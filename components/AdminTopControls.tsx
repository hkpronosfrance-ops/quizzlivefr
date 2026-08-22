"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export function AdminTopControls() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const db = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    let mounted = true;
    async function refreshUnread() {
      const { count } = await db.from("notification_events").select("id", { count: "exact", head: true }).is("read_at", null);
      if (mounted) setUnread(count || 0);
    }
    refreshUnread();
    const channel = db
      .channel("admin-top-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_events" }, refreshUnread)
      .subscribe();
    const fallback = window.setInterval(refreshUnread, 15000);
    return () => {
      mounted = false;
      window.clearInterval(fallback);
      db.removeChannel(channel);
    };
  }, [db]);

  async function handleSignOut() {
    await db.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/admin/notifications" aria-label="Ouvrir les notifications" className="relative text-auth-muted hover:text-auth-text transition">
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-auth-pink text-white text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>

      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-auth-blue to-auth-pink flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-auth-text text-xs font-semibold leading-tight">Admin</p>
            <p className="text-auth-mutedDim text-[10px] leading-tight">Super administrateur</p>
          </div>
          <ChevronDown size={14} className="text-auth-muted" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 w-44 bg-auth-panel border border-auth-border rounded-lg overflow-hidden shadow-xl z-20">
            <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-auth-text hover:bg-white/5 transition">
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
