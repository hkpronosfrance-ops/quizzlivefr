"use client";

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
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAdminToast } from "./AdminToastContext";

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
      { label: "Parties", icon: Gamepad2, href: "/admin/parties" },
      { label: "Questions", icon: HelpCircle, href: "/admin/questions" },
      { label: "Catégories", icon: FolderOpen, href: "/admin/categories" },
      { label: "Joueurs", icon: Users, href: "/admin/joueurs" },
    ],
  },
  {
    title: "Live & interaction",
    items: [
      { label: "Sessions live", icon: Radio, href: "/admin/sessions-live", badge: "live" },
      { label: "Statistiques live", icon: BarChart3, href: "/admin/statistiques-live" },
      { label: "Chat Live", icon: MessageSquare, href: "/admin/chat-moderation" },
      { label: "Notifications", icon: Bell, href: "/admin/notifications" },
    ],
  },
  {
    title: "Contenu",
    items: [
      { label: "Banque de questions", icon: Database, href: "/admin/question-bank" },
      { label: "Imports / Exports", icon: Upload, href: "/admin/imports-exports" },
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

export function AdminShell({ children, isLive }: { children: React.ReactNode; isLive: boolean }) {
  const pathname = usePathname();
  const notify = useAdminToast();

  return (
    <div className="min-h-screen bg-auth-bg font-body flex">
      <aside className="w-64 shrink-0 border-r border-auth-border flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-auth-text font-bold text-base tracking-tight">QUIZLIVE<sup className="text-[9px] font-bold text-auth-blue ml-0.5">FR</sup></span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">{section.title}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = item.href && pathname === item.href;
                  const Icon = item.icon;
                  const content = (
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-auth-blue/15 text-auth-text" : "text-auth-muted hover:bg-white/5 hover:text-auth-text"}`}>
                      <Icon size={16} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === "live" && isLive && <span className="text-[9px] font-bold text-auth-live bg-auth-live/15 rounded px-1.5 py-0.5">LIVE</span>}
                    </div>
                  );
                  return item.href ? <Link key={item.label} href={item.href}>{content}</Link> : <button key={item.label} onClick={() => notify(`${item.label} — bientôt disponible.`)} className="text-left">{content}</button>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4">
          <div className="rounded-xl border border-auth-border bg-auth-panel p-4">
            <div className="flex items-center gap-1.5 mb-1"><Crown size={13} className="text-auth-purple" /><span className="text-auth-mutedDim text-[10px] uppercase tracking-wide">Votre abonnement</span></div>
            <p className="text-auth-text text-sm font-bold mb-0.5">Premium</p>
            <p className="text-auth-mutedDim text-[11px] mb-3">Valide jusqu'au 12/06/2026</p>
            <button onClick={() => notify("Gestion de l'abonnement — bientôt disponible.")} className="w-full rounded-lg py-2 text-xs font-semibold text-white" style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}>Gérer l'abonnement</button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">{children}</div>
        <div className="text-center text-auth-mutedDim text-xs py-4 border-t border-auth-border">© 2026 QuizzLiveFR. Tous droits réservés. · <span className="opacity-60">Version 1.0.0</span></div>
      </div>
    </div>
  );
}
