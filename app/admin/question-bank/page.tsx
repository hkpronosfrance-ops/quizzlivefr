"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpDown, Check, Copy, Database, Edit3, Eye, FileQuestion,
  Filter, FolderOpen, Plus, RefreshCw, Search, Target, Trash2, Upload, X,
  type LucideIcon,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type ChoiceKey = "a" | "b" | "c" | "d";
type Difficulty = "easy" | "medium" | "hard";
type StatusFilter = "all" | "active" | "inactive";
type UsageFilter = "all" | "used" | "unused";
type SortMode = "recent" | "oldest" | "az" | "difficulty" | "usage";

type CategoryRow = { id: string; name: string; color: string; icon: string; is_active: boolean };
type BankQuestion = {
  id: string; category_id: string | null; text: string; choice_a: string; choice_b: string;
  choice_c: string | null; choice_d: string | null; correct_choice: ChoiceKey; difficulty: Difficulty;
  duration_seconds: number; is_active: boolean; tags: string[]; source: string; times_used: number;
  last_used_at: string | null; created_at: string; updated_at: string;
};
type QuestionForm = {
  text: string; choice_a: string; choice_b: string; choice_c: string; choice_d: string;
  correct_choice: ChoiceKey; category_id: string; difficulty: Difficulty; duration_seconds: number; is_active: boolean;
};

const EMPTY_FORM: QuestionForm = { text: "", choice_a: "", choice_b: "", choice_c: "", choice_d: "", correct_choice: "a", category_id: "", difficulty: "medium", duration_seconds: 30, is_active: true };
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
const DIFFICULTY_COLOR: Record<Difficulty, string> = { easy: "#22C55E", medium: "#F59E0B", hard: "#EF4444" };

