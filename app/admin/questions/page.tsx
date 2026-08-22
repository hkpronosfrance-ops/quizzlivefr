"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  FileText,
  FolderOpen,
  TrendingUp,
  Eye,
  Pencil,
  Copy,
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users2,
  Target,
  Check,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";

type Difficulty = "Facile" | "Moyen" | "Difficile";
type Status = "active" | "draft" | "archived";

type QuestionRow = {
  id: string;
  text: string;
  category: string;
  categoryColor: string;
  difficulty: Difficulty;
  status: Status;
  correct: "a" | "b" | "c" | "d";
  choices: { a: string; b: string; c: string; d: string };
  time: number;
  uses: number;
  successRate: number | null;
  author: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABEL: Record<Status, string> = { active: "Active", draft: "Brouillon", archived: "Archivée" };
const STATUS_COLOR: Record<Status, string> = { active: "#22C55E", draft: "#6B7086", archived: "#EF4444" };
const DIFFICULTY_COLOR: Record<Difficulty, string> = { Facile: "#22C55E", Moyen: "#F5A623", Difficile: "#EF4444" };

// Mock question bank — no per-question CRUD backend yet (Sessions live creates
// questions ad hoc). Wired for real once a question-bank table exists.
const QUESTIONS: QuestionRow[] = [
  { id: "Q-02487", text: "Quelle est la capitale du Japon ?", category: "Culture générale", categoryColor: "#4C6FFF", difficulty: "Facile", status: "active", correct: "b", choices: { a: "Séoul", b: "Tokyo", c: "Pékin", d: "Bangkok" }, time: 15, uses: 1842, successRate: 85.3, author: "Admin", createdAt: "12/04/2024 à 14:28", updatedAt: "18/05/2025 à 09:12" },
  { id: "Q-02486", text: "Qui a réalisé le film Titanic ?", category: "Cinéma", categoryColor: "#9B4DFF", difficulty: "Moyen", status: "active", correct: "c", choices: { a: "Steven Spielberg", b: "Ridley Scott", c: "James Cameron", d: "Christopher Nolan" }, time: 20, uses: 1256, successRate: 72.1, author: "Marie D.", createdAt: "03/02/2024 à 11:05", updatedAt: "02/04/2025 à 16:40" },
  { id: "Q-02485", text: "Combien de continents existe-t-il ?", category: "Géographie", categoryColor: "#3DDCFF", difficulty: "Facile", status: "active", correct: "a", choices: { a: "7", b: "5", c: "6", d: "8" }, time: 15, uses: 1983, successRate: 91.0, author: "Thomas L.", createdAt: "22/01/2024 à 09:50", updatedAt: "10/03/2025 à 13:22" },
  { id: "Q-02484", text: "En quelle année a eu lieu la Révolution française ?", category: "Histoire", categoryColor: "#F5A623", difficulty: "Moyen", status: "active", correct: "b", choices: { a: "1776", b: "1789", c: "1804", d: "1815" }, time: 20, uses: 1412, successRate: 68.7, author: "Admin", createdAt: "15/12/2023 à 17:15", updatedAt: "28/02/2025 à 10:08" },
  { id: "Q-02483", text: "Quelle planète est connue comme la planète rouge ?", category: "Sciences", categoryColor: "#14B8A6", difficulty: "Facile", status: "active", correct: "a", choices: { a: "Mars", b: "Vénus", c: "Jupiter", d: "Saturne" }, time: 15, uses: 1671, successRate: 87.2, author: "Julie R.", createdAt: "09/11/2023 à 08:40", updatedAt: "05/01/2025 à 12:00" },
  { id: "Q-02482", text: "De quel groupe est issu le chanteur Freddie Mercury ?", category: "Musique", categoryColor: "#FF3D8E", difficulty: "Moyen", status: "active", correct: "c", choices: { a: "The Who", b: "Led Zeppelin", c: "Queen", d: "Pink Floyd" }, time: 20, uses: 1233, successRate: 66.4, author: "Admin", createdAt: "30/10/2023 à 19:22", updatedAt: "14/12/2024 à 15:55" },
  { id: "Q-02481", text: "Quel langage est principalement utilisé pour le développement web ?", category: "Technologie", categoryColor: "#6366F1", difficulty: "Facile", status: "active", correct: "b", choices: { a: "Python", b: "JavaScript", c: "C++", d: "Swift" }, time: 15, uses: 1598, successRate: 79.5, author: "Thomas L.", createdAt: "18/09/2023 à 10:10", updatedAt: "01/12/2024 à 09:30" },
  { id: "Q-02480", text: "Quel est le plus haut sommet du monde ?", category: "Géographie", categoryColor: "#3DDCFF", difficulty: "Difficile", status: "draft", correct: "d", choices: { a: "K2", b: "Kilimandjaro", c: "Mont Blanc", d: "Everest" }, time: 30, uses: 0, successRate: null, author: "Marie D.", createdAt: "02/09/2023 à 14:48", updatedAt: "02/09/2023 à 14:48" },
  { id: "Q-02479", text: "Dans quel sport utilise-t-on un « birdie » ?", category: "Sport", categoryColor: "#22C55E", difficulty: "Moyen", status: "active", correct: "b", choices: { a: "Tennis", b: "Golf", c: "Badminton", d: "Squash" }, time: 20, uses: 894, successRate: 61.8, author: "Admin", createdAt: "20/07/2023 à 16:02", updatedAt: "19/10/2024 à 11:47" },
  { id: "Q-02478", text: "Quel inventeur est connu pour l'ampoule électrique ?", category: "Sciences", categoryColor: "#14B8A6", difficulty: "Facile", status: "archived", correct: "c", choices: { a: "Nikola Tesla", b: "Alexander Bell", c: "Thomas Edison", d: "Benjamin Franklin" }, time: 15, uses: 623, successRate: 54.2, author: "Julie R.", createdAt: "11/06/2023 à 08:33", updatedAt: "30/08/2024 à 17:19" },
];

const TOP_CATEGORIES = [
  { name: "Culture générale", pct: 28.4, count: 7045, color: "#4C6FFF" },
  { name: "Sciences", pct: 17.6, count: 4360, color: "#14B8A6" },
  { name: "Histoire", pct: 12.9, count: 3196, color: "#F5A623" },
  { name: "Géographie", pct: 11.8, count: 2917, color: "#3DDCFF" },
  { name: "Sport", pct: 9.3, count: 2309, color: "#22C55E" },
];

const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "active", label: "Actives" },
  { key: "draft", label: "Brouillons" },
  { key: "archived", label: "Archivées" },
];

