import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Delete, Lock, ShieldPlus } from "lucide-react";
import { toast } from "sonner";

export default function PinLock() {
  const { status, setupPin, verifyPin } = useAuth();
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState("");
  const [phase, setPhase] = useState("enter"); // enter | confirm
  const [busy, setBusy] = useState(false);

  const isSetup = status === "needs-setup";
  const title = isSetup
    ? phase === "enter" ? "Create a 4-digit PIN" : "Confirm your PIN"
    : "Enter your PIN";

  const target = phase === "enter" ? pin : confirming;

  const setTarget = (v) =>
    phase === "enter" ? setPin(v) : setConfirming(v);

  const onPress = async (k) => {
    if (busy) return;
    let next = target;
    if (k === "del") next = next.slice(0, -1);
    else if (target.length < 4) next = target + k;
    setTarget(next);

    if (next.length === 4) {
      if (isSetup) {
        if (phase === "enter") {
          setPhase("confirm");
        } else {
          if (next !== pin) {
            toast.error("PINs don't match. Try again.");
            setPin("");
            setConfirming("");
            setPhase("enter");
            return;
          }
          try {
            setBusy(true);
            await setupPin(pin);
            toast.success("PIN set. Welcome!");
          } catch (e) {
            toast.error("Could not save PIN");
          } finally {
            setBusy(false);
          }
        }
      } else {
        try {
          setBusy(true);
          await verifyPin(next);
        } catch (e) {
          toast.error("Wrong PIN");
          setPin("");
        } finally {
          setBusy(false);
        }
      }
    }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-background relative flex flex-col">
      <div className="pt-16 pb-8 px-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          {isSetup ? <ShieldPlus className="text-primary" /> : <Lock className="text-primary" />}
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isSetup
            ? "Your PIN keeps your business numbers private on this device."
            : "Unlock to see today's sales and stock."}
        </p>
      </div>

      <div className="flex gap-4 px-8 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid={`pin-dot-${i}`}
            className={`w-4 h-4 rounded-full pin-dot ${
              i < target.length ? "bg-primary scale-110" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="mt-auto px-6 pb-10">
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) =>
            k === "" ? (
              <div key={i} />
            ) : (
              <motion.button
                key={i}
                whileTap={{ scale: 0.94 }}
                onClick={() => onPress(k)}
                data-testid={`pin-key-${k}`}
                className="h-16 rounded-2xl bg-white border border-border text-2xl font-heading font-semibold text-foreground shadow-sm hover:bg-accent active:bg-primary/5"
              >
                {k === "del" ? <Delete size={22} className="mx-auto" /> : k}
              </motion.button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
