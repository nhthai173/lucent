# Add or change a pet

A pet is one object in `PETS` in `theme/templates.js`. `pet.js` (behaviour) and `pet.css` (animation) are generic: they work with any sprite that follows the class contract below. The eye-menu "Pet" card is generated from the object. Related docs: `pet-quotes.md` (what the pet says), `pet-animation.md` (gags and motion), `performance.md` (hard limits).

## Where the pet lives

`pet.js` creates `<div id="zg-pet">` appended to `<html>` (not `<body>`, so React never removes it) as a `position: fixed` layer. It appears in three situations and disappears (`display: none`) otherwise:

1. A chat is open: it walks along the top edge of the compose toolbar `.chat-box-bar`.
2. The small popup window is on the conversation list: it walks in the gap in `.msg-filters-bar` between the last `.conv-tab` and the first `.dd-lbl`.
3. "Big mode" (only when the user enabled "Phóng to pet khi đang che" and some `zg-hide-*` option is hiding content): it scales up to the centre of the window, then shrinks when the mouse enters the chat.

It never reads message text. Keep it that way.

## Sprite coordinate system

- The SVG is injected into `<svg class="zp-sprite" viewBox="0 0 40 36" width="36" height="32">`. Draw in a **40 × 36** box; origin top-left; the pet's feet end at y ≈ 35.
- `overflow: visible`: parts may stick out (the bunny ears use negative y).
- The picker card renders the same markup with `viewBox="-4 -10 48 48"` (extra margin so ears and props are not clipped). Keep important parts inside roughly x∈[-4,44], y∈[-10,38].
- `.zp-sprite * { transform-box: fill-box; }` is set globally, so `transform-origin: 50% 100%` etc. refers to each shape's own bounding box, not the whole SVG.

## Path A: a new animal with `fill()` (preferred)

`animal(p)` draws the standard cat-like body: tail, two legs, rounded body, belly, cheeks, four eye sets, mouth and all gag props. You supply colours and two small SVG fragments.

```js
const BEAR_EARS = (p) => `<circle cx="9" cy="12" r="4.5" fill="${p.fur}"/><circle cx="31" cy="12" r="4.5" fill="${p.fur}"/>
  <circle cx="9" cy="12" r="2.4" fill="${p.inner}"/><circle cx="31" cy="12" r="2.4" fill="${p.inner}"/>`;

// inside PETS:
gau: fill("Gấu", { fur: "#c8956d", dark: "#a8774f", belly: "#f1d9c0", inner: "#e9a9a0", cheek: "#ff8aa0", ears: BEAR_EARS, mark: () => "" }, {
  intro: "Gấu tới rồi, đừng chọc 🐻",
  lines: ["…", "…"],
}),
```

`fill(name, params, extras)` returns `{ ...animal(params), name, typing: TYPING, mad: MAD, gags: GAGS, ...extras }`. So:

| Field | Where | Required | Notes |
|---|---|---|---|
| `fur`, `dark`, `belly`, `inner`, `cheek` | params | yes | Hex colours. `dark` = tail + legs; `inner` = inner ear; `cheek` = blush |
| `ears(p)` | params | yes | Function returning an SVG fragment drawn **behind** the head. Receives `params` |
| `mark(p)` | params | yes | Function returning a fragment drawn **on top of** the body, before eyes (stripes, spots). Use `() => ""` for none |
| `intro` | extras | **yes** | One line shown when the pet is created or selected |
| `lines` | extras | **yes** | Array of random quotes (see `pet-quotes.md`). If missing, `pick(T.lines)` throws on first click |
| `typing`, `mad` | extras | no | Override the shared `TYPING` / `MAD` arrays |
| `gags` | extras | no | Override the shared `GAGS` (must be a complete object, not a patch) |
| `css` | extras | no | A CSS string injected into a `<style>` when this pet is active, replaced on switch |
| `forms` | extras | no | Array of `{ name, svg, line, attack }`; requires a `.zl-rest` group in `svg`. Last entry is the initial form. The existing 1-second tick selects a different form every 10 seconds when eligible; Shift + click changes immediately and resets the deadline. Changes are silent; `line` is descriptive data only. Normal clicks always run the current form's `attack` gag; idle behaviour stays unchanged. Current form is kept only for this session. Used by Luffy |
| `name` | first arg | yes | Vietnamese card label |

Where to put the new `ears`/`mark` helpers: next to `CAT_EARS`, `BUNNY_EARS`, `STRIPES` (just above `GAGS`). They must be defined before `PETS`.

Insert the pet entry before the closing `};` of `PETS` (after the `bong:` entry).

Body geometry you can rely on when drawing `ears`/`mark` (coordinates in the 40×36 box): body is `rect x=5 y=10 w=30 h=22 rx=11`; eyes at `cx=14` and `cx=26`, `cy=21`; belly ellipse centre `(20, 28)`; cheeks at `(9.6, 25.2)` and `(30.4, 25.2)`; mouth at about `(20, 24.6)`. Ears sit around y 3–15.