export default function QuestionsPage() {
  const notify = useAdminToast();
  const [tab, setTab] = useState<"all" | Status>("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(QUESTIONS[0].id);

  const categories = useMemo(() => Array.from(new Set(QUESTIONS.map((q) => q.category))), []);

  const filtered = useMemo(() => {
    return QUESTIONS.filter((q) => {
      if (tab !== "all" && q.status !== tab) return false;
      if (category !== "all" && q.category !== category) return false;
      if (difficulty !== "all" && q.difficulty !== difficulty) return false;
      if (search && !`${q.text} ${q.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tab, category, difficulty, search]);

  const selected = QUESTIONS.find((q) => q.id === selectedId) ?? QUESTIONS[0];
  const CHOICE_LABELS = ["a", "b", "c", "d"] as const;

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between -mt-2 mb-2">
        <div>
          <h1 className="text-auth-text font-bold text-2xl">Questions</h1>
          <p className="text-auth-muted text-sm">Gérez votre banque de questions de quiz.</p>
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

      {/* Stat cards — mock */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: HelpCircle, label: "Questions totales", value: "2 487", delta: "↑ 8.2% vs mois dernier", color: "#9B4DFF" },
          { icon: CheckCircle2, label: "Actives", value: "2 016", delta: "↑ 6.5% vs mois dernier", color: "#22C55E" },
          { icon: FileText, label: "Brouillons", value: "321", delta: "↓ 2.1% vs mois dernier", color: "#F5A623", deltaColor: "#EF4444" },
          { icon: FolderOpen, label: "Catégories", value: "28", delta: "Aucune évolution", color: "#4C6FFF", deltaColor: "#6B7086" },
          { icon: TrendingUp, label: "Taux de réussite moyen", value: "71,4%", delta: "↑ 3.2 pts vs mois dernier", color: "#3DDCFF" },
        ].map(({ icon: Icon, label, value, delta, color, deltaColor }) => (
          <div key={label} className="bg-auth-panel border border-auth-border rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}22`, color }}>
              <Icon size={17} />
            </div>
            <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">{label}</p>
            <p className="text-auth-text text-2xl font-bold mb-1">{value}</p>
            <p className="text-xs" style={{ color: deltaColor ?? "#22C55E" }}>{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left: table */}
        <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
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

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none">
              <option value="all">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none">
              <option value="all">Toutes difficultés</option>
              <option value="Facile">Facile</option>
              <option value="Moyen">Moyen</option>
              <option value="Difficile">Difficile</option>
            </select>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as "all" | Status)}
              className="bg-auth-bg border border-auth-border rounded-lg px-3 py-1.5 text-xs text-auth-text outline-none"
            >
              <option value="all">Tous statuts</option>
              <option value="active">Active</option>
              <option value="draft">Brouillon</option>
              <option value="archived">Archivée</option>
            </select>
            <button
              onClick={() => {
                setTab("all");
                setCategory("all");
                setDifficulty("all");
                setSearch("");
              }}
              className="ml-auto flex items-center gap-1.5 text-auth-muted text-xs hover:text-auth-text transition"
            >
              <RefreshCw size={12} /> Réinitialiser
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-auth-mutedDim text-[10px] uppercase tracking-wide border-y border-auth-border">
                  <th className="text-left px-4 py-2 font-medium">ID</th>
                  <th className="text-left px-2 py-2 font-medium">Question</th>
                  <th className="text-left px-2 py-2 font-medium">Catégorie</th>
                  <th className="text-left px-2 py-2 font-medium">Difficulté</th>
                  <th className="text-left px-2 py-2 font-medium">Statut</th>
                  <th className="text-left px-2 py-2 font-medium">Réussite</th>
                  <th className="text-left px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={`border-b border-auth-border last:border-b-0 cursor-pointer transition ${
                      selectedId === q.id ? "bg-white/5" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-4 py-3 text-auth-text font-mono text-xs">#{q.id}</td>
                    <td className="px-2 py-3 text-auth-text text-xs max-w-xs">{q.text}</td>
                    <td className="px-2 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: `${q.categoryColor}22`, color: q.categoryColor }}>
                        {q.category}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DIFFICULTY_COLOR[q.difficulty]}22`, color: DIFFICULTY_COLOR[q.difficulty] }}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${STATUS_COLOR[q.status]}22`, color: STATUS_COLOR[q.status] }}>
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-xs font-mono" style={{ color: q.successRate === null ? "#6B7086" : q.successRate >= 75 ? "#22C55E" : q.successRate >= 50 ? "#F5A623" : "#EF4444" }}>
                      {q.successRate !== null ? `${q.successRate}%` : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2 text-auth-mutedDim">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedId(q.id); }} className="hover:text-auth-text transition"><Eye size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Modifier — bientôt disponible."); }} className="hover:text-auth-text transition"><Pencil size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Dupliquer — bientôt disponible."); }} className="hover:text-auth-text transition"><Copy size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); notify("Archiver — bientôt disponible."); }} className="hover:text-auth-danger transition"><Archive size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-auth-mutedDim text-xs">
                      Aucune question ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-auth-border text-xs text-auth-mutedDim">
            <span>Affichage de 1 à {filtered.length} sur 2 487 questions</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronLeft size={13} /></button>
              <span className="w-7 h-7 flex items-center justify-center rounded bg-auth-blue text-white font-semibold">1</span>
              {[2, 3].map((n) => (
                <button key={n} onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">{n}</button>
              ))}
              <span>…</span>
              <button onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">249</button>
              <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>

        {/* Right: detail panel + top categories */}
        <div className="flex flex-col gap-4">
          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Détails de la question</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${STATUS_COLOR[selected.status]}22`, color: STATUS_COLOR[selected.status] }}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-auth-text font-semibold text-sm mb-2">{selected.text}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: `${selected.categoryColor}22`, color: selected.categoryColor }}>
                    {selected.category}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${DIFFICULTY_COLOR[selected.difficulty]}22`, color: DIFFICULTY_COLOR[selected.difficulty] }}>
                    {selected.difficulty}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-auth-bg border border-auth-border rounded-lg py-2.5">
                  <Clock size={14} className="text-auth-mutedDim mx-auto mb-1" />
                  <p className="text-auth-text text-sm font-bold">{selected.time} s</p>
                  <p className="text-auth-mutedDim text-[9px] uppercase">Temps</p>
                </div>
                <div className="bg-auth-bg border border-auth-border rounded-lg py-2.5">
                  <Users2 size={14} className="text-auth-mutedDim mx-auto mb-1" />
                  <p className="text-auth-text text-sm font-bold">{selected.uses}</p>
                  <p className="text-auth-mutedDim text-[9px] uppercase">Utilisations</p>
                </div>
                <div className="bg-auth-bg border border-auth-border rounded-lg py-2.5">
                  <Target size={14} className="text-auth-mutedDim mx-auto mb-1" />
                  <p className="text-auth-text text-sm font-bold">{selected.successRate !== null ? `${selected.successRate}%` : "—"}</p>
                  <p className="text-auth-mutedDim text-[9px] uppercase">Réussite</p>
                </div>
              </div>

              <div>
                <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-2">Réponses</p>
                <div className="flex flex-col gap-1.5">
                  {CHOICE_LABELS.map((c) => {
                    const isCorrect = selected.correct === c;
                    return (
                      <div
                        key={c}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                          isCorrect ? "border-auth-positive bg-auth-positive/10" : "border-auth-border bg-auth-bg"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-auth-text">
                            {c.toUpperCase()}
                          </span>
                          <span className="text-auth-text">{selected.choices[c]}</span>
                        </div>
                        {isCorrect && (
                          <span className="w-4 h-4 rounded-full bg-auth-positive flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  ["Auteur", selected.author],
                  ["Créé le", selected.createdAt],
                  ["Modifiée le", selected.updatedAt],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-auth-mutedDim">{label}</span>
                    <span className="text-auth-text font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => notify("Modifier — bientôt disponible.")}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-white text-sm font-semibold"
                style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
              >
                <Pencil size={14} /> Modifier
              </button>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => notify("Dupliquer — bientôt disponible.")} className="border border-auth-border rounded-lg py-2 text-xs text-auth-text hover:bg-white/5 transition">
                  Dupliquer
                </button>
                <button onClick={() => notify("Archivage — bientôt disponible.")} className="border border-auth-danger/40 text-auth-danger rounded-lg py-2 text-xs hover:bg-auth-danger/10 transition">
                  Archiver
                </button>
              </div>
            </div>
          </div>

          <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-auth-border">
              <span className="text-auth-text font-bold text-xs uppercase tracking-wide">Catégories les plus utilisées</span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {TOP_CATEGORIES.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-auth-text">{c.name}</span>
                    <span className="text-auth-mutedDim">{c.pct}% · {c.count.toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-auth-bg overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct * 2.5}%`, background: c.color }} />
                  </div>
                </div>
              ))}
              <button
                onClick={() => notify("Catégories — bientôt disponible.")}
                className="text-auth-blue text-xs text-left hover:underline mt-1"
              >
                Voir toutes les catégories →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
