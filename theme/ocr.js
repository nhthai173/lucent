// OCR kiểu Live Text trong viewer ảnh: nút "Aa" (hoặc phím T) quét chữ trên ảnh đang xem bằng Vision của macOS (server ocr-main.js ở main process),
// (mặc định bật sẵn) rồi phủ các dòng chữ trong suốt lên đúng vị trí để bôi đen / ⌘C / Ctrl+C. Đổi ảnh thì tự quét lại khi đang bật. Ảnh bị xoay thì tạm ẩn lớp chữ.
(() => {
  if (!location.pathname.endsWith("popup-viewer.html")) return;
  const API = "http://127.0.0.1:47831/ocr?p=";
  let on = true, src = "", btn, box, pill, lines = [];
  const img = () => document.querySelector(".imageShowMainImage img.zimg-el");
  const el = (tag, cls, p) => { const e = Object.assign(document.createElement(tag), { className: cls }); (p || document.body).append(e); return e; };
  const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8.5 15.5l3.5-7 3.5 7M9.8 13h4.4"/></svg>';

  const say = (t, copyable) => {
    pill ||= el("div", "zg-ocr-pill");
    pill.textContent = t; pill.style.display = t ? "" : "none";
    pill.classList.toggle("copy", !!copyable);
  };
  const clear = () => { box?.remove(); box = null; lines = []; };

  const build = (data) => {
    clear();
    box = el("div", "zg-ocr");
    data.forEach((d) => {
      const l = el("div", "zg-ocr-line", box), s = el("span", "", l);
      s.textContent = d.t;
      Object.assign(l.style, { left: d.x * 100 + "%", top: d.y * 100 + "%", width: d.w * 100 + "%", height: d.h * 100 + "%", fontSize: d.h * 88 + "cqh" });
      l.addEventListener("pointerdown", (e) => e.stopPropagation()); // không cho Zalo kéo ảnh khi đang bôi chữ
      l.addEventListener("mousedown", (e) => e.stopPropagation());
      lines.push([l, s]);
    });
    place(); // phải đặt khung trước: cỡ chữ tính theo cqh nên khung chưa có kích thước thì chữ rộng 0
    // ép bề ngang chữ khớp ô Vision trả về; tỉ lệ này không đổi theo zoom nên đo một lần
    lines.forEach(([l, s]) => { if (s.offsetWidth) s.style.transform = `scaleX(${l.clientWidth / s.offsetWidth})`; });
  };

  const place = () => {
    const i = img(), p = document.querySelector(".photo-player-container");
    if (!box || !i || !p) return;
    const r = i.getBoundingClientRect(), c = p.getBoundingClientRect();
    const rotated = Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) > 0.03 * (i.naturalWidth / i.naturalHeight);
    box.style.display = rotated ? "none" : "";
    Object.assign(box.style, { left: r.x + "px", top: r.y + "px", width: r.width + "px", height: r.height + "px",
      clipPath: `inset(${Math.max(0, c.top - r.top)}px ${Math.max(0, r.right - c.right)}px ${Math.max(0, r.bottom - c.bottom)}px ${Math.max(0, c.left - r.left)}px)` });
  };

  const off = () => document.body.classList.contains("zg-ocr-off"); // tắt trong menu mắt (blur.js)
  const scan = async () => {
    const i = img();
    if (!i || !i.currentSrc || off()) return;
    src = i.currentSrc; clear(); say("Đang quét chữ…");
    try {
      const path = decodeURIComponent(new URL(src).pathname);
      const data = await (await fetch(API + encodeURIComponent(path))).json();
      if (!on || src !== i.currentSrc) return; // đã tắt hoặc đã chuyển ảnh trong lúc chờ
      if (!Array.isArray(data)) throw new Error(data.error);
      data.length ? (build(data), say(`Sao chép tất cả (${data.length} dòng)`, true)) : say("Không thấy chữ trong ảnh");
    } catch (e) { // máy chưa cài / không hỗ trợ OCR: báo toast một lần rồi tắt, khỏi báo lại mỗi lần đổi ảnh (bấm T để thử lại)
      if (!on) return;
      on = false; btn?.classList.remove("on"); clear(); say("OCR không khả dụng: " + (e.message || e));
      setTimeout(() => pill?.classList.contains("copy") || say(""), 4000);
    }
  };

  const loop = () => {
    if (!on) return;
    if (document.hidden) return void setTimeout(loop, 500); // cửa sổ ẩn thì khỏi chạy mỗi frame
    const i = img();
    if (i && i.currentSrc && i.currentSrc !== src && !off()) scan(); // đổi ảnh bằng ←/→ hoặc thumbnail
    if (box) place(); // không có lớp chữ thì khỏi đo layout mỗi frame
    requestAnimationFrame(loop);
  };

  const toggle = () => {
    on = !on; btn?.classList.toggle("on", on);
    if (on) { src = ""; loop(); } else { clear(); say(""); }
  };

  const copyAll = () => navigator.clipboard.writeText(lines.map(([, s]) => s.textContent).join("\n")).then(() => say("Đã sao chép ✓"), () => say("Không sao chép được (cửa sổ chưa focus?)"));

  document.addEventListener("click", (e) => { if (e.target.closest?.(".zg-ocr-pill.copy")) copyAll(); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && box && getSelection().toString()) { navigator.clipboard.writeText(getSelection().toString()); e.preventDefault(); }
      return;
    }
    if ((e.key === "t" || e.key === "T") && !off()) { toggle(); e.preventDefault(); }
  }, true);

  // React vẽ lại thanh công cụ thì nút mất → gắn lại
  const mount = () => {
    const rot = document.querySelector(".btn-rotate");
    if (!rot || (btn && btn.isConnected)) return;
    btn = rot.cloneNode(false);
    btn.className = "z--btn--v2 btn-tertiary-neutral medium btn --rounded icon-only zg-ocr-btn" + (on ? " on" : "");
    btn.title = "Quét chữ (T)"; btn.removeAttribute("data-translate-title"); btn.removeAttribute("data-disabled");
    btn.innerHTML = ICON;
    btn.onclick = toggle;
    rot.parentElement.append(btn);
  };
  let q = 0; new MutationObserver(() => q || (q = requestAnimationFrame(() => { q = 0; mount(); }))).observe(document.documentElement, { childList: true, subtree: true });
  mount(); loop(); // ponytail: mặc định tự quét khi mở viewer; bấm T / nút Aa để tắt
})();
