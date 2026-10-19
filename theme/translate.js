// Dịch tin nhắn kiểu ZaDark: nút dịch nằm cùng hàng với Trả lời / Chia sẻ / … khi rê chuột vào tin, và mục "Dịch tin nhắn" trong menu chuột phải; bản dịch hiện ngay dưới chữ, bấm lại để ẩn.
// Engine = Translation của Apple chạy local (main process, /translate). Ngôn ngữ đích lấy từ body[data-zg-tr] (menu mắt, blur.js); rỗng = tắt. Bản dịch lưu ở ~/.zalo-glass/translations/ nên mở lại vẫn hiện.
// Lấy chữ bằng textContent (không phải innerText) vì chế độ che tin nhắn đặt visibility:hidden khi chuột rời khung chat → innerText rỗng.
(() => {
  if (location.pathname.endsWith("popup-viewer.html")) return;
  const API = "http://127.0.0.1:47831/", ROW = '[id^="bb_msg_id"]';
  const ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M12 5c-1 4-4 7-8 8M13 20l4-9 4 9M14.5 17h5"/></svg>';
  // gỡ bản dịch: icon dịch (góc trên-trái) và thùng rác (góc dưới-phải) xéo nhau; stroke bù theo tỉ lệ để nét vẫn 1.8
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(.68)" stroke-width="2.65"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M12 5c-1 4-4 7-8 8M13 20l4-9 4 9M14.5 17h5"/></g><g transform="translate(10 10) scale(.58)" stroke-width="3.1"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></g></svg>';
  const to = () => document.body?.dataset.zgTr || "";
  let store = {}, loaded = "", row0 = null; // store = bản dịch đã lưu của ngôn ngữ đang dùng; row0 = tin vừa bấm chuột phải
  const hash = (s) => { // cyrb53, đủ để làm khoá (va chạm ≈ 0 với vài chục nghìn tin)
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(16);
  };
  // phần chữ của tin (bỏ khối trích dẫn của tin reply); tin ảnh/file/sticker không có → null
  const bodyOf = (row) => [...(row?.querySelector(".text-message__container")?.children || [])].filter((c) => !/quote|zg-tr-out/.test(c.className)).pop() || null;
  const out = (b) => b.nextElementSibling?.classList.contains("zg-tr-out") ? b.nextElementSibling : null;

  const show = (b, t, err) => { // t === null: đang dịch (3 chấm nhảy, chỉ chạy lúc này)
    let o = out(b);
    if (!o) { o = document.createElement("div"); o.className = "zg-tr-out"; b.after(o); }
    o.classList.toggle("err", !!err);
    const k = t ?? "\0load";
    if (o.dataset.t === k) return;
    o.dataset.t = k;
    o.innerHTML = '<span class="zg-tr-h">' + ICON + "Bản dịch</span>";
    o.append(t === null ? Object.assign(document.createElement("div"), { className: "zg-tr-load", innerHTML: "<i></i><i></i><i></i>Đang dịch" }) : Object.assign(document.createElement("div"), { textContent: t }));
  };

  const translate = async (row) => {
    const b = bodyOf(row), lang = to(), text = b?.textContent.trim();
    if (!b || !text || !lang) return;
    const k = hash(text);
    if (out(b)) { // gỡ = xoá luôn bản dịch đã lưu, bấm dịch lần nữa sẽ dịch lại
      out(b).remove(); delete store[k];
      fetch(`${API}translations/del?to=${lang}&k=${k}`, { method: "POST" }).catch(() => {});
      return;
    }
    if (store[k]) return show(b, store[k]);
    show(b, null);
    try {
      const r = await (await fetch(`${API}translate?to=${lang}&k=${k}&e=${document.body.dataset.zgTrEngine || ""}`, { method: "POST", body: text })).json();
      if (r.error) throw new Error(r.error);
      if (lang === loaded) store[k] = r.t;
      if (out(b)) show(b, r.t); // người dùng gỡ trong lúc đang dịch thì thôi (kết quả vẫn được lưu)
    } catch (e) { if (out(b)) show(b, "Không dịch được: " + e.message, true); }
  };

  const load = async () => {
    const lang = to();
    if (lang === loaded) return;
    loaded = lang; store = {};
    if (lang) try { store = await (await fetch(`${API}translations?to=${lang}`)).json(); } catch {}
  };

  const scan = () => {
    const lang = to();
    // nút dịch trong hàng nút hành động của tin (Trả lời / Chia sẻ / …): nhân bản nút có sẵn để giống hệt style
    document.querySelectorAll(".MQA-contents").forEach((c) => {
      const has = c.querySelector(".zg-trb");
      if (has && !lang) return has.remove();
      const rb = bodyOf(c.closest(ROW));
      if (has) { // đã dịch → nút thành "Gỡ bản dịch"
        const d = String(!!(rb && out(rb)));
        if (has.dataset.o !== d) { has.dataset.o = d; has.title = d === "true" ? "Gỡ bản dịch" : "Dịch tin nhắn"; has.querySelector(".zg-trb-i").innerHTML = d === "true" ? ICON_OFF : ICON; }
        return;
      }
      if (!lang || !rb) return;
      const n = c.firstElementChild.cloneNode(true);
      n.classList.add("zg-trb"); n.title = "Dịch tin nhắn"; n.dataset.o = "false";
      const i = n.querySelector("i");
      i.replaceWith(Object.assign(document.createElement("span"), { className: "zg-trb-i", innerHTML: ICON }));
      n.onclick = (e) => { e.stopPropagation(); translate(c.closest(ROW)); };
      c.lastElementChild.before(n);
    });
    // mục trong menu chuột phải, ngay sau "Copy tin nhắn" (nhân bản để giữ style/hover của Zalo)
    const copy = [...document.querySelectorAll(".zmenu-item")].find((e) => e.textContent.trim() === "Copy tin nhắn");
    if (copy && lang && bodyOf(row0) && !copy.parentElement.querySelector(".zg-tri")) {
      const n = copy.cloneNode(true), ic = n.querySelector(".menu-icon"), off = !!out(bodyOf(row0));
      n.classList.add("zg-tri"); n.classList.toggle("zg-tri-off", off);
      if (off) { n.classList.remove("--NORMAL"); n.classList.add("--DANGER"); } // đỏ cả dòng như "Xóa chỉ ở phía tôi"
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
      for (let t; (t = w.nextNode()); ) if (t.nodeValue.trim()) { t.nodeValue = off ? "Gỡ bản dịch" : "Dịch tin nhắn"; break; }
      if (ic) { [...ic.classList].filter((c) => /_\d+_Line$/.test(c)).forEach((c) => ic.classList.remove(c)); ic.innerHTML = off ? ICON_OFF : ICON; }
      const r = row0;
      n.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); translate(r); document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); }, true); // mousedown đóng menu
      copy.after(n);
    }
    // bản dịch đã lưu: hiện lại khi tin xuất hiện (mở lại chat, cuộn lên tin cũ)
    if (lang) document.querySelectorAll(ROW).forEach((r) => {
      const b = bodyOf(r); if (!b || out(b)) return;
      const t = b.textContent.trim(), k = hash(t);
      if (t && store[k]) show(b, store[k]);
    });
  };

  document.addEventListener("contextmenu", (e) => { row0 = e.target.closest?.(ROW) || null; }, true);
  addEventListener("zg-tr-clear", () => { store = {}; document.querySelectorAll(".zg-tr-out").forEach((o) => o.remove()); });
  const init = () => {
    let q = 0; // ponytail: quét lại toàn bộ tin đang có mỗi lần DOM đổi (gộp 1 frame); chat dài hàng nghìn tin thì nên chỉ quét node mới
    const go = () => { q = 0; load().then(scan); };
    new MutationObserver(() => q || (q = requestAnimationFrame(go))).observe(document.body, { childList: true, subtree: true });
    go();
  };
  document.body ? init() : addEventListener("DOMContentLoaded", init);
})();
