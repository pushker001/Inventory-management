import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState("loading"); // loading | needs-setup | locked | unlocked
  const [pinSet, setPinSet] = useState(false);

  useEffect(() => {
    api.get("/auth/status").then((r) => {
      if (!r.data.is_set) {
        setPinSet(false);
        setStatus("needs-setup");
      } else {
        setPinSet(true);
        const unlocked = sessionStorage.getItem("unlocked") === "1";
        setStatus(unlocked ? "unlocked" : "locked");
      }
    });
  }, []);

  const setupPin = async (pin) => {
    await api.post("/auth/set-pin", { pin });
    sessionStorage.setItem("unlocked", "1");
    setPinSet(true);
    setStatus("unlocked");
  };

  const verifyPin = async (pin) => {
    await api.post("/auth/verify", { pin });
    sessionStorage.setItem("unlocked", "1");
    setStatus("unlocked");
  };

  const lock = () => {
    sessionStorage.removeItem("unlocked");
    setStatus("locked");
  };

  return (
    <AuthContext.Provider value={{ status, pinSet, setupPin, verifyPin, lock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
