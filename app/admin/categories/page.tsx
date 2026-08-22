"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Globe, Trophy, Film, Landmark, Map, Music, FlaskConical, Gamepad2, Cpu, Star,
  Pencil, Trash2, X, FolderOpen, CheckCircle2, CircleOff, Clock3, RefreshCw, Power, Loader2,
  BookOpen, GraduationCap, Brain, Rocket, Telescope, Plane, Car, Bike, Dumbbell, Medal, Goal,
  HeartPulse, Stethoscope, Dna, Atom, Microscope, Leaf, PawPrint, Dog, Cat, Bird, Fish,
  Utensils, Coffee, Pizza, CakeSlice, Palette, Camera, Clapperboard, Headphones, Mic2, Guitar,
  Radio, Tv, Monitor, Smartphone, Code2, Database, Wifi, Shield, Crown, Gem, Coins, Flag,
  Languages, Lightbulb, Puzzle, Dice5, Shapes, Calculator, BookMarked, Building2, Briefcase,
  ShoppingBag, Shirt, CloudSun, Mountain, Waves, TreePine, Ship, TrainFront, Bus, Volleyball,
  type LucideIcon,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";
import { supabaseBrowser } from "@/lib/supabase";

type CategoryRow = { id: string; name: string; description: string; icon: string; color: string; is_active: boolean; created_at: string; updated_at: string };
type FormState = { name: string; description: string; icon: string; color: string; isActive: boolean };
type IconOption = { key: string; label: string; icon: LucideIcon; tags: string };

