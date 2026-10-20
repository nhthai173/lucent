// Chạy ở main process (chèn đầu bootstrap.js, trước ocr-main.js): các tuỳ chọn giảm tải, đọc từ ~/.zalo-glass/config.json lúc khởi động
// (menu con mắt trong app ghi file này qua server localhost của ocr-main.js; đổi xong cần mở lại Zalo).
//   ram       giới hạn heap V8 + ít luồng raster (KHÔNG dùng enable-low-end-device-mode: đo thấy tốn 50-120% CPU)
//   noUpdate  bỏ autoUpdater.checkForUpdates
//   throttle  ép backgroundThrottling:true (Zalo mặc định false → cửa sổ ẩn vẫn chạy full tốc độ)
//   lazyNoti  cửa sổ popup thông báo chỉ nạp khi lần đầu hiện ra (popup đầu tiên có thể trễ / mất nội dung)
//   trKeep    số phút giữ helper dịch chạy nền sau lần dịch cuối (translate-main.js; 0 = thoát ngay), áp dụng ngay không cần mở lại
//   (luôn bật) Windows: nháy taskbar khi số tin chưa đọc tăng lúc cửa sổ không focus (Zalo chỉ nháy khi xoá badge); noti.js (renderer) và lần nảy/đặt badge của Dock (macOS) ghi vào ~/.zalo-glass/noti.log
//   noNoti / notiFocus / hideNoti   tắt thông báo / báo cả khi đang focus Zalo / ẩn tên-nội dung-ảnh (áp dụng ngay: đọc lại file mỗi lần báo; renderer lấy qua /config)
//   noCap / noCall   không chạy ZaloCap (chụp màn hình) / ZaloCall (gọi thoại, video) → tính năng đó không dùng được
try {
  const os = require("os"), path = require("path"), fs = require("fs"), cp = require("child_process"), { EventEmitter } = require("events"), { Writable, PassThrough } = require("stream");
  const FILE = path.join(os.homedir(), ".zalo-glass/config.json");
  const DEF = { ram: true, noUpdate: true, throttle: false, lazyNoti: false, noCap: false, noCall: false, trKeep: 30, noNoti: false, notiFocus: false, hideNoti: false };
  const read = () => { try { return { ...DEF, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch { return { ...DEF }; } };
  const NOTI_LOG = path.join(os.homedir(), ".zalo-glass/noti.log"); // ponytail: không xoay vòng; noti.js chỉ ghi vài dòng mỗi tin, xoá tay khi to
  const notiLog = (m) => { try { fs.appendFileSync(NOTI_LOG, new Date().toISOString() + " " + m + "\n"); } catch {} };
  globalThis.__zgNotiLog = notiLog; // noti.js gửi dòng log qua /noti của ocr-main.js (console của Zalo bị nuốt)
  const cfg = read();
  globalThis.__zgCfg = { DEF, read, set: (k, v) => { if (!(k in DEF)) return read(); const c = { ...read(), [k]: typeof DEF[k] === "number" ? Math.max(0, Math.min(1440, Math.round(+v) || 0)) : !!v }; fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(c, null, 2)); return c; } };

  const electron = require("electron"), sw = electron.app.commandLine;
  if (cfg.ram) { sw.appendSwitch("num-raster-threads", "2"); sw.appendSwitch("js-flags", "--max-old-space-size=512"); } // ponytail: 512MB đủ cho renderer ~160MB; tăng nếu thấy Zalo crash khi mở nhóm rất lớn

  // process giả cho ZaloCap/ZaloCall: nuốt mọi thứ Zalo ghi vào stdin, không bao giờ báo "ready"
  const fake = () => Object.assign(new EventEmitter(), { pid: undefined, kill() {}, stdout: new PassThrough(), stderr: new PassThrough(),
    stdin: Object.assign(new Writable({ write: (c, e, cb) => cb() }), { pause() {}, resume() {} }) });
  const spawn = cp.spawn;
  cp.spawn = function (cmd, ...r) {
    const b = path.basename(String(cmd)).replace(/\.exe$/i, "");
    return (b === "ZaloCap" && cfg.noCap) || (b === "ZaloCall" && cfg.noCall) ? fake() : spawn.call(this, cmd, ...r);
  };

  const dock = electron.app.dock; // macOS: ghi lại mỗi lần Zalo nảy icon / đặt badge để đối chiếu với sự kiện thông báo của renderer
  if (dock) for (const k of ["bounce", "setBadge"]) { const f = dock[k].bind(dock); dock[k] = (...a) => { notiLog("main dock." + k + (k === "setBadge" ? " " + a[0] : "") + " active=" + electron.app.isHidden() ); return f(...a); }; }

  // đường V2 của Zalo tạo thông báo ở main process (electron.Notification, macOS: API NSUserNotification cũ); ghi new/show/failed để biết banner có tới hệ điều hành không
  const HIDDEN = { title: "Zalo", body: "Bạn có tin nhắn mới", icon: undefined };
  class Noti extends electron.Notification {
    constructor(o) {
      super(read().hideNoti ? { ...o, ...HIDDEN } : o); notiLog("main Notification new silent=" + !!(o && o.silent));
      this.on("show", () => notiLog("main Notification show")); this.on("failed", (_e, err) => notiLog("main Notification failed " + err));
    }
    show() { if (read().noNoti) return; return super.show(); }
  }

  const Orig = electron.BrowserWindow;
  class Win extends Orig {
    constructor(o = {}) {
      if (cfg.throttle) o = { ...o, webPreferences: { ...o.webPreferences, backgroundThrottling: true } };
      super(o);
    }
    setOverlayIcon(img, desc) { // Zalo gọi hàm này với số tin chưa đọc; tăng mà đang không focus thì nháy taskbar
      const n = +desc || 0, up = n > (this._zgN || 0) && !this.isFocused(); this._zgN = n;
      super.setOverlayIcon(img, desc); if (up) this.flashFrame(true);
    }
    loadURL(u, ...r) {
      if (/znotification\.html/.test(u)) { // popup thông báo tự vẽ của Zalo (Windows < 10): chặn/ẩn gói noti-create trước khi tới cửa sổ
        const send = this.webContents.send.bind(this.webContents);
        this.webContents.send = (ch, d, ...a) => { const c = read(); if (ch === "noti-create" && c.noNoti) return; return send(ch, ch === "noti-create" && c.hideNoti && d ? { ...d, ...HIDDEN, icon: "" } : d, ...a); };
      }
      if (cfg.lazyNoti && /znotification\.html/.test(u)) { this._zgLazy = [u, ...r]; return Promise.resolve(); }
      return super.loadURL(u, ...r);
    }
    _zgFlush() { const l = this._zgLazy; this._zgLazy = null; if (l) super.loadURL(...l).catch(() => {}); }
    show() { this._zgFlush(); return super.show(); }
    showInactive() { this._zgFlush(); return super.showInactive(); }
  }
  const updater = new Proxy(electron.autoUpdater, { get: (t, k) => (k === "checkForUpdates" ? () => {} : typeof t[k] === "function" ? t[k].bind(t) : t[k]) });
  const Module = require("module"), load = Module._load;
  const proxy = new Proxy(electron, { get: (t, k) => (k === "BrowserWindow" ? Win : k === "Notification" ? Noti : k === "autoUpdater" && cfg.noUpdate ? updater : t[k]) });
  Module._load = function (req, ...r) { const m = load.call(this, req, ...r); return req === "electron" && m === electron ? proxy : m; };
} catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "opts-main: " + e.stack + "\n"); } catch {} }
