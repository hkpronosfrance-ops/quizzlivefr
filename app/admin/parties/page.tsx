"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  Gamepad2,
  Radio,
  CalendarClock,
  CheckCircle2,
  Eye,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";

type Status = "live" | "scheduled" | "finished" | "draft";

type Party = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  categoryColor: string;
  status: Status;
  date: string;
  time: string;
  questions: number;
  players: number | null;
  spectators: number | null;
  host: string;
};

const STATUS_LABEL: Record<Status, string> = {
  live: "En direct",
  scheduled: "Programmée",
  finished: "Terminée",
  draft: "Brouillon",
};

const STATUS_COLOR: Record<Status, string> = {
  live: "#EF4444",
  scheduled: "#4C6FFF",
  finished: "#22C55E",
  draft: "#6B7086",
};

// Mock catalog — no "parties" backend yet (each live question is created ad hoc
// from Sessions live). Wired for real once a game-catalog table exists.
const PARTIES: Party[] = [
  { id: "QL-89271", title: "Culture G. : Spécial Japon", emoji: "🗾", category: "Culture générale", categoryColor: "#4C6FFF", status: "live", date: "22/05/2025", time: "21:00", questions: 20, players: 823, spectators: 2853, host: "Admin" },
  { id: "QL-89270", title: "Sport Mania : Édition Finale", emoji: "⚽", category: "Sport", categoryColor: "#22C55E", status: "scheduled", date: "22/05/2025", time: "20:00", questions: 20, players: 612, spectators: 1234, host: "Admin" },
  { id: "QL-89269", title: "Cinéma Cultes des années 90", emoji: "🎬", category: "Cinéma", categoryColor: "#9B4DFF", status: "scheduled", date: "22/05/2025", time: "19:00", questions: 20, players: 542, spectators: 1892, host: "Marie D." },
  { id: "QL-89268", title: "Histoire : Les grandes dates", emoji: "📜", category: "Histoire", categoryColor: "#F5A623", status: "scheduled", date: "22/05/2025", time: "18:00", questions: 20, players: 431, spectators: 1532, host: "Thomas L." },
  { id: "QL-89267", title: "Géographie : Tour du monde", emoji: "🌍", category: "Géographie", categoryColor: "#3DDCFF", status: "finished", date: "22/05/2025", time: "17:00", questions: 20, players: 398, spectators: 1128, host: "Admin" },
  { id: "QL-89266", title: "Musique : Années 80", emoji: "🎵", category: "Musique", categoryColor: "#FF3D8E", status: "finished", date: "21/05/2025", time: "21:00", questions: 20, players: 654, spectators: 1840, host: "Julie R." },
  { id: "QL-89265", title: "Science & Nature", emoji: "🔬", category: "Sciences", categoryColor: "#14B8A6", status: "draft", date: "—", time: "—", questions: 20, players: null, spectators: null, host: "Admin" },
  { id: "QL-89264", title: "Spécial Noël : Quiz Festif", emoji: "🎄", category: "Culture générale", categoryColor: "#4C6FFF", status: "finished", date: "20/05/2025", time: "20:00", questions: 20, players: 712, spectators: 2102, host: "Marie D." },
  { id: "QL-89263", title: "Tech & Innovation", emoji: "💻", category: "Technologie", categoryColor: "#6366F1", status: "scheduled", date: "23/05/2025", time: "20:00", questions: 20, players: null, spectators: null, host: "Thomas L." },
  { id: "QL-89262", title: "Animaux : Le règne sauvage", emoji: "🦁", category: "Nature", categoryColor: "#84CC16", status: "finished", date: "19/05/2025", time: "18:00", questions: 20, players: 521, spectators: 1456, host: "Admin" },
];

const UPCOMING = [
  { day: "VEN", date: "23", month: "MAI", title: "Tech & Innovation", time: "20:00", questions: 20 },
  { day: "SAM", date: "24", month: "MAI", title: "Culture Générale : Le Quiz du Week-end", time: "16:00", questions: 20 },
  { day: "DIM", date: "25", month: "MAI", title: "Sport : Légendes du Foot", time: "18:00", questions: 20 },
];

