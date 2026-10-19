# Agent instructions

Lucent: a glassmorphism theme for the Zalo desktop app (macOS, Windows, Linux). "Build" = patch Zalo's `app.asar` by injecting `theme/*` into it. No compile step, no `package.json`, no dependencies, no test suite. Source comments, UI strings, pet quotes and `README.md` are Vietnamese; this file and `docs/` are English.

## Commands

```bash
./install.sh                # build + install (kills Zalo, backs up, patches, reopens)
./install.sh --uninstall    # restore the original
node --check install.mjs asar.mjs theme/*.js   # syntax check
```

Windows: `powershell -ExecutionPolicy Bypass -File install.ps1`. Every change to `theme/` needs a reinstall to take effect. Verified on macOS and Windows; Linux paths are guesses.

## Read the matching doc before you start

Do not work from this file alone for these tasks. The docs contain exact formats, pitfalls and checklists.

| Task | Read |
|---|---|
| Run the build, verify a change, anything touching Zalo's files | [docs/build-and-verify.md](docs/build-and-verify.md) |
| Understand how code gets injected, what runs where, where state lives | [docs/architecture.md](docs/architecture.md) |
| Add or edit a theme (colours) | [docs/add-theme.md](docs/add-theme.md) |
| Add or edit a pet (sprite, personality) | [docs/add-pet.md](docs/add-pet.md) |
| Write or change what the pet says | [docs/pet-quotes.md](docs/pet-quotes.md) |
| Pet animation, new gag, new idle behaviour | [docs/pet-animation.md](docs/pet-animation.md) |
| Add a feature module, menu toggle, main-process code | [docs/add-module.md](docs/add-module.md) |
| Any animation, timer, observer, or `backdrop-filter` | [docs/performance.md](docs/performance.md) |

## Rules that always apply

- No new dependencies. Only `node:` built-ins in `install.mjs` / `asar.mjs`.
- Never hand-edit Zalo's installed files and never delete `~/.zalo-glass-backup/`; all patching goes through `install.mjs`.
- `install.sh` kills Zalo. Run it only when that is acceptable.
- Message content stays on the machine. The only exception is the opt-in Google translate engine (`translate-main.js`; default on Windows/Linux only once the user turns translation on, opt-in on macOS). Do not add any other outbound request carrying chat content.
- Never rename a stored id (theme key, pet key, `localStorage` key, option key): it resets users' saved choices.
- Do not claim a UI change works until you have installed it and looked at it (screenshot), in the main window and the image viewer.
- Colours come from `--zg-*` variables, never hardcoded hues.
- Keep it lazy: no unrequested abstraction or config. A deliberate shortcut with a known limit gets a `// ponytail: <limit and upgrade path>` comment.
- Match surrounding style: terse Vietnamese comments explaining why; long single lines are fine in data tables.
- User-visible change (env var, option, module, feature) → update `README.md` (Vietnamese).
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `perf:`, …) with a short English subject on the user-visible change, like `git log`. No AI attribution trailers.
- Do not commit machine files (`.DS_Store`, anything under `~/.zalo-glass*`).
