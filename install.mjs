#!/usr/bin/env node
// Cài / gỡ theme Glass cho Zalo PC (macOS, Windows, Linux) theo cách ZaDark: chèn CSS+JS vào pc-dist/index.html trong app.asar.
//   ./install.sh | install.ps1 [--uninstall]   Chạy lại sau mỗi lần Zalo tự cập nhật. Không cần Node: nếu máy không có thì chạy bằng Electron của Zalo.
// Env: ZALO_APP (thư mục cài Zalo), GLASS_JS ("blur album keys ocr pet meet drag translate live noti"), GLASS_TRANSPARENT=1 (chỉ macOS, thử nghiệm).
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patchAsar } from "./asar.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), T = path.join(HERE, "theme");
const P = process.platform, MAC = P === "darwin", WIN = P === "win32";
const HOME = os.homedir(), STATE = path.join(HOME, ".zalo-glass");
const UNINSTALL = process.argv.includes("--uninstall");
const die = (m) => { console.error(m); process.exit(1); };
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" });
const read = (f) => fs.readFileSync(path.join(T, f), "utf8");

// ---- tìm Zalo ----
// ponytail: đường dẫn Windows/Linux chưa kiểm chứng trên máy thật; sai thì đặt ZALO_APP trỏ tới thư mục chứa "resources"
const locate = () => {
  const env = process.env.ZALO_APP;
  if (MAC) {
    const app = env || "/Applications/Zalo.app", plist = path.join(app, "Contents/Info.plist");
    const ver = execFileSync("defaults", ["read", plist, "CFBundleShortVersionString"]).toString().trim();
    return { res: path.join(app, "Contents/Resources"), key: ver, app, plist };
  }
  const roots = env ? [env] : WIN ? [path.join(process.env.LOCALAPPDATA || "", "Programs/Zalo")] : ["/opt/Zalo", "/opt/zalo", "/usr/lib/zalo"];
  for (const r of roots) {
    const dirs = [r, ...(fs.existsSync(r) ? fs.readdirSync(r).filter((n) => /^Zalo-/i.test(n)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map((n) => path.join(r, n)) : [])];
    for (const d of dirs) if (fs.existsSync(path.join(d, "resources/app.asar"))) return { res: path.join(d, "resources"), key: path.basename(d) };
  }
  die("Không tìm thấy Zalo. Đặt ZALO_APP=<thư mục chứa resources/app.asar>.");
};

process.noAsar = true; // chạy bằng binary Electron của Zalo thì *.asar bị coi là thư mục ảo
const z = locate(), ASAR = path.join(z.res, "app.asar");
const BACKUP = path.join(HOME, ".zalo-glass-backup", z.key);
const patched = (f) => { // tên file chèn nằm trong header asar (header có thể hàng MB nên đọc đúng độ dài)
  const fd = fs.openSync(f, "r"), h = Buffer.alloc(16); fs.readSync(fd, h, 0, 16, 0);
  const hdr = Buffer.alloc(h.readUInt32LE(12)); fs.readSync(fd, hdr, 0, hdr.length, 16); fs.closeSync(fd);
  return hdr.includes("zalo-glass.js");
};

// pid Zalo đang chạy, trừ chính tiến trình này (khi cài bằng binary Zalo thì mình cũng khớp tên/đường dẫn)
const ROOT = MAC ? z.app : path.dirname(z.res), sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const pids = () => (WIN
  ? [...spawnSync("tasklist", ["/FI", "IMAGENAME eq Zalo.exe", "/FO", "CSV", "/NH"], { encoding: "utf8" }).stdout.matchAll(/"Zalo\.exe","(\d+)"/gi)].map((m) => +m[1])
  : (spawnSync("pgrep", ["-f", ROOT], { encoding: "utf8" }).stdout || "").split(/\s+/).filter(Boolean).map(Number)).filter((p) => p !== process.pid);
const quit = () => {
  const stop = (sig) => pids().forEach((p) => { try { WIN ? spawnSync("taskkill", ["/PID", p, "/F"], { stdio: "ignore" }) : process.kill(p, sig); } catch {} });
  stop("SIGTERM");
  for (let i = 0; i < 20 && pids().length; i++) sleep(500);
  stop("SIGKILL"); sleep(500);
};
const resign = () => { if (MAC) { const r = spawnSync("codesign", ["--force", "--deep", "--sign", "-", z.app], { encoding: "utf8" }); if (r.status) console.error(r.stderr); } };
const open = () => { if (MAC) spawnSync("open", [z.app]); else console.log("Mở lại Zalo."); };

quit();

if (UNINSTALL) {
  if (!fs.existsSync(path.join(BACKUP, "app.asar"))) die(`Không có backup cho Zalo ${z.key} (${BACKUP})`);
  fs.copyFileSync(path.join(BACKUP, "app.asar"), ASAR);
  if (MAC) fs.copyFileSync(path.join(BACKUP, "Info.plist"), z.plist);
  resign(); console.log("Đã gỡ theme."); open(); process.exit(0);
}

// backup bản gốc; asar chưa patch (bản mới / vừa cập nhật) thì làm mới backup, luôn build từ backup nên chạy lại bao nhiêu lần cũng được
if (!fs.existsSync(path.join(BACKUP, "app.asar")) || !patched(ASAR)) {
  fs.mkdirSync(BACKUP, { recursive: true });
  fs.copyFileSync(ASAR, path.join(BACKUP, "app.asar"));
  if (MAC) fs.copyFileSync(z.plist, path.join(BACKUP, "Info.plist"));
  console.log("Đã backup bản gốc vào " + BACKUP);
}

// token dark chỉ áp khi Zalo ở dark mode (body.dark); light mode dùng glass-light.css
const dark = (f) => read(f).replace(/^body \{/gm, "body.dark {");
// tách 2 file: theme (đổi màu Zalo, templates.js tắt được để về giao diện Zalo gốc) và tính năng (menu, pet, OCR, dịch…, luôn bật)
const themeCss = [dark("dark-base.css"), dark("glass.css"), read("glass-light.css"), process.env.GLASS_TRANSPARENT === "1" && MAC ? read("transparent.css") : ""].join("\n");
const css = ["blur", "album", "ocr", "pet", "translate"].map((n) => read(n + ".css")).join("\n");
const js = ["templates", ...(process.env.GLASS_JS || "blur album keys ocr pet meet drag translate live noti").split(/\s+/)].map((j) => read(j + ".js")).join("\n");
// connect-src thêm 127.0.0.1:47831 cho OCR (ocr-main.js)
const inject = (b) => b && b.toString().replace("</head>", '<link rel="stylesheet" href="zalo-glass-theme.css"><link rel="stylesheet" href="zalo-glass.css"><script src="zalo-glass.js" defer></script></head>').replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:47831");

// OCR: mỗi OS một engine native, server localhost ở main process (ocr-main.js)
fs.mkdirSync(STATE, { recursive: true });
if (MAC) {
  const bin = path.join(STATE, "ocr"), swift = path.join(T, "ocr.swift");
  if (!fs.existsSync(bin) || fs.statSync(swift).mtimeMs > fs.statSync(bin).mtimeMs) if (run("swiftc", ["-O", swift, "-o", bin]).status) console.error("Không biên dịch được ocr.swift (cần Xcode Command Line Tools) — bỏ qua OCR");
  const tbin = path.join(STATE, "translate"), tswift = path.join(T, "translate.swift"); // dịch local (translate.swift), cần macOS 26+
  if (!fs.existsSync(tbin) || fs.statSync(tswift).mtimeMs > fs.statSync(tbin).mtimeMs) if (run("swiftc", ["-O", tswift, "-o", tbin]).status) console.error("Không biên dịch được translate.swift — bỏ qua dịch tin nhắn");
} else if (WIN) fs.copyFileSync(path.join(T, "ocr.ps1"), path.join(STATE, "ocr.ps1"));
else if (spawnSync("tesseract", ["--version"], { stdio: "ignore" }).status !== 0) console.error("Chưa có tesseract — OCR sẽ báo không khả dụng (cài tesseract + tesseract-ocr-vie)");

// cửa sổ trong suốt (thử nghiệm, chỉ macOS, mặc định tắt): GLASS_TRANSPARENT=1
const pre = read("opts-main.js") + "\n" + read("translate-main.js") + "\n" + read("ocr-main.js") + "\n" + read("drag-main.js") + "\n" + (MAC && process.env.GLASS_TRANSPARENT === "1" ? read("vibrancy.js") + "\n" : "");
const edits = { "pc-dist/zalo-glass-theme.css": () => themeCss, "pc-dist/zalo-glass.css": () => css, "pc-dist/zalo-glass.js": () => js, "bootstrap.js": (b) => pre + b, "pc-dist/index.html": inject };
// Zalo có sẵn FPS monitor (chunk lazy) chạy 2 vòng requestAnimationFrame ~100 lần/giây khi cờ enable_fps_monitor bật → compositor/GPU không bao giờ ngủ. Đổi tên cờ để nó luôn tắt.
// Lỗi của Zalo: className thanh nav ghép `(showChat?" show-chat":"")+(update?"show-update-btn":"")` thiếu dấu cách → khi có nút cập nhật, "show-chat" thành "show-chatshow-update-btn" và ở chế độ hẹp bấm hội thoại không mở được chat. Thêm dấu cách + thêm showChat vào deps của useMemo.
// Lỗi của Zalo: "đang dùng app" lấy từ ifvisible (bật lại khi chuột lướt qua cửa sổ dù không focus, tắt sau ~30 s) → tin tới lúc đó không báo, không nảy Dock. Ép thêm document.hasFocus() cho badge/bounce và thông báo (noti.js ghi lệch vào noti.log)
const actFix = (t) => t.replace(/\(this\.focusDetector\|\|([a-z])\.b\)\.isActive\(\)/g, "(window.__zgActive||(a=>a))((this.focusDetector||$1.b).isActive())").replace(/return ([a-z]+)\.b\.isActive\(\)\}_getConversationInfoForNotification/g, "return (window.__zgActive||(a=>a))($1.b.isActive())}_getConversationInfoForNotification");
const navFix = (t) => t.replace(/\(([a-z])\?"show-update-btn":""\)\+\(([a-z])\?"show-update-btn":""\)\}\),\[([a-z])\.compactLv,/g, '($1?" show-update-btn":"")+($2?" show-update-btn":"")}),[$3.showChat,$3.compactLv,');
edits["pc-dist/lazy/*.js"] = (b) => { if (!b) return false; let t = b.toString(); if (t.includes("enable_fps_monitor")) t = t.replace(/\.(enable_fps_monitor(?:_v2)?|enable_for_staging_account)/g, ".zg_off_$1"); t = actFix(navFix(t)); return t !== b.toString() && t; };
edits["pc-dist/compact-app-pc.*.js"] = (b) => { if (!b) return false; const t = navFix(b.toString()); return t !== b.toString() && t; };
edits["pc-dist/popup-viewer.html"] = inject; // bản Zalo không có file này thì bỏ qua
const hash = patchAsar(path.join(BACKUP, "app.asar"), ASAR, edits); // luôn build từ backup
if (MAC) { // ElectronAsarIntegrity = sha256 của chuỗi JSON header trong asar
  execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`, z.plist]);
  resign();
}

if (WIN) { // shortcut Start Menu cần AUMID thì toast mới hiện (xem theme/toast.ps1); lỗi thì chỉ cảnh báo
  const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(T, "toast.ps1"), "-Root", /^Zalo-/.test(path.basename(ROOT)) ? path.dirname(ROOT) : ROOT], { encoding: "utf8" });
  if (r.status) console.error("Không gắn được AUMID cho shortcut Zalo:", r.stderr || r.stdout); else if (r.stdout.trim() === "set") console.log("Đã gắn AppUserModelID com.vng.zalo vào shortcut Zalo (thông báo Windows).");
}

console.log("Xong."); open();
