"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Globe,
  Trophy,
  Film,
  Landmark,
  Map,
  Music,
  FlaskConical,
  Gamepad2,
  Cpu,
  Star,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  FolderOpen,
  Users2,
  Crown,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { AdminTopControls } from "@/components/AdminTopControls";
import { useAdminToast } from "@/components/AdminToastContext";

type Category = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  questions: number;
  usagePct: number;
  createdAt: string;
};

const ICON_CHOICES: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: "Globe" },
  { icon: Trophy, label: "Trophée" },
  { icon: Film, label: "Film" },
  { icon: Landmark, label: "Monument" },
  { icon: Music, label: "Musique" },
  { icon: FlaskConical, label: "Sciences" },
  { icon: Gamepad2, label: "Jeu" },
  { icon: Star, label: "Étoile" },
];

const COLOR_CHOICES = ["#9B4DFF", "#22C55E", "#4C6FFF", "#F5A623", "#3DDCFF", "#FF3D8E", "#14B8A6", "#6366F1"];

const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Culture générale", description: "Connaissances générales et faits divers", icon: Globe, color: "#9B4DFF", questions: 2012, usagePct: 42, createdAt: "15/01/2025" },
  { id: "2", name: "Sport", description: "Sports, athlètes, compétitions et records", icon: Trophy, color: "#22C55E", questions: 876, usagePct: 18, createdAt: "15/01/2025" },
  { id: "3", name: "Cinéma & TV", description: "Films, séries, acteurs et réalisateurs", icon: Film, color: "#4C6FFF", questions: 654, usagePct: 14, createdAt: "16/01/2025" },
  { id: "4", name: "Histoire", description: "Événements historiques et personnalités", icon: Landmark, color: "#F5A623", questions: 521, usagePct: 11, createdAt: "16/01/2025" },
  { id: "5", name: "Géographie", description: "Pays, capitales, lieux et monuments", icon: Map, color: "#3DDCFF", questions: 398, usagePct: 8, createdAt: "17/01/2025" },
  { id: "6", name: "Musique", description: "Artistes, albums, chansons et genres", icon: Music, color: "#FF3D8E", questions: 287, usagePct: 6, createdAt: "18/01/2025" },
  { id: "7", name: "Sciences", description: "Sciences, technologie et innovations", icon: FlaskConical, color: "#9B4DFF", questions: 182, usagePct: 4, createdAt: "18/01/2025" },
  { id: "8", name: "Jeux vidéo", description: "Jeux, consoles, personnages et studios", icon: Gamepad2, color: "#F5A623", questions: 156, usagePct: 3, createdAt: "19/01/2025" },
  { id: "9", name: "Intelligence artificielle", description: "IA, machine learning et technologies", icon: Cpu, color: "#6B7086", questions: 64, usagePct: 2, createdAt: "19/05/2025" },
  { id: "10", name: "Autres", description: "Divers et catégories spéciales", icon: Star, color: "#6B7086", questions: 0, usagePct: 0, createdAt: "20/05/2025" },
];

