// Chạy ở main process (chèn đầu bootstrap.js, trước ocr-main.js): các tuỳ chọn giảm tải, đọc từ ~/.zalo-glass/config.json lúc khởi động
// (menu con mắt trong app ghi file này qua server localhost của ocr-main.js; đổi xong cần mở lại Zalo).
//   ram       giới hạn heap V8 + ít luồng raster (KHÔNG dùng enable-low-end-device-mode: đo thấy tốn 50-120% CPU)
//   noUpdate  bỏ autoUpdater.checkForUpdates
//   throttle  ép backgroundThrottling:true (Zalo mặc định false → cửa sổ ẩn vẫn chạy full tốc độ)
//   lazyNoti  cửa sổ popup thông báo chỉ nạp khi lần đầu hiện ra (popup đầu tiên có thể trễ / mất nội dung)
//   trKeep    số phút giữ helper dịch chạy nền sau lần dịch cuối (translate-main.js; 0 = thoát ngay), áp dụng ngay không cần mở lại
//   noCap / noCall   không chạy ZaloCap (chụp màn hình) / ZaloCall (gọi thoại, video) → tính năng đó không dùng được
try {
  const os = require("os"), path = require("path"), fs = require("fs"), cp = require("child_process"), { EventEmitter } = require("events"), { Writable, PassThrough } = require("stream");
  const FILE = path.join(os.homedir(), ".zalo-glass/config.json");
  const DEF = { ram: true, noUpdate: true, throttle: false, lazyNoti: false, noCap: false, noCall: false, trKeep: 30 };
  const read = () => { try { return { ...DEF, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch { return { ...DEF }; } };
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

  const Orig = electron.BrowserWindow;
  class Win extends Orig {
    constructor(o = {}) {
      if (cfg.throttle) o = { ...o, webPreferences: { ...o.webPreferences, backgroundThrottling: true } };
      super(o);
    }
    loadURL(u, ...r) {
      if (cfg.lazyNoti && /znotification\.html/.test(u)) { this._zgLazy = [u, ...r]; return Promise.resolve(); }
      return super.loadURL(u, ...r);
    }
    _zgFlush() { const l = this._zgLazy; this._zgLazy = null; if (l) super.loadURL(...l).catch(() => {}); }
    show() { this._zgFlush(); return super.show(); }
    showInactive() { this._zgFlush(); return super.showInactive(); }
  }
  const updater = new Proxy(electron.autoUpdater, { get: (t, k) => (k === "checkForUpdates" ? () => {} : typeof t[k] === "function" ? t[k].bind(t) : t[k]) });
  const Module = require("module"), load = Module._load;
  const proxy = new Proxy(electron, { get: (t, k) => (k === "BrowserWindow" ? Win : k === "autoUpdater" && cfg.noUpdate ? updater : t[k]) });
  Module._load = function (req, ...r) { const m = load.call(this, req, ...r); return req === "electron" && m === electron ? proxy : m; };
} catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "opts-main: " + e.stack + "\n"); } catch {} }
