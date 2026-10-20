// Pet (mặc định Mochi, đổi trong menu; template ở templates.js) — sống ở hai chỗ trống của Zalo (không đụng DOM của React, chỉ là một lớp fixed đặt theo toạ độ):
//  • có khung chat hiện (cả cửa sổ lớn lẫn cửa sổ nhỏ đang mở hội thoại): đứng trên thanh công cụ soạn tin;
//  • cửa sổ nhỏ đang ở danh sách: đi qua đi lại ở khoảng trống giữa tab "Khác" và nút "Phân loại".
// Tính cách: hay hờn, mê ăn, thích bị chọc nhưng chọc nhiều là giận. Không đọc nội dung tin nhắn.
(() => {
  if (location.pathname.endsWith("popup-viewer.html")) return;
  const W = 36, H = 32, SPEED = 45, SLEEP_AFTER = 60000, GEAR_AFTER = 10000;
  let T = __zg.pet(), form = 0, lastFormAt = 0; // template pet đang dùng (templates.js); đổi trong menu thì nạp lại ở load()
  const timeLine = () => {
    const h = new Date().getHours();
    if (h >= 23 || h < 5) return "Khuya rồi, ngủ đi, deadline không chạy mất đâu 🌙";
    if (h >= 11 && h < 13) return "Trưa rồi, ăn cơm chưa nè 🍚 Không ăn là xỉu đó";
    if (h >= 17 && h < 19) return "Hết giờ rồi, về đi… à mà ai tin 🥲";
    return null;
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const pet = Object.assign(document.createElement("div"), { id: "zg-pet" });
  pet.innerHTML = `<div class="zp-bubble"></div><div class="zp-hop"><div class="zp-flip"><svg class="zp-sprite" viewBox="0 0 40 36" width="${W}" height="${H}"></svg></div></div>`;
  const style = document.head.appendChild(document.createElement("style")); // css riêng của template (nếu có)
  const load = () => {
    T = __zg.pet(); pet.querySelector(".zp-sprite").innerHTML = T.svg; style.textContent = T.css || "";
    form = (T.forms?.length || 1) - 1;
    lastFormAt = Date.now();
    pet.classList.toggle("zp-rubber", !!T.forms);
  };
  load();
  document.documentElement.append(pet); // gắn vào <html> để React không bao giờ dọn
  const sprite = pet.querySelector(".zp-hop"), bubble = pet.querySelector(".zp-bubble"), flip = pet.querySelector(".zp-flip");
  const set = (c, on) => pet.classList.toggle(c, on);

  // ---- vùng sống ----
  // đang che tin nhắn (blur.js bật class zg-hide-* lên body) mà chuột không ở trong khung chat/dòng hội thoại và không có tin nào đang focus
  // (đúng lúc nội dung đang bị che) → Mochi phóng to giữa cửa sổ; rê chuột vào là thu nhỏ lại. Tắt được bằng tuỳ chọn "petbig" trong menu che.
  const BIG = 2.5; // bóng thoại to theo cùng hệ số này
  let big = false;
  const hiding = () => {
    const c = document.body.classList;
    if (!c.contains("zg-pet-big") || ![...c].some((n) => n.startsWith("zg-hide-"))) return false;
    // đang tương tác: rê vào chat/dòng hội thoại, menu che đang mở, tin focus bằng phím, hoặc con trỏ đang ở ô soạn tin
    return !document.querySelector("#chatViewContainer:hover, .conv-item:hover, .zg-msg-focus, #zg-menu.open") && !document.activeElement?.closest?.(".rich-input");
  };
  const GROW_DELAY = 800, SHRINK_DELAY = 150, ANIM = 900; // chờ trạng thái ổn định rồi mới đổi (hết giật); Mochi chạy ANIM ms
  let anim = false, since = 0, smallX = 0, dragging = false;
  const bigK = () => Math.min((innerHeight * .5) / H, (innerWidth * .7) / W);
  const placeBig = (k = bigK()) => {
    pet.style.top = (innerHeight - H * k) / 2 + "px"; pet.style.transform = `translateX(${(innerWidth - W * k) / 2}px)`;
  };
  const setSize = (k) => { pet.style.setProperty("--k", k); pet.style.width = W * k + "px"; pet.style.height = H * k + "px"; };
  // chạy từ chỗ này sang chỗ kia kèm phóng/thu: transition CSS (.zp-anim) lo phần nội suy, JS chỉ đặt đích
  const run = (go) => {
    anim = true; pet.style.transition = ""; set("zp-anim", true); set("zp-walk", true); bubble.classList.remove("zp-show");
    void pet.offsetWidth; go();
    setTimeout(() => { anim = false; set("zp-anim", false); set("zp-walk", false); }, ANIM);
  };
  const setBig = (on) => {
    if (T.forms) { cancelGag(); cancelMorph(); }
    big = on; set("zp-big", on);
    if (on) {
      smallX = x; reg = null; const k = bigK();
      face((innerWidth - W * k) / 2 > x ? 1 : -1);
      run(() => { setSize(k); placeBig(k); });
      setTimeout(() => big && say("Mình đang canh màn hình nè 👀 Rê chuột vào là mình tránh ra", 4000), ANIM + 200);
    } else {
      const n = region();
      if (!n) { setSize(1); pet.style.display = "none"; return; }
      reg = n; mode = n.mode; const to = Math.max(n.min, Math.min(n.max, smallX));
      face(to > (innerWidth - pet.offsetWidth) / 2 ? 1 : -1);
      run(() => { setSize(1); pet.style.top = n.y - H + "px"; pet.style.transform = `translateX(${to}px)`; x = to; });
    }
  };

  let lastPerch = false, reg = null, mode = "", x = 0, dir = 1, busy = false, asleep = false, lastAct = Date.now();
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || !r.height) return false;
    const t = document.elementFromPoint(r.left + 6, r.top + r.height / 2);
    return !!t && (el.contains(t) || pet.contains(t));
  };
  const region = () => {
    const bar = [...document.querySelectorAll(".chat-box-bar")].find(shown);
    // chọn nhiều tin: thanh "Đã chọn" (.multisel-info) nằm trên bar → pet đứng lên trên nó
    if (bar) { const r = bar.getBoundingClientRect(), ms = document.querySelector(".multisel-info"); return { mode: "chat", min: r.left + 8, max: r.right - 8 - W, y: (ms ? ms.getBoundingClientRect().top : r.top) + 1 }; }
    const fb = [...document.querySelectorAll(".msg-filters-bar")].find(shown);
    if (!fb) return null;
    const r = fb.getBoundingClientRect();
    const tabs = [...fb.querySelectorAll(".conv-tab")].map((t) => t.getBoundingClientRect().right);
    const from = (tabs.length ? Math.max(...tabs) : r.left) + 10;
    const dd = [...fb.querySelectorAll(".dd-lbl")].map((t) => t.getBoundingClientRect().left).filter((l) => l > from).sort((a, b) => a - b)[0];
    const to = (dd ?? r.right) - 10;
    return to - from < W + 20 ? null : { mode: "list", min: from, max: to - W, y: r.bottom - 1 };
  };
  const tick = () => {
    if (T.forms && (document.hidden || !document.hasFocus())) { cancelGag(); cancelMorph(); }
    if (document.body.classList.contains("zg-pet-off")) { // tắt pet: ẩn và về trạng thái nhỏ, bật lại thì đặt lại chỗ như mới
      if (T.forms) cancelGag();
      cancelMorph();
      if (big) { big = false; set("zp-big", false); setSize(1); }
      anim = false; since = 0; reg = null; set("zp-anim", false); set("zp-walk", false); bubble.classList.remove("zp-show");
      pet.style.display = "none"; return;
    }
    if (anim || dragging) return;
    if (hiding() === big) since = 0;
    else if (!since) since = Date.now();
    else if (Date.now() - since >= (big ? SHRINK_DELAY : GROW_DELAY)) { since = 0; setBig(!big); return; }
    if (big) { pet.style.display = ""; placeBig(); return; }
    const n = region();
    if (!n) { if (T.forms) cancelGag(); cancelMorph(); reg = null; pet.style.display = "none"; return; }
    pet.style.display = "";
    const ty = n.y - H, perch = !!document.querySelector(".multisel-info");
    if (reg && reg.mode === n.mode && perch !== lastPerch) { // thanh "Đã chọn" hiện/ẩn: bật nhảy lên/xuống thanh (vòng cung qua đỉnh cao hơn cả hai chỗ)
      const from = parseFloat(pet.style.top) || ty;
      pet.animate([{ top: from + "px" }, { top: Math.min(from, ty) - 22 + "px", offset: .45 }, { top: ty + "px" }], { duration: 420, easing: "cubic-bezier(.4,0,.6,1)" }); hop();
    }
    lastPerch = perch; pet.style.top = ty + "px";
    if (!reg || reg.mode !== n.mode) { // đổi chỗ: đặt lại giữa vùng, không trượt
      mode = n.mode; reg = n;
      x = (n.min + n.max) / 2; pet.style.transition = "none"; pet.style.transform = `translateX(${x}px)`;
      pet.classList.remove("zp-in"); void pet.offsetWidth; pet.classList.add("zp-in");
    }
    reg = n;
    if (x > n.max || x < n.min) { x = Math.max(n.min, Math.min(n.max, x)); pet.style.transition = "transform .2s"; pet.style.transform = `translateX(${x}px)`; }
    if (T.forms && Date.now() - lastFormAt >= GEAR_AFTER) changeForm(); // dùng tick 1 giây sẵn có, đủ 10 giây thì đổi một dạng khác
  };

  // ---- hành vi ----
  const face = (d) => { dir = d; flip.style.transform = d < 0 ? "scaleX(-1)" : ""; };
  const move = async (to, speed = SPEED) => {
    const dist = Math.abs(to - x), dur = dist / speed;
    if (dist < 4) return;
    face(to > x ? 1 : -1); set("zp-walk", true);
    pet.style.transition = `transform ${dur}s linear`; pet.style.transform = `translateX(${to}px)`; x = to;
    await wait(dur * 1000); set("zp-walk", false);
  };
  const hop = () => { sprite.classList.remove("zp-jump"); void sprite.offsetWidth; sprite.classList.add("zp-jump"); };
  let hideT = 0;
  const say = (text, ms = 3800) => {
    if (!text || (!reg && !big)) return;
    bubble.textContent = text; bubble.classList.add("zp-show");
    bubble.style.left = "0px"; // đo lại từ gốc rồi kẹp vào cửa sổ
    const b = bubble.getBoundingClientRect(), px = big ? (innerWidth - pet.offsetWidth) / 2 : x, pw = big ? pet.offsetWidth : W;
    const want = px + pw / 2 - b.width / 2, left = Math.max(8, Math.min(innerWidth - b.width - 8, want));
    bubble.style.left = left - px + "px";
    clearTimeout(hideT); hideT = setTimeout(() => bubble.classList.remove("zp-show"), ms);
  };
  // mấy trò bựa: bật class zp-g-<tên> (CSS lo hình + hiệu ứng), nói một câu, đứng yên ms rồi trả lại như cũ; danh sách gag nằm trong template
  let activeGag = "", gagVersion = 0;
  const cancelGag = () => {
    if (!activeGag) return;
    pet.classList.remove("zp-gag", "zp-g-" + activeGag); activeGag = ""; gagVersion++; busy = false;
    bubble.classList.remove("zp-show");
  };
  const gag = async (n = pick(Object.keys(T.gags).filter((key) => !T.forms?.some((f) => f.attack === key) || T.forms[form].attack === key))) => {
    if (busy || asleep || big || anim || !reg || document.hidden || !document.hasFocus()) return;
    if (T.forms) cancelMorph();
    busy = true; const [ms, lines] = T.gags[n];
    activeGag = n; const version = ++gagVersion;
    set("zp-gag", true); set("zp-g-" + n, true); say(pick(lines), ms - 300);
    await wait(ms);
    if (version !== gagVersion) return; // đổi pet hoặc rời cửa sổ thì lượt diễn cũ không được đụng lượt mới
    cancelGag(); if (!T.forms || !matchMedia("(prefers-reduced-motion: reduce)").matches) hop();
  };
  const cancelMorph = () => pet.querySelector(".zl-rest")?.getAnimations().forEach((a) => a.cancel());
  const changeForm = () => {
    if (!T.forms || busy || asleep || big || anim || !reg || document.hidden || !document.hasFocus()) return;
    cancelMorph(); const next = pick(T.forms.filter((_, i) => i !== form)); form = T.forms.indexOf(next); lastFormAt = Date.now();
    const rest = pet.querySelector(".zl-rest"); rest.innerHTML = next.svg;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) rest.animate([
      { opacity: 0, transform: "scale(.75, 1.12)" }, { opacity: 1, transform: "scale(1.08, .94)", offset: .6 }, { opacity: 1, transform: "none" },
    ], { duration: 420, easing: "ease-out" });
    // Đổi Gear không bật thoại để giữ nhịp nói và đi bộ mặc định; không ghi localStorage.
  };
  const cancelInteraction = () => { if (T.forms) cancelGag(); cancelMorph(); };
  addEventListener("blur", cancelInteraction);
  addEventListener("resize", cancelInteraction);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelInteraction(); });
  const talking = () => bubble.classList.contains("zp-show");

  const sleep = (on) => {
    asleep = on; set("zp-asleep", on);
    if (on) { say("zZz… (đang họp trong mơ)", 6000); } else say("Hửm? Mình đâu có ngủ, mình đang suy nghĩ chiến lược 😤", 2500);
  };
  const activity = () => { lastAct = Date.now(); if (asleep) sleep(false); };
  ["mousemove", "mousedown", "keydown", "wheel"].forEach((t) => addEventListener(t, activity, { capture: true, passive: true }));

  // mắt dõi theo con trỏ
  let ray = 0, mx = 0, my = 0;
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (ray) return;
    ray = requestAnimationFrame(() => {
      ray = 0;
      const r = pet.getBoundingClientRect(), dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
      pet.style.setProperty("--lx", ((dx / d) * 1.3 * dir).toFixed(2));
      pet.style.setProperty("--ly", ((dy / d) * 1.1).toFixed(2));
    });
  }, { passive: true });

  // chọc
  let pokes = 0, pokeT = 0;
  sprite.addEventListener("click", async (e) => {
    if (justDragged) return;
    if (T.forms?.length > 1) {
      if (anim || document.hidden || !document.hasFocus()) return;
      activity();
      if (big || !reg) { hop(); say(pick(T.lines)); return; } // đang phóng to thì chỉ nhảy + nói như pet khác, chưa tung chiêu
      if (e.shiftKey) { cancelGag(); changeForm(); return; }
      const attack = T.forms[form].attack;
      if (activeGag === attack) return; // click dồn không khởi động lại chiêu đang diễn
      cancelGag(); gag(attack); return;
    }
    pokes++; clearTimeout(pokeT); pokeT = setTimeout(() => (pokes = 0), 4000);
    if (pokes >= 5) {
      cancelGag();
      pokes = 0; busy = true; set("zp-mad", true); say(pick(T.mad), 3000); hop();
      if (reg) await move(dir > 0 ? reg.min : reg.max, 130); // dỗi bỏ chạy sang đầu kia
      await wait(2500); set("zp-mad", false); busy = false;
    } else if (Math.random() < .5) gag();
    else { hop(); say(pick(T.lines)); }
  });
  // kéo thả: cầm pet đi khắp cửa sổ, thả ra thì rơi xuống thanh ở đúng vị trí ngang đó (không lưu gì)
  let justDragged = false;
  sprite.addEventListener("pointerdown", (e) => {
    if (e.button || big || anim || !reg) return;
    const r = pet.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top, sx = e.clientX, sy = e.clientY;
    let held = false;
    const at = (ev) => [Math.max(0, Math.min(innerWidth - W, ev.clientX - ox)), Math.max(0, Math.min(innerHeight - H, ev.clientY - oy))];
    const move = (ev) => {
      if (!held) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        held = dragging = busy = true; cancelGag(); busy = true; cancelMorph(); set("zp-drag", true); set("zp-joy", true);
        bubble.classList.remove("zp-show"); pet.style.transition = "none"; sprite.setPointerCapture(e.pointerId);
      }
      const [l, t] = at(ev); pet.style.top = t + "px"; pet.style.transform = `translateX(${l}px)`;
    };
    const up = () => {
      sprite.removeEventListener("pointermove", move); sprite.removeEventListener("pointerup", up); sprite.removeEventListener("pointercancel", up);
      if (!held) return;
      justDragged = true; setTimeout(() => (justDragged = false), 0);
      const n = region() || reg, from = { top: pet.style.top, transform: pet.style.transform };
      reg = n; x = Math.max(n.min, Math.min(n.max, parseFloat(pet.style.transform.slice(11)) || x));
      pet.style.top = n.y - H + "px"; pet.style.transform = `translateX(${x}px)`; set("zp-drag", false); set("zp-joy", false);
      const to = { top: pet.style.top, transform: pet.style.transform };
      pet.animate([from, to], { duration: 320, easing: "cubic-bezier(.5,0,1,.6)" }).onfinish = () => { dragging = false; busy = false; hop(); };
    };
    sprite.addEventListener("pointermove", move); sprite.addEventListener("pointerup", up); sprite.addEventListener("pointercancel", up);
  });
  sprite.addEventListener("mouseenter", () => set("zp-joy", true));
  sprite.addEventListener("mouseleave", () => set("zp-joy", false));

  // thấy bạn đang gõ
  let lastType = 0;
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !e.target.closest?.(".rich-input")) return;
    if (Date.now() - lastType > 25000 && Math.random() < .3) say(pick(T.typing), 2800);
    lastType = Date.now();
  }, true);

  // ---- vòng đời ----
  (async () => {
    say(T.intro, 3000);
    for (;;) {
      await wait(6000 + Math.random() * 12000); // ponytail: mỗi frame animation làm GPU vẽ lại cả cửa sổ kính (~7-15% GPU lúc đi) → thưa hành vi, đứng yên khi cửa sổ không focus
      if (!document.hasFocus() || !reg || big || anim || asleep || busy || talking()) continue;
      const r = Math.random();
      if (r < .45) await move(reg.min + Math.random() * (reg.max - reg.min));
      else if (r < .55) hop();
      else if (r < .8) await gag();
    }
  })();
  let lastMv = 0;
  addEventListener("mousemove", () => { const n = performance.now(); if (n - lastMv > 100) { lastMv = n; tick(); } }, { passive: true }); // tick đo layout + elementFromPoint nên không chạy theo từng sự kiện // thu nhỏ ngay khi rê chuột vào khung chat
  setInterval(() => {
    if (document.hidden) return;
    tick();
    if (!asleep && (reg || big) && Date.now() - lastAct > SLEEP_AFTER) sleep(true);
  }, 1000); // ponytail: tick đo layout + elementFromPoint; 200ms tốn ~13% CPU renderer lúc để yên, mousemove đã tick riêng cho phản hồi nhanh
  setInterval(() => { if (!asleep && (reg || big) && !busy && !talking() && Math.random() < .5) say(timeLine() || pick(T.lines)); }, 90000);
  addEventListener("zg-tpl", () => { if (__zg.pet() === T) return; cancelGag(); cancelMorph(); load(); hop(); say(T.intro, 3000); }); // đổi pet trong menu
  tick();
})();
