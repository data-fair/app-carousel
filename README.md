# DataFair — Carousel

*Cette application affiche des images qui défilent : un diaporama de photos, image par image, ou un bandeau continu de logos. Les images viennent d'un jeu de données DataFair ou des pièces jointes de l'application.*

An application for [DataFair](https://github.com/data-fair/data-fair). It is hosted [by npm and the jsdelivr CDN](https://cdn.jsdelivr.net/npm/@data-fair/app-carousel).

## Sources des images

- **Jeu de données** : une colonne au concept `http://schema.org/image` (adresse d'une image, servie en vignette à la taille des diapositives) ou `http://schema.org/DigitalDocument` (pièce jointe de ligne, servie telle quelle). Le titre vient de la colonne au concept `http://www.w3.org/2000/01/rdf-schema#label`, le lien de la colonne au concept `https://schema.org/WebPage`. Filtres prédéfinis et tri au choix.
- **Pièces jointes de l'application** : une liste d'images, chacune avec son titre et son lien.

## Configuration

`public/config-schema.json` est le schéma du formulaire de configuration, écrit à la main ; `npm run build-types` en génère les types TypeScript. Quatre sections :

1. **Source des images** : jeu de données (filtres, tri) ou pièces jointes de l'application.
2. **Défilement** : image par image (durée d'affichage, 0 pour un défilement manuel) ou continu (vitesse) ; sens.
3. **Images** : nombre d'images visibles (réduit automatiquement selon la largeur de l'application), cadrage (remplir le cadre ou image entière), espacement, marge, fond blanc pour des logos, niveaux de gris.
4. **Titre et lien** : titre sur l'image, sous l'image ou masqué ; bouton « En savoir plus », image cliquable ou aucun lien.

Les configurations des versions 0.x et 1.x (`interval`, `hideTitle`, `distactivateLinks`) sont encore lues : voir `src/utils/legacy-config.ts`.

## Accessibilité

Tout ce qui défile seul se met en pause : bouton pause, survol de la souris, focus clavier, préférence de mouvement réduit. Les diapositives masquées sont inertes, les liens sont nommés par le titre de l'image.

## Développement

```bash
npm install
npm run dev          # zellij : vite + df-dev-server (ports dans un .env généré par df-dev-env)
npm run dev-app      # vite seul
npm run dev-server   # df-dev-server seul
```

Le data-fair visé se règle dans le `.env` (jamais commité) :

```
DATAFAIR_URL=https://staging-koumoul.com/data-fair
DATAFAIR_OWNER_TYPE=organization
DATAFAIR_OWNER_ID=...
DATAFAIR_API_KEY=   # vide : jeux de données publics seulement
```

## Commandes

```bash
npm run build-types  # types générés depuis public/config-schema.json
npm run lint         # lint-fix pour corriger
npm run type-check
npm run test-unit    # tests unitaires (sans navigateur)
npm run test-e2e     # tests e2e, données simulées
npm run quality      # tout, lancé par le hook pre-push
npm run build        # build CDN (PUBLIC_URL=jsdelivr)
```

## Publication

```bash
npm version patch|minor|major
npm publish
git push && git push --tags
```
