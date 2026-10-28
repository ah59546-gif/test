# Pocket Day CRM working agreement

## Source and deployments

- Editable application files are in `dist/`; this is a buildless HTML/CSS/JavaScript application.
- GitHub source repository: `ah59546-gif/test`, default branch `main`.
- GitHub Pages URL: `https://ah59546-gif.github.io/test/`.
- GitHub deployment workflow: `.github/workflows/deploy-pages.yml` (`Deploy Pocket Day`). Pushes to `main` publish `dist/` automatically.
- Existing Sites project: `appgprj_6ae187aa70c081918dce83e3a2da1d1e` (see `.openai/hosting.json`).
- Existing Sites URL: `https://pocket-investor-crm-20261028.lemony-apple-7418.chatgpt.site/`.

## Completion includes publication

The user explicitly authorized future requested application changes to be reflected on all deployed pages. Unless a later request says local-only or no publishing, complete all of the following:

1. Inspect the current local state and remote `main`; preserve unrelated changes on both sides.
2. Implement the requested change and validate JavaScript with `node --check` for the changed scripts.
3. Synchronize the application source, this working agreement, the README, and the deployment workflow to GitHub `main`. Use authenticated Git if available; otherwise use the connected GitHub tools. Read the latest head and base tree before creating a commit; make a fast-forward ref update with the expected head. Never force-push over user changes.
4. Check the GitHub Actions run for that exact source commit. Wait for success, investigate failures, and verify the deployed URL before claiming publication is complete.
5. Publish the same application source to the existing Sites project using the available Sites skill and tools. Preserve its existing audience and confirm the returned deployment status.
6. Report completion with the actual live URLs, or clearly identify which deployment remains blocked. Do not describe an uploaded commit or an in-progress workflow as a successful deployment.

Do not publish `.git/`, credentials, `.openai/`, temporary archives, or browser-local user data to GitHub. Keep assets relative so the app works under `/test/` as well as the Sites root.

## Runtime data

The application keeps its established localStorage keys as an offline/browser cache and synchronizes mutable CRM records through the `pocket-kpi-crm-prod` Supabase project. The shared table is protected by RLS and only the explicitly allowed Pocket CRM accounts can read or write it. Preserve the storage keys and the `dist/shared-sync.js` bootstrap when changing runtime behavior so the GitHub Pages and Sites deployments continue to use the same records.
