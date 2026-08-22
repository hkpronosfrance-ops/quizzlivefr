"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { LoginScreen } from "@/components/LoginScreen";
import { AdminShell } from "@/components/AdminShell";
import { AdminToastProvider } from "@/components/AdminToastContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLive, setIsLive] = useState(false);

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

  // Track whether any question is currently live, for the sidebar's LIVE badge.
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

  if (checkingSession) {
    return <div className="min-h-screen bg-auth-bg" />;
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <AdminToastProvider>
      <AdminShell isLive={isLive}>{children}</AdminShell>
    </AdminToastProvider>
  );
}
