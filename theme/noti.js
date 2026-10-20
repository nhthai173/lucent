// Thông báo tin nhắn, cửa sổ chính. (1) Tuỳ chọn Thông báo (menu mắt): notiFocus/noNoti/hideNoti lấy từ /config của ocr-main.js; phần main process nằm ở opts-main.js.
// (2) Bọc `window.Notification` (đường V1 của Zalo) để áp tuỳ chọn và ghi ~/.zalo-glass/noti.log qua /noti (console của Zalo bị nuốt): new/show/noshow, không ghi tên/nội dung tin.
(() => {
  const N = window.Notification;
  if (!N || N.__zg || location.pathname.endsWith("popup-viewer.html")) return;
  const API = "http://127.0.0.1:47831/", log = (...a) => fetch(API + "noti?m=" + encodeURIComponent([...a, "focus=" + document.hasFocus(), "perm=" + N.permission].join(" "))).catch(() => {});
  let cfg = {};
  const sync = () => fetch(API + "config").then((r) => r.json()).then((c) => (cfg = c), () => {});
  sync(); addEventListener("focus", sync); addEventListener("blur", sync);
  const W = class extends N {
    constructor(t, o) {
      if (cfg.noNoti) return { close() {}, addEventListener() {}, removeEventListener() {} };
      if (cfg.hideNoti) { t = "Zalo"; o = { ...o, body: "Bạn có tin nhắn mới", icon: undefined }; }
      super(t, o);
      const t0 = Date.now(); let shown = false;
      this.addEventListener("show", () => { shown = true; log("show", Date.now() - t0 + "ms"); });
      this.addEventListener("error", () => log("error"));
      log("new", "silent=" + !!o?.silent);
      setTimeout(() => shown || log("noshow>3s"), 3000);
    }
  };
  // Zalo coi "đang active" theo ifvisible, bật lại khi chuột lướt qua cửa sổ dù không focus → tin tới không báo, không nảy Dock (install.mjs actFix gọi hàm này).
  // Mặc định: active chỉ khi cửa sổ thật sự có focus; notiFocus: không bao giờ coi là active (báo cả khi đang mở Zalo).
  window.__zgActive = (a) => !cfg.notiFocus && a && document.hasFocus();
  W.__zg = true;
  log("ready", "vis=" + document.visibilityState);
})();
