# Pocket Day CRM

Pocket Day investment relationship workspace.

## Publish with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy Pocket Day → Run workflow** (or push a change to `main`).

The workflow publishes the static files in `dist/`.

## Data storage

This app stores manual edits in browser localStorage. Data from a different domain is not automatically transferred.

## Local preview

Run `node preview-server.mjs` and open `http://127.0.0.1:4173`.
