# Agent Guide – @data-fair/app-carousel

`app-carousel` is a **DataFair visualization plugin** that renders a configurable
diaporama/carousel from a single DataFair dataset. Published on npm as
`@data-fair/app-carousel` and served via jsDelivr CDN.

## Tech Stack

- **Vue 3** (Composition API, `<script setup lang="ts">`)
- **Vuetify 4** (`<v-carousel>`, `<v-carousel-item>`, `<v-img>`, `<v-overlay>`)
- **TypeScript** strict
- **Vite 8** + `vite-plugin-vuetify`
- **`@data-fair/lib-vue`** (`useFetch`, `createSession`, `createUiNotif`, `createLocaleDayjs`, `reactiveSearchParams`)
- **`@data-fair/lib-vuetify`** (`vuetifySessionOptions`, `DfUiNotif`)
- **`@data-fair/lib-utils`** (`filters2qs`)
- **`@vueuse/core`** (`useWindowSize`)

> **Note** : `vite.config.mjs` inclut un petit plugin inline `vueI18nCustomBlock` qui transforme les blocs SFC `<i18n lang="yaml">` (utilisés par `@data-fair/lib-vuetify@2.4+` dans `DfUiNotif`) en modules JS. C'est un workaround pour un bug de `@vitejs/plugin-vue@6.0.7` qui ne transforme pas ces blocs. À retirer si le plugin officiel gère nativement le type `i18n`.

## Project Structure

```
├── .zellij.kdl                  # Layout dev (vite + df-dev-server)
├── index.html                   # %APPLICATION% + meta tags df:*
├── vite.config.mjs
├── tsconfig.json
├── eslint.config.js
├── package.json
├── public/
│   ├── config-schema.json       # Généré depuis src/config/.type/resolved-schema.json
│   ├── favicon.ico
│   └── thumbnail.png
├── src/
│   ├── main.ts                  # Bootstrap : createSession + createVuetify + createUiNotif + createLocaleDayjs + createConfig. vIframeOptions exposé au niveau module.
│   ├── App.vue                  # Racine : v-empty-state sur erreur de config, sinon <Carousel>. Signale les erreurs à DataFair en mode draft.
│   ├── types.d.ts               # Window.APPLICATION, vIframeOptions, types générés
│   ├── composables/
│   │   ├── config.ts            # createConfig plugin + useConfig (lecture de window.APPLICATION, listener postMessage 'set-config' pour hot-reload)
│   │   └── useData.ts           # useFetch réactif sur /lines, détection imageField/labelField/webPageField, calcul du qs avec _exists_:{imageField.key}
│   ├── components/
│   │   └── Carousel.vue         # <v-carousel> + <v-carousel-item> avec overlay titre + bouton "En savoir plus"
│   ├── config/
│   │   ├── schema.json          # VJSF v3 : 2 onglets (Source de données, Présentation), filtres oneOf discriminator
│   │   └── index.ts             # Re-export types générés
│   └── styles/
│       └── settings.scss
└── README.md
```

## DataFair Conventions

- **`%APPLICATION%`** dans `index.html` → `window.APPLICATION` (rempli par le reverse proxy DataFair). Typé dans `src/types.d.ts` comme `Application & { href: string }`.
- **`public/config-schema.json`** doit exister à `/config-schema.json`. DataFair le fetch pour construire le formulaire de config. Régénéré via `npm run build-types` (`df-build-types && ncp src/config/.type/resolved-schema.json public/config-schema.json`).
- **Meta tags** dans `index.html` (`application-name`, `title`, `description`, `thumbnail`, `df:*`) utilisés lors de l'import de l'app.
- **Filtres par concepts** (`x-refersTo`) : l'app détecte les colonnes `image`, `label` et `WebPage` dans le schema injecté via `window.APPLICATION.configuration.datasets[0].schema`.

## Concepts utilisés

| Concept | Usage |
|---|---|
| `http://schema.org/image` | URL de l'image (obligatoire) |
| `http://www.w3.org/2000/01/rdf-schema#label` | Titre affiché sur l'overlay (peut être masqué) |
| `https://schema.org/WebPage` | Lien "En savoir plus" (peut être masqué) |

## Key Patterns

### createConfig / useConfig
`createConfig()` lit `window.APPLICATION.configuration` et expose des refs typées :
`config`, `dataset`, `fields`, `datasetUrl`, `finalizedAt`, `error`. Le plugin écoute
les `postMessage({ type: 'set-config', ... })` pour le hot-reload en mode draft.

### useData
Composable qui :
- Détecte `imageField`, `labelField`, `webPageField` par `x-refersTo`
- Construit un `qs` avec `filters2qs([...staticFilters, "_exists_:{imageField.key}"])`
- Lance un `useFetch` réactif sur `${datasetUrl}/lines` avec `select`, `thumbnail` (basé sur `useWindowSize`), `size: 100`, `finalizedAt`
- Expose `data`, `linesError`, `dataError`

### App.vue
Affiche `v-empty-state` sur erreur de config ou de données, sinon `Carousel`.
Surveille `[error, dataError, linesError]` et signale à DataFair via `ofetch('/error', { method: 'POST' })` en mode draft.

### Carousel.vue
`<v-carousel>` cyclique avec `:interval` (depuis `config.interval`, en secondes) et
`:eager` pour précharger les items adjacents. Overlay `<v-overlay>` avec le label
et le bouton "En savoir plus" (URL normalisée avec préfixe `http://` si manquant).

## Development Workflow

```bash
npm install
npm run dev          # zellij layout : vite + df-dev-server
npm run dev-app      # vite only
npm run dev-server   # df-dev-server only
npm run build-types  # régénère les types TS et public/config-schema.json
npm run type-check
npm run lint
npm run build        # build de publication CDN
```

## Notes for Agents

- Ne **pas** modifier `window.APPLICATION` ; c'est le contrat avec DataFair.
- Ne **pas** renommer/déplacer `public/config-schema.json` sans mettre à jour le script `build-types`.
- Préserver les **noms de champs** (`interval`, `linksTarget`, `distactivateLinks`, `hideTitle`, `datasets`, `staticFilters`) pour ne pas casser les visus DataFair installées.
- Tous les fichiers source sont en TypeScript (`.ts` / `.vue` avec `lang="ts"`).
- `src/types.d.ts` étend l'interface `Window` ; y ajouter les nouveaux globals si besoin.
