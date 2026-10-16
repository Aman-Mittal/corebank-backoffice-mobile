# Sonar

Sonar analysis runs **server-side on SonarCloud**, which is a hosted service and not a project
dependency, so it has no licence impact. The ESLint plugin `eslint-plugin-sonarjs` is LGPL and is
not used ([LINT_POLICY.md](LINT_POLICY.md)).

## Set up (once, on your fork)

1. Sign in at sonarcloud.io with GitHub and import the repository.
2. In `sonar-project.properties`, replace `<sonarcloud-org>` in `sonar.organization` and
   `sonar.projectKey`.
3. Add the `SONAR_TOKEN` repository secret. The CI step is skipped while it is missing.
4. In SonarCloud, turn **Automatic Analysis off**: CI analysis is what imports the coverage
   (`coverage/lcov.info`) and the ESLint report (`eslint-report.json`).
5. Optionally make the Quality Gate a required status check.

The generated API types are excluded from analysis, duplication and coverage.

## In the editor: SonarQube for IDE (SonarLint)

Install **SonarQube for IDE** for VS Code or IntelliJ. Bind it in _connected mode_ to the
SonarCloud project, so the editor uses the same rules and quality profile as CI. In VS Code the
binding is stored in `.vscode/settings.json`:

```json
{
  "sonarlint.connectedMode.project": {
    "connectionId": "<sonarcloud-org>",
    "projectKey": "<sonarcloud-org>_mfi-backoffice-mobile"
  }
}
```

The IDE extension is a developer tool installed per machine, not a project dependency.