const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "live", label: "En direct" },
  { key: "scheduled", label: "Programmées" },
  { key: "finished", label: "Terminées" },
  { key: "draft", label: "Brouillons" },
];

export default function PartiesPage() {
  const notify = useAdminToast();
  const [tab, setTab] = useState<"all" | Status>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(PARTIES[0].id);

  const categories = useMemo(() => Array.from(new Set(PARTIES.map((p) => p.category))), []);

  const filtered = useMemo(() => {
    return PARTIES.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (category !== "all" && p.category !== category) return false;
      if (search && !`${p.title} ${p.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tab, category, search]);

  const selected = PARTIES.find((p) => p.id === selectedId) ?? PARTIES[0];

  const counts = {
    total: PARTIES.length,
    live: PARTIES.filter((p) => p.status === "live").length,
    scheduled: PARTIES.filter((p) => p.status === "scheduled").length,
    finished: PARTIES.filter((p) => p.status === "finished").length,
  };

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between -mt-2 mb-2">
        <div>
          <h1 className="text-auth-text font-bold text-2xl">Parties</h1>
          <p className="text-auth-muted text-sm">Gérez vos sessions et parties de quiz.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-auth-panel border border-auth-border rounded-lg pl-9 pr-3 py-2 text-sm text-auth-text outline-none focus:border-auth-blue w-52 placeholder:text-auth-mutedDim"
            />
          </div>
          <button
            onClick={() => notify("Filtres avancés — bientôt disponible.")}
            className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3 py-2 text-auth-text text-sm hover:bg-white/5 transition"
          >
            <Filter size={14} /> Filtres
          </button>
          <AdminTopControls />
        </div>
      </div>

      {/* Stat cards — mock, no game-catalog backend yet */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Gamepad2, label: "Parties totales", value: String(counts.total > 0 ? 128 : 0), delta: "+12% vs mois dernier", color: "#9B4DFF" },
          { icon: Radio, label: "En direct", value: String(5), delta: "+25% vs hier", color: "#22C55E" },
          { icon: CalendarClock, label: "Programmées", value: String(18), delta: "+8% vs hier", color: "#4C6FFF" },
          { icon: CheckCircle2, label: "Terminées", value: String(105), delta: "+10% vs mois dernier", color: "#3DDCFF" },
        ].map(({ icon: Icon, label, value, delta, color }) => (
          <div key={label} className="bg-auth-panel border border-auth-border rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}22`, color }}>
              <Icon size={17} />
            </div>
            <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-auth-text text-2xl font-bold mb-1">{value}</p>
            <p className="text-auth-positive text-xs">↗ {delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left: table */}
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-4">
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

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as "all" | Status)}
              className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none"
            >
              <option value="all">Tous statuts</option>
              <option value="live">En direct</option>
              <option value="scheduled">Programmées</option>
              <option value="finished">Terminées</option>
              <option value="draft">Brouillons</option>
            </select>
            <button
              onClick={() => notify("Filtre de date — bientôt disponible.")}
              className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-muted"
            >
              Toutes les dates
            </button>
            <button
              onClick={() => {
                setTab("all");
                setCategory("all");
                setSearch("");
              }}
              className="ml-auto flex items-center gap-1.5 text-auth-muted text-xs hover:text-auth-text transition"
            >
              <RefreshCw size={12} /> Réinitialiser
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-auth-mutedDim text-[10px] uppercase tracking-wide border-y border-auth-border">
                  <th className="text-left px-4 py-2 font-medium">ID Session</th>
                  <th className="text-left px-2 py-2 font-medium">Titre</th>
                  <th className="text-left px-2 py-2 font-medium">Catégorie</th>
                  <th className="text-left px-2 py-2 font-medium">Statut</th>
                  <th className="text-left px-2 py-2 font-medium">Date</th>
                  <th className="text-left px-2 py-2 font-medium">Joueurs</th>
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
                    <td className="px-4 py-3 text-auth-text font-mono text-xs">#{p.id}</td>
                    <td className="px-2 py-3 text-auth-text text-xs">
                      {p.emoji} {p.title}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded"
                        style={{ background: `${p.categoryColor}22`, color: p.categoryColor }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: `${STATUS_COLOR[p.status]}22`, color: STATUS_COLOR[p.status] }}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-auth-muted text-xs">
                      {p.date} {p.time !== "—" && `· ${p.time}`}
                    </td>
                    <td className="px-2 py-3 text-auth-text text-xs">{p.players ?? "—"}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2 text-auth-mutedDim">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }} className="hover:text-auth-text transition">
                          <Eye size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Modifier — bientôt disponible."); }} className="hover:text-auth-text transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Dupliquer — bientôt disponible."); }} className="hover:text-auth-text transition">
                          <Copy size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Suppression — bientôt disponible."); }} className="hover:text-auth-danger transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-auth-mutedDim text-xs">
                      Aucune partie ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-auth-border text-xs text-auth-mutedDim">
            <span>Affichage de {filtered.length} à {filtered.length} sur 128 résultats</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition">
                <ChevronLeft size={13} />
              </button>
              <span className="w-7 h-7 flex items-center justify-center rounded bg-auth-blue text-white font-semibold">1</span>
              {[2, 3].map((n) => (
                <button key={n} onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">
                  {n}
                </button>
              ))}
              <span>…</span>
              <button onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">
                13
              </button>
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: detail panel + upcoming */}
        <div className="flex flex-col gap-4">
          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Détails de la partie</span>
              {selected.status === "live" && (
                <span className="flex items-center gap-1 text-auth-live text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-auth-live animate-pulse" /> EN DIRECT
                </span>
              )}
            </div>

            <div
              className="h-24 flex items-center justify-center text-4xl"
              style={{ background: `linear-gradient(135deg, ${selected.categoryColor}33, #0A0C16)` }}
            >
              {selected.emoji}
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div>
                <p className="text-auth-text font-semibold text-sm">{selected.title}</p>
                <span
                  className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{ background: `${selected.categoryColor}22`, color: selected.categoryColor }}
                >
                  {selected.category}
                </span>
                <p className="text-auth-mutedDim text-[11px] mt-1">ID : #{selected.id}</p>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  ["Date", selected.date],
                  ["Heure", selected.time],
                  ["Questions", String(selected.questions)],
                  ["Joueurs", selected.players !== null ? String(selected.players) : "—"],
                  ["Spectateurs", selected.spectators !== null ? String(selected.spectators) : "—"],
                  ["Hôte", selected.host],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-auth-mutedDim">{label}</span>
                    <span className="text-auth-text font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/admin/sessions-live"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-white text-sm font-semibold"
                style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
              >
                <Play size={14} /> Voir le live
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => notify("Modifier — bientôt disponible.")}
                  className="border border-auth-border rounded-lg py-2 text-xs text-auth-text hover:bg-white/5 transition"
                >
                  Modifier
                </button>
                <button
                  onClick={() => notify("Dupliquer — bientôt disponible.")}
                  className="border border-auth-border rounded-lg py-2 text-xs text-auth-text hover:bg-white/5 transition"
                >
                  Dupliquer
                </button>
              </div>
              {selected.status === "live" && (
                <button
                  onClick={() => notify("Utilise Sessions live pour arrêter la partie en cours.")}
                  className="border border-auth-danger/40 text-auth-danger rounded-lg py-2 text-xs hover:bg-auth-danger/10 transition"
                >
                  Arrêter la partie
                </button>
              )}
            </div>
          </div>

          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Prochaines parties cette semaine</span>
            </div>
            <div className="flex flex-col">
              {UPCOMING.map((u) => (
                <div key={u.title} className="flex items-center gap-3 px-5 py-3 border-b border-auth-border last:border-b-0">
                  <div className="w-10 h-10 rounded-lg bg-auth-bg border border-auth-border flex flex-col items-center justify-center shrink-0">
                    <span className="text-[8px] text-auth-mutedDim font-bold">{u.day}</span>
                    <span className="text-xs text-auth-text font-bold leading-none">{u.date}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-auth-text text-xs font-medium truncate">{u.title}</p>
                    <p className="text-auth-mutedDim text-[10px]">{u.time} · {u.questions} questions</p>
                  </div>
                  <span className="text-[9px] font-bold text-auth-blue bg-auth-blue/15 rounded px-1.5 py-0.5 shrink-0">Programmée</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
