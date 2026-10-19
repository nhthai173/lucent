// Chạy ở main process (chèn đầu bootstrap.js, trước ocr-main.js): cung cấp globalThis.__zgTr(to, text, cb, engine) → cb({t} | {error}).
// engine "google" (mặc định ở Windows/Linux; trên macOS là lựa chọn trong menu): gọi Google Translate qua mạng, NỘI DUNG TIN NHẮN RỜI MÁY.
// Còn lại (chỉ macOS): quản lý helper dịch ~/.zalo-glass/translate (translate.swift) chạy nền để chỉ nạp model một lần. Helper tự thoát sau trKeep phút không dùng (config.json, mặc định 30; 0 = thoát ngay sau mỗi lần), lần sau tự bật lại.
try {
  const os = require("os"), path = require("path"), cp = require("child_process");
  // ponytail: endpoint không chính thức của tiện ích từ điển Chrome (dict-chrome-ex), không cần key, đã thấy "client=gtx" bị chặn 429 trên mạng nhà; Google đổi/chặn là hỏng.
  // Nâng cấp: Cloud Translation API chính thức (cần API key, tính phí). Chống chặn không phải việc của file này: lỗi thì báo cho người dùng.
  const google = (to, text, cb) => {
    let done = false;
    const fin = (r) => { if (!done) { done = true; cb(r); } };
    const body = "q=" + encodeURIComponent(text);
    const req = require("https").request({ hostname: "clients5.google.com", path: `/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${to}`, method: "POST", timeout: 15000,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      let b = "";
      res.setEncoding("utf8"); res.on("data", (d) => (b += d));
      res.on("end", () => {
        try { const r = JSON.parse(b), t = Array.isArray(r[0]) ? r[0][0] : r[0]; if (typeof t !== "string") throw 0; fin({ t }); }
        catch { fin({ error: `Google từ chối yêu cầu (HTTP ${res.statusCode}), có thể bị giới hạn tốc độ; thử lại sau` }); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("hết thời gian chờ")));
    req.on("error", (e) => fin({ error: "không gọi được Google: " + e.message }));
    req.end(body);
  };
  let apple = (to, text, cb) => cb({ error: "dịch local chỉ có trên macOS" });
  if (process.platform === "darwin") {
    const BIN = path.join(os.homedir(), ".zalo-glass/translate");
    let proc = null, seq = 0, idle = 0;
    const pend = new Map();
    const stop = () => { clearTimeout(idle); const p = proc; proc = null; if (p) { try { p.stdin.end(); } catch {} } };
    const fail = (msg) => { for (const cb of pend.values()) cb({ error: msg }); pend.clear(); };
    const start = () => {
      const p = cp.spawn(BIN, [], { stdio: ["pipe", "pipe", "ignore"] });
      let buf = "";
      p.stdout.setEncoding("utf8");
      p.stdout.on("data", (d) => {
        buf += d;
        for (let i; (i = buf.indexOf("\n")) >= 0; ) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1);
          try { const r = JSON.parse(line), cb = pend.get(r.id); pend.delete(r.id); cb && cb(r); } catch {}
        }
      });
      p.stdin.on("error", () => {});
      p.on("error", (e) => { if (proc === p) proc = null; fail(e.code === "ENOENT" ? "chưa cài công cụ dịch" : e.message); });
      p.on("exit", () => { if (proc === p) proc = null; fail("helper dịch đã thoát"); });
      return p;
    };
    apple = (to, text, cb) => {
      clearTimeout(idle);
      if (!proc) proc = start();
      const p = proc, id = ++seq;
      const t = setTimeout(() => { try { p.kill(); } catch {} }, 60000); // treo quá 60 s thì giết, lần sau tạo lại
      pend.set(id, (r) => {
        clearTimeout(t); cb(r);
        if (pend.size) return;
        const keep = globalThis.__zgCfg ? +globalThis.__zgCfg.read().trKeep : 30; // đọc lại mỗi lần nên đổi trong menu có tác dụng ngay
        idle = setTimeout(stop, (Number.isFinite(keep) ? keep : 30) * 60000);
      });
      p.stdin.write(JSON.stringify({ id, to, t: text }) + "\n");
    };
  }
  globalThis.__zgTr = (to, text, cb, engine) => (engine === "google" || process.platform !== "darwin" ? google : apple)(to, text, cb);
} catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "translate-main: " + e.stack + "\n"); } catch {} }
