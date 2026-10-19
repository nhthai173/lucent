// Dịch khi soạn tin (live translate, kiểu Google Translate): nút cạnh nút định dạng chữ (Aa) mở khung dưới ô soạn, bản dịch cập nhật theo lúc gõ; "Dùng bản dịch" thay nội dung ô soạn.
// Mention và emoji không đi qua bản dịch: đổi thành token ZQ<n>X trước khi dịch, dịch xong ráp lại bằng chính phần tử gốc (giữ nguyên mention thật). Dùng chung engine/route /translate với translate.js.
// Cấu trúc ô soạn của Zalo: #richInput > div#input_line_N > span#input_part_M (chữ) | span.clnMention | span.emoji-sizer; Zalo đọc lại DOM này lúc gửi nên sửa DOM trực tiếp là đủ (đã thử gửi thật).
(() => {
  if (location.pathname.endsWith("popup-viewer.html")) return;
  const API = "http://127.0.0.1:47831/translate", KEY = "zg-live", TOK = /ZQ(\d+)X/;
  const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M12 5c-1 4-4 7-8 8M13 20l4-9 4 9M14.5 17h5"/></svg>';
  const SWAP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>';
  const load = () => { try { return { on: false, to: "en", ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { on: false, to: "en" }; } };
  let st, pane, box, sel, useBtn, res = "", toks = [], seq = 0, timer = 0, watched = null, mo;
  st = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const lang = () => document.body?.dataset.zgTr || ""; // công tắc chung "Dịch tin nhắn" trong menu mắt; tắt thì không hiện nút/khung
  const cache = new Map(); // ponytail: cache theo "ngôn ngữ|văn bản" trong phiên, 200 mục

  const rich = () => document.getElementById("richInput");
  const parse = () => { // ô soạn → chuỗi có token + danh sách phần tử giữ nguyên
    const ri = rich(), t = [], lines = [...ri.querySelectorAll(":scope > div")];
    const text = (lines.length ? lines : [ri]).map((ln) => [...ln.childNodes].map((n) => {
      if (n.nodeType === 3) return n.nodeValue;
      if (n.nodeType !== 1 || n.nodeName === "BR") return "";
      if (n.classList.contains("clnMention") || n.classList.contains("emoji-sizer")) { t.push(n); return `ZQ${t.length - 1}X`; }
      return n.textContent;
    }).join("")).join("\n");
    return { text, t, lines };
  };
  const split = (s, f) => s.split("\n").map((ln) => ln.split(TOK).map((x, j) => f(x, j % 2 === 1))); // [dòng][đoạn], đoạn lẻ = số token

  const tokEl = (e) => Object.assign(document.createElement("span"), { className: "zg-live-tok" + (e.classList.contains("clnMention") ? " m" : ""), textContent: e.dataset.mention || e.dataset.name || e.textContent });
  const paint = (t, err) => { // vẽ bản dịch (có thể rỗng) vào khung
    box.classList.toggle("err", !!err); box.classList.remove("load");
    box.replaceChildren();
    if (err) return box.append(err);
    if (!t) return box.append(Object.assign(document.createElement("span"), { className: "zg-live-ph", textContent: "Bản dịch sẽ hiện ở đây" }));
    const used = new Set();
    split(t, (x, tok) => ({ x, tok })).forEach((ln, i, a) => {
      ln.forEach(({ x, tok }) => { if (tok) { const e = toks[+x]; if (e) { used.add(+x); box.append(tokEl(e)); } } else x && box.append(x); });
      if (i < a.length - 1) box.append(document.createElement("br"));
    });
    toks.forEach((e, i) => used.has(i) || box.append(" ", tokEl(e))); // model làm rơi token thì nối vào cuối, không để mất mention/emoji
  };

  const run = async () => {
    if (!pane || !rich()) return;
    const { text, t } = parse(), id = ++seq, k = st.to + "|" + text;
    toks = t;
    useBtn.disabled = true;
    if (!text.trim()) { res = ""; return paint(""); }
    try {
      if (!cache.has(k)) {
        box.classList.add("load");
        if (!box.firstChild || box.firstChild.className === "zg-live-ph") box.replaceChildren(Object.assign(document.createElement("div"), { className: "zg-tr-load", innerHTML: "<i></i><i></i><i></i>Đang dịch" }));
        const r = await (await fetch(`${API}?to=${st.to}&k=0&n=1&e=${document.body.dataset.zgTrEngine || ""}`, { method: "POST", body: text })).json();
        if (id !== seq) return; // đã gõ tiếp, bỏ kết quả cũ
        if (r.error) throw new Error(r.error);
        if (cache.size > 200) cache.clear();
        cache.set(k, r.t);
      }
      if (id !== seq) return;
      res = cache.get(k); paint(res); useBtn.disabled = res === text;
    } catch (e) { if (id === seq) { res = ""; paint("", "Không dịch được: " + e.message); } }
  };
  const later = () => { clearTimeout(timer); timer = setTimeout(run, 450); };

  const mk = (txt) => { const s = Object.assign(document.createElement("span"), { className: "", textContent: txt }); s.style.whiteSpace = "pre-wrap"; s.dataset.mention = txt; return s; };
  const use = () => { // thay nội dung ô soạn bằng bản dịch, giữ nguyên phần tử mention/emoji gốc
    const ri = rich(), { t, lines } = parse();
    if (!res || !lines.length) return;
    const used = new Set();
    const nl = split(res, (x, tok) => ({ x, tok })).map((ln) => ln.flatMap(({ x, tok }) => (tok ? (t[+x] && !used.has(+x) ? (used.add(+x), [t[+x]]) : []) : x ? [mk(x)] : [])));
    t.forEach((e, i) => used.has(i) || nl[nl.length - 1].push(mk(" "), e));
    while (lines.length < nl.length) { const c = lines[0].cloneNode(false); lines[lines.length - 1].after(c); lines.push(c); } // ponytail: bản dịch nhiều dòng hơn bản gốc (Google tách thêm) thì thêm dòng mới nhân bản từ dòng đầu
    lines.forEach((ln, i) => { if (i < nl.length) ln.replaceChildren(...(nl[i].length ? nl[i] : [document.createElement("br")])); else ln.remove(); });
    ri.querySelectorAll(":scope > div").forEach((ln, i) => { ln.id = "input_line_" + i; });
    ri.querySelectorAll(":scope > div > span").forEach((s, i) => { s.id = "input_part_" + i; });
    ri.focus(); const r = document.createRange(); r.selectNodeContents(ri); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r);
  };

  const build = () => {
    pane = Object.assign(document.createElement("div"), { id: "zg-live" });
    const bar = document.createElement("div"), l = Object.assign(document.createElement("span"), { textContent: "Tự nhận ngôn ngữ", className: "zg-live-src" });
    const swap = Object.assign(document.createElement("button"), { type: "button", className: "zg-live-swap", title: "Đảo chiều (Việt ⇄ Anh)", innerHTML: SWAP });
    sel = Object.assign(document.createElement("select"), { innerHTML: '<option value="vi">Tiếng Việt</option><option value="en">English</option>' });
    useBtn = Object.assign(document.createElement("button"), { type: "button", className: "zg-live-use", textContent: "Dùng bản dịch", title: "Thay nội dung ô soạn bằng bản dịch (rồi bấm Enter để gửi)", disabled: true });
    const x = Object.assign(document.createElement("button"), { type: "button", className: "zg-live-x", title: "Đóng", innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
    bar.className = "zg-live-bar"; bar.append(l, swap, sel, Object.assign(document.createElement("i"), { className: "zg-live-sp" }), useBtn, x);
    box = Object.assign(document.createElement("div"), { className: "zg-live-out" });
    pane.append(bar, box);
    sel.value = st.to;
    sel.onchange = () => { st.to = sel.value; save(); run(); };
    swap.onclick = () => { st.to = st.to === "vi" ? "en" : "vi"; sel.value = st.to; save(); run(); };
    useBtn.onclick = use;
    x.onclick = () => { st.on = false; save(); scan(); };
    pane.addEventListener("mousedown", (e) => e.stopPropagation()); // không để Zalo cướp focus/đóng popup khi bấm trong khung
  };

  const scan = () => {
    const bar = document.querySelector(".chat-box-toolbar"), aa = bar?.querySelector('[icon="TextFormat_24_Line"]')?.closest("li"), on = !!lang();
    let btn = bar?.querySelector(".zg-live-btn");
    if (bar && aa && on && !btn) { // nút nhân bản từ nút Đính kèm để giống style; đặt ngay sau nút Aa
      const li = bar.querySelector('[icon="Attach_24_Line"]')?.closest("li")?.cloneNode(true);
      if (li) {
        const d = li.firstElementChild;
        ["icon", "data-id", "data-translate-title"].forEach((a) => d.removeAttribute(a));
        d.title = "Dịch khi soạn tin"; d.classList.add("zg-live-btn");
        d.querySelector("i").replaceWith(Object.assign(document.createElement("span"), { className: "zg-live-ic", innerHTML: ICON }));
        d.onclick = () => { st.on = !st.on; save(); scan(); };
        aa.after(li); btn = d;
      }
    }
    if (btn && !on) btn.closest("li").remove();
    btn?.classList.toggle("zg-on", st.on && on);
    const c = document.getElementById("chat-box-input-container-id");
    if (st.on && on && c) {
      if (!pane) build();
      if (!pane.isConnected) { c.append(pane); run(); }
    } else if (pane?.isConnected) pane.remove();
    const ri = rich(); // ô soạn bị Zalo dựng lại khi đổi hội thoại → quan sát lại
    if (ri && ri !== watched && pane?.isConnected) {
      mo?.disconnect(); watched = ri;
      (mo ||= new MutationObserver(later)).observe(ri, { childList: true, characterData: true, subtree: true });
      later();
    }
  };

  const init = () => {
    let q = 0;
    new MutationObserver(() => q || (q = requestAnimationFrame(() => { q = 0; scan(); }))).observe(document.body, { childList: true, subtree: true });
    scan();
  };
  document.body ? init() : addEventListener("DOMContentLoaded", init);
})();
