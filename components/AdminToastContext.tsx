"use client";

import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState("");

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-auth-panel border border-auth-border text-auth-text text-sm px-4 py-2.5 rounded-lg shadow-xl z-50">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  return useContext(ToastContext);
}
