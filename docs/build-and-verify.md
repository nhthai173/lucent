# Build, install and verify

Read this before running anything that touches Zalo, and before claiming a change works.

## What "build" means here

There is no compile step. `install.mjs` does this, in order:

1. Locates Zalo (`locate()`): macOS `/Applications/Zalo.app`, Windows `%LOCALAPPDATA%\Programs\Zalo[\Zalo-<ver>]`, Linux `/opt/Zalo`, `/opt/zalo`, `/usr/lib/zalo`. Override with `ZALO_APP`.
2. Kills every running Zalo process (`quit()`), so **any unsaved Zalo state is lost**. Tell the user before running it if Zalo may be in use for something important.
3. Backs up the original `app.asar` (and `Info.plist` on macOS) to `~/.zalo-glass-backup/<version>/`. If the current asar is not yet patched (fresh install or Zalo auto-updated), the backup is refreshed. If it is already patched, the backup is kept.
4. Builds the patched asar **from the backup**, never from the already-patched file. This is why re-running is idempotent.
5. Concatenates CSS and JS (see `architecture.md`) and writes them, plus injected `<link>`/`<script>` tags, into the asar through `asar.mjs`.
6. macOS only: updates `ElectronAsarIntegrity` in `Info.plist` with the new header hash and re-signs the app ad hoc (`codesign --force --deep --sign -`). Skipping this makes macOS refuse to launch Zalo.
7. Reopens Zalo (macOS: `open`; others: prints "Mở lại Zalo.").

## Commands

```bash
./install.sh                 # macOS / Linux: install or re-install
./install.sh --uninstall     # restore original asar (same as ./uninstall.sh)
```

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1              # Windows install
powershell -ExecutionPolicy Bypass -File install.ps1 --uninstall  # Windows uninstall
```

Runtime: `node` if installed, otherwise Zalo's own Electron binary with `ELECTRON_RUN_AS_NODE=1`. This means `install.mjs` and `asar.mjs` may run under Electron's Node, which treats `*.asar` as virtual directories; that is why both set `process.noAsar = true`. Keep it. Use only `node:` built-ins in these two files (no npm packages, no network).

Environment variables:

| Var | Meaning |
|---|---|
| `ZALO_APP` | Zalo install dir (macOS: the `.app`; Windows/Linux: the dir containing `resources/app.asar`) |
| `GLASS_JS` | Space-separated JS modules to load, default `"blur album keys ocr pet meet drag"`. `templates` is always prepended automatically; do not list it |
| `GLASS_TRANSPARENT=1` | macOS only, experimental window transparency (`transparent.css`, `vibrancy.js`) |

Platform status: verified on macOS and Windows. Linux paths are unverified guesses.

## Verification protocol

Run in this order and stop at the first failure.

1. **Static check** (fast, no side effects):
   ```bash
   node --check install.mjs && node --check asar.mjs && for f in theme/*.js; do node --check "$f" || echo "FAIL $f"; done
   ```
   `theme/ocr.swift` and `theme/ocr.ps1` are not covered; they are compiled/run at install time and errors are printed by `install.mjs`.
2. **Install**: `./install.sh`. Read its output. "Xong." means the patch was written. Messages about `swiftc` or `tesseract` only concern OCR and are not fatal.
3. **Look at the real app.** Zalo reopens itself. For any visual change take a screenshot (computer-use / screenshot tooling) and look at it. Do not conclude that a visual change works from reading the code or from a clean install log.
4. **Exercise the feature**: click the thing, switch the theme, wait for the pet to speak, etc. The per-recipe checklists in this folder list exact things to check.
5. **Check the second window.** Zalo has an image viewer window (`popup-viewer.html`) that also receives the CSS and JS. Open an image and make sure nothing broke there. Modules that must not run in the viewer start with `if (location.pathname.endsWith("popup-viewer.html")) return;`.
6. **Persistence**: quit Zalo and reopen it (not through `install.sh`); user choices (theme, pet, menu options) must survive.

If DevTools can be opened for the Zalo window in your environment it helps for inspecting computed variables and classes. Do not depend on it; screenshots are the required verification.

## Things that look like bugs but are not

- Zalo auto-update overwrites the patch. The user just runs `install.sh` again.
- Changing a file in `theme/` has no effect until `install.sh` is run again.
- A leftover chunk of old file data stays inside the asar after each patch (`asar.mjs`, `ponytail:` comment). The asar grows by tens of KB. Intentional.
- The first install prints "Đã backup bản gốc vào …"; later runs do not. Intentional.

## Never do

- Do not edit files inside Zalo's install dir by hand, and do not copy files there from scripts other than `install.mjs`. Uninstall relies on the backup matching what `install.mjs` expects.
- Do not delete `~/.zalo-glass-backup/`. Without it uninstall is impossible and re-install after a Zalo update cannot rebuild from a clean asar.
- Do not remove the macOS re-sign or integrity-hash step.
- Do not add dependencies or a `package.json` to make building "nicer".
