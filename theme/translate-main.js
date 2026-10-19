// Chạy ở main process (chèn đầu bootstrap.js, trước ocr-main.js): quản lý helper dịch ~/.zalo-glass/translate (translate.swift) chạy nền để chỉ nạp model một lần.
// Cung cấp globalThis.__zgTr(to, text, cb) → cb({t} | {error}). Helper tự thoát sau trKeep phút không dùng (config.json, mặc định 30; 0 = thoát ngay sau mỗi lần), lần sau tự bật lại.
try {
  const os = require("os"), path = require("path"), cp = require("child_process");
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
    globalThis.__zgTr = (to, text, cb) => {
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
} catch (e) { try { require("fs").appendFileSync(require("os").tmpdir() + "/zalo-glass.log", "translate-main: " + e.stack + "\n"); } catch {} }
