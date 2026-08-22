"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Download,
  UserPlus,
  Filter,
  Users2,
  UserCheck,
  Activity,
  Trophy,
  Star,
  BadgeCheck,
  MessageCircle,
  BarChart3,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";

type PlayerStatus = "online" | "away" | "offline";
type PlayerRole = "Joueur" | "Modérateur";

type Player = {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  status: PlayerStatus;
  role: PlayerRole;
  games: number;
  score: number;
  bestStreak: number;
  lastActive: string;
  color: string;
  successRate: number;
  correctAnswers: number;
  bestScore: number;
  rank: number;
  topCategories: string[];
  recentGames: { date: string; category: string; score: number; result: string }[];
};

const STATUS_LABEL: Record<PlayerStatus, string> = { online: "En ligne", away: "Absent", offline: "Hors ligne" };
const STATUS_COLOR: Record<PlayerStatus, string> = { online: "#22C55E", away: "#F5A623", offline: "#6B7086" };

// Mock community data — the real source of truth is the `leaderboard` table
// (one row per tiktok_user per session), but it has no persistent profile,
// streak tracking, or online-status concept yet. Wired for real once that
// exists; for now this mirrors the mockup with sample data.
const PLAYERS: Player[] = [
  { id: "1", name: "Mathilde", handle: "@Mathilde", verified: true, status: "online", role: "Modérateur", games: 156, score: 24650, bestStreak: 28, lastActive: "Il y a 2 min", color: "#9B4DFF", successRate: 78, correctAnswers: 1834, bestScore: 980, rank: 1, topCategories: ["Culture générale", "Cinéma"], recentGames: [
    { date: "22/05", category: "Culture G. : Spécial Japon", score: 340, result: "1ère place" },
    { date: "21/05", category: "Musique : Années 80", score: 290, result: "2e place" },
    { date: "20/05", category: "Spécial Noël", score: 350, result: "1ère place" },
  ] },
  { id: "2", name: "Léo_93", handle: "@Leo_93", verified: true, status: "online", role: "Modérateur", games: 142, score: 21870, bestStreak: 25, lastActive: "Il y a 5 min", color: "#4C6FFF", successRate: 74, correctAnswers: 1602, bestScore: 910, rank: 2, topCategories: ["Sport", "Histoire"], recentGames: [
    { date: "22/05", category: "Sport Mania", score: 310, result: "1ère place" },
    { date: "21/05", category: "Histoire : Grandes dates", score: 260, result: "3e place" },
  ] },
  { id: "3", name: "Maxoou", handle: "@Maxoou", verified: false, status: "away", role: "Joueur", games: 98, score: 15430, bestStreak: 18, lastActive: "Il y a 1 h", color: "#F5A623", successRate: 65, correctAnswers: 980, bestScore: 720, rank: 8, topCategories: ["Géographie"], recentGames: [
    { date: "20/05", category: "Géographie : Tour du monde", score: 280, result: "2e place" },
  ] },
  { id: "4", name: "Sara", handle: "@Sara", verified: false, status: "online", role: "Joueur", games: 87, score: 12950, bestStreak: 16, lastActive: "Il y a 3 min", color: "#FF3D8E", successRate: 70, correctAnswers: 845, bestScore: 690, rank: 12, topCategories: ["Cinéma", "Musique"], recentGames: [
    { date: "22/05", category: "Cinéma Cultes 90", score: 300, result: "1ère place" },
  ] },
  { id: "5", name: "Julien", handle: "@Julien", verified: false, status: "online", role: "Joueur", games: 76, score: 11230, bestStreak: 15, lastActive: "Il y a 10 min", color: "#3DDCFF", successRate: 68, correctAnswers: 720, bestScore: 650, rank: 15, topCategories: ["Sciences"], recentGames: [
    { date: "19/05", category: "Science & Nature", score: 250, result: "4e place" },
  ] },
  { id: "6", name: "Chris", handle: "@Chris", verified: false, status: "offline", role: "Joueur", games: 65, score: 9870, bestStreak: 12, lastActive: "Il y a 2 h", color: "#14B8A6", successRate: 61, correctAnswers: 590, bestScore: 580, rank: 22, topCategories: ["Technologie"], recentGames: [] },
  { id: "7", name: "Nico", handle: "@Nico", verified: false, status: "away", role: "Joueur", games: 54, score: 8420, bestStreak: 10, lastActive: "Il y a 6 h", color: "#6366F1", successRate: 58, correctAnswers: 470, bestScore: 510, rank: 28, topCategories: ["Musique"], recentGames: [] },
  { id: "8", name: "Emma", handle: "@Emma", verified: false, status: "offline", role: "Joueur", games: 48, score: 7210, bestStreak: 9, lastActive: "Il y a 1 j", color: "#22C55E", successRate: 55, correctAnswers: 390, bestScore: 460, rank: 34, topCategories: ["Histoire"], recentGames: [] },
  { id: "9", name: "Tom_07", handle: "@Tom_07", verified: false, status: "offline", role: "Joueur", games: 41, score: 6340, bestStreak: 8, lastActive: "Il y a 2 j", color: "#F5A623", successRate: 52, correctAnswers: 320, bestScore: 410, rank: 41, topCategories: ["Sport"], recentGames: [] },
  { id: "10", name: "PlayerOne", handle: "@PlayerOne", verified: false, status: "offline", role: "Joueur", games: 33, score: 5120, bestStreak: 7, lastActive: "Il y a 3 j", color: "#9B4DFF", successRate: 49, correctAnswers: 260, bestScore: 380, rank: 52, topCategories: ["Culture générale"], recentGames: [] },
];

