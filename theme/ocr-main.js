// Chạy ở main process (chèn đầu bootstrap.js): server 127.0.0.1:47831 cho viewer ảnh gọi OCR bằng engine native của từng OS:
// macOS = Vision (ocr.swift → ~/.zalo-glass/ocr), Windows = Windows.Media.Ocr (ocr.ps1), Linux = tesseract (cần cài + gói vie).
// GET /ocr?p=<đường dẫn ảnh>. Chỉ đọc file nằm trong thư mục ZaloData; không nhận gì khác.
try {
  const os = require("os"), path = require("path"), fs = require("fs"), { execFile } = require("child_process");
  const WIN = process.platform === "win32", MAC = process.platform === "darwin", DIR = path.join(os.homedir(), ".zalo-glass"), TR = path.join(DIR, "translations");
  const inMedia = (p) => (MAC ? p.startsWith(path.join(os.homedir(), "Library/Application Support/ZaloData/media") + path.sep) : p.split(path.sep).includes("ZaloData")); // ponytail: Win/Linux chưa kiểm chứng đường dẫn ZaloData, siết lại khi có máy thật
  const opt = { timeout: 120000, maxBuffer: 1 << 24, windowsHide: true };
  // mỗi engine trả JSON [{t,x,y,w,h}] chuẩn hoá 0–1
  const engines = {
    darwin: (p, cb) => execFile(path.join(DIR, "ocr"), [p], opt, cb),
    win32: (p, cb) => execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", path.join(DIR, "ocr.ps1"), p], opt, (e, out) => cb(e, (out || "").replace(/^\uFEFF/, ""))),
    linux: (p, cb) => execFile("tesseract", [p, "stdout", "-l", "vie+eng", "tsv"], opt, (e, out) => {
      if (e) return cb(e);
      let W = 1, H = 1; const lines = new Map(); // tsv: level page block par line word left top width height conf text
      for (const r of out.split("\n").slice(1)) {
        const c = r.split("\t"); if (c.length < 12) continue;
        const [lv, , b, pa, ln, , l, t, w, h, cf] = c.map(Number), txt = c.slice(11).join("\t").trim();
        if (lv === 1) { W = w; H = h; continue; }
        if (lv !== 5 || cf < 0 || !txt) continue;
        const k = `${b}.${pa}.${ln}`, o = lines.get(k) || { t: [], x0: 1e9, y0: 1e9, x1: 0, y1: 0 };
        o.t.push(txt); o.x0 = Math.min(o.x0, l); o.y0 = Math.min(o.y0, t); o.x1 = Math.max(o.x1, l + w); o.y1 = Math.max(o.y1, t + h); lines.set(k, o);
      }
      cb(null, JSON.stringify([...lines.values()].map((o) => ({ t: o.t.join(" "), x: o.x0 / W, y: o.y0 / H, w: (o.x1 - o.x0) / W, h: (o.y1 - o.y0) / H }))));
    }),
  };
  const engine = engines[process.platform];
  const cache = new Map(), busy = new Map(); // ponytail: cache theo đường dẫn trong phiên, 200 mục; busy gộp các request trùng đang chạy
  const srv = require("http").createServer((req, res) => {
    const h = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    const fail = (c, m) => { res.writeHead(c, h); res.end(JSON.stringify({ error: m })); };
    const done = (out) => { res.writeHead(200, h); res.end(out); };
    try {
      const u = new URL(req.url, "http://x");
      if (/^https?:/.test(req.headers.origin || "")) return fail(403, "forbidden"); // chỉ trang file:// của Zalo; chặn website bất kỳ gọi vào localhost
      if (u.pathname === "/config") { // tuỳ chọn giảm tải (opts-main.js); ?set=<khoá>&v=0|1 để đổi
        const Z = globalThis.__zgCfg;
        if (!Z) return fail(501, "no config");
        const k = u.searchParams.get("set");
        return done(JSON.stringify(k ? Z.set(k, typeof Z.DEF[k] === "number" ? +u.searchParams.get("v") : u.searchParams.get("v") === "1") : Z.read()));
      }
      if (u.pathname === "/noti") { globalThis.__zgNotiLog?.("renderer " + (u.searchParams.get("m") || "").slice(0, 200)); return done("{}"); } // nhật ký thông báo (noti.js)
      if (u.pathname === "/restart") { // menu "Khởi động lại Zalo"; chỉ POST (trang web ngoài gửi POST sẽ mang Origin http → đã bị chặn ở trên)
        if (req.method !== "POST") return fail(405, "POST only");
        done("{}"); const { app } = require("electron"); setTimeout(() => { app.relaunch(); app.exit(0); }, 200);
        return;
      }
      if (u.pathname === "/drag") { // kéo file ra ngoài (drag-main.js); không nhận đường dẫn từ request, chỉ tên file
        const D = globalThis.__zgDrag;
        if (!D) return fail(501, "no drag");
        if (u.searchParams.get("m") === "arm") { D.arm(); return done("{}"); }
        return D.start(path.basename(u.searchParams.get("n") || ""), (ok) => (ok ? done("{}") : fail(404, "no file")));
      }
      if (u.pathname === "/translations") { // bản dịch đã lưu của 1 ngôn ngữ (translate.js hiện lại khi mở chat)
        const to = u.searchParams.get("to");
        if (!["vi", "en"].includes(to)) return fail(400, "bad lang");
        try { return done(fs.readFileSync(path.join(TR, to + ".json"), "utf8")); } catch { return done("{}"); }
      }
      if (u.pathname === "/translations/del") { // gỡ 1 bản dịch đã lưu (nút "Gỡ bản dịch")
        if (req.method !== "POST") return fail(405, "POST only");
        const to = u.searchParams.get("to"), k = u.searchParams.get("k") || "", f = path.join(TR, to + ".json");
        if (!["vi", "en"].includes(to) || !/^[0-9a-f]{1,16}$/.test(k)) return fail(400, "bad request");
        try { const m = JSON.parse(fs.readFileSync(f, "utf8")); delete m[k]; fs.writeFileSync(f, JSON.stringify(m)); } catch {}
        return done("{}");
      }
      if (u.pathname === "/translations/clear") { // nút "Xoá lịch sử dịch" trong menu mắt
        if (req.method !== "POST") return fail(405, "POST only");
        for (const l of ["vi", "en"]) try { fs.unlinkSync(path.join(TR, l + ".json")); } catch {}
        return done("{}");
      }
      if (u.pathname === "/translate") { // dịch local bằng Apple Translation (macOS 26+) hoặc Google (e=google, mặc định ở Windows/Linux); POST text thuần, ?to=vi|en&k=<khoá lưu>[&e=google]
        if (req.method !== "POST") return fail(405, "POST only");
        const to = u.searchParams.get("to"), k = u.searchParams.get("k") || "";
        if (!["vi", "en"].includes(to) || !/^[0-9a-f]{1,16}$/.test(k)) return fail(400, "bad request");
        if (!globalThis.__zgTr) return fail(501, "chưa có helper dịch");
        let body = "";
        req.on("data", (d) => { body += d; if (body.length > 5000) req.destroy(); });
        req.on("end", () => globalThis.__zgTr(to, body, (r) => {
          if (r.error) return fail(500, String(r.error).slice(0, 200));
          if (u.searchParams.get("n") === "1") return done(JSON.stringify({ t: r.t })); // bản nháp đang soạn (live.js): không lưu
          try { // lưu lại: ~/.zalo-glass/translations/<ngôn ngữ>.json {khoá: bản dịch}
            const f = path.join(TR, to + ".json");
            fs.mkdirSync(TR, { recursive: true }); let m = {}; try { m = JSON.parse(fs.readFileSync(f, "utf8")); } catch {} m[k] = r.t; fs.writeFileSync(f, JSON.stringify(m));
          } catch {}
          done(JSON.stringify({ t: r.t }));
        }, u.searchParams.get("e")));
        return;
      }
      if (u.pathname !== "/ocr") return fail(404, "not found");
      if (!engine) return fail(501, "OCR chưa hỗ trợ trên " + process.platform);
      let raw = u.searchParams.get("p") || "";
      if (WIN) raw = raw.replace(/^\/(?=[A-Za-z]:)/, ""); // pathname của file:///C:/… có dấu / thừa ở đầu
      let p = fs.realpathSync(raw);
      if (!inMedia(p)) return fail(403, "outside media");
      if (p.endsWith("_n") && fs.existsSync(p.slice(0, -1) + "h")) p = p.slice(0, -1) + "h"; // bản HD (_h) nếu đã tải, chữ nhỏ đọc chuẩn hơn
      if (cache.has(p)) return done(cache.get(p));
      if (!busy.has(p)) {
        const waiters = [];
        busy.set(p, waiters);
        engine(p, (e, out) => {
          busy.delete(p);
          if (!e) { if (cache.size > 200) cache.clear(); cache.set(p, out); }
          waiters.forEach((w) => w(e, out));
        });
      }
      busy.get(p).push((e, out) => (e ? fail(500, String(e.code === "ENOENT" ? "chưa cài công cụ OCR (" + e.path + ")" : e.message).slice(0, 200)) : done(out)));
    } catch (e) { fail(400, "bad request"); }
  });
  srv.on("error", () => {}); // cổng bận (instance thứ hai) → bỏ qua
  srv.listen(47831, "127.0.0.1");
} catch {}
