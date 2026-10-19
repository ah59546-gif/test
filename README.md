# Pocket Day CRM

## GitHub Pages deployment

Open [Settings → Pages](https://github.com/ah59546-gif/test/settings/pages), select **GitHub Actions** as the publishing source, then run **Deploy Pocket Day** from [Actions](https://github.com/ah59546-gif/test/actions).

The workflow publishes `dist/`. The expected address is https://ah59546-gif.github.io/test/ after a successful deployment.

## Data storage

Manual edits are stored in browser localStorage. Existing data on the Sites domain does not automatically transfer to the GitHub Pages domain.

## Local preview

Run `node preview-server.mjs` and open http://127.0.0.1:4173.