function MetricCard({ label, value, helper, icon: Icon, color }: { label: string; value: string; helper: string; icon: LucideIcon; color: string }) {
  return <div className="rounded-xl border border-auth-border bg-auth-panel p-4 min-w-0"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}><Icon size={18} /></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-auth-mutedDim truncate">{label}</p><p className="mt-1 text-2xl font-bold text-auth-text">{value}</p><p className="mt-1 text-[11px] text-auth-muted">{helper}</p></div></div></div>;
}
function formatDate(value: string | null) { if (!value) return "Jamais"; return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function shortId(id: string) { return `#${id.slice(0, 8).toUpperCase()}`; }

export default function QuestionBankPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [{ data: bankRows, error: bankError }, { data: categoryRows }] = await Promise.all([
      db.from("question_bank").select("id,category_id,text,choice_a,choice_b,choice_c,choice_d,correct_choice,difficulty,duration_seconds,is_active,tags,source,times_used,last_used_at,created_at,updated_at").order("updated_at", { ascending: false }).limit(5000),
      db.from("categories").select("id,name,color,icon,is_active").order("name", { ascending: true }),
    ]);
    if (bankError) notify(`Impossible de charger la banque : ${bankError.message}`);
    const next = (bankRows ?? []) as BankQuestion[];
    setQuestions(next); setCategories((categoryRows ?? []) as CategoryRow[]);
    setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    setLastUpdated(new Date()); setLoading(false);
  }

  useEffect(() => {
    loadData();
    const channel = db.channel("question-bank-v3").on("postgres_changes", { event: "*", schema: "public", table: "question_bank" }, loadData).on("postgres_changes", { event: "*", schema: "public", table: "categories" }, loadData).subscribe();
    return () => { db.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const activeCategories = categories.filter((item) => item.is_active).length;
  const stats = useMemo(() => ({ total: questions.length, active: questions.filter((q) => q.is_active).length, used: questions.filter((q) => q.times_used > 0).length, categories: new Set(questions.map((q) => q.category_id).filter(Boolean)).size }), [questions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = questions.filter((item) => {
      if (statusFilter === "active" && !item.is_active) return false;
      if (statusFilter === "inactive" && item.is_active) return false;
      if (usageFilter === "used" && item.times_used === 0) return false;
      if (usageFilter === "unused" && item.times_used > 0) return false;
      if (categoryFilter !== "all" && item.category_id !== categoryFilter) return false;
      if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter) return false;
      if (!q) return true;
      const categoryName = item.category_id ? categoryMap.get(item.category_id)?.name ?? "" : "";
      return `${item.text} ${item.choice_a} ${item.choice_b} ${item.choice_c ?? ""} ${item.choice_d ?? ""} ${categoryName} ${item.id}`.toLowerCase().includes(q);
    });
    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
      if (sortMode === "az") return a.text.localeCompare(b.text, "fr");
      if (sortMode === "difficulty") return ({ easy: 0, medium: 1, hard: 2 }[a.difficulty] - { easy: 0, medium: 1, hard: 2 }[b.difficulty]);
      if (sortMode === "usage") return b.times_used - a.times_used;
      return +new Date(b.updated_at) - +new Date(a.updated_at);
    });
  }, [questions, statusFilter, usageFilter, categoryFilter, difficultyFilter, search, categoryMap, sortMode]);

  const selected = questions.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const filtersActive = Boolean(search || categoryFilter !== "all" || difficultyFilter !== "all" || statusFilter !== "all" || usageFilter !== "all" || sortMode !== "recent");
  function resetFilters() { setSearch(""); setCategoryFilter("all"); setDifficultyFilter("all"); setStatusFilter("all"); setUsageFilter("all"); setSortMode("recent"); }
  function openCreate() { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(question: BankQuestion) { setEditingId(question.id); setForm({ text: question.text, choice_a: question.choice_a, choice_b: question.choice_b, choice_c: question.choice_c ?? "", choice_d: question.choice_d ?? "", correct_choice: question.correct_choice, category_id: question.category_id ?? "", difficulty: question.difficulty, duration_seconds: question.duration_seconds, is_active: question.is_active }); setModalOpen(true); }

  async function saveQuestion() {
    const text = form.text.trim(), a = form.choice_a.trim(), b = form.choice_b.trim(), c = form.choice_c.trim(), d = form.choice_d.trim();
    if (!text || !a || !b) return notify("La question et les réponses A et B sont obligatoires.");
    if ((form.correct_choice === "c" && !c) || (form.correct_choice === "d" && !d)) return notify("La bonne réponse sélectionnée doit contenir du texte.");
    setSaving(true);
    const payload = { text, choice_a: a, choice_b: b, choice_c: c || null, choice_d: d || null, correct_choice: form.correct_choice, category_id: form.category_id || null, difficulty: form.difficulty, duration_seconds: Math.min(300, Math.max(5, Number(form.duration_seconds) || 30)), is_active: form.is_active, updated_at: new Date().toISOString() };
    const result = editingId ? await db.from("question_bank").update(payload).eq("id", editingId) : await db.from("question_bank").insert({ ...payload, source: "manual" });
    setSaving(false); if (result.error) return notify(`Enregistrement impossible : ${result.error.message}`);
    setModalOpen(false); notify(editingId ? "Question mise à jour." : "Question ajoutée à la banque."); await loadData();
  }
  async function toggleActive(question: BankQuestion) { const { error } = await db.from("question_bank").update({ is_active: !question.is_active, updated_at: new Date().toISOString() }).eq("id", question.id); if (error) return notify(`Modification impossible : ${error.message}`); notify(question.is_active ? "Question désactivée." : "Question activée."); await loadData(); }
  async function duplicateQuestion(question: BankQuestion) { const { error } = await db.from("question_bank").insert({ category_id: question.category_id, text: `${question.text} (copie)`, choice_a: question.choice_a, choice_b: question.choice_b, choice_c: question.choice_c, choice_d: question.choice_d, correct_choice: question.correct_choice, difficulty: question.difficulty, duration_seconds: question.duration_seconds, is_active: false, tags: question.tags, source: "duplicate" }); if (error) return notify(`Duplication impossible : ${error.message}`); notify("Question dupliquée en version désactivée."); await loadData(); }
  async function deleteQuestion(question: BankQuestion) { if (!window.confirm(`Supprimer définitivement « ${question.text} » ?`)) return; const { error } = await db.from("question_bank").delete().eq("id", question.id); if (error) return notify(`Suppression impossible : ${error.message}`); notify("Question supprimée de la banque."); await loadData(); }

  const selectClass = "h-9 bg-auth-bg border border-auth-border rounded-lg px-3 text-xs text-auth-text outline-none hover:border-white/15 focus:border-auth-blue transition";

  return <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
    <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div><h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Banque de questions</h1><p className="text-sm text-auth-muted mt-1">Préparez et organisez votre catalogue de questions réutilisables pour vos prochaines sessions.</p></div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Question, réponse ou ID..." className="w-60 rounded-lg border border-auth-border bg-auth-panel py-2.5 pl-9 pr-3 text-xs text-auth-text outline-none placeholder:text-auth-mutedDim focus:border-auth-blue" /></div>
        <button onClick={() => notify("L’import CSV sera relié à la page Imports / Exports lors de la prochaine étape.")} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition"><Upload size={14} /> Importer</button>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 transition"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg,#4C6FFF 0%,#9B4DFF 52%,#FF3D8E 100%)" }}><Plus size={15} /> Nouvelle question</button>
        <div className="hidden xl:block h-8 w-px bg-auth-border mx-1" /><AdminTopControls />
      </div>
    </header>

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard label="Questions totales" value={stats.total.toLocaleString("fr-FR")} helper="Questions enregistrées dans la banque" icon={Database} color="#9B4DFF" />
      <MetricCard label="Actives" value={stats.active.toLocaleString("fr-FR")} helper="Disponibles pour une future session" icon={Activity} color="#22C55E" />
      <MetricCard label="Déjà utilisées" value={stats.used.toLocaleString("fr-FR")} helper="Lancées au moins une fois" icon={Target} color="#4C6FFF" />
      <MetricCard label="Catégories utilisées" value={`${stats.categories} / ${activeCategories}`} helper="Catégories représentées dans la banque" icon={FolderOpen} color="#F59E0B" />
    </section>

    <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
        <div className="px-4 py-3.5 border-b border-auth-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">{([['all','Toutes'],['active','Actives'],['inactive','Désactivées']] as Array<[StatusFilter,string]>).map(([key,label]) => <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === key ? "bg-auth-blue/15 text-auth-text" : "text-auth-muted hover:text-auth-text"}`}>{label}<span className="ml-1.5 text-[9px] text-auth-mutedDim">{key === 'all' ? questions.length : key === 'active' ? stats.active : questions.length - stats.active}</span></button>)}</div>
          <div className="text-[10px] text-auth-mutedDim">{lastUpdated ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement…"}</div>
        </div>

        <div className="px-4 py-3 border-b border-auth-border flex flex-wrap items-center gap-2 bg-black/[0.06]">
          <div className="w-8 h-8 rounded-lg border border-auth-border bg-auth-bg flex items-center justify-center text-auth-mutedDim"><Filter size={13} /></div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}><option value="all">Toutes les catégories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className={selectClass}><option value="all">Toutes les difficultés</option><option value="easy">Facile</option><option value="medium">Moyen</option><option value="hard">Difficile</option></select>
          <select value={usageFilter} onChange={(e) => setUsageFilter(e.target.value as UsageFilter)} className={selectClass}><option value="all">Toutes les utilisations</option><option value="unused">Jamais utilisée</option><option value="used">Déjà utilisée</option></select>
          <div className="relative"><ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim pointer-events-none" /><select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className={`${selectClass} pl-8`}><option value="recent">Plus récentes</option><option value="oldest">Plus anciennes</option><option value="az">A → Z</option><option value="difficulty">Par difficulté</option><option value="usage">Plus utilisées</option></select></div>
          <span className="text-[11px] text-auth-muted ml-1">{filtered.length} question{filtered.length > 1 ? "s" : ""}</span>
          {filtersActive && <button onClick={resetFilters} className="ml-auto text-[11px] text-auth-blue hover:text-auth-text transition">Réinitialiser</button>}
        </div>

        {loading && questions.length === 0 ? <div className="py-14 text-center text-sm text-auth-muted">Chargement de la banque de questions…</div> : filtered.length === 0 ? <div className="px-5 py-12 flex flex-col items-center justify-center text-center min-h-[250px]">
          <div className="w-12 h-12 rounded-xl border border-auth-blue/20 bg-auth-blue/5 flex items-center justify-center mb-3"><FileQuestion size={20} className="text-auth-blue" /></div>
          <p className="text-sm font-semibold text-auth-text">{questions.length ? "Aucune question trouvée" : "Votre banque est prête"}</p>
          <p className="text-[11px] text-auth-muted mt-1 max-w-md leading-5">{questions.length ? "Aucune question ne correspond aux filtres actuels." : "Ajoutez une question manuellement ou importez votre catalogue pour commencer à préparer vos prochaines sessions."}</p>
          {!questions.length && <div className="mt-4 flex items-center gap-2"><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg,#4C6FFF 0%,#9B4DFF 55%,#FF3D8E 100%)" }}><Plus size={14} /> Ajouter une question</button><button onClick={() => notify("L’import CSV sera relié à Imports / Exports.")} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-bg px-4 py-2 text-xs font-semibold text-auth-text hover:bg-white/5"><Upload size={14} /> Importer un CSV</button></div>}
        </div> : <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left table-fixed"><colgroup><col className="w-[105px]" /><col /><col className="w-[150px]" /><col className="w-[105px]" /><col className="w-[80px]" /><col className="w-[90px]" /><col className="w-[95px]" /><col className="w-[120px]" /></colgroup><thead className="bg-black/10 border-b border-auth-border"><tr className="text-[9px] uppercase tracking-[0.16em] text-auth-mutedDim"><th className="px-4 py-3">ID</th><th className="px-4 py-3">Question</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">Difficulté</th><th className="px-4 py-3">Bonne</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Utilisations</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((question) => { const category = question.category_id ? categoryMap.get(question.category_id) : null; const isSelected = selected?.id === question.id; return <tr key={question.id} onClick={() => setSelectedId(question.id)} className={`border-b border-auth-border/80 cursor-pointer transition ${isSelected ? "bg-white/[0.045]" : "hover:bg-white/[0.025]"}`}><td className="px-4 py-3 text-[11px] font-bold text-auth-text">{shortId(question.id)}</td><td className="px-4 py-3"><p className="text-xs font-semibold text-auth-text truncate">{question.text}</p><p className="text-[10px] text-auth-muted mt-0.5">{question.duration_seconds}s · {question.source === "manual" ? "Manuelle" : question.source === "duplicate" ? "Copie" : question.source}</p></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[11px] text-auth-muted"><span className="w-2 h-2 rounded-full" style={{ background: category?.color ?? "#6B7086" }} />{category?.name ?? "Sans catégorie"}</span></td><td className="px-4 py-3"><span className="px-2 py-1 rounded-md text-[10px] font-bold" style={{ color: DIFFICULTY_COLOR[question.difficulty], background: `${DIFFICULTY_COLOR[question.difficulty]}14` }}>{DIFFICULTY_LABEL[question.difficulty]}</span></td><td className="px-4 py-3"><span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase">{question.correct_choice}</span></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase ${question.is_active ? "text-green-400 bg-green-500/10" : "text-auth-muted bg-white/5"}`}>{question.is_active ? "Active" : "Off"}</span></td><td className="px-4 py-3 text-xs font-semibold text-auth-text">{question.times_used}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}><button title="Voir" onClick={() => setSelectedId(question.id)} className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text"><Eye size={13} /></button><button title="Modifier" onClick={() => openEdit(question)} className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-blue"><Edit3 size={13} /></button><button title="Dupliquer" onClick={() => duplicateQuestion(question)} className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text"><Copy size={13} /></button></div></td></tr>; })}</tbody></table></div>}
        <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-auth-mutedDim"><span>{filtered.length} affichée{filtered.length > 1 ? "s" : ""} sur {questions.length}</span><span>Catalogue réutilisable QuizzLiveFR</span></div>
      </div>

      <aside className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden sticky top-5">
        <div className="px-4 py-3.5 border-b border-auth-border flex items-center justify-between"><div><h2 className="text-sm font-bold text-auth-text">Détails de la question</h2><p className="text-[10px] text-auth-muted mt-0.5">Aperçu du catalogue</p></div>{selected && <span className={`px-2 py-1 rounded-md text-[9px] font-bold ${selected.is_active ? "text-green-400 bg-green-500/10" : "text-auth-muted bg-white/5"}`}>{selected.is_active ? "ACTIVE" : "DÉSACTIVÉE"}</span>}</div>
        {!selected ? <div className="p-8 text-center"><Database size={22} className="mx-auto text-auth-mutedDim mb-2" /><p className="text-xs font-semibold text-auth-text">Aucune question sélectionnée</p><p className="text-[10px] text-auth-muted mt-1">Sélectionnez une ligne pour afficher son aperçu.</p></div> : <div className="p-4 space-y-4">
          <div><p className="text-sm font-bold text-auth-text leading-5">{selected.text}</p><p className="text-[10px] text-auth-mutedDim mt-1">{shortId(selected.id)}</p></div>
          <div className="grid grid-cols-3 gap-2"><div className="rounded-lg border border-auth-border bg-auth-bg p-2.5 text-center"><p className="text-base font-bold text-auth-text">{selected.duration_seconds}s</p><p className="text-[9px] uppercase text-auth-mutedDim">Temps</p></div><div className="rounded-lg border border-auth-border bg-auth-bg p-2.5 text-center"><p className="text-base font-bold text-auth-text">{selected.times_used}</p><p className="text-[9px] uppercase text-auth-mutedDim">Utilisations</p></div><div className="rounded-lg border border-auth-border bg-auth-bg p-2.5 text-center"><p className="text-sm font-bold" style={{ color: DIFFICULTY_COLOR[selected.difficulty] }}>{DIFFICULTY_LABEL[selected.difficulty]}</p><p className="text-[9px] uppercase text-auth-mutedDim">Niveau</p></div></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-auth-mutedDim mb-2">Réponses</p><div className="space-y-2">{(["a","b","c","d"] as ChoiceKey[]).map((key) => { const value = selected[`choice_${key}` as keyof BankQuestion] as string | null; if (!value) return null; const correct = selected.correct_choice === key; return <div key={key} className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 ${correct ? "border-green-500/40 bg-green-500/[0.07]" : "border-auth-border bg-auth-bg"}`}><span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold uppercase ${correct ? "bg-green-500/15 text-green-400" : "bg-white/5 text-auth-muted"}`}>{key}</span><span className="text-[11px] text-auth-text flex-1">{value}</span>{correct && <Check size={13} className="text-green-400" />}</div>; })}</div></div>
          <div className="space-y-2 text-[10px]"><div className="flex justify-between gap-3"><span className="text-auth-muted">Catégorie</span><span className="text-auth-text font-semibold">{selected.category_id ? categoryMap.get(selected.category_id)?.name ?? "Inconnue" : "Sans catégorie"}</span></div><div className="flex justify-between"><span className="text-auth-muted">Créée le</span><span className="text-auth-text font-semibold">{formatDate(selected.created_at)}</span></div><div className="flex justify-between"><span className="text-auth-muted">Dernière utilisation</span><span className="text-auth-text font-semibold">{formatDate(selected.last_used_at)}</span></div></div>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => openEdit(selected)} className="rounded-lg border border-auth-border bg-auth-bg py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5">Modifier</button><button onClick={() => duplicateQuestion(selected)} className="rounded-lg border border-auth-border bg-auth-bg py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5">Dupliquer</button><button onClick={() => toggleActive(selected)} className="rounded-lg border border-auth-border bg-auth-bg py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5 col-span-2">{selected.is_active ? "Désactiver" : "Activer"}</button><button onClick={() => deleteQuestion(selected)} className="rounded-lg border border-red-500/30 bg-red-500/5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 col-span-2"><Trash2 size={13} className="inline mr-1.5" />Supprimer</button></div>
        </div>}
      </aside>
    </section>

    {modalOpen && <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-2xl rounded-2xl border border-auth-border bg-auth-panel shadow-2xl overflow-hidden"><div className="px-5 py-4 border-b border-auth-border flex items-center justify-between"><div><h2 className="text-base font-bold text-auth-text">{editingId ? "Modifier la question" : "Nouvelle question"}</h2><p className="text-[10px] text-auth-muted mt-0.5">Enregistrée dans la banque réutilisable</p></div><button onClick={() => setModalOpen(false)} className="text-auth-muted hover:text-auth-text"><X size={18} /></button></div><div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto"><div><label className="text-[10px] uppercase font-bold text-auth-mutedDim">Question</label><textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} className="mt-1.5 w-full rounded-lg border border-auth-border bg-auth-bg p-3 text-sm text-auth-text outline-none focus:border-auth-blue" /></div><div className="grid sm:grid-cols-2 gap-3">{(["a","b","c","d"] as ChoiceKey[]).map((key) => <div key={key}><label className="text-[10px] uppercase font-bold text-auth-mutedDim">Réponse {key.toUpperCase()}{(key === "a" || key === "b") ? " *" : ""}</label><div className="mt-1.5 flex gap-2"><button type="button" onClick={() => setForm((f) => ({ ...f, correct_choice: key }))} className={`w-9 rounded-lg border text-[10px] font-bold uppercase ${form.correct_choice === key ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-auth-border bg-auth-bg text-auth-muted"}`}>{key}</button><input value={form[`choice_${key}` as keyof QuestionForm] as string} onChange={(e) => setForm((f) => ({ ...f, [`choice_${key}`]: e.target.value }))} className="flex-1 min-w-0 rounded-lg border border-auth-border bg-auth-bg px-3 py-2.5 text-xs text-auth-text outline-none focus:border-auth-blue" /></div></div>)}</div><div className="grid sm:grid-cols-3 gap-3"><div><label className="text-[10px] uppercase font-bold text-auth-mutedDim">Catégorie</label><select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="mt-1.5 w-full bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5 text-xs text-auth-text"><option value="">Sans catégorie</option>{categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-[10px] uppercase font-bold text-auth-mutedDim">Difficulté</label><select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))} className="mt-1.5 w-full bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5 text-xs text-auth-text"><option value="easy">Facile</option><option value="medium">Moyen</option><option value="hard">Difficile</option></select></div><div><label className="text-[10px] uppercase font-bold text-auth-mutedDim">Durée</label><input type="number" min={5} max={300} value={form.duration_seconds} onChange={(e) => setForm((f) => ({ ...f, duration_seconds: Number(e.target.value) }))} className="mt-1.5 w-full bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5 text-xs text-auth-text" /></div></div><label className="flex items-center gap-3 rounded-lg border border-auth-border bg-auth-bg p-3 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /><div><p className="text-xs font-semibold text-auth-text">Question active</p><p className="text-[10px] text-auth-muted">Disponible pour les prochaines sessions.</p></div></label></div><div className="px-5 py-4 border-t border-auth-border flex justify-end gap-2"><button onClick={() => setModalOpen(false)} className="rounded-lg border border-auth-border px-4 py-2.5 text-xs font-semibold text-auth-muted hover:text-auth-text">Annuler</button><button onClick={saveQuestion} disabled={saving} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#4C6FFF,#9B4DFF,#FF3D8E)" }}>{saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Ajouter à la banque"}</button></div></div></div>}
  </div>;
}
