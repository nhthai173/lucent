// Dịch khi soạn tin (live translate, kiểu Google Translate): nút cạnh nút định dạng chữ (Aa) mở khung dưới ô soạn, bản dịch cập nhật theo lúc gõ; "Dùng bản dịch" thay nội dung ô soạn.
// Mention và emoji không đi qua bản dịch: đổi thành token ZQ<n>X trước khi dịch, dịch xong ráp lại bằng chính phần tử gốc (giữ nguyên mention thật). Dùng chung engine/route /translate với translate.js.
// Cấu trúc ô soạn của Zalo: #richInput > div#input_line_N > span#input_part_M (chữ) | span.clnMention | span.emoji-sizer; Zalo đọc lại DOM này lúc gửi nên sửa DOM trực tiếp là đủ (nhưng gửi đi lấy từ trạng thái nội bộ nên phải bắn sự kiện input sau khi sửa).
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

  // Thay nội dung ô soạn bằng bản dịch bằng thao tác sửa như người dùng gõ (execCommand → beforeinput/input thật): Zalo giữ trạng thái riêng
  // (vị trí mention...) và gửi từ trạng thái đó, nên sửa thẳng DOM làm lệch vị trí mention (đã thử: "Hello@Tên..i").
  // Sửa từng đoạn chữ nằm giữa các mention (mỗi dòng riêng, từ cuối lên đầu): chèn bản mới vào CUỐI đoạn cũ rồi xoá đoạn cũ từ đầu (forwardDelete);
  // xoá hết rồi chèn, hoặc chọn-thay-thế thì Zalo/Chrome dồn chữ vào span mention và nhân đôi mention (đã thử). Zalo vẽ lại dòng bất đồng bộ nên chờ giữa các thao tác.
  // Không chèn được xuống dòng bằng execCommand (insertText "\n"/insertParagraph/paste giả đều bị Zalo bỏ) nên bản dịch phải CÙNG số dòng với bản gốc (dịch từng dòng đảm bảo điều này).
  // ponytail: số dòng/thứ tự mention-emoji khác, hoặc đoạn rỗng mà bản dịch có chữ thì xoá hết và dán bản dịch gộp thành MỘT dòng, mention/emoji thành chữ thường (mất mention thật). Nâng cấp: chèn mention qua popup @ của Zalo.
  const isTok = (n) => n.nodeType === 1 && (n.classList.contains("clnMention") || n.classList.contains("emoji-sizer"));
  const gapsOf = (line) => { // các đoạn chữ của một dòng, tính lại từ DOM hiện tại
    const old = [[]];
    [...line.childNodes].forEach((n) => (isTok(n) ? old.push([]) : old[old.length - 1].push(n)));
    return old.map((g) => g.filter((n) => n.textContent));
  };
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const glen = (s) => [...new Intl.Segmenter().segment(s)].length; // forwardDelete xoá theo ký tự hiển thị (emoji = 1), không theo UTF-16
  const use = async () => {
    const ri = rich(), { t, lines } = parse();
    if (!res || !ri) return;
    const tl = res.split("\n"), ng = tl.map((l) => l.split(TOK).filter((_, j) => j % 2 === 0)), nt = tl.flatMap((l) => (l.match(/ZQ(\d+)X/g) || []).map((x) => +x.slice(2, -1)));
    const ex = (c, v) => document.execCommand(c, false, v), sel = getSelection(), caret = (n, o) => { const r = document.createRange(); r.setStart(n, o); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); };
    const first = (n) => (n.firstChild && n.nodeType === 1 ? first(n.firstChild) : n), last = (n) => (n.lastChild && n.nodeType === 1 ? last(n.lastChild) : n);
    ri.focus();
    let ok = tl.length === lines.length && nt.length === t.length && nt.every((v, j) => v === j) && t.every((e) => e.classList.contains("clnMention")); // emoji: Zalo dẹt sprite thành ký tự khi vẽ lại dòng → đi đường dán gộp
    if (ok) ok = lines.every((ln, i) => { const g = gapsOf(ln); return g.length === ng[i].length && g.every((n, k) => n.length || !ng[i][k]); });
    if (ok) {
      try {
        for (let li = lines.length - 1; li >= 0; li--) {
          for (let g = ng[li].length - 1; g >= 0; g--) {
            const all = gapsOf(rich().querySelectorAll(":scope > div")[li]);
            if (all.length !== ng[li].length) throw 0; // Zalo đã đổi cấu trúc dòng giữa chừng
            let nodes = all[g];
            if (!nodes.length) continue; // đoạn rỗng và bản dịch cũng rỗng
            const len = glen(nodes.map((n) => n.textContent).join("")), e = last(nodes[nodes.length - 1]);
            if (ng[li][g]) { caret(e, e.textContent.length); ex("insertText", ng[li][g]); await tick(); }
            nodes = gapsOf(rich().querySelectorAll(":scope > div")[li])[g];
            caret(first(nodes[0]), 0);
            for (let i = 0; i < len; i++) ex("forwardDelete");
            await tick();
          }
        }
      } catch { ok = false; }
    }
    if (!ok) {
      const name = (e) => e.dataset.mention || e.dataset.name || e.textContent, seen = new Set();
      const full = res.replace(/ZQ(\d+)X/g, (_, i) => (seen.add(+i), t[+i] ? name(t[+i]) : "")) + t.map((e, i) => (seen.has(i) ? "" : " " + name(e))).join("");
      ri.focus(); ex("selectAll"); // thay thế vùng chọn bằng bản dịch trong MỘT thao tác: xoá trước rồi chèn thì Zalo vẽ lại ô soạn và chèn sau đó không còn tác dụng (đã thử)
      ex("insertText", full.split("\n").filter((x) => x.trim()).join(" "));
    }
    await tick();
    const rr = rich(), r = document.createRange(); r.selectNodeContents(rr); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
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
    useBtn.onclick = () => { useBtn.disabled = true; use().catch(() => {}); }; // bất đồng bộ: có chờ giữa các thao tác sửa
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
    const c = document.getElementById("chatInput"); // trong ô soạn: cùng nền, cùng lề trái với chữ đang gõ
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
