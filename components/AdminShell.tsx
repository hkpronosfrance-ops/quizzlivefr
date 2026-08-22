"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gamepad2,
  HelpCircle,
  FolderOpen,
  Users,
  Radio,
  BarChart3,
  MessageSquare,
  Bell,
  Database,
  Upload,
  Settings,
  Palette,
  UserCog,
  Crown,
  ChevronDown,
  MonitorPlay,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { supabaseBrowser } from "@/lib/supabase";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: "live";
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Général",
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, href: "/admin" },
      { label: "Parties", icon: Gamepad2 },
      { label: "Questions", icon: HelpCircle },
      { label: "Catégories", icon: FolderOpen },
      { label: "Joueurs", icon: Users },
    ],
  },
  {
    title: "Live & interaction",
    items: [
      { label: "Sessions live", icon: Radio, href: "/admin/sessions-live", badge: "live" },
      { label: "Statistiques live", icon: BarChart3 },
      { label: "Chat & Modération", icon: MessageSquare },
      { label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Contenu",
    items: [
      { label: "Banque de questions", icon: Database },
      { label: "Imports / Exports", icon: Upload },
    ],
  },
  {
    title: "Paramètres",
    items: [
      { label: "Paramètres du quiz", icon: Settings },
      { label: "Personnalisation", icon: Palette },
      { label: "Utilisateurs", icon: UserCog },
      { label: "Abonnements", icon: Crown },
    ],
  },
];

export function AdminShell({
  children,
  isLive,
  notify,
}: {
  children: React.ReactNode;
  isLive: boolean;
  notify: (msg: string) => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const db = supabaseBrowser();
    await db.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-auth-bg font-body flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-auth-border flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-auth-text font-bold text-base tracking-tight">
            QUIZLIVE
            <sup className="text-[9px] font-bold text-auth-blue ml-0.5">FR</sup>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">
                {section.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = item.href && pathname === item.href;
                  const Icon = item.icon;
                  const content = (
                    <div
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                        active
                          ? "bg-auth-blue/15 text-auth-text"
                          : "text-auth-muted hover:bg-white/5 hover:text-auth-text"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === "live" && isLive && (
                        <span className="text-[9px] font-bold text-auth-live bg-auth-live/15 rounded px-1.5 py-0.5">
                          LIVE
                        </span>
                      )}
                    </div>
                  );
                  return item.href ? (
                    <Link key={item.label} href={item.href}>
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      onClick={() => notify(`${item.label} — bientôt disponible.`)}
                      className="text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4">
          <div className="rounded-xl border border-auth-border bg-auth-panel p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown size={13} className="text-auth-purple" />
              <span className="text-auth-mutedDim text-[10px] uppercase tracking-wide">Votre abonnement</span>
            </div>
            <p className="text-auth-text text-sm font-bold mb-0.5">Premium</p>
            <p className="text-auth-mutedDim text-[11px] mb-3">Valide jusqu'au 12/06/2026</p>
            <button
              onClick={() => notify("Gestion de l'abonnement — bientôt disponible.")}
              className="w-full rounded-lg py-2 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
            >
              Gérer l'abonnement
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="border-b border-auth-border px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-auth-muted text-xs">Bienvenue,</p>
            <p className="text-auth-text font-bold text-lg">Admin QuizzLiveFR</p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-auth-border rounded-lg px-3.5 py-2 text-auth-text text-sm hover:bg-white/5 transition"
            >
              <MonitorPlay size={15} />
              Voir le live
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-auth-live" />}
            </a>

            <button
              onClick={() => notify("Notifications — bientôt disponible.")}
              className="relative text-auth-muted hover:text-auth-text transition"
            >
              <Bell size={19} />
              <span className="absolute -top-1.5 -right-1.5 bg-auth-pink text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </button>

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
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-auth-text hover:bg-white/5 transition"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        <div className="text-center text-auth-mutedDim text-xs py-4 border-t border-auth-border">
          © 2026 QuizzLiveFR. Tous droits réservés. · <span className="opacity-60">Version 1.0.0</span>
        </div>
      </div>
    </div>
  );
}
