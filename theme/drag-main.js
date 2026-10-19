// Chạy ở main process: kéo file từ thẻ file trong chat ra Finder/Explorer (drag.js ở renderer gọi qua server của ocr-main.js).
// Zalo không để lộ đường dẫn file đã tải, nên "bấm hộ" nút "Hiển thị trong thư mục", chặn shell.showItemInFolder để lấy đường dẫn, rồi webContents.startDrag.
try {
  const { shell, app, webContents, nativeImage } = require("electron"), fs = require("fs"), os = require("os"), path = require("path");
  let armed = 0, got = null; const waiters = [];
  const orig = shell.showItemInFolder.bind(shell);
  shell.showItemInFolder = (p) => { // đang "armed" thì nuốt lời gọi (không mở Finder), chỉ ghi lại đường dẫn
    if (Date.now() > armed) return orig(p);
    armed = 0; got = p; waiters.splice(0).forEach((w) => w());
  };
  const start = async (name, cb) => {
    try {
      if (!got) await new Promise((r) => { waiters.push(r); setTimeout(r, 1500); });
      let f = got; got = null;
      if (!f || !fs.statSync(f).isFile()) return cb(false);
      if (name && path.basename(f) !== name) { // cache của Zalo đặt tên theo hash → chép sang tên thật để file thả ra đúng tên. ponytail: chép cả file mỗi lần kéo, file rất lớn thì đổi sang hard link
        const d = path.join(os.tmpdir(), "zalo-glass-drag"); fs.mkdirSync(d, { recursive: true });
        fs.copyFileSync(f, f = path.join(d, name));
      }
      const icon = await app.getFileIcon(f).catch(() => nativeImage.createEmpty());
      (webContents.getFocusedWebContents() || webContents.getAllWebContents()[0]).startDrag({ file: f, icon });
      cb(true);
    } catch (e) { cb(false); }
  };
  globalThis.__zgDrag = { arm: () => { armed = Date.now() + 3000; got = null; }, start };
} catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "drag-main: " + e.stack + "\n"); } catch {} }
