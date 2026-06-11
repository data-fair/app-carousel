# DataFair — Diaporama

*Cette application permet de créer des diaporamas déroulants à partir d'un jeu de données DataFair.*

An application for [DataFair](https://koumoul-dev.github.io/data-fair/). It is hosted [by npm and the jsdelivr CDN](https://cdn.jsdelivr.net/npm/@data-fair/app-carousel).

## Concept

L'application exploite les concepts DataFair suivants pour détecter automatiquement les colonnes du jeu de données :

- `http://schema.org/image` — colonne contenant l'URL de l'image (obligatoire)
- `http://www.w3.org/2000/01/rdf-schema#label` — colonne du titre affiché sur l'overlay
- `https://schema.org/WebPage` — colonne contenant l'URL du lien "En savoir plus"

## Configuration

Le fichier `public/config-schema.json` (généré depuis `src/config/schema.json`) décrit la configuration acceptée par l'application. Il est généré via :

```bash
npm run build-types
```

Deux onglets :

1. **Source de données** — choix du jeu de données + filtres prédéfinis (`staticFilters` `in` / `interval` / `out`)
2. **Présentation** — intervalle de rotation, cible des liens, masquage titre/liens

## Technical stack

- **Vue 3.5+** (Composition API, `<script setup lang="ts">`)
- **Vuetify 4** (`vite-plugin-vuetify`)
- **Vite 8**
- **TypeScript** strict
- `@data-fair/lib-vue`, `@data-fair/lib-vuetify`, `@data-fair/lib-utils`
- `@vueuse/core` (`useWindowSize`)
- Dev server : `df-dev-server` + Zellij layout `.zellij.kdl`

## Development Setup

Installer les dépendances :

```bash
npm install
```

Configurer l'instance DataFair visée via `.dev-config.json` (déjà présent à la racine) ou un fichier `.env` :

```
DATAFAIR_URL=https://koumoul.com/s/data-fair
DATAFAIR_OWNER_TYPE=organization or user
DATAFAIR_OWNER_ID=...
DATAFAIR_API_KEY= leave empty to use only public datasets
```

Lancer le dev server avec hot reload (Vite + `df-dev-server` dans un layout Zellij) :

```bash
npm run dev
```

Ou lancer chaque partie séparément :

```bash
npm run dev-server   # df-dev-server (reverse proxy DataFair)
npm run dev-app      # Vite (HMR)
```

## Commandes

```bash
npm run dev          # zellij layout : vite + df-dev-server
npm run dev-app      # vite only
npm run dev-server   # df-dev-server only
npm run build        # build CDN (PUBLIC_URL=jsdelivr)
npm run build-preview
npm run build-types  # génère src/config/.type/ et public/config-schema.json
npm run type-check   # vue-tsc --noEmit
npm run lint         # eslint --fix
```

## Deployment

Publier sur le registre npm global (membre de l'organisation owner) :

```bash
npm version patch|minor|major
npm publish
git push && git push --tags
```

Pour une version de test pré-publiée :

```bash
npm version prerelease --preid=staging
npm publish --tag staging
```
