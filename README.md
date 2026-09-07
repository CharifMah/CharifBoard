# CharifBoard

Site portfolio de Mahmoud Charif : https://charifmah.github.io/CharifBoard/

## Stack

- Angular 22 (standalone, SCSS) dans `app/`
- Déploiement GitHub Pages automatique via GitHub Actions (`.github/workflows/static.yml`)

## Développement

```bash
cd app
npm install
npm start          # serve dev sur http://localhost:4200
npm run build      # build production dans app/dist/charifboard-app/browser
```

## Structure

- `app/src/app/components/` : stars-background, title, social-bar, about, cards, windows-host, sliders
- `app/public/images/` : assets (CV.pdf, créations WPF/Cinema4D/AfterEffect, logos)
- `index.htm` + `CSS/` + `Scripts/` : ancienne version statique (remplacée par l'app Angular)