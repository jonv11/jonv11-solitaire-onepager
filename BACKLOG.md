# Backlog

Last audit: 2025-09-06
Added: 3, Updated: 4, Resolved: 16

Priorities: P1 critical, P2 important, P3 nice-to-have

## Code quality and architecture
- [x][P2][Code] Add ESLint config and npm lint script (auto-checked on 2025-09-06)
  - Why: catch bugs and enforce consistent JS style
  - Evidence: package.json defines lint script; .eslintrc.json present

## Tests and coverage
- [x][P2][Tests] Add coverage reporting for Node tests (auto-checked on 2025-09-06)
  - Why: measure test completeness and gaps
  - Evidence: .nycrc.json defines coverage; test.yml uploads coverage
- [x][P3][Tests] Convert stats-test.html to automated test or remove (auto-checked on 2025-09-06)
  - Why: unused manual test increases maintenance burden
  - Evidence: stats-test.html removed from repository
- [P2][Tests] Integrate Jest auto-play tests into CI
  - Why: ensure auto-play functionality is exercised
  - Evidence: tests/auto.spec.js not executed in test.yml
- [P3][Tests] Remove or port browser-run stats.test.js to Node test
  - Why: browser-only test not covered by CI
  - Evidence: js/stats.test.js is a standalone browser test

## Documentation
- [x][P2][Docs] Add root-level CONTRIBUTING.md referencing docs/CONTRIBUTING.md (auto-checked on 2025-09-06)
  - Why: guide contributors from repository root
  - Evidence: CONTRIBUTING.md exists at repo root
- [x][P2][Docs] Add CODE_OF_CONDUCT.md for contributor expectations (auto-checked on 2025-09-06)
  - Why: set community standards
  - Evidence: CODE_OF_CONDUCT.md present
- [P2][Docs] Update README CI section to reflect current workflows
  - Why: README references obsolete node-ci.yml
  - Evidence: README.md lines 272-279 mention `.github/workflows/node-ci.yml`

## CI/CD
- [x][P2][CI] Cache npm modules in tests workflow (auto-checked on 2025-09-06)
  - Why: reduce CI time and bandwidth
  - Evidence: test.yml uses actions/setup-node cache
- [P2][CI] Use npm ci instead of npm install in CI
  - Why: ensure clean reproducible installs
  - Evidence: test.yml runs `npm install --no-audit --no-fund`
- [P2][CI] Add lint job to CI workflow
  - Why: enforce code style in CI
  - Evidence: test.yml comment notes linting not yet integrated

## Security
- [x][P1][Security] Add SECURITY.md with vulnerability disclosure process (auto-checked on 2025-09-06)
  - Why: provide channel for reporting security issues
  - Evidence: SECURITY.md present
- [x][P1][Security] Add Dependabot config for automated updates (auto-checked on 2025-09-06)
  - Why: track security patches and outdated deps
  - Evidence: .github/dependabot.yml exists
- [P1][Security] Enable secret scanning in repository
  - Why: detect accidental credential commits
  - Evidence: issues/enable-github-advanced-security.md recommends secret scanning
- [x][P2][Security] Limit GITHUB_TOKEN permissions in workflows (auto-checked on 2025-09-06)
  - Why: principle of least privilege
  - Evidence: test.yml sets permissions: contents: read
- [x][P2][Security] Add CodeQL scanning workflow (auto-checked on 2025-09-06)
  - Why: find code vulnerabilities automatically
  - Evidence: codeql.yml workflow exists

## Dependencies and build
- [x][P2][Deps] Commit package-lock.json for deterministic installs (auto-checked on 2025-09-06)
  - Why: lock dev tooling versions
  - Evidence: package-lock.json present

## Release and changelog
- [P1][Release] Tag versions and section CHANGELOG accordingly
  - Why: track releases and allow reproducible builds
  - Evidence: `git tag --list` shows no tags; CHANGELOG.md has 0.1.0 entry
- [x][P2][Release] Add release workflow to automate tagging and pages deploy (auto-checked on 2025-09-06)
  - Why: streamline release process
  - Evidence: release.yml workflow exists

## Repo hygiene and metadata
- [x][P1][Hygiene] Add .gitignore for common Node and editor artifacts (auto-checked on 2025-09-06)
  - Why: prevent committing generated files
  - Evidence: .gitignore present
- [x][P2][Hygiene] Add .editorconfig to enforce indentation and line rules (auto-checked on 2025-09-06)
  - Why: ensure consistent formatting across editors
  - Evidence: .editorconfig present
- [x][P2][Hygiene] Add .gitattributes to normalize line endings (auto-checked on 2025-09-06)
  - Why: avoid cross-platform diffs
  - Evidence: .gitattributes file present
- [x][P2][Hygiene] Add pull request template under .github/ (auto-checked on 2025-09-06)
  - Why: standardize PR descriptions
  - Evidence: .github/pull_request_template.md exists
