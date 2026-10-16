# Licensing

The project is **Apache-2.0** (`LICENSE`), and `NOTICE` names the copyright holder and attributions.

## File headers

New files carry the project header in `scripts/license-header.txt`. Add it with
`node scripts/add-license-header.mjs <files…>`.

Files carried over from fineract-backoffice-ui keep their original ASF header, as Apache-2.0 §4
requires. `scripts/check-license.sh` accepts either header. It checks the grant, the URL and the
"AS IS" clause, and that `LICENSE`, `NOTICE` and `DISCLAIMER.md` exist.

## Dependency policy

All dependencies, including dev, test and build tooling, must be compatible with the
[ASF third-party licence policy](https://www.apache.org/legal/resolved.html).
`scripts/check-dependency-licenses.mjs` comes from fineract-backoffice-ui. It walks `npm ls --all`
and treats each category differently:

| Verdict      | Licences                                                   | Result              |
| ------------ | ---------------------------------------------------------- | ------------------- |
| Category A   | MIT, Apache-2.0, BSD, ISC, 0BSD, CC0, CC-BY, Python-2.0, … | pass                |
| Acknowledged | BlueOak-1.0.0 (written reason in the script)               | pass, recorded      |
| Category B   | MPL, EPL, CDDL, …                                          | reported for review |
| Category X   | GPL, LGPL, AGPL, SSPL, BUSL, JSON, CC-BY-NC, …             | **blocks**          |
| Unknown      | no or unrecognised licence                                 | **blocks**          |

One local change: the script now reads the deprecated `licenses: [{type}]` array from a package's
own manifest when `npm ls` reports no licence. `exit@0.1.2`, under Jest, is the package that showed
the gap. It is MIT.

## Recorded decisions

| Package                              | Licence               | Decision                                                                                           |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------- |
| `eslint-plugin-sonarjs`              | LGPL-3.0-only (X)     | **Rejected.** Replaced by local rules and SonarCloud ([LINT_POLICY.md](LINT_POLICY.md))            |
| `sharp` / `@img/sharp-libvips-*`     | LGPL-3.0 (X)          | **Must not appear.** Expo uses `jimp-compact`; the gate blocks a transitive arrival                |
| `eslint-plugin-react-native-a11y`    | MIT                   | Not adopted (ESLint 8 and older only); licence fine                                                |
| `tamagui`                            | empty `license` field | Not adopted (would block as Unknown)                                                               |
| `axe-core`, `@axe-core/playwright`   | MPL-2.0 (B)           | Dev/test only, used unmodified, never distributed                                                  |
| `lightningcss` (+ platform binaries) | MPL-2.0 (B)           | Build tooling inside Expo's Metro config, used unmodified as a binary; not part of the shipped app |
| Mifos `web-app` (reference project)  | MPL-2.0               | **Behavioural reference only.** No code, tests or translations copied                              |
| Maestro CLI                          | Apache-2.0            | Installed in CI with curl; not an npm dependency                                                   |
| SonarCloud                           | service               | A hosted service, not a dependency; no licence impact                                              |

The current scan has 0 Category X and 0 Unknown, with 5 Category B packages (axe-core and
lightningcss), all build- or test-only. CI also produces a CycloneDX SBOM (`sbom.json`) on every
run.
