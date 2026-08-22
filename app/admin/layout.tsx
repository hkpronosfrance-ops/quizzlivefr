"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { LoginScreen } from "@/components/LoginScreen";
import { AdminShell } from "@/components/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [toast, setToast] = useState("");

  const db = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track whether any question is currently live, for the sidebar/topbar badges.
  useEffect(() => {
    if (!authed) return;

    async function checkLive() {
      const { data } = await db.from("questions").select("id").eq("status", "active").limit(1);
      setIsLive(!!data && data.length > 0);
    }
    checkLive();

    const channel = db
      .channel("admin-shell-live-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, checkLive)
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [db, authed]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  if (checkingSession) {
    return <div className="min-h-screen bg-auth-bg" />;
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <>
      <AdminShell isLive={isLive} notify={notify}>
        {children}
      </AdminShell>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-auth-panel border border-auth-border text-auth-text text-sm px-4 py-2.5 rounded-lg shadow-xl z-50">
          {toast}
        </div>
      )}
    </>
  );
}
