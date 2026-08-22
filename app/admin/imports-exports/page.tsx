"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileUp,
  FolderOpen,
  History,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type Category = { id: string; name: string };
type ParsedQuestion = {
  text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string | null;
  choice_d: string | null;
  correct_choice: "a" | "b" | "c" | "d";
  category_id: string | null;
  category_name: string;
  difficulty: "easy" | "medium" | "hard";
  duration_seconds: number;
  is_active: boolean;
  source: string;
};
type PreviewRow = {
  line: number;
  valid: boolean;
  error: string;
  question?: ParsedQuestion;
  duplicate?: "bank" | "file";
  duplicateId?: string;
};
type DuplicateMode = "skip" | "replace" | "import";
type ExistingQuestion = { id: string; text: string };
type ImportHistory = {
  id: string;
  file_name: string;
  mode: DuplicateMode;
  total_rows: number;
  added_count: number;
  replaced_count: number;
  ignored_count: number;
  error_count: number;
  created_at: string;
};

const EXPECTED = [
  "question",
  "reponse_a",
  "reponse_b",
  "reponse_c",
  "reponse_d",
  "bonne_reponse",
  "categorie",
  "difficulte",
  "duree",
  "active",
];

const DIFF: Record<string, "easy" | "medium" | "hard"> = {
  facile: "easy",
  easy: "easy",
  moyen: "medium",
  medium: "medium",
  difficile: "hard",
  hard: "hard",
};

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[;\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(name: string, text: string) {
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ";" && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function norm(v: string) {
  return v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function modeLabel(mode: DuplicateMode) {
  if (mode === "replace") return "Remplacement";
  if (mode === "import") return "Tout importer";
  return "Doublons ignorés";
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ImportsExportsPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankCount, setBankCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");

  async function loadMeta() {
    const [{ data: cats }, { count: total }, { count: active }, { data: recent }] = await Promise.all([
      db.from("categories").select("id,name").order("name"),
      db.from("question_bank").select("id", { count: "exact", head: true }),
      db.from("question_bank").select("id", { count: "exact", head: true }).eq("is_active", true),
      db.from("import_history").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    setCategories((cats ?? []) as Category[]);
    setBankCount(total ?? 0);
    setActiveCount(active ?? 0);
    setHistory((recent ?? []) as ImportHistory[]);
  }

  async function loadExistingQuestions() {
    const all: ExistingQuestion[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("question_bank").select("id,text").range(from, from + 999);
      if (error) throw error;
      const page = (data ?? []) as ExistingQuestion[];
      all.push(...page);
      if (page.length < 1000) break;
    }
    return all;
  }

  useEffect(() => {
    loadMeta();
  }, []);

  const validRows = preview.filter((r) => r.valid && r.question);
  const invalidRows = preview.filter((r) => !r.valid);
  const duplicateRows = validRows.filter((r) => r.duplicate);
  const cleanRows = validRows.filter((r) => !r.duplicate);
  const importableCount = duplicateMode === "skip" ? cleanRows.length : validRows.length;
  const lastImport = history[0];

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setFileName(file.name);
    setPreview([]);
    setDuplicateMode("skip");

    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        notify("Format non pris en charge : utilisez un fichier CSV.");
        return;
      }
      const raw = await file.text();
      const rows = parseCsv(raw);
      if (rows.length < 2) {
        notify("Le fichier ne contient aucune question exploitable.");
        return;
      }
      const headers = rows[0].map(norm);
      const index = Object.fromEntries(headers.map((h, i) => [h, i]));
      const missing = ["question", "reponse_a", "reponse_b", "bonne_reponse"].filter((h) => index[h] === undefined);
      if (missing.length) {
        setPreview([{ line: 1, valid: false, error: `Colonnes obligatoires manquantes : ${missing.join(", ")}` }]);
        return;
      }

      const existing = await loadExistingQuestions();
      const existingMap = new Map(existing.map((q) => [norm(q.text), q]));
      const seenInFile = new Map<string, number>();
      const catMap = new Map(categories.map((c) => [norm(c.name), c]));

      const next = rows.slice(1).map((cols, idx): PreviewRow => {
        const get = (h: string) => (cols[index[h]] ?? "").trim();
        const text = get("question");
        const a = get("reponse_a");
        const b = get("reponse_b");
        const c = get("reponse_c");
        const d = get("reponse_d");
        const correctRaw = norm(get("bonne_reponse"));
        const correct = correctRaw.replace("reponse_", "").replace("réponse_", "") as "a" | "b" | "c" | "d";

        if (!text || !a || !b) return { line: idx + 2, valid: false, error: "Question, réponse A et réponse B sont obligatoires." };
        if (!["a", "b", "c", "d"].includes(correct)) return { line: idx + 2, valid: false, error: "Bonne réponse invalide (A, B, C ou D attendu)." };
        if ((correct === "c" && !c) || (correct === "d" && !d)) return { line: idx + 2, valid: false, error: `La réponse ${correct.toUpperCase()} est indiquée comme correcte mais elle est vide.` };

        const categoryName = get("categorie");
        const cat = categoryName ? catMap.get(norm(categoryName)) : undefined;
        if (categoryName && !cat) return { line: idx + 2, valid: false, error: `Catégorie inconnue : ${categoryName}` };

        const diffRaw = norm(get("difficulte") || "moyen");
        const difficulty = DIFF[diffRaw];
        if (!difficulty) return { line: idx + 2, valid: false, error: `Difficulté inconnue : ${get("difficulte")}` };

        const duration = Math.max(5, Math.min(300, Number(get("duree") || 30) || 30));
        const activeRaw = norm(get("active") || "oui");
        const isActive = !["non", "false", "0", "desactive", "désactivé"].includes(activeRaw);
        const key = norm(text);
        const bankDuplicate = existingMap.get(key);
        const fileDuplicateLine = seenInFile.get(key);
        seenInFile.set(key, idx + 2);

        return {
          line: idx + 2,
          valid: true,
          error: "",
          duplicate: bankDuplicate ? "bank" : fileDuplicateLine ? "file" : undefined,
          duplicateId: bankDuplicate?.id,
          question: {
            text,
            choice_a: a,
            choice_b: b,
            choice_c: c || null,
            choice_d: d || null,
            correct_choice: correct,
            category_id: cat?.id ?? null,
            category_name: cat?.name ?? "Sans catégorie",
            difficulty,
            duration_seconds: duration,
            is_active: isActive,
            source: `csv:${file.name}`,
          },
        };
      });
      setPreview(next);
    } catch (error) {
      notify(`Analyse impossible : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function insertInBatches(payload: Omit<ParsedQuestion, "category_name">[]) {
    let inserted = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error } = await db.from("question_bank").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }
    return inserted;
  }

  async function importValidRows() {
    if (!importableCount) return;
    setImporting(true);
    try {
      let added = 0;
      let replaced = 0;
      let ignored = 0;

      if (duplicateMode === "skip") {
        const payload = cleanRows.map((r) => r.question!).map(({ category_name, ...q }) => q);
        added = await insertInBatches(payload);
        ignored = duplicateRows.length;
      } else if (duplicateMode === "import") {
        const payload = validRows.map((r) => r.question!).map(({ category_name, ...q }) => q);
        added = await insertInBatches(payload);
      } else {
        const byQuestion = new Map<string, PreviewRow>();
        validRows.forEach((row) => row.question && byQuestion.set(norm(row.question.text), row));
        const finalRows = [...byQuestion.values()];
        const toInsert = finalRows.filter((r) => !r.duplicateId);
        const toUpdate = finalRows.filter((r) => r.duplicateId);
        added = await insertInBatches(toInsert.map((r) => r.question!).map(({ category_name, ...q }) => q));
        ignored = Math.max(0, validRows.length - finalRows.length);
        for (const row of toUpdate) {
          const { category_name, ...payload } = row.question!;
          const { error } = await db.from("question_bank").update(payload).eq("id", row.duplicateId!);
          if (error) throw error;
          replaced++;
        }
      }

      const { error: historyError } = await db.from("import_history").insert({
        file_name: fileName,
        mode: duplicateMode,
        total_rows: preview.length,
        added_count: added,
        replaced_count: replaced,
        ignored_count: ignored,
        error_count: invalidRows.length,
      });
      if (historyError) throw historyError;

      const parts = [`${added} ajoutée${added > 1 ? "s" : ""}`];
      if (replaced) parts.push(`${replaced} remplacée${replaced > 1 ? "s" : ""}`);
      if (ignored) parts.push(`${ignored} ignorée${ignored > 1 ? "s" : ""}`);
      if (invalidRows.length) parts.push(`${invalidRows.length} erreur${invalidRows.length > 1 ? "s" : ""}`);
      notify(`Import terminé · ${parts.join(" · ")}.`);
      clearFile();
      await loadMeta();
    } catch (error) {
      notify(`Import interrompu : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    } finally {
      setImporting(false);
    }
  }

  async function exportBank(activeOnly = false) {
    let query = db.from("question_bank").select("text,choice_a,choice_b,choice_c,choice_d,correct_choice,category_id,difficulty,duration_seconds,is_active,created_at").order("created_at");
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return notify(`Export impossible : ${error.message}`);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const lines = [EXPECTED.join(";")];
    for (const q of data ?? []) {
      lines.push([
        q.text,
        q.choice_a,
        q.choice_b,
        q.choice_c ?? "",
        q.choice_d ?? "",
        String(q.correct_choice).toUpperCase(),
        q.category_id ? catMap.get(q.category_id) ?? "" : "",
        q.difficulty === "easy" ? "Facile" : q.difficulty === "hard" ? "Difficile" : "Moyen",
        q.duration_seconds,
        q.is_active ? "Oui" : "Non",
      ].map(escapeCsv).join(";"));
    }
    downloadText(`quizzlivefr-banque-${activeOnly ? "actives-" : ""}${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\r\n"));
    notify("Export CSV généré.");
  }

  function downloadTemplate() {
    const example = [
      EXPECTED.join(";"),
      ["Dans quel pays se trouve le Machu Picchu ?", "Pérou", "Chili", "Bolivie", "Argentine", "A", "Géographie", "Facile", "30", "Oui"].map(escapeCsv).join(";"),
    ].join("\r\n");
    downloadText("quizzlivefr-modele-import.csv", example);
  }

  function clearFile() {
    setPreview([]);
    setFileName("");
    setDuplicateMode("skip");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Imports / Exports</h1>
          <p className="text-sm text-auth-muted mt-1">Importez vos catalogues de questions et exportez vos données QuizzLiveFR.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadMeta} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5">
            <RefreshCw size={14}/> Actualiser
          </button>
          <AdminTopControls />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { l: "Questions en banque", v: bankCount, h: "Catalogue actuellement enregistré", i: Database, c: "#8B5CF6" },
          { l: "Questions actives", v: activeCount, h: "Disponibles pour les sessions", i: CheckCircle2, c: "#22C55E" },
          { l: "Catégories", v: categories.length, h: "Catégories reconnues à l'import", i: FolderOpen, c: "#38BDF8" },
          { l: "Dernier import", v: lastImport ? lastImport.added_count + lastImport.replaced_count : "—", h: lastImport ? lastImport.file_name : "Aucun historique", i: FileUp, c: "#F59E0B" },
        ].map((m) => (
          <div key={m.l} className="rounded-xl border border-auth-border bg-auth-panel p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.c}18`, color: m.c }}><m.i size={18}/></div>
              <div><p className="text-[10px] uppercase tracking-[.15em] font-bold text-auth-mutedDim">{m.l}</p><p className="text-2xl font-bold text-auth-text mt-1">{m.v}</p><p className="text-[11px] text-auth-muted mt-1 truncate max-w-[240px]">{m.h}</p></div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-4">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between">
            <div><h2 className="text-sm font-bold text-auth-text">Importer un catalogue</h2><p className="text-[11px] text-auth-muted mt-1">CSV séparé par des points-virgules · analyse complète avant insertion</p></div>
            <ShieldCheck size={18} className="text-auth-blue"/>
          </div>
          <div className="p-5">
            {!fileName ? (
              <button onClick={() => inputRef.current?.click()} className="w-full min-h-[235px] rounded-xl border border-dashed border-auth-border hover:border-auth-blue/60 bg-auth-bg/50 flex flex-col items-center justify-center gap-3 transition group">
                <div className="w-12 h-12 rounded-xl bg-auth-blue/10 text-auth-blue flex items-center justify-center group-hover:scale-105 transition"><Upload size={22}/></div>
                <div className="text-center"><p className="text-sm font-semibold text-auth-text">Choisir un fichier CSV</p><p className="text-xs text-auth-muted mt-1">Le fichier sera analysé avant toute modification de votre banque.</p></div>
                <span className="rounded-lg px-3 py-1.5 bg-white/5 text-[11px] text-auth-muted">Format .csv · plusieurs milliers de lignes</span>
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-auth-border bg-auth-bg/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-lg bg-auth-blue/10 text-auth-blue flex items-center justify-center"><FileSpreadsheet size={19}/></div><div className="min-w-0"><p className="text-sm font-semibold text-auth-text truncate">{fileName}</p><p className="text-[11px] text-auth-muted">{analyzing ? "Analyse du catalogue et recherche de doublons…" : `${preview.length} ligne(s) analysée(s)`}</p></div></div>
                    <button onClick={clearFile} className="p-2 rounded-lg hover:bg-white/5 text-auth-muted"><XCircle size={17}/></button>
                  </div>
                  {!analyzing && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
                      <div className="rounded-lg border border-auth-border p-3"><p className="text-[10px] uppercase text-auth-mutedDim">Lignes</p><p className="text-lg font-bold text-auth-text">{preview.length}</p></div>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-[10px] uppercase text-emerald-400">Valides</p><p className="text-lg font-bold text-emerald-400">{validRows.length}</p></div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-[10px] uppercase text-amber-400">Doublons</p><p className="text-lg font-bold text-amber-400">{duplicateRows.length}</p></div>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-[10px] uppercase text-red-400">Erreurs</p><p className="text-lg font-bold text-red-400">{invalidRows.length}</p></div>
                    </div>
                  )}
                </div>

                {!analyzing && validRows.length > 0 && (
                  <div className="rounded-xl border border-auth-border bg-auth-bg/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-auth-border flex items-center justify-between"><div><p className="text-xs font-semibold text-auth-text">Aperçu avant import</p><p className="text-[10px] text-auth-muted mt-0.5">Vérifiez les premières lignes et leur statut.</p></div><span className="text-[10px] text-auth-muted">{Math.min(preview.length, 8)} / {preview.length} affichées</span></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="text-[9px] uppercase tracking-wider text-auth-mutedDim border-b border-auth-border"><th className="px-4 py-2.5">Ligne</th><th className="px-3 py-2.5">Question</th><th className="px-3 py-2.5">Catégorie</th><th className="px-3 py-2.5">Statut</th></tr></thead>
                        <tbody>{preview.slice(0, 8).map((row) => <tr key={row.line} className="border-b border-white/5 last:border-0 text-[11px]"><td className="px-4 py-2.5 text-auth-muted">{row.line}</td><td className="px-3 py-2.5 text-auth-text max-w-[360px] truncate">{row.question?.text ?? row.error}</td><td className="px-3 py-2.5 text-auth-muted">{row.question?.category_name ?? "—"}</td><td className="px-3 py-2.5">{!row.valid ? <span className="text-red-400">Erreur</span> : row.duplicate ? <span className="inline-flex items-center gap-1 text-amber-400"><Copy size={11}/>{row.duplicate === "bank" ? "Déjà en banque" : "Doublon fichier"}</span> : <span className="text-emerald-400">Valide</span>}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!analyzing && duplicateRows.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-start gap-2"><Copy size={16} className="text-amber-400 mt-0.5"/><div><p className="text-xs font-semibold text-auth-text">{duplicateRows.length} doublon{duplicateRows.length > 1 ? "s" : ""} détecté{duplicateRows.length > 1 ? "s" : ""}</p><p className="text-[10px] text-auth-muted mt-1">Choisissez comment QuizzLiveFR doit les traiter.</p></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                      {[
                        { id: "skip" as DuplicateMode, title: "Ignorer", desc: "N'importe que les nouvelles questions" },
                        { id: "replace" as DuplicateMode, title: "Remplacer", desc: "Met à jour celles déjà en banque" },
                        { id: "import" as DuplicateMode, title: "Tout importer", desc: "Autorise aussi les doublons" },
                      ].map((option) => <button key={option.id} onClick={() => setDuplicateMode(option.id)} className={`rounded-lg border p-3 text-left transition ${duplicateMode === option.id ? "border-auth-blue/60 bg-auth-blue/10" : "border-auth-border hover:bg-white/5"}`}><div className="flex items-center gap-2"><span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${duplicateMode === option.id ? "border-auth-blue" : "border-auth-border"}`}>{duplicateMode === option.id && <span className="w-1.5 h-1.5 rounded-full bg-auth-blue"/>}</span><span className="text-[11px] font-semibold text-auth-text">{option.title}</span></div><p className="text-[9px] text-auth-muted mt-1.5 ml-[22px]">{option.desc}</p></button>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile}/>

            {invalidRows.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-500/15 flex items-center gap-2 text-red-400 text-xs font-semibold"><AlertTriangle size={15}/> Lignes à corriger ({invalidRows.length})</div>
                <div className="max-h-40 overflow-auto">{invalidRows.slice(0, 30).map((r) => <div key={r.line} className="px-4 py-2 border-b border-white/5 text-[11px] text-auth-muted"><span className="text-auth-text font-semibold mr-2">Ligne {r.line}</span>{r.error}</div>)}</div>
              </div>
            )}

            {fileName && !analyzing && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-auth-border pt-4">
                <p className="text-[10px] text-auth-muted">{duplicateMode === "skip" && duplicateRows.length ? `${duplicateRows.length} doublon(s) seront ignorés.` : duplicateMode === "replace" && duplicateRows.length ? "Les doublons existants seront mis à jour." : duplicateMode === "import" && duplicateRows.length ? "Tous les doublons seront conservés." : "Aucun doublon à traiter."}</p>
                <div className="flex items-center justify-end gap-2"><button onClick={clearFile} className="px-4 py-2.5 rounded-lg border border-auth-border text-xs font-semibold text-auth-text hover:bg-white/5">Annuler</button><button disabled={!importableCount || importing} onClick={importValidRows} className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#4C6FFF,#EC4899)" }}>{importing ? "Import en cours…" : `Importer ${importableCount} question${importableCount > 1 ? "s" : ""}`}</button></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-auth-border"><h2 className="text-sm font-bold text-auth-text">Exporter les données</h2><p className="text-[11px] text-auth-muted mt-1">Téléchargez une copie CSV de votre catalogue.</p></div>
            <div className="p-4 flex flex-col gap-2">
              <button onClick={() => exportBank(false)} className="flex items-center gap-3 rounded-xl border border-auth-border p-3.5 hover:bg-white/5 text-left"><div className="w-9 h-9 rounded-lg bg-auth-purple/10 text-auth-purple flex items-center justify-center"><Download size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Banque complète</p><p className="text-[10px] text-auth-muted">Actives et désactivées · {bankCount} question(s)</p></div><FileDown size={15} className="text-auth-muted"/></button>
              <button onClick={() => exportBank(true)} className="flex items-center gap-3 rounded-xl border border-auth-border p-3.5 hover:bg-white/5 text-left"><div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><CheckCircle2 size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Questions actives</p><p className="text-[10px] text-auth-muted">Prêtes pour une session · {activeCount} question(s)</p></div><FileDown size={15} className="text-auth-muted"/></button>
            </div>
          </div>

          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-auth-border"><h2 className="text-sm font-bold text-auth-text">Format d'import</h2><p className="text-[11px] text-auth-muted mt-1">Utilisez notre modèle pour éviter les erreurs de colonnes.</p></div>
            <div className="p-4"><button onClick={downloadTemplate} className="w-full flex items-center gap-3 rounded-xl border border-auth-blue/25 bg-auth-blue/5 p-3.5 hover:bg-auth-blue/10 text-left"><div className="w-9 h-9 rounded-lg bg-auth-blue/10 text-auth-blue flex items-center justify-center"><FileSpreadsheet size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Télécharger le modèle CSV</p><p className="text-[10px] text-auth-muted">Colonnes et exemple compatibles QuizzLiveFR</p></div><Download size={15} className="text-auth-blue"/></button><div className="mt-3 rounded-lg bg-auth-bg border border-auth-border p-3 text-[10px] leading-5 text-auth-muted"><span className="text-auth-text font-semibold">Obligatoire :</span> question, reponse_a, reponse_b, bonne_reponse.<br/><span className="text-auth-text font-semibold">Optionnel :</span> reponse_c, reponse_d, categorie, difficulte, duree, active.</div></div>
          </div>

          <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between"><div><h2 className="text-sm font-bold text-auth-text">Historique des imports</h2><p className="text-[11px] text-auth-muted mt-1">Les 5 dernières opérations enregistrées.</p></div><History size={17} className="text-auth-muted"/></div>
            <div className="p-3">
              {history.length === 0 ? (
                <div className="py-7 text-center"><Clock3 size={18} className="mx-auto text-auth-mutedDim"/><p className="text-[11px] text-auth-muted mt-2">Aucun import enregistré.</p></div>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((item) => (
                    <div key={item.id} className="rounded-lg border border-auth-border bg-auth-bg/40 p-3">
                      <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold text-auth-text truncate">{item.file_name}</p><span className="text-[9px] text-auth-muted shrink-0">{shortDate(item.created_at)}</span></div>
                      <p className="text-[9px] text-auth-muted mt-1">{modeLabel(item.mode)}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[9px]"><span className="text-emerald-400">+{item.added_count} ajoutée(s)</span>{item.replaced_count > 0 && <span className="text-auth-blue">{item.replaced_count} remplacée(s)</span>}{item.ignored_count > 0 && <span className="text-amber-400">{item.ignored_count} ignorée(s)</span>}{item.error_count > 0 && <span className="text-red-400">{item.error_count} erreur(s)</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
