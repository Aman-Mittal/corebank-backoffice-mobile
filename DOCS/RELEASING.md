# Releasing

Builds use EAS (`eas.json`), driven by `.github/workflows/eas.yml`. The workflow only runs when
the repository variable `EAS_ENABLED` is `true`.

1. Create an Expo account and project, then add `"owner": "<expo-account>"` to `app.json`.
2. Add the `EXPO_TOKEN` secret.
3. **Preview:** a push to `main` publishes an OTA update to the `preview` channel.
4. **Production:** a tag `vX.Y.Z` starts the `production` builds for both stores. Bump `version` in
   `app.json` first.

## Web demo (GitHub Pages)

`.github/workflows/pages.yml` builds every push to `main` (or a manual run) and publishes the web
export to the `gh-pages` branch, at `https://<owner>.github.io/<repository>/`. The demo points at
the community sandbox (`https://sandbox.mifos.community`, tenant `default`), which answers CORS for
the Pages origin.

1. After the first run, set Settings → Pages → "Deploy from a branch" → `gh-pages`, folder `/`.
2. The base path comes from the repository name, so a rename needs no edit.
3. Pages has no rewrite rules. A deep link (`…/clients`) is served `404.html`, which is the app, so
   it renders correctly but with HTTP status 404.

## Bundle id

The bundle id `io.github.amanmittal.mfibackoffice` is a placeholder; change it before the
first store submission. The `e2e` build profile builds an APK that points at the emulator-reachable
docker stack (`10.0.2.2`).
