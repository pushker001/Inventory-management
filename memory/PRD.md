# FMCG Distributor Sales & Profit Tracker — PRD

## Problem
Single-owner FMCG distributor (masala, biscuit, namkeen, soap) has no clear monthly profit view. Needs mobile-first app to log purchases/sales/damage/expenses and compute correct monthly Net Profit accounting for stock roll-forward, box→unit conversion, wholesaler vs retailer pricing.

## Personas
- **Owner** (single user): purchases stock in boxes monthly, sells in units to wholesalers (lower price/bulk) and retailers (higher price/loose), needs to see one number: monthly Net Profit.

## Core Requirements (V1)
- PIN lock (4 digits) for privacy on shared device
- Categories + SKUs (with units_per_box, wholesale/retail default prices, archive)
- Purchase entries (boxes × cost/box → auto units & value)
- Sale entries (wholesaler/retailer toggle, auto-suggested prices)
- Damage/Expiry entries
- Operating Expense entries
- Monthly Profit Report — weighted-avg COGS, per-SKU rows, CSV export
- Channel Comparison (Wholesale vs Retail margin)
- Current Stock/Inventory view
- Dashboard with Net Profit hero, 6-month trend chart, quick-add buttons
- Sample data seed (Masala/Biscuit/Namkeen)
- Warm Indian retail theme (terracotta/turmeric/sage) — mobile-first max-w-md

## Implemented (2026-02-08)
- Full backend (FastAPI + Motor MongoDB) with weighted-average stock valuation
- PIN auth (hashed) + all CRUD endpoints + reports (dashboard/monthly/channels/stock)
- Full frontend: PinLock, Dashboard, SKU mgmt, Purchase/Sale/Damage/Expense forms, ProfitReport (CSV), ChannelComparison, StockView, Settings
- Seed endpoint with realistic sample data across current + previous month
- Design agent guidelines followed (Outfit + DM Sans, terracotta palette)
- Passed backend + frontend smoke tests (auth, seed, monthly formulas, roll-forward verified)

## Backlog / Deferred
- P1: PDF export for monthly report (V1 = CSV only per user choice)
- P1: Editable historical entries listing (transactions page per SKU)
- P1: Offline data entry with sync (mentioned as nice-to-have)
- P2: Multi-user staff login
- P2: GST invoice generation
- P2: Retailer/wholesaler ledger + credit tracking (khata)
- P2: Scheme/discount automation
- P2: FIFO valuation option (currently weighted average)
