# Pet animation, behaviours and gags

How the pet moves and how to add a new "gag" (a short comedy scene such as zap, gun, oxygen, cry, faint) or a new idle behaviour. Read `performance.md` first: animation here costs GPU on a translucent window, and there are hard rules.

## State machine (all state is CSS classes on `#zg-pet`)

| Class | Set by | Meaning / what CSS does |
|---|---|---|
| `zp-walk` | `move()`, `run()` | legs alternate (`zp-step`), body bobs (`zp-bob`) |
| `zp-jump` (on `.zp-hop`) | `hop()` | one jump (`zp-jump` keyframes); re-triggered by removing the class, forcing reflow (`void el.offsetWidth`), re-adding |
| `zp-joy` | mouse enter/leave on the sprite | swap `.zp-open` for `.zp-happy` eyes |
| `zp-asleep` | `sleep(true)` after 60 s without input | swap to `.zp-sleep` eyes, slow breathing |
| `zp-mad` | 5 clicks, each less than 4 s after the previous | red-ish filter, fast tail; pet runs to the other end |
| `zp-gag` + `zp-g-<name>` | `gag(name)` | the gag scene (see below) |
| `zp-big` | big mode | scaled to window centre; pointer events disabled |
| `zp-anim` | `run()` | enables CSS transitions on `transform/top/width/height` for the move-and-scale effect |
| `zp-in` | `tick()` when the region changes | fade-in |

Rules: reuse these classes; do not add a second parallel state system. Set/clear them via `pet.classList` helpers (`set(cls, on)` in `pet.js`).

Variables on `#zg-pet`: `--lx`, `--ly` (pupil offset, set from mouse position), `--k` (scale factor in big mode; jump height is multiplied by it).

## Behaviour loop (idle life)

At the bottom of `pet.js`:

```js
await wait(6000 + Math.random() * 12000);
if (!document.hasFocus() || !reg || big || anim || asleep || busy || talking()) continue;
const r = Math.random();
if (r < .45) await move(...random x in region...);
else if (r < .55) hop();
else if (r < .8) await gag();
```

Probabilities: walk 45 %, hop 10 %, gag 25 %, nothing 20 %. The loop only acts when the Zalo window is focused. To add a behaviour: add a branch and adjust the thresholds so they stay increasing and ≤ 1; implement it as an `async` function that sets `busy = true` at start and `busy = false` at the end (so other behaviours do not overlap), awaits `wait(ms)` for its duration, and cleans up every class it set.

Clicks: `sprite.addEventListener("click", …)`: 5 clicks → mad; otherwise 50 % `gag()` else `hop()` + `say(pick(T.lines))`.

For Luffy's optional `forms`, the existing 1-second `tick()` checks a 10-second deadline and selects a different form when due. Hidden/unfocused windows, sleep, big mode and busy actions defer the change; the next eligible tick changes once and starts a fresh 10-second deadline, without catching up missed periods or adding a timer. Loading a pet resets the deadline. Shift + click cancels any current gag, changes to another random form immediately and restarts the 10-second deadline. Changing form neither speaks nor interrupts walking. A normal click always runs the current form's `attack`, replacing a different active gag; repeated clicks during that attack do not restart or stack it. This replaces the random click/five-click mad behaviour only for pets with forms. The idle loop and shared speech triggers retain the original behaviour above. Idle gag selection excludes attacks belonging to other forms. Attacks use the normal gag lock and cleanup, with finite CSS animations scoped to each attack class.

## Anatomy of a gag

A gag is made of four independent parts. All four must exist.

1. **Registry entry** in `GAGS` (`theme/templates.js`):
   ```js
   dance: [3000, ["Nhảy cho vui! 💃", "Deadline? Mình chỉ biết nhảy"]],
   ```
   `[durationMs, [quotes…]]`. Key = gag name = used in the class name `zp-g-<name>` (lowercase ASCII, no spaces). `gag()` picks a random key from the pet's `gags`, so adding a key makes it eligible immediately.
2. **Logic** `gag(n)` in `pet.js` (do not modify unless behaviour must differ): returns early if `busy || asleep || big || anim || !reg`; sets `busy`, adds `zp-gag` and `zp-g-<n>`, `say(pick(lines), ms - 300)`, waits `ms`, removes both classes, `hop()`, clears `busy`.
3. **Prop** (optional), an SVG group in the sprite (`animal()` string in `templates.js`, or a custom sprite):
   ```html
   <g class="zp-prop zp-p-dance"> … shapes … </g>
   ```
   Hidden by default via `.zp-prop { display: none }` in `pet.css`.