const TABS = [
  { key: "all", label: "Tous les joueurs" },
  { key: "active", label: "Joueurs actifs" },
  { key: "subscribers", label: "Abonnés" },
  { key: "moderators", label: "Modérateurs" },
] as const;

export default function JoueursPage() {
  const notify = useAdminToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return PLAYERS.filter((p) => {
      if (tab === "active" && p.status !== "online") return false;
      if (tab === "moderators" && p.role !== "Modérateur") return false;
      if (tab === "subscribers" && !p.verified) return false;
      if (role !== "all" && p.role !== role) return false;
      if (status !== "all" && p.status !== status) return false;
      if (search && !`${p.name} ${p.handle}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tab, role, status, search]);

  const selected = PLAYERS.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between -mt-2 mb-2">
        <div>
          <h1 className="text-auth-text font-bold text-2xl">Joueurs</h1>
          <p className="text-auth-muted text-sm">Consultez et gérez les joueurs de votre communauté.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="bg-auth-panel border border-auth-border rounded-lg pl-9 pr-3 py-2 text-sm text-auth-text outline-none focus:border-auth-blue w-56 placeholder:text-auth-mutedDim"
            />
          </div>
          <button
            onClick={() => notify("Export — bientôt disponible.")}
            className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3 py-2 text-auth-text text-sm hover:bg-white/5 transition"
          >
            <Download size={14} /> Exporter
          </button>
          <button
            onClick={() => notify("Invitation — bientôt disponible.")}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-white text-sm font-semibold"
            style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
          >
            <UserPlus size={15} /> Inviter un joueur
          </button>
          <AdminTopControls />
        </div>
      </div>

      {/* Stat cards — mock */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: Users2, label: "Joueurs totaux", value: "12 485", delta: "+245 ce mois-ci", color: "#9B4DFF" },
          { icon: UserCheck, label: "Nouveaux joueurs", value: "342", delta: "+18% vs mois dernier", color: "#22C55E" },
          { icon: Activity, label: "Joueurs actifs (30j)", value: "2 845", delta: "+12% vs mois dernier", color: "#4C6FFF" },
          { icon: Trophy, label: "Meilleure série", value: "28", delta: "par @Mathilde", color: "#F5A623" },
          { icon: Star, label: "Score moyen", value: "1 248 pts", delta: "+56 pts vs mois dernier", color: "#FF3D8E" },
        ].map(({ icon: Icon, label, value, delta, color }) => (
          <div key={label} className="bg-auth-panel border border-auth-border rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}22`, color }}>
              <Icon size={17} />
            </div>
            <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-auth-text text-2xl font-bold mb-1">{value}</p>
            <p className="text-auth-mutedDim text-xs">{delta}</p>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-6 items-start ${selected ? "xl:grid-cols-[1fr_320px]" : ""}`}>
        {/* Table */}
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 flex-wrap gap-3">
            <div className="flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    tab === t.key ? "bg-auth-blue/15 text-auth-text font-semibold" : "text-auth-muted hover:text-auth-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none">
                <option value="all">Rôle : Tous</option>
                <option value="Joueur">Joueur</option>
                <option value="Modérateur">Modérateur</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none">
                <option value="all">Statut : Tous</option>
                <option value="online">En ligne</option>
                <option value="away">Absent</option>
                <option value="offline">Hors ligne</option>
              </select>
              <button
                onClick={() => notify("Filtres avancés — bientôt disponible.")}
                className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-muted hover:text-auth-text transition"
              >
                <Filter size={12} /> Filtres
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-auth-mutedDim text-[10px] uppercase tracking-wide border-y border-auth-border">
                  <th className="text-left px-4 py-2 font-medium">Joueur</th>
                  <th className="text-left px-2 py-2 font-medium">Statut</th>
                  <th className="text-left px-2 py-2 font-medium">Rôle</th>
                  <th className="text-left px-2 py-2 font-medium">Parties</th>
                  <th className="text-left px-2 py-2 font-medium">Score total</th>
                  <th className="text-left px-2 py-2 font-medium">Meilleure série</th>
                  <th className="text-left px-2 py-2 font-medium">Dernière activité</th>
                  <th className="text-left px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`border-b border-auth-border last:border-b-0 cursor-pointer transition ${
                      selectedId === p.id ? "bg-white/5" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: p.color }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-auth-text font-medium text-xs">{p.name}</span>
                            {p.verified && <BadgeCheck size={12} className="text-auth-blue" />}
                          </div>
                          <p className="text-auth-mutedDim text-[11px]">{p.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />
                        <span className="text-auth-muted text-xs">{STATUS_LABEL[p.status]}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          p.role === "Modérateur" ? "bg-auth-purple/20 text-auth-purple" : "bg-white/5 text-auth-muted"
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-auth-text text-xs">{p.games}</td>
                    <td className="px-2 py-3 text-auth-text text-xs font-mono">{p.score.toLocaleString("fr-FR")} pts</td>
                    <td className="px-2 py-3 text-auth-text text-xs">{p.bestStreak} {p.bestStreak >= 20 && "🔥"}</td>
                    <td className="px-2 py-3 text-auth-mutedDim text-xs">{p.lastActive}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2 text-auth-mutedDim">
                        <button onClick={(e) => { e.stopPropagation(); notify("Messages — bientôt disponible."); }} className="hover:text-auth-text transition"><MessageCircle size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }} className="hover:text-auth-text transition"><BarChart3 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Options — bientôt disponible."); }} className="hover:text-auth-text transition"><MoreVertical size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-auth-mutedDim text-xs">
                      Aucun joueur ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-auth-border text-xs text-auth-mutedDim">
            <span>Affichage 1 à {filtered.length} sur 12 485 joueurs</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronLeft size={13} /></button>
              <span className="w-7 h-7 flex items-center justify-center rounded bg-auth-blue text-white font-semibold">1</span>
              {[2, 3].map((n) => (
                <button key={n} onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">{n}</button>
              ))}
              <span>…</span>
              <button onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">1 249</button>
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Fiche joueur</span>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: selected.color }}>
                  {selected.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-auth-text font-semibold">{selected.name}</p>
                    {selected.verified && <BadgeCheck size={14} className="text-auth-blue" />}
                  </div>
                  <p className="text-auth-mutedDim text-xs">{selected.handle}</p>
                  <span
                    className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                      selected.role === "Modérateur" ? "bg-auth-purple/20 text-auth-purple" : "bg-white/5 text-auth-muted"
                    }`}
                  >
                    {selected.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Parties", selected.games],
                  ["Réussite", `${selected.successRate}%`],
                  ["Meilleur score", selected.bestScore],
                  ["Meilleure série", selected.bestStreak],
                  ["Classement", `#${selected.rank}`],
                  ["Bonnes réponses", selected.correctAnswers],
                ].map(([label, value]) => (
                  <div key={label} className="bg-auth-bg border border-auth-border rounded-lg py-2.5">
                    <p className="text-auth-text text-sm font-bold">{value}</p>
                    <p className="text-auth-mutedDim text-[9px] uppercase">{label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-2">Catégories favorites</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.topCategories.map((c) => (
                    <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-auth-blue/15 text-auth-blue">{c}</span>
                  ))}
                </div>
              </div>

              {selected.recentGames.length > 0 && (
                <div>
                  <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-2">Dernières parties</p>
                  <div className="flex flex-col gap-1.5">
                    {selected.recentGames.map((g, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-auth-bg border border-auth-border rounded-lg px-3 py-2">
                        <div>
                          <p className="text-auth-text">{g.category}</p>
                          <p className="text-auth-mutedDim text-[10px]">{g.date} · {g.result}</p>
                        </div>
                        <span className="text-auth-text font-mono">{g.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => notify("Profil — bientôt disponible.")} className="border border-auth-border rounded-lg py-2 text-xs text-auth-text hover:bg-white/5 transition">
                  Voir le profil
                </button>
                <button onClick={() => notify("Historique — bientôt disponible.")} className="border border-auth-border rounded-lg py-2 text-xs text-auth-text hover:bg-white/5 transition">
                  Historique
                </button>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Prendre une mesure de modération contre ${selected.name} ?`)) {
                    notify("Modération — bientôt disponible.");
                  }
                }}
                className="flex items-center justify-center gap-1.5 border border-auth-danger/40 text-auth-danger rounded-lg py-2 text-xs hover:bg-auth-danger/10 transition"
              >
                <ShieldAlert size={13} /> Modérer ce joueur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
