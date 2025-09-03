# Backlog

_Last audit: 2025-09-03_
_Added: 20, Updated: 0, Resolved: 0_

_Priorities: P1 critical, P2 important, P3 nice-to-have_

## Code quality and architecture
- [P2][Code] Add ESLint config and npm lint script
  · Why: catch bugs and enforce consistent JS style
  · Evidence: package.json lacks lint script; no .eslintrc in repo

## Tests and coverage
- [P2][Tests] Add coverage reporting for Node tests
  · Why: measure test completeness and gaps
  · Evidence: package.json scripts contain only test command
- [P3][Tests] Convert stats-test.html to automated test or remove
  · Why: unused manual test increases maintenance burden
  · Evidence: test/stats-test.html not referenced in CI

## Documentation
- [P2][Docs] Add root-level CONTRIBUTING.md referencing docs/CONTRIBUTING.md
  · Why: guide contributors from repository root
  · Evidence: docs/CONTRIBUTING.md exists; none at root
- [P2][Docs] Add CODE_OF_CONDUCT.md for contributor expectations
  · Why: set community standards
  · Evidence: no code of conduct file in repository
- [P3][Docs] Update README project structure to reflect actual files
  · Why: avoid confusion during onboarding
  · Evidence: README lists files that are absent in repo

## CI/CD
- [P2][CI] Cache npm modules in tests workflow
  · Why: reduce CI time and bandwidth
  · Evidence: .github/workflows/tests.yml installs without cache
- [P2][CI] Use "npm ci" instead of "npm install" in CI
  · Why: ensure clean reproducible installs
  · Evidence: tests workflow runs "npm install"

## Security
- [P1][Security] Add SECURITY.md with vulnerability disclosure process
  · Why: provide channel for reporting security issues
  · Evidence: no SECURITY.md at repository root
- [P1][Security] Add Dependabot config for automated updates
  · Why: track security patches and outdated deps
  · Evidence: no .github/dependabot.yml file
- [P1][Security] Enable secret scanning in repository
  · Why: detect accidental credential commits
  · Evidence: no workflow or config for secret scanning
- [P2][Security] Limit GITHUB_TOKEN permissions in workflows
  · Why: principle of least privilege
  · Evidence: tests workflow lacks explicit permissions field
- [P2][Security] Add CodeQL scanning workflow
  · Why: find code vulnerabilities automatically
  · Evidence: .github/workflows contains only tests.yml

## Dependencies and build
- [P2][Deps] Commit package-lock.json for deterministic installs
  · Why: lock dev tooling versions
  · Evidence: package-lock.json missing from repository

## Release and changelog
- [P1][Release] Tag versions and section CHANGELOG accordingly
  · Why: track releases and allow reproducible builds
  · Evidence: git has no tags; changelog only has "Unreleased"
- [P2][Release] Add release workflow to automate tagging and pages deploy
  · Why: streamline release process
  · Evidence: no release workflow under .github/workflows

## Repo hygiene and metadata
- [P1][Hygiene] Add .gitignore for common Node and editor artifacts
  · Why: prevent committing generated files
  · Evidence: repo root lacks .gitignore
- [P2][Hygiene] Add .editorconfig to enforce indentation and line rules
  · Why: ensure consistent formatting across editors
  · Evidence: no .editorconfig present
- [P2][Hygiene] Add .gitattributes to normalize line endings
  · Why: avoid cross-platform diffs
  · Evidence: .gitattributes file missing
- [P2][Hygiene] Add pull request template under .github/
  · Why: standardize PR descriptions
  · Evidence: .github contains only workflows directory
