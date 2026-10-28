# Pocket Day CRM

## Live sites

- GitHub Pages: https://ah59546-gif.github.io/test/
- Sites: https://pocket-investor-crm-20261028.lemony-apple-7418.chatgpt.site/

## Automatic GitHub deployment

Every push to `main` runs `.github/workflows/deploy-pages.yml`, checks the application's JavaScript, and publishes `dist/` to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

Follow `AGENTS.md` when editing this project. A requested application change includes synchronizing GitHub and publishing both live sites, unless explicitly requested otherwise.

## Data storage

Manual edits keep using the existing browser localStorage keys as a local cache and are synchronized to the `pocket-kpi-crm-prod` Supabase project. After signing in with an allowed account, the GitHub Pages and Sites deployments read and write the same CRM records. On the first connection, sign in first on the domain that already contains the records to seed the shared store.

## Local preview

Run `node preview-server.mjs` and open http://127.0.0.1:4173.