4. **CSS** in `pet.css`, three kinds of rules, all scoped by `#zg-pet.zp-g-<name>`:
   - **Reveal the prop**: append `, #zg-pet.zp-g-dance .zp-p-dance` to the selector list of the rule ending in `{ display: inline; }` (the one that already lists `.zp-p-zap`, `.zp-p-gun`, `.zp-p-oxy`, `.zp-tear`, `.zp-stream`, `.zp-wail`). Prop elements are `display: none` otherwise.
   - **Choose the eyes**: the base rule `#zg-pet.zp-gag .zp-open, #zg-pet.zp-gag .zp-happy { display: none; }` hides normal eyes for every gag. **You must therefore show an alternative eye set** or the face has no eyes: append `, #zg-pet.zp-g-dance .zp-x` (or `.zp-sleep`) to the rule `… .zp-x … .zp-sleep … { display: inline; }`. Existing: zap → `x`; faint → `x`; gun/oxy/cry → `sleep`. If you want the happy eyes, add a dedicated rule `#zg-pet.zp-g-dance .zp-happy { display: inline; }` placed after the hide rule (same specificity, later wins).
   - **Animate**: define `@keyframes zp-dance { … }` and attach it only under the gag class:
     ```css
     #zg-pet.zp-g-dance .zp-body { animation: zp-dance .5s ease-in-out infinite; }
     @keyframes zp-dance { 50% { transform: translateY(-3px) rotate(4deg); } }
     ```
     `infinite` is acceptable here because the rule matches only while the gag class is present (≤ ~5 s). Never attach an infinite animation to a selector that is always true.

### Existing gags as reference

| Gag | Duration | Prop | Eyes | Motion |
|---|---|---|---|---|
| `zap` | 3200 ms | `.zp-p-zap` (taser + bolts) | `.zp-x` | body jitters + flashes (`zp-zap`), bolts flicker, tail whips |
| `gun` | 4200 ms | `.zp-p-gun` (water gun) | `.zp-sleep` | body tilted −5°, tears drip (`zp-drip`) |
| `oxy` | 4500 ms | `.zp-p-oxy` (mask + tube) | `.zp-sleep` | pant (`zp-pant`), mask pulses, fog fades |
| `cry` | 4500 ms | `.zp-tears` group | `.zp-sleep` | sob (`zp-sob`), streams (`zp-stream`), mouth (`zp-wail`) |
| `faint` | 3500 ms | none | `.zp-x` | whole `.zp-sprite` rotates 88° and drops (transition) |

### Gotchas

- A prop or eye rule that is not in the `display: inline` lists never shows (everything starts hidden).
- Animating `.zp-body` with `transform` while another rule also sets `transform` on it (for example `zp-g-gun` sets `rotate(-5deg)` with `animation: none`) overrides, it does not merge. Wrap nested motion in separate groups if you need both.
- `.zp-hop` is the element that jumps and `.zp-flip` mirrors the sprite left/right: do not animate `transform` on either from gag CSS; animate children (`.zp-body`, props) instead.
- SVG child animations need `transform-origin` (the global `transform-box: fill-box` makes `50% 50%` mean "the shape's own centre"). Set it explicitly in the keyframe rule.
- A gag in a pet's `gags` whose prop does not exist in that pet's SVG makes the pet freeze with nothing visible. Keep sprite and `gags` in sync.
- `GAGS` is shared by reference: do not mutate it per pet; pass a new `gags` object to `fill` instead.

## Adding a non-gag animation (walk style, idle fidget, entrance)

1. Decide the trigger (state class). Prefer reusing an existing state class; otherwise set a new `zp-<state>` class from `pet.js` and remove it at the end.
2. Put the CSS under `#zg-pet.zp-<state> …` only.
3. Use `transform` and `opacity` only (compositor-friendly); avoid animating `filter`, `box-shadow`, `width/height`, or blur on large areas.
4. Keep durations short (a few seconds) and end in the resting pose.

## Previewing / testing a gag

The gag is random (clicks: 50 %, idle loop: 25 %), so force it while developing:

1. Temporarily make the pet's `gags` contain only the new gag: in the pet object add `gags: { dance: GAGS.dance }` (remove this after testing).
2. Reinstall, click the pet repeatedly; every second click on average triggers it.
3. Verify: prop shown, eyes visible and appropriate, motion plays, bubble text fits, everything returns to normal when it ends, hop at the end, the pet can walk again afterwards.
4. Check that **no animation keeps running after the gag**: after it ends, the pet idle should be static again (see `performance.md`).
5. Remove the temporary `gags` override.

## Checklist

- [ ] Registry entry in `GAGS` (duration + ≥ 3 quotes, see `pet-quotes.md`)
- [ ] Prop group in the sprite for every pet that has this gag
- [ ] Prop reveal selector added
- [ ] Eye-set selector added (face is never blank)
- [ ] Keyframes scoped under `#zg-pet.zp-g-<name>`, `transform-origin` set
- [ ] Returns to the normal pose; no leftover classes (`zp-gag`, `zp-g-*`)
- [ ] Works for all pets that inherit `GAGS` (cat, grey cat, rabbit); rabbit ears and cat ears both look fine
- [ ] Big mode and sleeping do not trigger it (guarded in `gag()`)
- [ ] Idle GPU/CPU unchanged