export default function CategoriesPage() {
  const notify = useAdminToast();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState(0);
  const [newColor, setNewColor] = useState(0);

  const filtered = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const totalQuestions = categories.reduce((sum, c) => sum + c.questions, 0);
  const mainCategory = [...categories].sort((a, b) => b.usagePct - a.usagePct)[0];
  const lastAdded = categories[categories.length - 1];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const cat: Category = {
      id: String(Date.now()),
      name: newName.trim(),
      description: newDesc.trim() || "Aucune description",
      icon: ICON_CHOICES[newIcon].icon,
      color: COLOR_CHOICES[newColor],
      questions: 0,
      usagePct: 0,
      createdAt: new Date().toLocaleDateString("fr-FR"),
    };
    setCategories((prev) => [...prev, cat]);
    setShowModal(false);
    setNewName("");
    setNewDesc("");
    setNewIcon(0);
    setNewColor(0);
    notify(`Catégorie « ${cat.name} » créée.`);
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between -mt-2 mb-2">
        <div>
          <h1 className="text-auth-text font-bold text-2xl">Catégories</h1>
          <p className="text-auth-muted text-sm">Gérez les catégories de questions disponibles dans vos quiz.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-mutedDim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="bg-auth-panel border border-auth-border rounded-lg pl-9 pr-3 py-2 text-sm text-auth-text outline-none focus:border-auth-blue w-56 placeholder:text-auth-mutedDim"
            />
          </div>
          <button
            onClick={() => notify("Filtres avancés — bientôt disponible.")}
            className="flex items-center gap-1.5 border border-auth-border rounded-lg px-3 py-2 text-auth-text text-sm hover:bg-white/5 transition"
          >
            <Filter size={14} /> Filtrer
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-white text-sm font-semibold"
            style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
          >
            <Plus size={15} /> Nouvelle catégorie
          </button>
          <AdminTopControls />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-auth-panel border border-auth-border rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-auth-purple/20 text-auth-purple">
            <FolderOpen size={17} />
          </div>
          <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">Catégories totales</p>
          <p className="text-auth-text text-2xl font-bold mb-1">{categories.length}</p>
          <p className="text-auth-positive text-xs">+2 ce mois-ci</p>
        </div>
        <div className="bg-auth-panel border border-auth-border rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-auth-blue/20 text-auth-blue">
            <Users2 size={17} />
          </div>
          <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">Questions associées</p>
          <p className="text-auth-text text-2xl font-bold mb-1">{totalQuestions.toLocaleString("fr-FR")}</p>
          <p className="text-auth-positive text-xs">+128 ce mois-ci</p>
        </div>
        <div className="bg-auth-panel border border-auth-border rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-auth-positive/20 text-auth-positive">
            <Crown size={17} />
          </div>
          <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">Catégorie principale</p>
          <p className="text-auth-text text-lg font-bold mb-1">{mainCategory.name}</p>
          <p className="text-auth-mutedDim text-xs">{mainCategory.usagePct}% des questions</p>
        </div>
        <div className="bg-auth-panel border border-auth-border rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-auth-live/20 text-auth-live">
            <Clock size={17} />
          </div>
          <p className="text-auth-mutedDim text-[10px] font-bold uppercase tracking-wide mb-1">Dernière ajoutée</p>
          <p className="text-auth-text text-lg font-bold mb-1">{lastAdded.name}</p>
          <p className="text-auth-mutedDim text-xs">Ajoutée récemment</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-auth-panel border border-auth-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-auth-mutedDim text-[10px] uppercase tracking-wide border-b border-auth-border">
              <th className="text-left px-5 py-3 font-medium">Catégorie</th>
              <th className="text-left px-2 py-3 font-medium">Description</th>
              <th className="text-left px-2 py-3 font-medium">Questions</th>
              <th className="text-left px-2 py-3 font-medium">Utilisation</th>
              <th className="text-left px-2 py-3 font-medium">Créée le</th>
              <th className="text-left px-2 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const Icon = c.icon;
              return (
                <tr key={c.id} className="border-b border-auth-border last:border-b-0 hover:bg-white/[0.03] transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${c.color}22`, color: c.color }}>
                        <Icon size={17} />
                      </div>
                      <span className="text-auth-text font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-auth-muted text-xs">{c.description}</td>
                  <td className="px-2 py-3 text-auth-text font-semibold">{c.questions.toLocaleString("fr-FR")}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 w-40">
                      <div className="flex-1 h-1.5 rounded-full bg-auth-bg overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.usagePct}%`, background: c.color }} />
                      </div>
                      <span className="text-auth-mutedDim text-xs w-8 text-right">{c.usagePct}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-auth-muted text-xs">{c.createdAt}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => notify("Modifier — bientôt disponible.")}
                        className="w-7 h-7 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text hover:bg-white/5 transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer la catégorie « ${c.name} » ?`)) {
                            setCategories((prev) => prev.filter((x) => x.id !== c.id));
                            notify(`Catégorie « ${c.name} » supprimée.`);
                          }
                        }}
                        className="w-7 h-7 rounded-lg border border-auth-danger/40 flex items-center justify-center text-auth-danger hover:bg-auth-danger/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => notify("Options — bientôt disponible.")}
                        className="w-7 h-7 rounded-lg border border-auth-border flex items-center justify-center text-auth-muted hover:text-auth-text hover:bg-white/5 transition"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-auth-mutedDim text-xs">
                  Aucune catégorie ne correspond à cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-auth-border text-xs text-auth-mutedDim">
          <span>Affichage 1 à {filtered.length} sur {categories.length} catégories</span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronLeft size={13} /></button>
            <span className="w-7 h-7 flex items-center justify-center rounded bg-auth-blue text-white font-semibold">1</span>
            <button onClick={() => notify("Pagination — bientôt disponible.")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/5 transition">2</button>
            <button className="p-1.5 rounded border border-auth-border hover:bg-white/5 transition"><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {/* Create category modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="bg-auth-panel border border-auth-border rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-auth-border flex items-center justify-between">
              <span className="text-auth-text font-bold text-sm">Nouvelle catégorie</span>
              <button type="button" onClick={() => setShowModal(false)} className="text-auth-mutedDim hover:text-auth-text transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-auth-text text-sm">Nom</span>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex. Cuisine du monde"
                  className="bg-auth-bg border border-auth-border rounded-lg px-3.5 py-2.5 text-sm text-auth-text outline-none focus:border-auth-blue placeholder:text-auth-mutedDim"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-auth-text text-sm">Description</span>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex. Plats, ingrédients et traditions culinaires"
                  className="bg-auth-bg border border-auth-border rounded-lg px-3.5 py-2.5 text-sm text-auth-text outline-none focus:border-auth-blue placeholder:text-auth-mutedDim"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-auth-text text-sm">Icône</span>
                <div className="flex flex-wrap gap-2">
                  {ICON_CHOICES.map(({ icon: Icon, label }, i) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setNewIcon(i)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border transition ${
                        newIcon === i ? "border-auth-blue bg-auth-blue/15 text-auth-blue" : "border-auth-border text-auth-muted hover:text-auth-text"
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-auth-text text-sm">Couleur</span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_CHOICES.map((c, i) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewColor(i)}
                      className="w-8 h-8 rounded-full transition"
                      style={{ background: c, outline: newColor === i ? `2px solid ${c}` : "none", outlineOffset: 2, opacity: newColor === i ? 1 : 0.6 }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="rounded-lg py-2.5 text-white text-sm font-semibold mt-1"
                style={{ background: "linear-gradient(90deg, #4C6FFF 0%, #9B4DFF 100%)" }}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
