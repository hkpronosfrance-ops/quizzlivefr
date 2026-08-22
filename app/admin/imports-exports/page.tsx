"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileDown, FileSpreadsheet, FileUp, FolderOpen, RefreshCw, ShieldCheck, Upload, XCircle } from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type Category = { id: string; name: string };
type ParsedQuestion = {
  text: string; choice_a: string; choice_b: string; choice_c: string | null; choice_d: string | null;
  correct_choice: "a" | "b" | "c" | "d"; category_id: string | null; category_name: string;
  difficulty: "easy" | "medium" | "hard"; duration_seconds: number; is_active: boolean; source: string;
};
type PreviewRow = { line: number; valid: boolean; error: string; question?: ParsedQuestion };

const EXPECTED = ["question", "reponse_a", "reponse_b", "reponse_c", "reponse_d", "bonne_reponse", "categorie", "difficulte", "duree", "active"];
const DIFF: Record<string, "easy" | "medium" | "hard"> = { facile: "easy", easy: "easy", moyen: "medium", medium: "medium", difficile: "hard", hard: "hard" };

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[;\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function downloadText(name: string, text: string) {
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === ";" && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
function norm(v: string) { return v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

export default function ImportsExportsPage() {
  const db = useMemo(() => supabaseBrowser(), []); const notify = useAdminToast(); const inputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]); const [bankCount, setBankCount] = useState(0); const [activeCount, setActiveCount] = useState(0);
  const [fileName, setFileName] = useState(""); const [preview, setPreview] = useState<PreviewRow[]>([]); const [analyzing, setAnalyzing] = useState(false); const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{ name: string; count: number; at: Date } | null>(null);

  async function loadMeta() {
    const [{ data: cats }, { count: total }, { count: active }] = await Promise.all([
      db.from("categories").select("id,name").order("name"), db.from("question_bank").select("id", { count: "exact", head: true }), db.from("question_bank").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
    setCategories((cats ?? []) as Category[]); setBankCount(total ?? 0); setActiveCount(active ?? 0);
  }
  useEffect(() => { loadMeta(); }, []);

  const validRows = preview.filter((r) => r.valid && r.question); const invalidRows = preview.filter((r) => !r.valid);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; setAnalyzing(true); setFileName(file.name); setPreview([]);
    if (!file.name.toLowerCase().endsWith(".csv")) { notify("Format non pris en charge : utilisez un fichier CSV."); setAnalyzing(false); return; }
    const raw = await file.text(); const rows = parseCsv(raw); if (rows.length < 2) { notify("Le fichier ne contient aucune question exploitable."); setAnalyzing(false); return; }
    const headers = rows[0].map(norm); const index = Object.fromEntries(headers.map((h, i) => [h, i]));
    const missing = ["question", "reponse_a", "reponse_b", "bonne_reponse"].filter((h) => index[h] === undefined);
    if (missing.length) { setPreview([{ line: 1, valid: false, error: `Colonnes obligatoires manquantes : ${missing.join(", ")}` }]); setAnalyzing(false); return; }
    const catMap = new Map(categories.map((c) => [norm(c.name), c]));
    const next = rows.slice(1).map((cols, idx): PreviewRow => {
      const get = (h: string) => (cols[index[h]] ?? "").trim(); const text = get("question"), a = get("reponse_a"), b = get("reponse_b"), c = get("reponse_c"), d = get("reponse_d");
      const correctRaw = norm(get("bonne_reponse")); const correct = correctRaw.replace("reponse_", "").replace("réponse_", "") as "a" | "b" | "c" | "d";
      if (!text || !a || !b) return { line: idx + 2, valid: false, error: "Question, réponse A et réponse B sont obligatoires." };
      if (!["a", "b", "c", "d"].includes(correct)) return { line: idx + 2, valid: false, error: "Bonne réponse invalide (A, B, C ou D attendu)." };
      if ((correct === "c" && !c) || (correct === "d" && !d)) return { line: idx + 2, valid: false, error: `La réponse ${correct.toUpperCase()} est indiquée comme correcte mais elle est vide.` };
      const categoryName = get("categorie"); const cat = categoryName ? catMap.get(norm(categoryName)) : undefined; if (categoryName && !cat) return { line: idx + 2, valid: false, error: `Catégorie inconnue : ${categoryName}` };
      const diffRaw = norm(get("difficulte") || "moyen"); const difficulty = DIFF[diffRaw]; if (!difficulty) return { line: idx + 2, valid: false, error: `Difficulté inconnue : ${get("difficulte")}` };
      const duration = Math.max(5, Math.min(300, Number(get("duree") || 30) || 30)); const activeRaw = norm(get("active") || "oui"); const isActive = !["non", "false", "0", "desactive", "désactivé"].includes(activeRaw);
      return { line: idx + 2, valid: true, error: "", question: { text, choice_a: a, choice_b: b, choice_c: c || null, choice_d: d || null, correct_choice: correct, category_id: cat?.id ?? null, category_name: cat?.name ?? "Sans catégorie", difficulty, duration_seconds: duration, is_active: isActive, source: `csv:${file.name}` } };
    });
    setPreview(next); setAnalyzing(false);
  }

  async function importValidRows() {
    if (!validRows.length) return; setImporting(true); const payload = validRows.map((r) => r.question!).map(({ category_name, ...q }) => q);
    let imported = 0;
    for (let i = 0; i < payload.length; i += 500) { const { error } = await db.from("question_bank").insert(payload.slice(i, i + 500)); if (error) { notify(`Import interrompu : ${error.message}`); setImporting(false); return; } imported += Math.min(500, payload.length - i); }
    setLastImport({ name: fileName, count: imported, at: new Date() }); setImporting(false); notify(`${imported} question${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""} dans la banque.`); setPreview([]); setFileName(""); if (inputRef.current) inputRef.current.value = ""; await loadMeta();
  }

  async function exportBank(activeOnly = false) {
    let query = db.from("question_bank").select("text,choice_a,choice_b,choice_c,choice_d,correct_choice,category_id,difficulty,duration_seconds,is_active,created_at").order("created_at"); if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query; if (error) return notify(`Export impossible : ${error.message}`);
    const catMap = new Map(categories.map((c) => [c.id, c.name])); const lines = [EXPECTED.join(";")];
    for (const q of data ?? []) lines.push([q.text, q.choice_a, q.choice_b, q.choice_c ?? "", q.choice_d ?? "", String(q.correct_choice).toUpperCase(), q.category_id ? catMap.get(q.category_id) ?? "" : "", q.difficulty === "easy" ? "Facile" : q.difficulty === "hard" ? "Difficile" : "Moyen", q.duration_seconds, q.is_active ? "Oui" : "Non"].map(escapeCsv).join(";"));
    downloadText(`quizzlivefr-banque-${activeOnly ? "actives-" : ""}${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\r\n")); notify("Export CSV généré.");
  }
  function downloadTemplate() { const example = [EXPECTED.join(";"), ["Dans quel pays se trouve le Machu Picchu ?", "Pérou", "Chili", "Bolivie", "Argentine", "A", "Géographie", "Facile", "30", "Oui"].map(escapeCsv).join(";")].join("\r\n"); downloadText("quizzlivefr-modele-import.csv", example); }
  function clearFile() { setPreview([]); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }

  return <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
    <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div><h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-auth-text">Imports / Exports</h1><p className="text-sm text-auth-muted mt-1">Importez vos catalogues de questions et exportez vos données QuizzLiveFR.</p></div>
      <div className="flex items-center gap-2"><button onClick={loadMeta} className="inline-flex items-center gap-2 rounded-lg border border-auth-border bg-auth-panel px-3.5 py-2.5 text-xs font-semibold text-auth-text hover:bg-white/5"><RefreshCw size={14}/> Actualiser</button><AdminTopControls /></div>
    </header>

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {[{l:"Questions en banque",v:bankCount,h:"Catalogue actuellement enregistré",i:Database,c:"#8B5CF6"},{l:"Questions actives",v:activeCount,h:"Disponibles pour les sessions",i:CheckCircle2,c:"#22C55E"},{l:"Catégories",v:categories.length,h:"Catégories reconnues à l'import",i:FolderOpen,c:"#38BDF8"},{l:"Dernier import",v:lastImport ? lastImport.count : "—",h:lastImport ? lastImport.name : "Aucun import durant cette visite",i:FileUp,c:"#F59E0B"}].map((m) => <div key={m.l} className="rounded-xl border border-auth-border bg-auth-panel p-4"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${m.c}18`,color:m.c}}><m.i size={18}/></div><div><p className="text-[10px] uppercase tracking-[.15em] font-bold text-auth-mutedDim">{m.l}</p><p className="text-2xl font-bold text-auth-text mt-1">{m.v}</p><p className="text-[11px] text-auth-muted mt-1">{m.h}</p></div></div></div>)}
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-4">
      <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-auth-border flex items-center justify-between"><div><h2 className="text-sm font-bold text-auth-text">Importer un catalogue</h2><p className="text-[11px] text-auth-muted mt-1">CSV séparé par des points-virgules · analyse avant insertion</p></div><ShieldCheck size={18} className="text-auth-blue"/></div>
        <div className="p-5">
          {!fileName ? <button onClick={() => inputRef.current?.click()} className="w-full min-h-[220px] rounded-xl border border-dashed border-auth-border hover:border-auth-blue/60 bg-auth-bg/50 flex flex-col items-center justify-center gap-3 transition group"><div className="w-12 h-12 rounded-xl bg-auth-blue/10 text-auth-blue flex items-center justify-center group-hover:scale-105 transition"><Upload size={22}/></div><div className="text-center"><p className="text-sm font-semibold text-auth-text">Choisir un fichier CSV</p><p className="text-xs text-auth-muted mt-1">Importez jusqu'à plusieurs milliers de questions en une fois.</p></div><span className="rounded-lg px-3 py-1.5 bg-white/5 text-[11px] text-auth-muted">Format .csv</span></button> : <div className="rounded-xl border border-auth-border bg-auth-bg/50 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-lg bg-auth-blue/10 text-auth-blue flex items-center justify-center"><FileSpreadsheet size={19}/></div><div className="min-w-0"><p className="text-sm font-semibold text-auth-text truncate">{fileName}</p><p className="text-[11px] text-auth-muted">{analyzing ? "Analyse du fichier…" : `${validRows.length} valide(s) · ${invalidRows.length} erreur(s)`}</p></div></div><button onClick={clearFile} className="p-2 rounded-lg hover:bg-white/5 text-auth-muted"><XCircle size={17}/></button></div>
            {!analyzing && <div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-lg border border-auth-border p-3"><p className="text-[10px] uppercase text-auth-mutedDim">Lignes</p><p className="text-lg font-bold text-auth-text">{preview.length}</p></div><div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-[10px] uppercase text-emerald-400">Valides</p><p className="text-lg font-bold text-emerald-400">{validRows.length}</p></div><div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><p className="text-[10px] uppercase text-red-400">Erreurs</p><p className="text-lg font-bold text-red-400">{invalidRows.length}</p></div></div>}
          </div>}
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile}/>
          {invalidRows.length > 0 && <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden"><div className="px-4 py-3 border-b border-amber-500/15 flex items-center gap-2 text-amber-400 text-xs font-semibold"><AlertTriangle size={15}/> Lignes à corriger</div><div className="max-h-36 overflow-auto">{invalidRows.slice(0,20).map((r)=><div key={r.line} className="px-4 py-2 border-b border-white/5 text-[11px] text-auth-muted"><span className="text-auth-text font-semibold mr-2">Ligne {r.line}</span>{r.error}</div>)}</div></div>}
          {fileName && !analyzing && <div className="mt-4 flex items-center justify-end gap-2"><button onClick={clearFile} className="px-4 py-2.5 rounded-lg border border-auth-border text-xs font-semibold text-auth-text hover:bg-white/5">Annuler</button><button disabled={!validRows.length || importing} onClick={importValidRows} className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40" style={{background:"linear-gradient(90deg,#4C6FFF,#EC4899)"}}>{importing ? "Import en cours…" : `Importer ${validRows.length} question${validRows.length>1?"s":""}`}</button></div>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden"><div className="px-5 py-4 border-b border-auth-border"><h2 className="text-sm font-bold text-auth-text">Exporter les données</h2><p className="text-[11px] text-auth-muted mt-1">Téléchargez une copie CSV de votre catalogue.</p></div><div className="p-4 flex flex-col gap-2"><button onClick={()=>exportBank(false)} className="flex items-center gap-3 rounded-xl border border-auth-border p-3.5 hover:bg-white/5 text-left"><div className="w-9 h-9 rounded-lg bg-auth-purple/10 text-auth-purple flex items-center justify-center"><Download size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Banque complète</p><p className="text-[10px] text-auth-muted">Actives et désactivées · {bankCount} question(s)</p></div><FileDown size={15} className="text-auth-muted"/></button><button onClick={()=>exportBank(true)} className="flex items-center gap-3 rounded-xl border border-auth-border p-3.5 hover:bg-white/5 text-left"><div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><CheckCircle2 size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Questions actives</p><p className="text-[10px] text-auth-muted">Prêtes pour une session · {activeCount} question(s)</p></div><FileDown size={15} className="text-auth-muted"/></button></div></div>
        <div className="rounded-xl border border-auth-border bg-auth-panel overflow-hidden"><div className="px-5 py-4 border-b border-auth-border"><h2 className="text-sm font-bold text-auth-text">Format d'import</h2><p className="text-[11px] text-auth-muted mt-1">Utilisez notre modèle pour éviter les erreurs de colonnes.</p></div><div className="p-4"><button onClick={downloadTemplate} className="w-full flex items-center gap-3 rounded-xl border border-auth-blue/25 bg-auth-blue/5 p-3.5 hover:bg-auth-blue/10 text-left"><div className="w-9 h-9 rounded-lg bg-auth-blue/10 text-auth-blue flex items-center justify-center"><FileSpreadsheet size={17}/></div><div className="flex-1"><p className="text-xs font-semibold text-auth-text">Télécharger le modèle CSV</p><p className="text-[10px] text-auth-muted">Colonnes et exemple compatibles QuizzLiveFR</p></div><Download size={15} className="text-auth-blue"/></button><div className="mt-3 rounded-lg bg-auth-bg border border-auth-border p-3 text-[10px] leading-5 text-auth-muted"><span className="text-auth-text font-semibold">Obligatoire :</span> question, reponse_a, reponse_b, bonne_reponse.<br/><span className="text-auth-text font-semibold">Optionnel :</span> reponse_c, reponse_d, categorie, difficulte, duree, active.</div></div></div>
      </div>
    </section>
  </div>;
}
