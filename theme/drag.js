// Kéo thẻ file trong chat ra Finder/Explorer thay cho nút "Lưu về máy" + chọn thư mục. Chạy ở cửa sổ chính/popup chat.
// Đường dẫn do main process lấy (drag-main.js); file chưa có trên máy thì chưa kéo được.
(() => {
  if (location.pathname.endsWith("popup-viewer.html")) return;
  const API = "http://127.0.0.1:47831/drag", CARD = ".file-message__container";
  const card = (t) => t.closest && t.closest(CARD);
  // nhấn chuột xuống: nhờ main chặn lần mở thư mục kế tiếp rồi "bấm" nút mở thư mục của Zalo → main biết đường dẫn trước khi dragstart
  addEventListener("mousedown", async (e) => {
    const c = card(e.target), open = c && c.querySelector("a.open");
    if (!c || e.button || e.target.closest(".file-message__actions") || !c.querySelector(".cloud-status.local") || !open) return;
    try { await fetch(API + "?m=arm"); open.click(); } catch {}
  }, true);
  addEventListener("dragstart", (e) => {
    const c = card(e.target);
    if (!c || !c.querySelector(".cloud-status.local")) return;
    e.preventDefault(); e.stopPropagation();
    const n = c.querySelector(".file-message__content-title")?.title || "";
    fetch(API + "?n=" + encodeURIComponent(n)).catch(() => {});
  }, true);
  const mark = () => document.querySelectorAll(CARD + ":not([draggable])").forEach((c) => c.setAttribute("draggable", "true"));
  let raf = 0;
  const init = () => { new MutationObserver(() => raf || (raf = requestAnimationFrame(() => { raf = 0; mark(); }))).observe(document.body, { childList: true, subtree: true }); mark(); };
  document.body ? init() : addEventListener("DOMContentLoaded", init);
})();