const ICON_LIBRARY: IconOption[] = [
  { key:"globe", label:"Monde", icon:Globe, tags:"monde culture géographie planète international" },
  { key:"trophy", label:"Trophée", icon:Trophy, tags:"sport victoire compétition coupe" },
  { key:"medal", label:"Médaille", icon:Medal, tags:"sport victoire récompense" },
  { key:"goal", label:"Football", icon:Goal, tags:"football sport but ballon" },
  { key:"volleyball", label:"Ballon", icon:Volleyball, tags:"sport ballon volley" },
  { key:"dumbbell", label:"Fitness", icon:Dumbbell, tags:"sport fitness musculation" },
  { key:"film", label:"Film", icon:Film, tags:"cinéma film série tv" },
  { key:"clapperboard", label:"Clap cinéma", icon:Clapperboard, tags:"cinéma film tournage" },
  { key:"tv", label:"Télévision", icon:Tv, tags:"télévision tv série média" },
  { key:"camera", label:"Caméra", icon:Camera, tags:"photo cinéma image" },
  { key:"landmark", label:"Histoire", icon:Landmark, tags:"histoire monument politique patrimoine" },
  { key:"flag", label:"Drapeau", icon:Flag, tags:"pays histoire géographie nation" },
  { key:"map", label:"Carte", icon:Map, tags:"géographie carte voyage pays" },
  { key:"mountain", label:"Montagne", icon:Mountain, tags:"géographie nature montagne" },
  { key:"waves", label:"Océan", icon:Waves, tags:"géographie mer océan nature" },
  { key:"plane", label:"Avion", icon:Plane, tags:"voyage avion monde transport" },
  { key:"ship", label:"Bateau", icon:Ship, tags:"voyage mer transport" },
  { key:"train", label:"Train", icon:TrainFront, tags:"transport train voyage" },
  { key:"bus", label:"Bus", icon:Bus, tags:"transport bus ville" },
  { key:"music", label:"Musique", icon:Music, tags:"musique chanson artiste" },
  { key:"headphones", label:"Casque audio", icon:Headphones, tags:"musique audio podcast" },
  { key:"microphone", label:"Micro", icon:Mic2, tags:"musique chant podcast" },
  { key:"guitar", label:"Guitare", icon:Guitar, tags:"musique instrument" },
  { key:"radio", label:"Radio", icon:Radio, tags:"musique média radio" },
  { key:"science", label:"Sciences", icon:FlaskConical, tags:"science chimie laboratoire" },
  { key:"atom", label:"Atome", icon:Atom, tags:"science physique atome" },
  { key:"dna", label:"ADN", icon:Dna, tags:"science biologie adn génétique" },
  { key:"microscope", label:"Microscope", icon:Microscope, tags:"science biologie recherche" },
  { key:"brain", label:"Cerveau", icon:Brain, tags:"science cerveau intelligence psychologie" },
  { key:"health", label:"Santé", icon:HeartPulse, tags:"santé médecine coeur" },
  { key:"doctor", label:"Médecine", icon:Stethoscope, tags:"santé médecine docteur" },
  { key:"game", label:"Jeux vidéo", icon:Gamepad2, tags:"jeu gaming console vidéo" },
  { key:"dice", label:"Dé", icon:Dice5, tags:"jeu hasard société" },
  { key:"puzzle", label:"Puzzle", icon:Puzzle, tags:"jeu logique réflexion" },
  { key:"cpu", label:"Technologie", icon:Cpu, tags:"technologie informatique ia processeur" },
  { key:"code", label:"Code", icon:Code2, tags:"technologie code développement web" },
  { key:"database", label:"Base de données", icon:Database, tags:"technologie données informatique" },
  { key:"monitor", label:"Ordinateur", icon:Monitor, tags:"technologie ordinateur écran" },
  { key:"smartphone", label:"Smartphone", icon:Smartphone, tags:"technologie mobile téléphone" },
  { key:"wifi", label:"Internet", icon:Wifi, tags:"technologie internet réseau" },
  { key:"rocket", label:"Fusée", icon:Rocket, tags:"espace astronomie fusée" },
  { key:"telescope", label:"Télescope", icon:Telescope, tags:"espace astronomie étoiles" },
  { key:"book", label:"Livre", icon:BookOpen, tags:"culture littérature livre lecture" },
  { key:"bookmarked", label:"Savoir", icon:BookMarked, tags:"culture connaissance livre" },
  { key:"graduation", label:"Éducation", icon:GraduationCap, tags:"éducation école étude savoir" },
  { key:"languages", label:"Langues", icon:Languages, tags:"langue traduction français anglais" },
  { key:"calculator", label:"Mathématiques", icon:Calculator, tags:"mathématiques calcul chiffres" },
  { key:"lightbulb", label:"Idée", icon:Lightbulb, tags:"idée connaissance innovation" },
  { key:"leaf", label:"Nature", icon:Leaf, tags:"nature écologie plante" },
  { key:"tree", label:"Forêt", icon:TreePine, tags:"nature forêt arbre" },
  { key:"paw", label:"Animaux", icon:PawPrint, tags:"animaux nature" },
  { key:"dog", label:"Chien", icon:Dog, tags:"animaux chien" },
  { key:"cat", label:"Chat", icon:Cat, tags:"animaux chat" },
  { key:"bird", label:"Oiseau", icon:Bird, tags:"animaux oiseau" },
  { key:"fish", label:"Poisson", icon:Fish, tags:"animaux poisson mer" },
  { key:"utensils", label:"Gastronomie", icon:Utensils, tags:"cuisine gastronomie nourriture" },
  { key:"pizza", label:"Pizza", icon:Pizza, tags:"cuisine nourriture gastronomie" },
  { key:"coffee", label:"Café", icon:Coffee, tags:"boisson café cuisine" },
  { key:"cake", label:"Dessert", icon:CakeSlice, tags:"dessert gâteau cuisine" },
  { key:"palette", label:"Art", icon:Palette, tags:"art peinture culture" },
  { key:"car", label:"Automobile", icon:Car, tags:"voiture automobile transport" },
  { key:"bike", label:"Vélo", icon:Bike, tags:"vélo cyclisme sport transport" },
  { key:"building", label:"Ville", icon:Building2, tags:"ville bâtiment architecture" },
  { key:"briefcase", label:"Entreprise", icon:Briefcase, tags:"travail entreprise business" },
  { key:"shopping", label:"Shopping", icon:ShoppingBag, tags:"shopping commerce achat" },
  { key:"shirt", label:"Mode", icon:Shirt, tags:"mode vêtement fashion" },
  { key:"weather", label:"Météo", icon:CloudSun, tags:"météo climat soleil" },
  { key:"coins", label:"Économie", icon:Coins, tags:"argent économie finance" },
  { key:"gem", label:"Luxe", icon:Gem, tags:"luxe diamant valeur" },
  { key:"crown", label:"Royauté", icon:Crown, tags:"roi reine royauté histoire" },
  { key:"shield", label:"Sécurité", icon:Shield, tags:"sécurité défense protection" },
  { key:"shapes", label:"Divers", icon:Shapes, tags:"divers formes général" },
  { key:"star", label:"Autres", icon:Star, tags:"autres favori étoile" },
];
const ICONS: Record<string, LucideIcon> = Object.fromEntries(ICON_LIBRARY.map((item) => [item.key, item.icon]));
const COLOR_CHOICES = ["#9B4DFF", "#22C55E", "#4C6FFF", "#F5A623", "#3DDCFF", "#FF3D8E", "#14B8A6", "#6366F1"];
const EMPTY_FORM: FormState = { name:"", description:"", icon:"globe", color:"#9B4DFF", isActive:true };

