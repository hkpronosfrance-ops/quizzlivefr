# QuizzLiveFR

Système de quiz automatisé pour TikTok Live (`@quizzlivefr`), utilisé avec TikTok Live Studio.

## Architecture

- **`worker/`** — Bot Node.js (déployé sur Railway) qui écoute les commentaires du live via `tiktok-live-connector`, parse les votes A/B/C/D, et les insère dans Supabase.
- **`app/`** — Application Next.js (déployée sur Vercel) :
  - `/` — Overlay transparent à ajouter comme source Browser dans OBS/TikTok Live Studio (question, chrono, votes en direct, classement).
  - `/admin` — Panneau de contrôle protégé par mot de passe : tu tapes la question et cliques "Lancer", tout le reste (chrono 30s, comptage, classement cumulé) est automatique.
- **Supabase** — Base de données + Realtime (aucun serveur à gérer, calcul des points fait par triggers SQL).

## Comment ça marche pendant un live

1. Tu lances ton live sur TikTok Live Studio.
2. Le bot Railway tourne en continu et se connecte automatiquement dès que le live démarre (reconnexion auto si le live n'a pas encore commencé).
3. Tu ouvres `/admin`, tu tapes ta question + réponses, tu cliques "Lancer la question".
4. L'overlay (`/`) affiche la question avec un chrono de 30s, les votes arrivent en temps réel, le classement se met à jour tout seul.
5. Après 30s, l'overlay révèle la bonne réponse. Tu peux enchaîner avec la question suivante.

## Mise en route

### 1. Variables d'environnement

Copie `.env.example` → `.env.local` (app) et `worker/.env.example` → `worker/.env` (bot), puis remplis `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard → Project Settings → API → `service_role`). Ne commite jamais cette clé.

### 2. App Next.js (Vercel)

```bash
npm install
npm run dev   # test en local sur http://localhost:3000
```

Déploiement : connecté à Vercel, chaque push sur `main` redéploie automatiquement. Pense à renseigner les 4 variables d'environnement dans Vercel → Project Settings → Environment Variables.

### 3. Bot (Railway)

```bash
cd worker
npm install
npm start
```

Sur Railway : nouveau service depuis ce repo, root directory `worker/`, start command `npm start`, variables d'environnement `TIKTOK_USERNAME`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### 4. OBS / TikTok Live Studio

Ajoute une source **Browser** pointant vers l'URL Vercel de production (`https://ton-projet.vercel.app`), fond transparent déjà géré par le CSS.

## Format des votes acceptés

Le bot reconnaît la première lettre isolée A, B, C ou D dans un commentaire (insensible à la casse) — donc "A", "a", "je dis A", "🅰️ A" fonctionnent tous.
