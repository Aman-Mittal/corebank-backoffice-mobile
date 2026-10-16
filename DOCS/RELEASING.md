# Releasing

Builds use EAS (`eas.json`), driven by `.github/workflows/eas.yml`. The workflow only runs when
the repository variable `EAS_ENABLED` is `true`.

1. Create an Expo account and project, then add `"owner": "<expo-account>"` to `app.json`.
2. Add the `EXPO_TOKEN` secret.
3. **Preview:** a push to `main` publishes an OTA update to the `preview` channel.
4. **Production:** a tag `vX.Y.Z` starts the `production` builds for both stores. Bump `version` in
   `app.json` first.

The bundle id `io.github.amanmittal.corebankbackoffice` is a placeholder; change it before the
first store submission. The `e2e` build profile builds an APK that points at the emulator-reachable
docker stack (`10.0.2.2`).
