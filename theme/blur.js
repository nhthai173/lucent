// Che tin nhắn kiểu ZaDark: mục trong sidebar mở menu bật/tắt từng phần, lưu localStorage (chung cho cửa sổ chính và viewer ảnh, đồng bộ qua sự kiện storage).
// Nhóm 1: danh sách hội thoại (msg/name/avatar). Nhóm 2: trong khung chat (cmsg/cimg/cname). Nhóm 3: cửa sổ xem ảnh (view).
(() => {
  const ICON = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const MACOS = /Mac/.test(navigator.platform), KEY = "zg-hide", VIEWER = location.pathname.endsWith("popup-viewer.html");
  // icon nét mảnh 24px như menu Cài đặt của Zalo
  const I = {
    list: ICON('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    chat: ICON('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    img: ICON('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-4.5 4 3.5 3-2.5 6 4.5"/>'),
    album: ICON('<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M20 8v8M7 3h10"/>'),
    pet: ICON('<circle cx="8" cy="8" r="1.7"/><circle cx="16" cy="8" r="1.7"/><circle cx="5" cy="13" r="1.7"/><circle cx="19" cy="13" r="1.7"/><path d="M12 12c-3 0-5 3-5 5 0 1.5 1.5 2 3 1.5 1.3-.4 2.7-.4 4 0 1.5.5 3 0 3-1.5 0-2-2-5-5-5z"/>'),
    theme: ICON('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'),
    tr: ICON('<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M12 5c-1 4-4 7-8 8M13 20l4-9 4 9M14.5 17h5"/>'),
    perf: ICON('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
    bell: ICON('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/>'),
  };
  const GROUPS = [
    ["Ẩn trong danh sách hội thoại", I.list, [["msg", "Tin nhắn"], ["name", "Tên"], ["avatar", "Ảnh đại diện"]]],
    ["Ẩn trong hội thoại", I.chat, [["cmsg", "Nội dung tin nhắn"], ["cimg", "Ảnh / album"], ["cname", "Tên & avatar"]]],
    ["Ẩn khi xem ảnh", I.img, [["view", "Ảnh, thumbnail, người gửi"]]],
    ["Hiển thị ảnh trong hội thoại", I.album, "album"], // select: Mặc định (dạng gốc của Zalo) | Cuộn ngang
    ["Dịch tin nhắn", I.tr, "tr"], // macOS: Apple local (mặc định) hoặc Google; Windows/Linux: chỉ Google, mặc định tắt
    ["OCR trên ảnh", I.img, [["ocr", "Quét chữ khi xem ảnh"]]], // mặc định bật; ocr.js (viewer) đọc class zg-ocr-off
    ["Giao diện", I.theme, "@theme"], // select template theme / pet (templates.js)
    ["Pet", I.pet, [["pet", "Hiện pet"], ["petbig", "Phóng to pet khi đang che"]]], // Hiện pet mặc định bật, Phóng to mặc định tắt; pet.js đọc class zg-pet-off / zg-pet-big
  ];
  const OPTS = GROUPS.flatMap(([, , o]) => (Array.isArray(o) ? o : o === "album" || o === "tr" ? [[o]] : [])), PET = ["pet", "petbig", "album", "tr", "ocr"], isOn = (k) => (k === "pet" || k === "ocr" ? st[k] !== false : !!st[k]); // "pet" và "ocr" mặc định bật
  const selVal = (k) => (st[k] === true ? "1" : st[k] || ""); // album lưu boolean, tr lưu mã ngôn ngữ
  const svg = (extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>${extra}</svg>`;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let st = load();
  document.documentElement.classList.toggle("zg-mac", /Mac/.test(navigator.platform)); // phím tắt hiển thị ⌘ trên Mac, Ctrl nơi khác
  let btn, menu, body, foot;

  const render = () => {
    // "view" chỉ áp ở viewer: ảnh trong khung chat cũng dùng class zimg-el
    OPTS.forEach(([k]) => !PET.includes(k) && document.body.classList.toggle("zg-hide-" + k, !!st[k] && (k !== "view" || VIEWER)));
    document.body.classList.toggle("zg-album", !!st.album); // mặc định tắt
    document.body.dataset.zgTr = st.tr || ""; // translate.js đọc ngôn ngữ đích ("" = tắt)
    document.body.dataset.zgTrEngine = MACOS ? st.trEngine || "" : "google"; // "" = Apple local (chỉ macOS)
    document.body.classList.toggle("zg-pet-big", isOn("petbig"));
    document.body.classList.toggle("zg-pet-off", !isOn("pet"));
    document.body.classList.toggle("zg-ocr-off", !isOn("ocr"));
    const any = OPTS.some(([k]) => !PET.includes(k) && st[k]);
    if (btn) { btn.classList.toggle("on", any); btn.innerHTML = svg(any ? '<path d="M3 3l18 18"/>' : ""); btn.title = "Che tin nhắn & tuỳ chọn"; }
  };

  // Nhóm "Hiệu năng": đọc/ghi qua server localhost ở main process (ocr-main.js ↔ opts-main.js), áp dụng khi mở lại Zalo
  const PERF = [["ram", "Giảm RAM (low-end mode)"], ["noUpdate", "Tắt tự cập nhật"], ["throttle", "Giảm tải khi ẩn / thu nhỏ"], ["lazyNoti", "Hoãn nạp cửa sổ thông báo", "Chỉ liên quan tới cửa sổ thông báo riêng của Zalo trên Windows/Linux: hoãn nạp có thể làm thông báo đầu tiên bị trễ hoặc mất nội dung, nên không bật ở đó. Trên macOS Zalo dùng thông báo hệ thống nên mục này gần như không có tác dụng."], ["noCap", "Tắt ZaloCap (chụp màn hình)", "Khi tắt ZaloCap, Zalo không dán (paste) được ảnh/file từ clipboard vào khung chat. Cần dán ảnh/file thì đừng bật mục này."], ["noCall", "Tắt ZaloCall (gọi thoại / video)"]];
  // Nhóm "Thông báo": cùng server /config nhưng main process đọc lại file mỗi lần báo tin nên áp dụng ngay, không cần mở lại Zalo
  const NOTI = [["noNoti", "Tắt thông báo tin nhắn", "Không hiện banner/popup khi có tin mới (badge và nảy icon vẫn chạy; âm báo do cài đặt âm thanh của Zalo quyết định)."],
    ["notiFocus", "Báo tin cả khi đang mở Zalo", "Mặc định Zalo bỏ qua thông báo khi bạn đang ở trong cửa sổ Zalo. Bật mục này để vẫn báo."],
    ["hideNoti", "Ẩn nội dung thông báo", "Banner chỉ ghi \"Bạn có tin nhắn mới\", không hiện tên, nội dung và ảnh đại diện (áp dụng cho thông báo hệ thống lẫn popup của Zalo)."]];
  const API = "http://127.0.0.1:47831/config";
  const sech = (icon, title) => { const h = document.createElement("div"); h.className = "zg-h"; h.innerHTML = icon; h.append(title); return h; };
  const cfgBox = async (icon, title, list, restart) => {
    try {
      const cfg = await (await fetch(API)).json(), box = document.createElement("section");
      box.append(sech(icon, title));
      list.forEach(([k, label, tip]) => {
        const l = document.createElement("label");
        l.innerHTML = `<span>${label}</span><input type="checkbox">`;
        if (tip) { // (i) rê chuột / bấm để xem giải thích
          const i = Object.assign(document.createElement("i"), { className: "zg-i", textContent: "i", tabIndex: 0 });
          i.dataset.tip = tip; i.onclick = (e) => e.preventDefault();
          l.firstChild.append(i);
        }
        const c = l.lastChild; c.checked = !!cfg[k];
        c.onchange = () => { fetch(`${API}?set=${k}&v=${+c.checked}`).catch(() => {}); if (restart) foot.classList.add("dirty"); };
        box.append(l);
      });
      body.append(box); foot.hidden = false;
    } catch {} // server chưa chạy / viewer không có → bỏ nhóm
  };
  const perf = () => cfgBox(I.perf, "Hiệu năng", PERF, true), noti = () => cfgBox(I.bell, "Thông báo", NOTI, false);

  // thẻ chọn template có preview (kiểu chọn giao diện của Zalo): theme vẽ khung mini bằng chính biến màu của theme, pet vẽ sprite
  const preview = (kind, k) => {
    if (kind === "pet") return `<svg viewBox="-4 -10 48 48" class="zp-sprite">${__zg.PETS[k].svg}</svg>`;
    const v = __zg.THEMES[k].vars, d = document.body.classList.contains("dark");
    return `<div class="zg-pv" style="background:radial-gradient(70% 90% at 15% 10%,${v[d ? "--zg-d1" : "--zg-l1"]},transparent),radial-gradient(70% 90% at 95% 100%,${v[d ? "--zg-d3" : "--zg-l3"]},transparent),${v[d ? "--zg-bg-d" : "--zg-bg-l"]}">
      <i class="zg-pv-nav" style="background:${d ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.55)"}"></i><i class="zg-pv-in" style="background:${d ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.8)"}"></i><i class="zg-pv-out" style="background:rgb(${v["--zg-primary"]})"></i></div>`;
  };
  const draws = [];
  const cards = (kind) => {
    const row = Object.assign(document.createElement("div"), { className: "zg-cards" }), all = kind === "pet" ? __zg.PETS : __zg.THEMES;
    const draw = () => {
      row.innerHTML = Object.entries(all).map(([k, t]) => `<button type="button" data-k="${k}" class="${__zg.get()[kind] === k ? "on" : ""}">${preview(kind, k)}<span>${t.name}</span></button>`).join("");
    };
    row.onclick = (e) => { const c = e.target.closest("button"); if (c) __zg.set(kind, c.dataset.k); };
    draw(); draws.push(draw);
    return row;
  };

  const buildMenu = () => {
    menu = Object.assign(document.createElement("div"), { id: "zg-menu" }); // lớp phủ; hộp thoại nằm trong
    const dlg = document.createElement("div"), head = document.createElement("header"), x = Object.assign(document.createElement("button"), { type: "button", className: "zg-x", ariaLabel: "Đóng", innerHTML: ICON('<path d="M5 5l14 14M19 5L5 19"/>') });
    dlg.className = "zg-dlg";
    head.append(Object.assign(document.createElement("h2"), { textContent: "Tuỳ chọn Glass" }), x);
    body = Object.assign(document.createElement("div"), { className: "zg-body" });
    foot = Object.assign(document.createElement("footer"), { hidden: true }); // chỉ hiện khi có nhóm Hiệu năng (cần server localhost của main process)
    const rb = Object.assign(document.createElement("button"), { type: "button", textContent: "Khởi động lại" });
    rb.onclick = () => fetch(API.replace("/config", "/restart"), { method: "POST" }).catch(() => {});
    foot.append(Object.assign(document.createElement("span"), { textContent: "Khởi động lại Zalo để áp dụng thay đổi Hiệu năng" }), rb);
    dlg.append(head, body, foot); menu.append(dlg);
    x.onclick = () => menu.classList.remove("open");
    GROUPS.forEach(([title, icon, opts]) => {
      const sec = document.createElement("section"), h = sech(icon, title);
      sec.append(h);
      if (opts[0] === "@") { sec.append(cards("theme")); body.append(sec); return; } // theme: lưới thẻ preview
      if (!Array.isArray(opts)) { // select Mặc định / Cuộn ngang
        const s = document.createElement("select");
        s.dataset.k = opts; s.innerHTML = opts === "tr" ? '<option value="">Tắt</option><option value="vi">Tiếng Việt</option><option value="en">English</option>' : '<option value="">Mặc định</option><option value="1">Cuộn ngang</option>'; s.value = selVal(opts);
        s.onchange = () => { st[opts] = opts === "tr" ? s.value : !!s.value; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} render(); };
        h.append(s);
        if (opts === "tr") { // bản dịch lưu ở ~/.zalo-glass/translations/ (ocr-main.js); xoá phải xác nhận
          const l = document.createElement("label");
          l.innerHTML = "<span>Lịch sử dịch (lưu trên máy)</span><button type=\"button\">Xoá</button>";
          l.lastChild.onclick = async (e) => {
            e.preventDefault();
            if (!confirm("Xoá toàn bộ lịch sử dịch đã lưu?\nBản dịch trên các tin nhắn sẽ biến mất và không khôi phục được.")) return;
            try { await fetch(API.replace("/config", "/translations/clear"), { method: "POST" }); dispatchEvent(new Event("zg-tr-clear")); } catch {}
          };
          sec.append(l);
          const eng = document.createElement("label"), note = document.createElement("label"); // công cụ dịch + cảnh báo quyền riêng tư khi dùng Google
          note.className = "zg-note"; note.textContent = "Google Translate: nội dung tin nhắn được gửi tới Google (không còn offline). Endpoint không chính thức, có thể bị giới hạn.";
          const showNote = () => (note.hidden = !(!MACOS || st.trEngine === "google"));
          if (MACOS) {
            eng.innerHTML = '<span>Công cụ dịch</span><select class="zg-sel"><option value="">Apple (trên máy)</option><option value="google">Google (online)</option></select>';
            eng.lastChild.value = st.trEngine || "";
            eng.lastChild.onchange = () => { st.trEngine = eng.lastChild.value; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} render(); showNote(); };
            sec.append(eng);
          }
          showNote(); sec.append(note);
        }
        if (opts === "tr" && MACOS) {
          const k = document.createElement("label"); // thời gian giữ helper dịch chạy nền (translate-main.js): nạp model một lần cho các lần dịch sau, tốn ~15 MB RAM khi đang giữ
          k.innerHTML = '<span>Giữ helper dịch trong bộ nhớ (phút)</span><input type="number" min="0" max="1440" step="5" class="zg-num">';
          k.title = "0 = tắt hẳn sau mỗi lần dịch (mỗi lần dịch chậm hơn ~2 giây vì phải nạp lại model). Đổi có tác dụng ngay.";
          const n = k.lastChild;
          fetch(API).then((r) => r.json()).then((c) => (n.value = c.trKeep ?? 30)).catch(() => (n.value = 30));
          n.onchange = () => { n.value = Math.max(0, Math.min(1440, Math.round(+n.value) || 0)); fetch(`${API}?set=trKeep&v=${n.value}`).catch(() => {}); };
          sec.append(k);
        }
        body.append(sec); return;
      }
      if (title === "Pet") sec.append(cards("pet"));
      opts.forEach(([k, label]) => {
        const l = document.createElement("label");
        l.innerHTML = `<span>${label}</span><input type="checkbox" data-k="${k}">`;
        const c = l.lastChild; c.checked = isOn(k);
        c.onchange = () => { st[k] = c.checked; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} render(); };
        sec.append(l);
      });
      body.append(sec);
    });
    noti().then(perf);
    document.body.append(menu);
    menu.addEventListener("mousedown", (e) => { if (e.target === menu) menu.classList.remove("open"); }); // bấm nền mờ để đóng
    addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) { menu.classList.remove("open"); e.stopPropagation(); } }, true);
  };

  // React vẽ lại sidebar thì mục bị mất → gắn lại
  const mount = () => {
    const nav = document.querySelector(".nav__tabs__bottom");
    if (!nav || nav.contains(btn)) return;
    if (!btn) {
      btn = Object.assign(document.createElement("div"), { id: "zg-nav", className: "nav__tabs__bottom__btn" });
      buildMenu();
      btn.onclick = () => { draws.forEach((f) => f()); menu.classList.toggle("open"); }; // vẽ lại: preview theo chế độ sáng/tối hiện tại
    }
    nav.prepend(btn);
    render();
  };

  addEventListener("zg-tpl", () => draws.forEach((f) => f())); // chọn xong (hoặc cửa sổ khác đổi) → vẽ lại thẻ để cập nhật viền chọn
  addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    st = load(); render();
    menu?.querySelectorAll("input[data-k]").forEach((c) => (c.checked = isOn(c.dataset.k)));
    menu?.querySelectorAll("select[data-k]").forEach((s) => (s.value = selVal(s.dataset.k)));
  });

  const init = () => { render(); let q = 0; new MutationObserver(() => q || (q = requestAnimationFrame(() => { q = 0; mount(); }))).observe(document.body, { childList: true, subtree: true }); mount(); };
  document.body ? init() : addEventListener("DOMContentLoaded", init);
})();