## Path B: a custom sprite (not cat-like)

Write the `svg` string yourself in the pet object (no `animal()` call). Keep the rest of the object shape: `name`, `intro`, `lines`, `typing`, `mad`, `gags`.

```js
robo: { name: "Robo", svg: `…`, typing: TYPING, mad: MAD, gags: GAGS, intro: "…", lines: ["…"] },
```

The SVG **must** contain these class names for behaviours to work. Anything missing silently disables only that behaviour.

| Class | Used for | Notes |
|---|---|---|
| `zp-body` | breathe (on hover), walk bob, gag shakes | Wrap the main body shape + face in `<g class="zp-body">`; origin `50% 100%` |
| `zp-tail` | wag animation | origin `0 100%` (attach point is the left-bottom of its box) |
| `zp-leg zp-leg-a`, `zp-leg zp-leg-b` | walk cycle (alternate lift) | Both need class `zp-leg` too; origin `50% 0` |
| `zp-pupil` | eyes follow cursor | CSS translates it by `--lx`/`--ly` pixels; put it inside the open eyes |
| `<g class="zp-eyes zp-open">` | normal eyes | shown by default; blinks via `scaleY` |
| `<g class="zp-eyes zp-happy">` | on hover (`zp-joy`) | hidden by default (`.zp-eyes { display: none }`) |
| `<g class="zp-eyes zp-x">` | zap / faint | |
| `<g class="zp-eyes zp-sleep">` | asleep, gun, oxy, cry | |
| `zp-prop zp-p-zap` (+ `.zp-bolt`, `.zp-b2`, `.zp-b3`) | zap gag prop | |
| `zp-prop zp-p-gun` | gun gag prop | |
| `zp-prop zp-p-oxy` (+ `.zp-mask`, `.zp-fog`) | oxygen mask gag prop | |
| `zp-tears` with `.zp-tear`, `.zp-t2`, `.zp-stream`, `.zp-s2`, `.zp-wail` | cry gag (and gun gag tears) | |

If you omit a gag's props, **also remove that gag from the pet's `gags`** (pass your own `gags` object without it), otherwise the pet will freeze for the gag duration with nothing visible happening.

Simplest custom approach: copy the template string of `animal()`, change the body drawing only, and keep the rest.

## Steps

1. Choose an id: lowercase ASCII (`gau`). Permanent. Do not reuse an existing id.
2. Add helper functions (if any) above `GAGS`, and the pet entry inside `PETS`.
3. Write `intro` and ≥ 8 `lines` following `pet-quotes.md`.
4. `node --check theme/templates.js`.
5. Install and verify per `build-and-verify.md`, then run the checklist.

## Verification checklist

- [ ] Eye menu → "Pet": card shows the sprite fully (ears/props not clipped) and the right name.
- [ ] Selecting it swaps the sprite instantly, hops once and shows the `intro` bubble.
- [ ] Open a chat: the pet stands on the compose toolbar and walks; legs alternate; body bobs; no console-visible errors.
- [ ] Mouse over the pet: happy eyes (`zp-happy`) appear. Move the mouse around: pupils follow.
- [ ] Click once: a quote or a gag appears. Click until each gag in `gags` has played at least once (50 % chance per click): props visible, eyes change, bubble text shows, pet returns to normal.
- [ ] Click 5 times in a row (< 4 s apart): mad bubble from `mad`, pet runs to the other end.
- [ ] Idle 60 s: sleeping eyes and the sleep bubble; moving the mouse wakes it.
- [ ] Facing: walk both directions; sprite flips (mirrored text/asymmetric details look OK flipped).
- [ ] Small popup window on the conversation list: pet appears in the filter bar gap.
- [ ] Switch to another pet and back: no leftover `<style>` rules, no duplicated sprite.
- [ ] Restart Zalo: selection persisted.
- [ ] Idle CPU/GPU did not rise: no new infinite animation outside hover/gag states.

## Common mistakes

| Mistake | Symptom |
|---|---|
| No `lines` or no `intro` | JS error on click / on selection; pet stops working |
| Ears/props drawn outside `[-4..44] × [-10..38]` | Clipped in the picker card |
| Forgot class `zp-leg` on legs | Legs lift around the wrong origin (looks broken) |
| Gag in `gags` without its prop in the SVG | Pet freezes silently for the gag duration |
| Unscoped CSS in `css` | Leaks into other pets / Zalo UI. Always prefix with `#zg-pet` |
| Reused an existing id | Overwrites the other pet |
| Using `<img>`/external URLs in the SVG | Blocked by Zalo's CSP; inline everything |
| Always-running `@keyframes` in `css` | Wakes the GPU all the time; see `performance.md` |
