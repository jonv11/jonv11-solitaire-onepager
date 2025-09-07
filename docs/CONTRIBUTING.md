# Contributing Guidelines

Thank you for considering contributing to **Solitaire One-Pager**.  
This project is designed to remain lightweight, modular, and easy to maintain.  
Please read the following guidelines before opening an issue or submitting a pull request.

---

## How to Contribute

### Reporting Issues
- Use the [GitHub Issues](../../issues) tracker.  
- Provide a **clear description** of the problem, expected vs actual behavior, and steps to reproduce.  
- Include browser/OS details and screenshots if relevant.

### Feature Requests
- Open a new issue with the label `enhancement`.  
- Describe the **use case** and why the feature benefits players.  
- Keep in mind the philosophy: **simple, responsive, client-only app**.

### Code Contributions
1. **Fork** the repository and create a branch from `develop`.  
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Make your changes:
   - Keep code modular (Engine, UI, Model separation).
   - Document new functions with short JSDoc-style comments.
   - Update CSS with responsive design in mind (cards must fit on small screens).
3. **Lint / Test** locally before committing:
   - Ensure the game loads cleanly in at least one modern desktop browser and one mobile browser.
   - Avoid console errors/warnings.
   - Run `npm run lint` for JS, HTML, and CSS.
   - Add unit tests for all code-based parts that are testable and keep them passing (`npm test`). Tests use Jest and live under `tests/`.
4. **Commit** using clear messages:
   ```
   feat: add auto-move to foundations
   fix: prevent card text selection on mobile
   chore: update README with live demo link
   ```
5. **Push** your branch and open a Pull Request against `develop`.

---

## Project Standards

- **Languages**: Vanilla JavaScript, CSS, HTML.  
- **No external frameworks** (only jQuery as optional fallback for cookies).  
- **CSS**: Use CSS variables (`--card-w`, `--gap`) and media queries for responsiveness.  
- **JavaScript**:
  - Avoid global state except the `Engine`, `UI`, and `Controller`.
  - Use event emitters for communication between Engine and UI.
  - Prefer pure functions in `model.js`.
- **Accessibility**: 
  - Respect ARIA attributes (`role`, `aria-label`, `aria-live`).
  - Ensure the game is usable with keyboard navigation.
- **Performance**:
  - Use `requestAnimationFrame` for drag updates.
  - Minimize DOM reflows/repaints.

---

## Development Workflow

- Default branch: `main` → stable, published to GitHub Pages.  
- Development branch: `develop` → open PRs here.  
- Protect `main`: do not push directly, only merge tested features via PR.

---

## Node projects

- Use `npm install` to add or update dependencies and commit the resulting `package-lock.json`.
- Continuous Integration uses Node.js LTS 20 and runs lint and Jest. See `.github/workflows/ci.yml`.
- CI fails if `package.json` and `package-lock.json` drift out of sync.

---

## License

By contributing, you agree that your code will be licensed under the [MIT License](LICENSE) of this repository.
