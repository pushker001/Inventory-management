from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- Helpers ----------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


def month_key(iso_date: str) -> str:
    return iso_date[:7]  # YYYY-MM


def parse_month(m: str):
    y, mo = m.split("-")
    return int(y), int(mo)


# ---------- Models ----------
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    created_at: str = Field(default_factory=now_iso)


class CategoryCreate(BaseModel):
    name: str


class SKU(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    category_id: str
    company_id: Optional[str] = None
    brand: str = ""
    pack_size: str = ""
    units_per_box: int
    current_cost_per_box: float = 0.0
    default_wholesale_price: float = 0.0
    default_retail_price: float = 0.0
    archived: bool = False
    created_at: str = Field(default_factory=now_iso)


class SKUCreate(BaseModel):
    name: str
    category_id: str
    company_id: Optional[str] = None
    brand: str = ""
    pack_size: str = ""
    units_per_box: int
    current_cost_per_box: float = 0.0
    default_wholesale_price: float = 0.0
    default_retail_price: float = 0.0


class SKUUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    company_id: Optional[str] = None
    brand: Optional[str] = None
    pack_size: Optional[str] = None
    units_per_box: Optional[int] = None
    current_cost_per_box: Optional[float] = None
    default_wholesale_price: Optional[float] = None
    default_retail_price: Optional[float] = None
    archived: Optional[bool] = None


class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    name: str
    note: str = ""
    archived: bool = False
    created_at: str = Field(default_factory=now_iso)


class CompanyCreate(BaseModel):
    name: str
    note: str = ""


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    note: Optional[str] = None
    archived: Optional[bool] = None


class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    date: str
    sku_id: str
    boxes: float
    cost_per_box: float
    units_per_box_snapshot: int
    total_units: float
    total_value: float
    created_at: str = Field(default_factory=now_iso)


class PurchaseCreate(BaseModel):
    date: str
    sku_id: str
    boxes: float
    cost_per_box: float


class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    date: str
    sku_id: str
    customer_type: Literal["wholesaler", "retailer"]
    quantity: float
    price_per_unit: float
    total_value: float
    created_at: str = Field(default_factory=now_iso)


class SaleCreate(BaseModel):
    date: str
    sku_id: str
    customer_type: Literal["wholesaler", "retailer"]
    quantity: float
    price_per_unit: float


class Damage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    date: str
    sku_id: str
    quantity: float
    reason: str
    note: str = ""
    created_at: str = Field(default_factory=now_iso)


class DamageCreate(BaseModel):
    date: str
    sku_id: str
    quantity: float
    reason: str
    note: str = ""


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    date: str
    category: str
    amount: float
    note: str = ""
    created_at: str = Field(default_factory=now_iso)


class ExpenseCreate(BaseModel):
    date: str
    category: str
    amount: float
    note: str = ""


# ---------- PIN auth ----------
class PinSetRequest(BaseModel):
    pin: str


class PinVerifyRequest(BaseModel):
    pin: str


@api_router.get("/auth/status")
async def auth_status():
    doc = await db.settings.find_one({"key": "pin"})
    return {"is_set": bool(doc)}


@api_router.post("/auth/set-pin")
async def set_pin(req: PinSetRequest):
    if not req.pin or len(req.pin) < 4:
        raise HTTPException(400, "PIN must be at least 4 digits")
    await db.settings.update_one(
        {"key": "pin"},
        {"$set": {"key": "pin", "value": hash_pin(req.pin), "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.post("/auth/verify")
async def verify_pin(req: PinVerifyRequest):
    doc = await db.settings.find_one({"key": "pin"})
    if not doc:
        raise HTTPException(400, "PIN not set")
    if doc["value"] != hash_pin(req.pin):
        raise HTTPException(401, "Incorrect PIN")
    return {"ok": True}


# ---------- Categories ----------
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    docs = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    obj = Category(name=payload.name.strip())
    await db.categories.insert_one(obj.model_dump())
    return obj


@api_router.delete("/categories/{cid}")
async def delete_category(cid: str):
    in_use = await db.skus.count_documents({"category_id": cid})
    if in_use:
        raise HTTPException(400, "Category in use by SKUs")
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


# ---------- Companies ----------
@api_router.get("/companies", response_model=List[Company])
async def list_companies(include_archived: bool = False):
    q = {} if include_archived else {"archived": False}
    docs = await db.companies.find(q, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/companies", response_model=Company)
async def create_company(payload: CompanyCreate):
    obj = Company(name=payload.name.strip(), note=payload.note)
    await db.companies.insert_one(obj.model_dump())
    return obj


@api_router.patch("/companies/{cid}", response_model=Company)
async def update_company(cid: str, payload: CompanyUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.companies.update_one({"id": cid}, {"$set": updates})
    doc = await db.companies.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Company not found")
    return doc


@api_router.delete("/companies/{cid}")
async def delete_company(cid: str):
    in_use = await db.skus.count_documents({"company_id": cid})
    if in_use:
        raise HTTPException(400, "Company has SKUs; archive instead")
    await db.companies.delete_one({"id": cid})
    return {"ok": True}


# ---------- SKUs ----------
@api_router.get("/skus", response_model=List[SKU])
async def list_skus(include_archived: bool = False):
    q = {} if include_archived else {"archived": False}
    docs = await db.skus.find(q, {"_id": 0}).sort("name", 1).to_list(2000)
    return docs


@api_router.post("/skus", response_model=SKU)
async def create_sku(payload: SKUCreate):
    obj = SKU(**payload.model_dump())
    await db.skus.insert_one(obj.model_dump())
    return obj


@api_router.patch("/skus/{sid}", response_model=SKU)
async def update_sku(sid: str, payload: SKUUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.skus.update_one({"id": sid}, {"$set": updates})
    doc = await db.skus.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "SKU not found")
    return doc


@api_router.delete("/skus/{sid}")
async def delete_sku(sid: str):
    # hard delete only if no history
    counts = 0
    for coll in ("purchases", "sales", "damages"):
        counts += await db[coll].count_documents({"sku_id": sid})
    if counts:
        raise HTTPException(400, "SKU has transactions; archive instead")
    await db.skus.delete_one({"id": sid})
    return {"ok": True}


# ---------- Purchases ----------
@api_router.get("/purchases", response_model=List[Purchase])
async def list_purchases(month: Optional[str] = None, sku_id: Optional[str] = None):
    q = {}
    if month:
        q["date"] = {"$gte": f"{month}-01", "$lt": f"{month}-32"}
    if sku_id:
        q["sku_id"] = sku_id
    docs = await db.purchases.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    return docs


@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(payload: PurchaseCreate):
    sku = await db.skus.find_one({"id": payload.sku_id}, {"_id": 0})
    if not sku:
        raise HTTPException(404, "SKU not found")
    upb = int(sku["units_per_box"])
    total_units = payload.boxes * upb
    total_value = payload.boxes * payload.cost_per_box
    obj = Purchase(
        date=payload.date,
        sku_id=payload.sku_id,
        boxes=payload.boxes,
        cost_per_box=payload.cost_per_box,
        units_per_box_snapshot=upb,
        total_units=total_units,
        total_value=total_value,
    )
    await db.purchases.insert_one(obj.model_dump())
    # update latest cost on SKU
    await db.skus.update_one(
        {"id": payload.sku_id}, {"$set": {"current_cost_per_box": payload.cost_per_box}}
    )
    return obj


@api_router.delete("/purchases/{pid}")
async def delete_purchase(pid: str):
    await db.purchases.delete_one({"id": pid})
    return {"ok": True}


class PurchaseUpdate(BaseModel):
    date: Optional[str] = None
    boxes: Optional[float] = None
    cost_per_box: Optional[float] = None


@api_router.patch("/purchases/{pid}", response_model=Purchase)
async def update_purchase(pid: str, payload: PurchaseUpdate):
    doc = await db.purchases.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    merged = {**doc, **updates}
    upb = int(merged["units_per_box_snapshot"])
    merged["total_units"] = float(merged["boxes"]) * upb
    merged["total_value"] = float(merged["boxes"]) * float(merged["cost_per_box"])
    await db.purchases.update_one({"id": pid}, {"$set": {
        "date": merged["date"],
        "boxes": merged["boxes"],
        "cost_per_box": merged["cost_per_box"],
        "total_units": merged["total_units"],
        "total_value": merged["total_value"],
    }})
    return merged


# ---------- Sales ----------
@api_router.get("/sales", response_model=List[Sale])
async def list_sales(month: Optional[str] = None, sku_id: Optional[str] = None):
    q = {}
    if month:
        q["date"] = {"$gte": f"{month}-01", "$lt": f"{month}-32"}
    if sku_id:
        q["sku_id"] = sku_id
    docs = await db.sales.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    return docs


@api_router.post("/sales", response_model=Sale)
async def create_sale(payload: SaleCreate):
    sku = await db.skus.find_one({"id": payload.sku_id}, {"_id": 0})
    if not sku:
        raise HTTPException(404, "SKU not found")
    total_value = payload.quantity * payload.price_per_unit
    obj = Sale(
        date=payload.date,
        sku_id=payload.sku_id,
        customer_type=payload.customer_type,
        quantity=payload.quantity,
        price_per_unit=payload.price_per_unit,
        total_value=total_value,
    )
    await db.sales.insert_one(obj.model_dump())
    # remember last used price
    price_key = "default_wholesale_price" if payload.customer_type == "wholesaler" else "default_retail_price"
    await db.skus.update_one({"id": payload.sku_id}, {"$set": {price_key: payload.price_per_unit}})
    return obj


@api_router.delete("/sales/{sid}")
async def delete_sale(sid: str):
    await db.sales.delete_one({"id": sid})
    return {"ok": True}


class SaleUpdate(BaseModel):
    date: Optional[str] = None
    customer_type: Optional[Literal["wholesaler", "retailer"]] = None
    quantity: Optional[float] = None
    price_per_unit: Optional[float] = None


@api_router.patch("/sales/{sid}", response_model=Sale)
async def update_sale(sid: str, payload: SaleUpdate):
    doc = await db.sales.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    merged = {**doc, **updates}
    merged["total_value"] = float(merged["quantity"]) * float(merged["price_per_unit"])
    await db.sales.update_one({"id": sid}, {"$set": {
        "date": merged["date"],
        "customer_type": merged["customer_type"],
        "quantity": merged["quantity"],
        "price_per_unit": merged["price_per_unit"],
        "total_value": merged["total_value"],
    }})
    return merged


# ---------- Damages ----------
@api_router.get("/damages", response_model=List[Damage])
async def list_damages(month: Optional[str] = None, sku_id: Optional[str] = None):
    q = {}
    if month:
        q["date"] = {"$gte": f"{month}-01", "$lt": f"{month}-32"}
    if sku_id:
        q["sku_id"] = sku_id
    docs = await db.damages.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    return docs


@api_router.post("/damages", response_model=Damage)
async def create_damage(payload: DamageCreate):
    obj = Damage(**payload.model_dump())
    await db.damages.insert_one(obj.model_dump())
    return obj


@api_router.delete("/damages/{did}")
async def delete_damage(did: str):
    await db.damages.delete_one({"id": did})
    return {"ok": True}


class DamageUpdate(BaseModel):
    date: Optional[str] = None
    quantity: Optional[float] = None
    reason: Optional[str] = None
    note: Optional[str] = None


@api_router.patch("/damages/{did}", response_model=Damage)
async def update_damage(did: str, payload: DamageUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.damages.update_one({"id": did}, {"$set": updates})
    doc = await db.damages.find_one({"id": did}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


# ---------- Expenses ----------
@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(month: Optional[str] = None):
    q = {}
    if month:
        q = {"date": {"$gte": f"{month}-01", "$lt": f"{month}-32"}}
    docs = await db.expenses.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    return docs


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    obj = Expense(**payload.model_dump())
    await db.expenses.insert_one(obj.model_dump())
    return obj


@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str):
    await db.expenses.delete_one({"id": eid})
    return {"ok": True}


# ---------- Reports: core stock accounting ----------
async def _compute_per_sku_monthly(target_month: str):
    """
    Weighted-average cost method.
    Returns dict[sku_id] with: opening_units, opening_value, purchased_units, purchased_value,
    sold_units_wh, sold_value_wh, sold_units_rt, sold_value_rt, damaged_units,
    avg_cost_per_unit_period, cogs, damage_cost, closing_units, closing_value, gross_profit.
    """
    ty, tm = parse_month(target_month)
    month_start = f"{target_month}-01"
    month_end_exclusive = f"{ty}-{tm:02d}-32"

    all_purchases = await db.purchases.find({}, {"_id": 0}).to_list(20000)
    all_sales = await db.sales.find({}, {"_id": 0}).to_list(20000)
    all_damages = await db.damages.find({}, {"_id": 0}).to_list(20000)

    # Historical running weighted avg per SKU up to start of target month
    # We simulate: iterate all events sorted by date. When purchase -> update wavg.
    # Opening units/value = state at month_start.
    events = []
    for p in all_purchases:
        events.append((p["date"], "P", p))
    for s in all_sales:
        events.append((s["date"], "S", s))
    for d in all_damages:
        events.append((d["date"], "D", d))
    events.sort(key=lambda x: x[0])

    state = defaultdict(lambda: {"units": 0.0, "value": 0.0})  # per sku
    opening_state = {}

    result = defaultdict(lambda: {
        "opening_units": 0.0, "opening_value": 0.0,
        "purchased_units": 0.0, "purchased_value": 0.0,
        "sold_units_wh": 0.0, "sold_value_wh": 0.0,
        "sold_units_rt": 0.0, "sold_value_rt": 0.0,
        "damaged_units": 0.0,
        "cogs": 0.0, "damage_cost": 0.0,
        "closing_units": 0.0, "closing_value": 0.0,
        "gross_profit": 0.0,
        "avg_cost_period": 0.0,
    })

    for dt, kind, doc in events:
        sku_id = doc["sku_id"]
        st = state[sku_id]
        if dt < month_start:
            # apply pre-period so we can compute opening
            if kind == "P":
                st["units"] += doc["total_units"]
                st["value"] += doc["total_value"]
            else:
                qty = doc["quantity"]
                avg = (st["value"] / st["units"]) if st["units"] > 0 else 0.0
                st["units"] -= qty
                st["value"] -= avg * qty
        else:
            # snapshot opening the first time we cross the boundary for this SKU
            pass

    # Snapshot opening after processing pre-period
    for sku_id, st in state.items():
        opening_state[sku_id] = {"units": st["units"], "value": st["value"]}

    # Now process in-period events and compute weighted average across the period
    # Period weighted avg = (opening_value + purchase_value_in_period) / (opening_units + purchase_units_in_period)
    for dt, kind, doc in events:
        if not (month_start <= dt < month_end_exclusive):
            continue
        sku_id = doc["sku_id"]
        r = result[sku_id]
        if kind == "P":
            r["purchased_units"] += doc["total_units"]
            r["purchased_value"] += doc["total_value"]
        elif kind == "S":
            if doc["customer_type"] == "wholesaler":
                r["sold_units_wh"] += doc["quantity"]
                r["sold_value_wh"] += doc["total_value"]
            else:
                r["sold_units_rt"] += doc["quantity"]
                r["sold_value_rt"] += doc["total_value"]
        elif kind == "D":
            r["damaged_units"] += doc["quantity"]

    # Ensure opening applied
    all_sku_ids = set(list(opening_state.keys()) + list(result.keys()))
    for sku_id in all_sku_ids:
        r = result[sku_id]
        op = opening_state.get(sku_id, {"units": 0.0, "value": 0.0})
        r["opening_units"] = op["units"]
        r["opening_value"] = op["value"]

        total_units_available = r["opening_units"] + r["purchased_units"]
        total_value_available = r["opening_value"] + r["purchased_value"]
        avg = (total_value_available / total_units_available) if total_units_available > 0 else 0.0
        r["avg_cost_period"] = avg

        sold_units = r["sold_units_wh"] + r["sold_units_rt"]
        sales_value = r["sold_value_wh"] + r["sold_value_rt"]
        r["cogs"] = sold_units * avg
        r["damage_cost"] = r["damaged_units"] * avg

        r["closing_units"] = r["opening_units"] + r["purchased_units"] - sold_units - r["damaged_units"]
        r["closing_value"] = r["closing_units"] * avg
        r["gross_profit"] = sales_value - r["cogs"]

    return dict(result)


@api_router.get("/reports/monthly")
async def monthly_report(month: str):
    """month format YYYY-MM"""
    per_sku = await _compute_per_sku_monthly(month)
    skus = await db.skus.find({}, {"_id": 0}).to_list(2000)
    sku_map = {s["id"]: s for s in skus}
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    cat_map = {c["id"]: c["name"] for c in categories}

    rows = []
    total_sales = 0.0
    total_cogs = 0.0
    total_damage_cost = 0.0
    for sku_id, r in per_sku.items():
        s = sku_map.get(sku_id)
        if not s:
            continue
        sales_value = r["sold_value_wh"] + r["sold_value_rt"]
        total_sales += sales_value
        total_cogs += r["cogs"]
        total_damage_cost += r["damage_cost"]
        rows.append({
            "sku_id": sku_id,
            "sku_name": s["name"],
            "category": cat_map.get(s["category_id"], ""),
            "brand": s.get("brand", ""),
            **r,
            "sales_value": sales_value,
        })

    # expenses
    exp_docs = await db.expenses.find(
        {"date": {"$gte": f"{month}-01", "$lt": f"{month}-32"}}, {"_id": 0}
    ).to_list(5000)
    total_expenses = sum(e["amount"] for e in exp_docs)

    gross_profit = total_sales - total_cogs
    net_profit = gross_profit - total_expenses - total_damage_cost

    rows.sort(key=lambda x: -x["gross_profit"])
    return {
        "month": month,
        "rows": rows,
        "summary": {
            "total_sales": total_sales,
            "total_cogs": total_cogs,
            "gross_profit": gross_profit,
            "total_expenses": total_expenses,
            "total_damage_cost": total_damage_cost,
            "net_profit": net_profit,
        },
    }


@api_router.get("/reports/dashboard")
async def dashboard_report(month: Optional[str] = None):
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{now.month:02d}"
    current = await monthly_report(month=month)

    # last 6 months trend
    y, m = parse_month(month)
    trend = []
    for _ in range(6):
        mm_str = f"{y}-{m:02d}"
        rep = await monthly_report(month=mm_str)
        trend.append({"month": mm_str, **rep["summary"]})
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    trend.reverse()

    return {"current": current, "trend": trend}


@api_router.get("/reports/channels")
async def channel_report(month: Optional[str] = None):
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{now.month:02d}"
    per_sku = await _compute_per_sku_monthly(month)
    wh_units = wh_revenue = wh_cogs = 0.0
    rt_units = rt_revenue = rt_cogs = 0.0
    for _, r in per_sku.items():
        avg = r["avg_cost_period"]
        wh_units += r["sold_units_wh"]
        wh_revenue += r["sold_value_wh"]
        wh_cogs += r["sold_units_wh"] * avg
        rt_units += r["sold_units_rt"]
        rt_revenue += r["sold_value_rt"]
        rt_cogs += r["sold_units_rt"] * avg
    return {
        "month": month,
        "wholesaler": {
            "units": wh_units, "revenue": wh_revenue, "cogs": wh_cogs,
            "margin": wh_revenue - wh_cogs,
            "avg_margin_per_unit": ((wh_revenue - wh_cogs) / wh_units) if wh_units else 0.0,
        },
        "retailer": {
            "units": rt_units, "revenue": rt_revenue, "cogs": rt_cogs,
            "margin": rt_revenue - rt_cogs,
            "avg_margin_per_unit": ((rt_revenue - rt_cogs) / rt_units) if rt_units else 0.0,
        },
    }


@api_router.get("/reports/stock")
async def stock_report():
    """Current closing stock across all history (weighted average)."""
    all_purchases = await db.purchases.find({}, {"_id": 0}).to_list(20000)
    all_sales = await db.sales.find({}, {"_id": 0}).to_list(20000)
    all_damages = await db.damages.find({}, {"_id": 0}).to_list(20000)
    events = []
    for p in all_purchases:
        events.append((p["date"], "P", p))
    for s in all_sales:
        events.append((s["date"], "S", s))
    for d in all_damages:
        events.append((d["date"], "D", d))
    events.sort(key=lambda x: x[0])
    state = defaultdict(lambda: {"units": 0.0, "value": 0.0})
    for dt, kind, doc in events:
        sid = doc["sku_id"]
        st = state[sid]
        if kind == "P":
            st["units"] += doc["total_units"]
            st["value"] += doc["total_value"]
        else:
            qty = doc["quantity"]
            avg = (st["value"] / st["units"]) if st["units"] > 0 else 0.0
            st["units"] -= qty
            st["value"] -= avg * qty

    skus = await db.skus.find({}, {"_id": 0}).to_list(2000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    cat_map = {c["id"]: c["name"] for c in categories}

    # compute median value for flag
    rows = []
    for s in skus:
        st = state.get(s["id"], {"units": 0.0, "value": 0.0})
        avg_cost = (st["value"] / st["units"]) if st["units"] > 0 else 0.0
        rows.append({
            "sku_id": s["id"],
            "sku_name": s["name"],
            "brand": s.get("brand", ""),
            "category": cat_map.get(s["category_id"], ""),
            "archived": s.get("archived", False),
            "units": max(0.0, st["units"]),
            "value": max(0.0, st["value"]),
            "avg_cost_per_unit": avg_cost,
            "units_per_box": s["units_per_box"],
        })
    values = sorted([r["value"] for r in rows if r["value"] > 0])
    threshold = 0.0
    if values:
        threshold = values[int(len(values) * 0.8)] if len(values) >= 5 else max(values)
    for r in rows:
        r["is_slow_moving"] = r["value"] > threshold and r["value"] > 0
    rows.sort(key=lambda r: (r["category"], r["sku_name"]))
    return {"rows": rows}


# ---------- Seed data ----------
@api_router.post("/seed")
async def seed_data(force: bool = False):
    existing = await db.skus.count_documents({})
    if existing and not force:
        return {"ok": False, "message": "Data exists. Use ?force=true to reseed."}

    if force:
        for c in ("categories", "skus", "purchases", "sales", "damages", "expenses", "companies"):
            await db[c].delete_many({})

    # companies (user-requested list + originals)
    company_names = ["JO", "Rakesh Masala", "Bhagwati", "Amrit Taza", "MDH", "Everest", "Catch", "Parle", "Britannia", "Haldiram"]
    companies = []
    for cn in company_names:
        c = {"id": new_id(), "name": cn, "note": "", "archived": False, "created_at": now_iso()}
        await db.companies.insert_one(c)
        companies.append(c)
    co_by_name = {c["name"]: c["id"] for c in companies}

    # categories
    cats = [
        {"id": new_id(), "name": "Masala"},
        {"id": new_id(), "name": "Biscuit"},
        {"id": new_id(), "name": "Namkeen"},
    ]
    for c in cats:
        c["created_at"] = now_iso()
        await db.categories.insert_one(c)
    cat_by_name = {c["name"]: c["id"] for c in cats}

    # SKUs
    skus_seed = [
        # Masala (box of 48)
        {"name": "Garam Masala 50g", "cat": "Masala", "brand": "MDH", "pack_size": "50g", "upb": 48,
         "cost_box": 720, "wh": 18, "rt": 22},
        {"name": "Chana Masala 100g", "cat": "Masala", "brand": "Everest", "pack_size": "100g", "upb": 48,
         "cost_box": 1440, "wh": 34, "rt": 40},
        {"name": "Turmeric Powder 200g", "cat": "Masala", "brand": "Catch", "pack_size": "200g", "upb": 48,
         "cost_box": 2160, "wh": 52, "rt": 62},
        {"name": "Kitchen King 100g", "cat": "Masala", "brand": "Rakesh Masala", "pack_size": "100g", "upb": 48,
         "cost_box": 1200, "wh": 29, "rt": 35},
        {"name": "Sabji Masala 50g", "cat": "Masala", "brand": "JO", "pack_size": "50g", "upb": 48,
         "cost_box": 600, "wh": 15, "rt": 18},
        # Biscuit (box of 144)
        {"name": "Orange Cream Biscuit 60g", "cat": "Biscuit", "brand": "Parle", "pack_size": "60g", "upb": 144,
         "cost_box": 1152, "wh": 9, "rt": 10},
        {"name": "Marie Gold 100g", "cat": "Biscuit", "brand": "Britannia", "pack_size": "100g", "upb": 144,
         "cost_box": 1728, "wh": 13, "rt": 15},
        {"name": "Good Day Cashew 75g", "cat": "Biscuit", "brand": "Britannia", "pack_size": "75g", "upb": 144,
         "cost_box": 1440, "wh": 11, "rt": 12},
        {"name": "Amrit Cookies 100g", "cat": "Biscuit", "brand": "Amrit Taza", "pack_size": "100g", "upb": 144,
         "cost_box": 1300, "wh": 10, "rt": 12},
        # Namkeen (box of 60)
        {"name": "Aloo Bhujia 200g", "cat": "Namkeen", "brand": "Haldiram", "pack_size": "200g", "upb": 60,
         "cost_box": 3000, "wh": 56, "rt": 65},
        {"name": "Moong Dal 150g", "cat": "Namkeen", "brand": "Haldiram", "pack_size": "150g", "upb": 60,
         "cost_box": 2400, "wh": 44, "rt": 52},
        {"name": "Bhagwati Mixture 200g", "cat": "Namkeen", "brand": "Bhagwati", "pack_size": "200g", "upb": 60,
         "cost_box": 2700, "wh": 50, "rt": 58},
    ]
    sku_ids = {}
    for s in skus_seed:
        obj = SKU(
            name=s["name"], category_id=cat_by_name[s["cat"]], brand=s["brand"],
            company_id=co_by_name.get(s["brand"]),
            pack_size=s["pack_size"], units_per_box=s["upb"],
            current_cost_per_box=s["cost_box"],
            default_wholesale_price=s["wh"], default_retail_price=s["rt"],
        )
        await db.skus.insert_one(obj.model_dump())
        sku_ids[s["name"]] = obj.id

    # Purchases + sales over last 2 months to show carry-forward and profit
    now = datetime.now(timezone.utc)
    curr_year, curr_month = now.year, now.month
    prev_year, prev_month = (curr_year, curr_month - 1) if curr_month > 1 else (curr_year - 1, 12)

    def ds(y, m, d):
        return f"{y}-{m:02d}-{d:02d}"

    # last month purchases & sales
    purchases_seed = [
        (prev_year, prev_month, 3, "Orange Cream Biscuit 60g", 5, 1150),
        (prev_year, prev_month, 3, "Marie Gold 100g", 3, 1720),
        (prev_year, prev_month, 4, "Garam Masala 50g", 4, 720),
        (prev_year, prev_month, 4, "Aloo Bhujia 200g", 2, 3000),
        (prev_year, prev_month, 5, "Turmeric Powder 200g", 2, 2160),
        (curr_year, curr_month, 2, "Orange Cream Biscuit 60g", 4, 1160),
        (curr_year, curr_month, 2, "Good Day Cashew 75g", 3, 1440),
        (curr_year, curr_month, 3, "Chana Masala 100g", 3, 1450),
        (curr_year, curr_month, 3, "Moong Dal 150g", 2, 2400),
    ]
    for y, m, d, name, boxes, cost in purchases_seed:
        sku = await db.skus.find_one({"id": sku_ids[name]}, {"_id": 0})
        upb = sku["units_per_box"]
        p = Purchase(
            date=ds(y, m, d), sku_id=sku_ids[name], boxes=boxes, cost_per_box=cost,
            units_per_box_snapshot=upb, total_units=boxes * upb, total_value=boxes * cost,
        )
        await db.purchases.insert_one(p.model_dump())

    sales_seed = [
        # last month
        (prev_year, prev_month, 8, "Orange Cream Biscuit 60g", "wholesaler", 300, 9),
        (prev_year, prev_month, 10, "Orange Cream Biscuit 60g", "retailer", 90, 10),
        (prev_year, prev_month, 12, "Marie Gold 100g", "wholesaler", 200, 13),
        (prev_year, prev_month, 15, "Garam Masala 50g", "wholesaler", 96, 18),
        (prev_year, prev_month, 16, "Garam Masala 50g", "retailer", 40, 22),
        (prev_year, prev_month, 20, "Aloo Bhujia 200g", "wholesaler", 60, 56),
        (prev_year, prev_month, 22, "Turmeric Powder 200g", "retailer", 30, 62),
        # this month
        (curr_year, curr_month, 5, "Orange Cream Biscuit 60g", "wholesaler", 250, 9),
        (curr_year, curr_month, 6, "Orange Cream Biscuit 60g", "retailer", 80, 10),
        (curr_year, curr_month, 7, "Good Day Cashew 75g", "wholesaler", 180, 11),
        (curr_year, curr_month, 8, "Chana Masala 100g", "retailer", 50, 40),
        (curr_year, curr_month, 9, "Moong Dal 150g", "wholesaler", 60, 44),
        (curr_year, curr_month, 10, "Moong Dal 150g", "retailer", 25, 52),
    ]
    for y, m, d, name, ctype, qty, price in sales_seed:
        s = Sale(
            date=ds(y, m, d), sku_id=sku_ids[name], customer_type=ctype,
            quantity=qty, price_per_unit=price, total_value=qty * price,
        )
        await db.sales.insert_one(s.model_dump())

    # a bit of damage
    dmg = Damage(date=ds(curr_year, curr_month, 4), sku_id=sku_ids["Marie Gold 100g"],
                 quantity=12, reason="Expired", note="Torn packet")
    await db.damages.insert_one(dmg.model_dump())

    # expenses
    exps_seed = [
        (prev_year, prev_month, 5, "Godown Rent", 8000, ""),
        (prev_year, prev_month, 10, "Fuel/Van", 2500, ""),
        (prev_year, prev_month, 25, "Salary", 12000, "Helper salary"),
        (curr_year, curr_month, 2, "Godown Rent", 8000, ""),
        (curr_year, curr_month, 6, "Fuel/Van", 1800, ""),
        (curr_year, curr_month, 8, "Loading Labor", 900, ""),
    ]
    for y, m, d, cat, amt, note in exps_seed:
        e = Expense(date=ds(y, m, d), category=cat, amount=amt, note=note)
        await db.expenses.insert_one(e.model_dump())

    return {"ok": True, "categories": len(cats), "skus": len(skus_seed)}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
