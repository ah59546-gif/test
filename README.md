# Pocket Day CRM

## Live sites

- GitHub Pages: https://ah59546-gif.github.io/test/
- Sites: https://pocket-investor-crm-20261028.lemony-apple-7418.chatgpt.site/

## Automatic GitHub deployment

Every push to `main` runs `.github/workflows/deploy-pages.yml`, checks the application's JavaScript, and publishes `dist/` to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

Follow `AGENTS.md` when editing this project. A requested application change includes synchronizing GitHub and publishing both live sites, unless explicitly requested otherwise.

## Data storage

Manual edits are stored in browser localStorage. Existing data on the Sites domain does not automatically transfer to the GitHub Pages domain. Deployment updates code, not records saved in other browsers or domains.

## Local preview

Run `node preview-server.mjs` and open http://127.0.0.1:4173.