function formatDate(value:string) { return new Date(value).toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" }); }
function StatCard({ icon:Icon, color, label, value, helper }:{ icon:LucideIcon; color:string; label:string; value:string; helper:string }) { return <div className="bg-auth-panel border border-auth-border rounded-xl p-4"><div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:`${color}20`,color}}><Icon size={17}/></div><p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-[0.14em] mb-1">{label}</p><p className="text-auth-text text-2xl font-bold mb-1">{value}</p><p className="text-auth-muted text-xs">{helper}</p></div>; }

export default function CategoriesPage() {
  const db = useMemo(() => supabaseBrowser(), []);
  const notify = useAdminToast();
  const [categories,setCategories] = useState<CategoryRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [busyAction,setBusyAction] = useState<string|null>(null);
  const [search,setSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState<"all"|"active"|"inactive">("all");
  const [modalOpen,setModalOpen] = useState(false);
  const [editing,setEditing] = useState<CategoryRow|null>(null);
  const [form,setForm] = useState<FormState>(EMPTY_FORM);
  const [iconSearch,setIconSearch] = useState("");
  const [lastUpdated,setLastUpdated] = useState<Date|null>(null);

  async function loadCategories(){ setLoading(true); const {data,error}=await db.from("categories").select("id,name,description,icon,color,is_active,created_at,updated_at").order("created_at",{ascending:true}); if(error) notify(`Impossible de charger les catégories : ${error.message}`); setCategories((data??[]) as CategoryRow[]); setLastUpdated(new Date()); setLoading(false); }
  useEffect(()=>{ loadCategories(); const channel=db.channel("categories-v2-live").on("postgres_changes",{event:"*",schema:"public",table:"categories"},loadCategories).subscribe(); return()=>{db.removeChannel(channel)}; /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[db]);

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return categories.filter(c=>{if(statusFilter==="active"&&!c.is_active)return false;if(statusFilter==="inactive"&&c.is_active)return false;return !q||`${c.name} ${c.description}`.toLowerCase().includes(q);});},[categories,search,statusFilter]);
  const filteredIcons=useMemo(()=>{const q=iconSearch.trim().toLowerCase(); return !q?ICON_LIBRARY:ICON_LIBRARY.filter(i=>`${i.label} ${i.tags}`.toLowerCase().includes(q));},[iconSearch]);
  const activeCount=categories.filter(c=>c.is_active).length, inactiveCount=categories.length-activeCount;
  const lastModified=[...categories].sort((a,b)=>+new Date(b.updated_at)-+new Date(a.updated_at))[0];
  function openCreate(){if(busyAction)return;setEditing(null);setForm(EMPTY_FORM);setIconSearch("");setModalOpen(true);}
  function openEdit(c:CategoryRow){if(busyAction)return;setEditing(c);setForm({name:c.name,description:c.description,icon:c.icon,color:c.color,isActive:c.is_active});setIconSearch("");setModalOpen(true);}

  async function saveCategory(e:React.FormEvent){e.preventDefault();if(!form.name.trim()||saving)return;setSaving(true);const payload={name:form.name.trim(),description:form.description.trim(),icon:form.icon,color:form.color,is_active:form.isActive};const result=editing?await db.from("categories").update(payload).eq("id",editing.id).select().single():await db.from("categories").insert(payload).select().single();if(result.error){notify(result.error.code==="23505"?"Une catégorie portant ce nom existe déjà.":`Enregistrement impossible : ${result.error.message}`);setSaving(false);return;}notify(editing?`Catégorie « ${payload.name} » mise à jour.`:`Catégorie « ${payload.name} » créée.`);setModalOpen(false);setEditing(null);setForm(EMPTY_FORM);await loadCategories();setSaving(false);}
  async function toggleCategory(c:CategoryRow){if(busyAction)return;setBusyAction(`toggle:${c.id}`);const{error}=await db.from("categories").update({is_active:!c.is_active}).eq("id",c.id);if(error)notify(`Modification impossible : ${error.message}`);else{notify(c.is_active?`Catégorie « ${c.name} » désactivée.`:`Catégorie « ${c.name} » activée.`);await loadCategories();}setBusyAction(null);}
  async function deleteCategory(c:CategoryRow){if(busyAction||!window.confirm(`Supprimer définitivement la catégorie « ${c.name} » ?`))return;setBusyAction(`delete:${c.id}`);const{error}=await db.from("categories").delete().eq("id",c.id);if(error)notify(`Suppression impossible : ${error.message}`);else{notify(`Catégorie « ${c.name} » supprimée.`);await loadCategories();}setBusyAction(null);}

  return <div className="p-5 lg:p-8 flex flex-col gap-5 lg:gap-6">
    <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"><div><h1 className="text-auth-text font-bold text-2xl lg:text-3xl tracking-tight">Catégories</h1><p className="text-auth-muted text-sm mt-1">Gérez le catalogue de catégories qui alimentera votre banque de questions.</p></div><div className="flex items-center gap-2.5 flex-wrap"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une catégorie..." className="bg-auth-panel border border-auth-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-auth-text outline-none focus:border-auth-blue w-60 placeholder:text-auth-mutedDim"/></div><button disabled={loading||!!busyAction} onClick={loadCategories} className="flex items-center gap-2 border border-auth-border bg-auth-panel rounded-lg px-3.5 py-2.5 text-auth-text text-xs font-semibold hover:bg-white/5 disabled:opacity-50"><RefreshCw size={14} className={loading?"animate-spin":""}/>Actualiser</button><button disabled={!!busyAction} onClick={openCreate} className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-white text-xs font-semibold disabled:opacity-50" style={{background:"linear-gradient(135deg,#4C6FFF 0%,#9B4DFF 52%,#FF3D8E 100%)"}}><Plus size={15}/>Nouvelle catégorie</button><div className="hidden xl:block h-8 w-px bg-auth-border mx-1"/><AdminTopControls/></div></header>

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"><StatCard icon={FolderOpen} color="#9B4DFF" label="Catégories totales" value={String(categories.length)} helper="Catégories enregistrées dans Supabase"/><StatCard icon={CheckCircle2} color="#22C55E" label="Actives" value={String(activeCount)} helper="Disponibles pour le futur catalogue"/><StatCard icon={CircleOff} color="#6B7086" label="Désactivées" value={String(inactiveCount)} helper={inactiveCount?"Masquées du catalogue":"Aucune catégorie désactivée"}/><StatCard icon={Clock3} color="#F5A623" label="Dernière modifiée" value={lastModified?.name??"—"} helper={lastModified?`Modifiée le ${formatDate(lastModified.updated_at)}`:"Aucune catégorie enregistrée"}/></section>

    <section className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden"><div className="px-4 py-3 border-b border-auth-border flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1">{(["all","active","inactive"] as const).map(s=><button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter===s?"bg-auth-blue/15 text-auth-text":"text-auth-muted hover:text-auth-text"}`}>{s==="all"?"Toutes":s==="active"?"Actives":"Désactivées"}</button>)}</div><span className="text-[10px] text-auth-mutedDim">{lastUpdated?`Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`:"Chargement…"}</span></div>
    {loading&&categories.length===0?<div className="px-5 py-14 text-center"><FolderOpen size={22} className="mx-auto text-auth-mutedDim mb-3"/><p className="text-sm font-semibold text-auth-text">Chargement des catégories</p><p className="text-[11px] text-auth-muted mt-1">Lecture du catalogue Supabase.</p></div>:filtered.length===0?<div className="px-5 py-14 text-center"><FolderOpen size={22} className="mx-auto text-auth-mutedDim mb-3"/><p className="text-sm font-semibold text-auth-text">Aucune catégorie</p><p className="text-[11px] text-auth-muted mt-1">Créez votre première catégorie ou modifiez les filtres actuels.</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="text-auth-mutedDim text-[9px] uppercase tracking-[0.15em] border-b border-auth-border"><th className="text-left px-5 py-3 font-bold">Catégorie</th><th className="text-left px-3 py-3 font-bold">Description</th><th className="text-left px-3 py-3 font-bold">Statut</th><th className="text-left px-3 py-3 font-bold">Questions associées</th><th className="text-left px-3 py-3 font-bold">Créée le</th><th className="text-right px-5 py-3 font-bold">Actions</th></tr></thead><tbody>{filtered.map(c=>{const Icon=ICONS[c.icon]??Globe;const rowBusy=busyAction?.endsWith(c.id)??false;return <tr key={c.id} className={`border-b border-auth-border/70 last:border-b-0 ${rowBusy?"bg-white/[0.035]":"hover:bg-white/[0.025]"}`}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{background:`${c.color}20`,color:c.color}}><Icon size={17}/></div><span className="text-auth-text font-semibold text-xs">{c.name}</span></div></td><td className="px-3 py-3.5 text-auth-muted text-xs max-w-[430px]">{c.description||"Aucune description"}</td><td className="px-3 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${c.is_active?"bg-auth-positive/10 text-auth-positive":"bg-white/[0.04] text-auth-muted"}`}><span className="w-1.5 h-1.5 rounded-full bg-current"/>{c.is_active?"Active":"Désactivée"}</span></td><td className="px-3 py-3.5"><span className="text-auth-text font-semibold">0</span><p className="text-[9px] text-auth-mutedDim mt-0.5">Disponible avec la Banque de questions</p></td><td className="px-3 py-3.5 text-auth-muted text-xs">{formatDate(c.created_at)}</td><td className="px-5 py-3.5"><div className="flex items-center justify-end gap-2"><button disabled={!!busyAction} onClick={()=>openEdit(c)} className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text hover:bg-white/5 disabled:opacity-40"><Pencil size={13}/></button><button disabled={!!busyAction} onClick={()=>toggleCategory(c)} className="w-8 h-8 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text disabled:opacity-40">{busyAction===`toggle:${c.id}`?<Loader2 size={13} className="animate-spin"/>:<Power size={13}/>}</button><button disabled={!!busyAction} onClick={()=>deleteCategory(c)} className="w-8 h-8 rounded-lg border border-auth-danger/35 flex items-center justify-center text-auth-danger hover:bg-auth-danger/10 disabled:opacity-40">{busyAction===`delete:${c.id}`?<Loader2 size={13} className="animate-spin"/>:<Trash2 size={13}/>}</button></div></td></tr>})}</tbody></table></div>}
    <div className="flex justify-between px-5 py-3 border-t border-auth-border text-[10px] text-auth-mutedDim"><span>{filtered.length} catégorie{filtered.length>1?"s":""} affichée{filtered.length>1?"s":""}</span><span>Les compteurs de questions seront reliés à la Banque de questions.</span></div></section>

    {modalOpen&&<div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-5" onClick={()=>!saving&&setModalOpen(false)}><form onClick={e=>e.stopPropagation()} onSubmit={saveCategory} className="bg-auth-panel border border-auth-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"><div className="px-6 py-4 border-b border-auth-border flex items-center justify-between shrink-0"><div><p className="text-auth-text font-bold text-sm">{editing?"Modifier la catégorie":"Nouvelle catégorie"}</p><p className="text-[10px] text-auth-muted mt-0.5">Choisissez une icône SVG puis enregistrez dans Supabase.</p></div><button type="button" disabled={saving} onClick={()=>setModalOpen(false)} className="text-auth-muted hover:text-auth-text"><X size={18}/></button></div><div className="p-6 space-y-5 overflow-y-auto"><div><label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-auth-mutedDim mb-2">Nom</label><input disabled={saving} autoFocus value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} maxLength={60} placeholder="Ex. Culture générale" className="w-full bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5 text-sm text-auth-text outline-none focus:border-auth-blue" required/></div><div><label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-auth-mutedDim mb-2">Description</label><textarea disabled={saving} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} maxLength={240} rows={3} placeholder="Décrivez le type de questions..." className="w-full resize-none bg-auth-bg border border-auth-border rounded-lg px-3 py-2.5 text-sm text-auth-text outline-none focus:border-auth-blue"/></div><div><div className="flex items-end justify-between gap-4 mb-2"><label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-auth-mutedDim">Banque d’icônes SVG</label><span className="text-[9px] text-auth-mutedDim">{filteredIcons.length} icônes</span></div><div className="relative mb-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim"/><input disabled={saving} value={iconSearch} onChange={e=>setIconSearch(e.target.value)} placeholder="Rechercher : sport, espace, musique..." className="w-full bg-auth-bg border border-auth-border rounded-lg pl-9 pr-3 py-2 text-xs text-auth-text outline-none focus:border-auth-blue"/></div><div className="h-52 overflow-y-auto rounded-xl border border-auth-border bg-auth-bg/35 p-2"><div className="grid grid-cols-6 sm:grid-cols-8 gap-2">{filteredIcons.map(item=>{const Icon=item.icon;const selected=form.icon===item.key;return <button disabled={saving} key={item.key} type="button" title={item.label} onClick={()=>setForm(p=>({...p,icon:item.key}))} className={`group aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition ${selected?"border-auth-blue bg-auth-blue/12 text-auth-blue":"border-auth-border text-auth-muted hover:text-auth-text hover:bg-white/5"}`}><Icon size={17}/><span className="text-[7px] max-w-full px-1 truncate opacity-70">{item.label}</span></button>})}</div>{filteredIcons.length===0&&<div className="h-full flex items-center justify-center text-[10px] text-auth-muted">Aucune icône trouvée.</div>}</div><p className="text-[9px] text-auth-mutedDim mt-2">L’icône reste un SVG vectoriel et prendra automatiquement la couleur choisie.</p></div><div><label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-auth-mutedDim mb-2">Couleur</label><div className="flex flex-wrap gap-2">{COLOR_CHOICES.map(color=><button disabled={saving} key={color} type="button" onClick={()=>setForm(p=>({...p,color}))} className={`w-8 h-8 rounded-full border-2 ${form.color===color?"border-white scale-110":"border-transparent"}`} style={{background:color}}/>)}</div></div><label className={`flex items-center justify-between gap-4 rounded-xl border border-auth-border bg-auth-bg/40 px-4 py-3 ${saving?"opacity-60":"cursor-pointer"}`}><div><p className="text-xs font-semibold text-auth-text">Catégorie active</p><p className="text-[10px] text-auth-muted mt-0.5">Disponible pour les futurs packs et questions du catalogue.</p></div><input disabled={saving} type="checkbox" checked={form.isActive} onChange={e=>setForm(p=>({...p,isActive:e.target.checked}))} className="accent-[#4C6FFF]"/></label></div><div className="px-6 py-4 border-t border-auth-border flex justify-end gap-2 shrink-0"><button type="button" disabled={saving} onClick={()=>setModalOpen(false)} className="px-4 py-2 rounded-lg border border-auth-border text-xs font-semibold text-auth-muted hover:text-auth-text">Annuler</button><button type="submit" disabled={saving||!form.name.trim()} className="min-w-[132px] px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#4C6FFF 0%,#9B4DFF 55%,#FF3D8E 100%)"}}>{saving&&<Loader2 size={13} className="animate-spin"/>}{saving?"Enregistrement...":editing?"Enregistrer":"Créer la catégorie"}</button></div></form></div>}
  </div>;
}
