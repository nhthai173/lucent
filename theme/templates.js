// Dữ liệu template cho theme và pet + áp theme. Luôn nạp đầu tiên (install.mjs tự thêm), chạy cả ở cửa sổ viewer.
// Thêm theme: thêm một mục vào THEMES (chỉ cần ghi đè biến --zg-*). Thêm pet: gọi animal({...}) hoặc tự viết svg theo hợp đồng class zp-* (xem pet.css).
(() => {
  const KEY = "zg-tpl", DEF = { theme: "glass", pet: "mochi" };

  // ---- theme: biến màu ghi đè lên <html>; giá trị của "glass" trùng mặc định trong glass.css (dùng để vẽ preview) ----
  const THEMES = {
    glass: { name: "Glass (tím)", vars: {
      "--zg-primary": "110 96 255", "--zg-ink": "60 50 140", "--zg-ink2": "74 69 144", "--zg-accent": "139 120 255", "--zg-bg-d": "#070814", "--zg-bg-l": "#eef0fb",
      "--zg-d1": "rgba(124, 92, 255, 0.42)", "--zg-d2": "rgba(0, 190, 255, 0.28)", "--zg-d3": "rgba(255, 70, 170, 0.26)", "--zg-d4": "rgba(40, 220, 190, 0.18)", "--zg-d5": "rgba(90, 110, 255, 0.16)",
      "--zg-l1": "rgba(150, 125, 255, 0.45)", "--zg-l2": "rgba(80, 200, 255, 0.35)", "--zg-l3": "rgba(255, 130, 200, 0.32)", "--zg-l4": "rgba(90, 230, 200, 0.25)" } },
    ocean: { name: "Đại dương", vars: {
      "--zg-primary": "2 132 199", "--zg-ink": "20 70 120", "--zg-ink2": "40 90 140", "--zg-accent": "56 189 248", "--zg-bg-d": "#050d16", "--zg-bg-l": "#eaf6fb",
      "--zg-d1": "rgba(14, 116, 255, 0.40)", "--zg-d2": "rgba(0, 200, 220, 0.30)", "--zg-d3": "rgba(60, 120, 255, 0.24)", "--zg-d4": "rgba(40, 220, 170, 0.18)", "--zg-d5": "rgba(80, 160, 255, 0.16)",
      "--zg-l1": "rgba(90, 170, 255, 0.42)", "--zg-l2": "rgba(70, 215, 240, 0.35)", "--zg-l3": "rgba(120, 150, 255, 0.28)", "--zg-l4": "rgba(90, 230, 190, 0.25)" } },
    sunset: { name: "Hoàng hôn", vars: {
      "--zg-primary": "234 88 12", "--zg-ink": "140 60 40", "--zg-ink2": "144 80 60", "--zg-accent": "255 138 76", "--zg-bg-d": "#14080a", "--zg-bg-l": "#fbf0ea",
      "--zg-d1": "rgba(255, 90, 60, 0.38)", "--zg-d2": "rgba(255, 170, 40, 0.26)", "--zg-d3": "rgba(255, 60, 130, 0.28)", "--zg-d4": "rgba(200, 60, 200, 0.18)", "--zg-d5": "rgba(255, 120, 90, 0.16)",
      "--zg-l1": "rgba(255, 140, 100, 0.42)", "--zg-l2": "rgba(255, 200, 90, 0.35)", "--zg-l3": "rgba(255, 120, 170, 0.32)", "--zg-l4": "rgba(230, 150, 230, 0.25)" } },
    forest: { name: "Rừng", vars: {
      "--zg-primary": "22 163 74", "--zg-ink": "30 100 60", "--zg-ink2": "50 120 80", "--zg-accent": "74 222 128", "--zg-bg-d": "#06100a", "--zg-bg-l": "#ecf7ee",
      "--zg-d1": "rgba(30, 190, 100, 0.34)", "--zg-d2": "rgba(120, 220, 60, 0.22)", "--zg-d3": "rgba(0, 170, 150, 0.26)", "--zg-d4": "rgba(200, 220, 60, 0.14)", "--zg-d5": "rgba(60, 200, 120, 0.16)",
      "--zg-l1": "rgba(90, 210, 130, 0.42)", "--zg-l2": "rgba(170, 225, 90, 0.35)", "--zg-l3": "rgba(70, 200, 190, 0.30)", "--zg-l4": "rgba(210, 230, 110, 0.25)" } },
  };

  // "Zalo mặc định": templates.js tắt file CSS theme (zalo-glass-theme.css) nên chỉ cần màu trung tính + xanh Zalo cho các thành phần của Lucent (pet, menu, OCR, bản dịch)
  const clear = "rgba(0, 0, 0, 0)";
  THEMES.zalo = { name: "Zalo mặc định", native: true, vars: {
    "--zg-primary": "0 104 255", "--zg-ink": "128 138 160", "--zg-ink2": "110 120 140", "--zg-accent": "76 156 255", "--zg-bg-d": "#1d2025", "--zg-bg-l": "#ffffff",
    "--zg-d1": clear, "--zg-d2": clear, "--zg-d3": clear, "--zg-d4": clear, "--zg-d5": clear, "--zg-l1": clear, "--zg-l2": clear, "--zg-l3": clear, "--zg-l4": clear } };

  // ---- pet ----
  // Hợp đồng sprite (viewBox 40×36): .zp-body .zp-tail .zp-leg-a/.zp-leg-b .zp-pupil, bốn bộ mắt .zp-eyes + .zp-open/.zp-happy/.zp-x/.zp-sleep,
  // đạo cụ cho gag .zp-p-zap/.zp-p-gun/.zp-p-oxy và .zp-tears. Thiếu phần tử nào thì gag/hiệu ứng tương ứng chỉ là không hiện.
  const eye = (cx) => `<circle cx="${cx}" cy="21" r="2.6" fill="#2b2118"/><circle class="zp-pupil" cx="${cx - .7}" cy="20.2" r=".9" fill="#fff"/>`;
    const arc = (cx, d) => `<path d="M${cx - 2.6} ${d} q2.6 -3.4 5.2 0" fill="none" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round"/>`;
  
  const animal = (p) => ({ ...p, svg: `
      <path class="zp-tail" d="M33 28 q8 -2 5 -11" fill="none" stroke="${p.dark}" stroke-width="3.4" stroke-linecap="round"/>
      <rect class="zp-leg zp-leg-a" x="10" y="30" width="6" height="5" rx="2.5" fill="${p.dark}"/>
      <rect class="zp-leg zp-leg-b" x="24" y="30" width="6" height="5" rx="2.5" fill="${p.dark}"/>
      <g class="zp-body">
        ${p.ears(p)}
        <rect x="5" y="10" width="30" height="22" rx="11" fill="${p.fur}"/>
        <ellipse cx="20" cy="28" rx="9" ry="4.6" fill="${p.belly}"/>
        ${p.mark(p)}
        <g class="zp-eyes zp-open">${eye(14)}${eye(26)}</g>
        <g class="zp-eyes zp-happy">${arc(14, 22)}${arc(26, 22)}</g>
        <g class="zp-eyes zp-x"><path d="M11.8 19.2 l4.4 4.4 M16.2 19.2 l-4.4 4.4 M23.8 19.2 l4.4 4.4 M28.2 19.2 l-4.4 4.4" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round"/></g>
        <g class="zp-eyes zp-sleep"><path d="M11.4 21.5 h5.2 M23.4 21.5 h5.2" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round"/></g>
        <ellipse cx="9.6" cy="25.2" rx="2.6" ry="1.6" fill="${p.cheek}" opacity=".55"/><ellipse cx="30.4" cy="25.2" rx="2.6" ry="1.6" fill="${p.cheek}" opacity=".55"/>
        <path d="M18 24.6 q1 1.3 2 0 q1 1.3 2 0" fill="none" stroke="#2b2118" stroke-width="1.1" stroke-linecap="round"/>
      </g>
      <g class="zp-prop zp-p-zap">
        <rect x="31" y="22" width="5.4" height="11" rx="1.4" fill="#2a2a30"/><rect x="32" y="24.2" width="3.4" height="2.2" rx=".6" fill="#6cf"/>
        <path d="M32 22 v-2.4 M35.4 22 v-2.4" stroke="#aab" stroke-width="1.1" stroke-linecap="round"/><circle cx="33.7" cy="31.5" r="2.4" fill="${p.fur}"/>
        <g fill="none" stroke="#ffe14d" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
          <path class="zp-bolt" d="M33.7 19 l-3 -2.5 l2.4 -.5 l-3.4 -3.6"/><path class="zp-bolt zp-b2" d="M6 14 l3.4 2 l-2 1.4 l4 3.2"/><path class="zp-bolt zp-b3" d="M2.5 26 l3.2 -1.6 l-.6 2.6 l3.2 -.8"/>
        </g>
      </g>
      <g class="zp-prop zp-p-gun">
        <rect x="28" y="14.5" width="10" height="4.4" rx="1.2" fill="#5ed16a"/><rect x="26.4" y="15.3" width="2.2" height="2.8" rx=".6" fill="#ffd23f"/>
        <rect x="34" y="18.9" width="3.4" height="5.6" rx="1.2" fill="#ffd23f"/><circle cx="35.7" cy="24.2" r="2.3" fill="${p.fur}"/>
      </g>
      <g class="zp-prop zp-p-oxy">
        <path d="M13.4 24 L6 20.5 M26.6 24 L34 20.5" stroke="#b9d9d0" stroke-width=".9" stroke-linecap="round"/>
        <path d="M20 29.6 q-1 4 -9 4.2 q-5 .2 -7 -3" fill="none" stroke="#e4f3ee" stroke-width="1.7" stroke-linecap="round"/>
        <g class="zp-mask"><path d="M13.4 24 q6.6 -4.8 13.2 0 q-1 6.2 -6.6 7.2 q-5.6 -1 -6.6 -7.2z" fill="#d8f0ff" fill-opacity=".65" stroke="#a9cfe0" stroke-width=".9"/>
          <ellipse cx="15.6" cy="25.6" rx="1.2" ry="2" fill="#3ec96a"/><ellipse cx="24.4" cy="25.6" rx="1.2" ry="2" fill="#3ec96a"/><circle class="zp-fog" cx="20" cy="27.6" r="2.4" fill="#fff"/></g>
      </g>
      <g class="zp-tears" fill="#5cc8ff">
        <rect class="zp-stream" x="13.3" y="23.4" width="1.5" height="9" rx=".75" opacity=".75"/><rect class="zp-stream zp-s2" x="25.2" y="23.4" width="1.5" height="9" rx=".75" opacity=".75"/>
        <path class="zp-tear" d="M11.6 23 q-1.4 2.6 0 3.2 q1.4 -.6 0 -3.2z"/><path class="zp-tear zp-t2" d="M28.4 23 q-1.4 2.6 0 3.2 q1.4 -.6 0 -3.2z"/>
        <ellipse class="zp-wail" cx="20" cy="26.4" rx="2.4" ry="2.2" fill="#7a2a2a"/>
      </g>
    ` });
  const CAT_EARS = (p) => `<path d="M8.5 15 L10.5 3.5 L18.5 12Z M31.5 15 L29.5 3.5 L21.5 12Z" fill="${p.fur}" stroke="${p.fur}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M11.2 11.5 L11.8 7 L15 10.4Z M28.8 11.5 L28.2 7 L25 10.4Z" fill="${p.inner}"/>`;
  const BUNNY_EARS = (p) => `<rect x="10.5" y="-7" width="7" height="19" rx="3.5" fill="${p.fur}"/><rect x="22.5" y="-7" width="7" height="19" rx="3.5" fill="${p.fur}"/>
        <rect x="12.2" y="-4" width="3.6" height="13" rx="1.8" fill="${p.inner}"/><rect x="24.2" y="-4" width="3.6" height="13" rx="1.8" fill="${p.inner}"/>`;
  const STRIPES = (p) => `<path d="M17 11 v3 M20 10.4 v3.6 M23 11 v3" stroke="${p.dark}" stroke-width="1.5" stroke-linecap="round"/>`;
  // ponytail: gag (CSS đạo cụ) dùng chung; mỗi pet chỉ đổi lời thoại. Muốn gag riêng thì thêm css + tên mới vào gags của pet đó.
  const GAGS = {
    zap: [3200, ["Chích điện cho tỉnh nè ⚡", "Bzzzt! Dậy làm việc đi ⚡", "Chích điện tự thức tỉnh: KPI +1 ⚡"]],
    gun: [4200, ["Cho nó sang cảm… à nhầm, cho mình nghỉ đi 🔫", "Kê súng nước vô đầu cho tỉnh táo 💦", "Còn 3 task nữa là mình xả súng… nước 🔫"]],
    oxy: [4500, ["Hít… thở… deadline… 😮‍💨", "Bình oxy để sống qua tuần này", "Cho mình thở tí, sắp tới giờ họp"]],
    cry: [4500, ["Huhu… task chưa xong 😭", "Khóc ròng vì sếp nhắn 'gấp' 😭😭", "Hức… mình chỉ muốn ăn cá thôi mà…"]],
    faint: [3500, ["Mình xỉu, báo sếp là mình đi viện 💀", "Tắt nguồn. Khởi động lại vào ngày mai", "x_x"]],
  };
  const TYPING = ["Ồ, đang gõ gì đó… gõ nhanh coi, mình đói", "Viết gì mà dài thế 😳 báo cáo hay tâm sự?", "Mình không nhìn trộm đâu, thề! (nhìn chằm chằm)", "Gõ đi gõ đi, mình đợi, mình có cả ngày 🍿", "Gõ rồi xoá, gõ rồi xoá… biết rồi nha 🤭"];
  const MAD = ["Thôi nha! Mình giận á 😾", "Chọc nữa là mình nghỉ việc đó!", "Hứ! Mình đi nộp đơn xin nghỉ đây", "Đủ rồi, mình lên HR báo cáo bạn 📋"];
  const fill = (n, p, l) => ({ ...animal(p), name: n, typing: TYPING, mad: MAD, gags: GAGS, ...l });

  // Màu nhân vật giữ riêng để nhận ra áo đỏ, mũ rơm và Haki trên mọi theme.
  // ponytail: màu nhân vật cố định, không theo --zg-* (Gear 5 còn hex trực tiếp); muốn đổi theo theme thì chuyển hết sang biến --zg-luffy-*.
  const LUFFY_PALETTE = "--zg-luffy-skin:#f5c39c;--zg-luffy-hot:#eb9d91;--zg-luffy-red:#cf3345;--zg-luffy-blue:#4388c5;--zg-luffy-straw:#e6bc64;--zg-luffy-ink:#332a32;--zg-luffy-haki:#181725;--zg-luffy-white:#fff9ee";
  const luffyArm = (side, haki = false, giant = false) => {
    const s = side === "l" ? -1 : 1, skin = haki ? "var(--zg-luffy-haki)" : "var(--zg-luffy-skin)";
    return `<g transform="translate(${side === "l" ? 11 : 29} 23)"><g class="zl-arm-${side}"><g class="zl-strike" stroke="${haki ? "var(--zg-luffy-red)" : "var(--zg-luffy-ink)"}" stroke-width=".7" stroke-linejoin="round">
      <path d="M0 0Q${s * 3} 0 ${s * 6} ${giant ? -10 : 4}" fill="none" stroke="${skin}" stroke-width="${haki ? 6 : 3}"/>
      <ellipse cx="${s * 6}" cy="${giant ? -10 : 4}" rx="${giant ? 8 : haki ? 5 : 2.4}" ry="${giant ? 8.5 : haki ? 5.8 : 2.5}" fill="${skin}"/>
      <path d="M${s * 4} ${giant ? -13 : 2}l${s} 4m${s * 2}-4v4" fill="none"/>
    </g></g></g>`;
  };
  // Nhóm tay riêng để tung chiêu không tranh transform với lớp đi bộ/nhún.
  const LUFFY_GEAR5 = `
    <g style="${LUFFY_PALETTE}">
    <g class="zp-tail" fill="#fff" stroke="#b9c8da" stroke-width=".7" stroke-linejoin="round">
      <path d="M8 26 C-2 25 -3 17 2 15 C-2 12 1 7 5 10 C7 11 6 14 4 13 C1 17 5 20 10 20Z"/>
    </g>
    <g class="zp-leg zp-leg-a" stroke="#634c50" stroke-width=".7">
      <g>
      <path d="M13 28h6l-1 5h-5z" fill="#fff"/>
      <path d="M13 32h4v2h-5z" fill="#edb18a"/>
      <path d="M11.5 34h6.5v1.3h-7z" fill="#b78146"/>
      <path d="m13 33 2 1 1-1" fill="none"/>
      </g>
    </g>
    <g class="zp-leg zp-leg-b" stroke="#634c50" stroke-width=".7">
      <g>
      <path d="M22 28h6l-1 5h-5z" fill="#fff"/>
      <path d="M23 32h4l1 2h-5z" fill="#edb18a"/>
      <path d="M22 34h6.5l1 1.3H22z" fill="#b78146"/>
      <path d="m24 33 1 1 1-1" fill="none"/>
      </g>
    </g>
    <g class="zp-body" stroke-linecap="round" stroke-linejoin="round">
      <g>
      <path d="M11 21Q20 18 29 21l1 9H10Z" fill="#fff" stroke="#a9bcd2" stroke-width=".75"/>
      <path d="M16 21h8l2 8H14Z" fill="#f2ba92"/>
      <path d="m17 23 6 4m0-4-6 4" stroke="#c47768" stroke-width=".9"/>
      <path d="m12 21 5-.5-2 6-4 1m17-6-5-.5 2 6 4 1" fill="#fff" stroke="#d0ddea" stroke-width=".7"/>
      <path d="M11 28q9 2 18 0v3q-9 2-18 0Z" fill="#a079cf" stroke="#755294" stroke-width=".65"/>
      <path d="m27 30 5 1-2 5-3-1 1-3-3-1Z" fill="#b78ee3" stroke="#755294" stroke-width=".65"/>
      ${luffyArm("l")}${luffyArm("r")}
      <path d="M9 22C3 24 2 18 6 17c-1-4 4-5 6-2q8-4 16 0c3-3 7-1 6 2 5 1 3 7-2 6l-3-3q-9-4-18 0Z" fill="#fff" stroke="#b9c8da" stroke-width=".75"/>
      <path d="M6 19q-1 3 3 2m22-3q4-1 3 2" fill="none" stroke="#d2dfed" stroke-width=".8"/>
      <g>
      <path d="M17 18h6v6h-6z" fill="var(--zg-luffy-skin)"/>
      <ellipse cx="10.2" cy="12.5" rx="2" ry="2.7" fill="#edb18a" stroke="#bf8269" stroke-width=".65"/>
      <ellipse cx="29.8" cy="12.5" rx="2" ry="2.7" fill="#edb18a" stroke="#bf8269" stroke-width=".65"/>
      <path d="M10.5 10C10 0 30 0 29.5 10v5C29 24 11 24 10.5 15Z" fill="#f5c39c" stroke="#bf8269" stroke-width=".75"/>
      <path d="M10 11C5 11 5 6 8 5 4 1 8-3 12-2c0-4 6-6 9-2 4-5 10-2 10 1 6-1 8 5 4 7 3 4-1 8-6 7l-1-4c-3 2-5 0-6-2-1 4-5 5-8 3l-2 3Z" fill="#fff" stroke="#b9c8da" stroke-width=".8"/>
      <path d="M10 4c-3-3 3-6 5-3s-1 5-3 3m6-6c4-3 8 2 4 4-2 1-3-1-2-2m7 2c1-4 7-2 5 1m-16 3q3 1 4-2" fill="none" stroke="#d2dfed" stroke-width=".8"/>
      <g fill="none" stroke="#fff" stroke-width="1.5">
        <path d="M12.5 10q3-4 5-1c1 2-2 2-2 .5m6-.5q3-4 5-1c1 2-2 2-2 .5"/>
      </g>
      <g class="zp-eyes zp-open">
        <ellipse cx="15.7" cy="12.5" rx="2.7" ry="2.4" fill="#fff" stroke="#634c50" stroke-width=".5"/>
        <ellipse cx="24.3" cy="12.5" rx="2.7" ry="2.4" fill="#fff" stroke="#634c50" stroke-width=".5"/>
        <g class="zp-pupil"><g fill="#cc4667" stroke="#63394f" stroke-width=".45"><circle cx="15.7" cy="12.5" r="1.15"/><circle cx="24.3" cy="12.5" r="1.15"/></g>
          <g fill="#35283f"><circle cx="15.7" cy="12.5" r=".45"/><circle cx="24.3" cy="12.5" r=".45"/></g></g>
      </g>
      <g class="zp-eyes zp-happy" fill="none" stroke="#63404b" stroke-width="1.1"><path d="M13 13q2.7-4 5.4 0m3.2 0q2.7-4 5.4 0"/></g>
      <g class="zp-eyes zp-x" fill="none" stroke="#63404b" stroke-width="1.1"><path d="m14 11 3.4 3.4m0-3.4L14 14.4m8.6-3.4 3.4 3.4m0-3.4-3.4 3.4"/></g>
      <g class="zp-eyes zp-sleep" fill="none" stroke="#63404b" stroke-width="1"><path d="M13 13q2.7 2 5.4 0m3.2 0q2.7 2 5.4 0"/></g>
      <path d="M12 15.5h4m-3-1v2m2-2v2" fill="none" stroke="#bf8269" stroke-width=".6"/>
      <path d="M13 16q7 2 14 0-1 6-7 6t-7-6Z" fill="#fff" stroke="#874f4b" stroke-width=".75"/>
      <path d="M14 18.5q6 1.6 12 0m-6-1v4" fill="none" stroke="#d0b2a3" stroke-width=".5"/>
      <g class="zp-tears" fill="#5cc8ff">
        <rect class="zp-stream" x="14.8" y="14.5" width="1.2" height="7" rx=".6"/><rect class="zp-stream zp-s2" x="23.7" y="14.5" width="1.2" height="7" rx=".6"/>
        <path class="zp-tear" d="M12 14q-2 3 0 4 2-1 0-4Z"/><path class="zp-tear zp-t2" d="M28 14q-2 3 0 4 2-1 0-4Z"/>
        <ellipse class="zp-wail" cx="20" cy="18.5" rx="3.5" ry="2.5" fill="#874f4b"/>
      </g>
      </g></g>
    </g></g>`;

  // Dạng thường được gọi Gear 1 trong bộ chọn; Gear 4 dùng dáng Boundman.
  const luffyGear = (gear) => {
    const haki = gear === 4, steam = gear === 2 || haki;
    return `<g style="${LUFFY_PALETTE}" stroke="var(--zg-luffy-ink)" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round">
      ${steam ? `<g class="zp-tail" fill="none" stroke="var(--zg-luffy-white)" stroke-width="1.8"><path d="M5 29C-1 24 8 22 3 17S7 11 4 7M34 28c7-5-3-7 2-12s-3-6 0-10"/><path d="M8 8C4 4 11 3 8-2m23 9c5-4-2-5 1-9"/></g>` : ""}
      <g class="zp-leg zp-leg-a"><g><path d="M12 28h7l-1 5h-6z" fill="var(--zg-luffy-blue)"/><path d="M13 32h4v2h-5z" fill="${haki ? "var(--zg-luffy-haki)" : "var(--zg-luffy-skin)"}"/><path d="M11 34h7v1H11Z" fill="var(--zg-luffy-straw)"/></g></g>
      <g class="zp-leg zp-leg-b"><g><path d="M22 28h7l-1 5h-6z" fill="var(--zg-luffy-blue)"/><path d="M24 32h3l1 2h-5z" fill="${haki ? "var(--zg-luffy-haki)" : "var(--zg-luffy-skin)"}"/><path d="M22 34h7v1h-7z" fill="var(--zg-luffy-straw)"/></g></g>
      <g class="zp-body">
      <g>
      ${haki ? `<ellipse cx="20" cy="22.5" rx="12" ry="10" fill="var(--zg-luffy-skin)"/><path d="M9 18q4-6 9-2l2 4 2-4q5-4 9 2l-2 5-7-1-2 3-2-3-7 1Z" fill="var(--zg-luffy-haki)" stroke="var(--zg-luffy-red)"/><path d="M15 27q5 2 10 0m-9 2h8" fill="none"/>` : `<path d="M11 21q9-3 18 0v10H11Z" fill="var(--zg-luffy-red)"/><path d="m17 21 3 2 3-2 2 9H15Z" fill="var(--zg-luffy-skin)"/><g fill="var(--zg-luffy-straw)"><circle cx="13.5" cy="25" r=".7"/><circle cx="13.5" cy="28" r=".7"/></g>`}
      <path d="m16 25 7 4m0-4-7 4" fill="none" stroke="var(--zg-luffy-red)"/>
      <path d="M11 30q9 2 18 0v2H11Z" fill="var(--zg-luffy-straw)"/>
      ${luffyArm("l", haki)}${luffyArm("r", haki, gear === 3)}
      <g>
      <path d="M17 18h6v6h-6z" fill="var(--zg-luffy-skin)"/>
      <ellipse cx="20" cy="13" rx="${haki ? 8 : 10}" ry="${haki ? 7 : 9}" fill="${gear === 2 ? "var(--zg-luffy-hot)" : "var(--zg-luffy-skin)"}"/>
      <path d="${haki ? "M12 12 8 6l4-1-1-5 5 2 2-5 4 4 4-2 1 4 5-1-2 6-3 5-3-6-3 2-3-2-3 5Z" : "M10 13 8 7l4-5 3 2 3-5 4 3 4-2 5 6-1 7-3-5-3 2-3-3-3 3-3-2Z"}" fill="var(--zg-luffy-haki)"/>
      ${gear === 1 ? `<path d="M5 7q15-6 30 0l-2 3H7Z" fill="var(--zg-luffy-straw)"/><path d="M11 6q1-9 9-9t9 9Z" fill="var(--zg-luffy-straw)"/><path d="M11 4h18v2H11Z" fill="var(--zg-luffy-red)"/><path d="m14 1 1-2m4 1v-2m5 3-1-2" fill="none"/>` : ""}
      <g class="zp-eyes zp-open"><g fill="var(--zg-luffy-white)"><ellipse cx="16" cy="13" rx="2.7" ry="${haki ? 1.7 : 2.4}"/><ellipse cx="24" cy="13" rx="2.7" ry="${haki ? 1.7 : 2.4}"/></g><g class="zp-pupil" fill="var(--zg-luffy-haki)"><circle cx="16" cy="13" r="1"/><circle cx="24" cy="13" r="1"/></g></g>
      <g class="zp-eyes zp-happy" fill="none"><path d="M13 13q3-4 6 0m2 0q3-4 6 0"/></g>
      <g class="zp-eyes zp-x" fill="none"><path d="m14 11 4 4m0-4-4 4m8-4 4 4m0-4-4 4"/></g>
      <g class="zp-eyes zp-sleep" fill="none"><path d="M13 13q3 2 6 0m2 0q3 2 6 0"/></g>
      ${haki ? `<path d="m13 11 5 1m4 0 5-1" fill="none" stroke-width="1.4"/>` : ""}
      <path d="m12 16 4 .2m-3-1v2m2-2v2" fill="none"/>
      <path d="M13 17q7 2 14 0-2 5-7 5t-7-5Z" fill="var(--zg-luffy-white)"/>
      <g class="zp-tears" fill="rgb(var(--zg-accent))" stroke="none"><rect class="zp-stream" x="15.4" y="14.5" width="1.2" height="7" rx=".6"/><rect class="zp-stream zp-s2" x="23.4" y="14.5" width="1.2" height="7" rx=".6"/><path class="zp-tear" d="M12 14q-2 3 0 4 2-1 0-4Z"/><path class="zp-tear zp-t2" d="M28 14q-2 3 0 4 2-1 0-4Z"/><ellipse class="zp-wail" cx="20" cy="19" rx="3.5" ry="2.5" fill="var(--zg-luffy-ink)"/></g>
      </g></g></g>
    </g>`;
  };
  const LUFFY_FORMS = [
    { name: "Dạng thường", svg: luffyGear(1), attack: "pistol", line: "Mũ rơm sẵn sàng, đi kiếm thịt thôi! 🍖" },
    { name: "Gear 2", svg: luffyGear(2), attack: "jet", line: "Gear 2, tăng tốc cho kịp giờ ăn! 💨" },
    { name: "Gear 3", svg: luffyGear(3), attack: "giant", line: "Gear 3, tay to để ôm hết phần thịt! ✊" },
    { name: "Gear 4 · Boundman", svg: luffyGear(4), attack: "kong", line: "Boundman tới rồi, bật tung deadline! 🔥" },
    { name: "Gear 5", svg: LUFFY_GEAR5, attack: "dawn", line: "Gear 5, cười lên nào đồng đội! ☁️" },
  ];
  const LUFFY_GEARS = `<g class="zl-rest">${LUFFY_GEAR5}</g><g class="zp-prop zl-impact" fill="none" stroke="rgb(var(--zg-accent))" stroke-width="1.2" pointer-events="none"><ellipse cx="43" cy="22" rx="6" ry="9"/><path d="m37 9 5 6m5-6-2 6m-7 15 4-4m4 7-1-6M38 22h13"/></g>`;
  const LUFFY_GEARS_CSS = `
    #zg-pet .zl-rest { transform-origin: 50% 100%; }
    #zg-pet .zl-strike { transform-box: view-box; transform-origin: 0 0; }
    #zg-pet:is(.zp-g-pistol, .zp-g-jet, .zp-g-giant, .zp-g-kong, .zp-g-dawn) .zp-happy,
    #zg-pet:is(.zp-g-pistol, .zp-g-jet, .zp-g-giant, .zp-g-kong, .zp-g-dawn) .zl-impact { display: inline; }
    #zg-pet:is(.zp-g-pistol, .zp-g-jet, .zp-g-giant, .zp-g-kong, .zp-g-dawn) .zl-impact { transform-origin: 43px 22px; transform-box: view-box; animation: zl-impact .55s ease-out 4; }
    #zg-pet.zp-g-pistol .zl-arm-r .zl-strike { animation: zl-pistol 1.1s ease-in-out 2; }
    #zg-pet.zp-g-jet .zl-arm-r .zl-strike { animation: zl-jet .16s linear 12; }
    #zg-pet.zp-g-jet .zl-arm-l .zl-strike { animation: zl-jet-left .16s .08s linear 11; }
    #zg-pet.zp-g-giant .zl-arm-r .zl-strike { animation: zl-giant 2.2s ease-in-out; }
    #zg-pet.zp-g-kong .zl-arm-r .zl-strike { animation: zl-kong 2.2s ease-in-out; }
    #zg-pet.zp-g-dawn .zl-arm-r .zl-strike { animation: zl-dawn 2.2s ease-in-out; }
    #zg-pet.zp-g-dawn .zp-body { animation: zl-laugh .55s ease-in-out 4; }
    @keyframes zl-pistol { 0%, 100% { transform: none; } 25% { transform: translateX(-3px) scaleX(.65); } 45%, 60% { transform: translateX(5px) scaleX(3.2); } }
    @keyframes zl-jet { 0%, 100% { transform: translateX(-2px) scaleX(.7); } 50% { transform: translateX(7px) scaleX(3); } }
    @keyframes zl-jet-left { 0%, 100% { transform: none; } 50% { transform: translateX(19px) scaleX(-2.4); } }
    @keyframes zl-giant { 0%, 100% { transform: none; } 25% { transform: rotate(-18deg) scale(1.1); } 55%, 75% { transform: translate(10px, 7px) rotate(35deg) scale(1.55); } }
    @keyframes zl-kong { 0%, 100% { transform: none; } 35% { transform: translateX(-5px) scale(.65, 1.2); } 55%, 70% { transform: translateX(7px) scale(2.7, 1.2); } }
    @keyframes zl-dawn { 0%, 100% { transform: none; } 25% { transform: rotate(-75deg) scale(1.5); } 55% { transform: translate(6px, -5px) rotate(35deg) scale(3, 1.1); } 80% { transform: rotate(-20deg) scale(.8, 1.3); } }
    @keyframes zl-laugh { 50% { transform: rotate(-6deg) scale(1.05, .94); } }
    @keyframes zl-impact { 0%, 100% { opacity: 0; transform: scale(.4); } 45% { opacity: .9; transform: scale(1.15); } }
    @media (prefers-reduced-motion: reduce) {
      #zg-pet.zp-rubber .zl-strike, #zg-pet.zp-rubber .zp-body { animation: none !important; }
      #zg-pet.zp-rubber .zl-impact { display: none; }
    }
  `;

  const PETS = {
    mochi: fill("Mochi", { fur: "#ffb26b", dark: "#f59a4a", belly: "#ffe3c4", inner: "#ff9fb0", cheek: "#ff8aa0", ears: CAT_EARS, mark: STRIPES }, {
      intro: "Mochi đi làm rồi nè, chưa gì đã muốn về ✨",
      lines: [
        "Người ta đặt vé về quê ăn lễ, còn mình đặt niềm tin sẽ xong KPI tuần này 🙏", "Tạm gác cuộc đời nô lệ tư bản, ê hề lô 🐥", "Hết ngày mai nữa là phải làm nô lệ cho… à mà nay cũng đang làm rồi 🥲",
        "Cảm xúc chạy task của nô lệ tư bản: 🙂😐🙃💀", "Mình thở bằng bình oxy để sống sót qua deadline 😮‍💨", "Nhắn nhanh đi, mình đói rồi 🍙",
        "Đừng chọc nữa, nhột! Mình đang bận… ngồi không", "Reply người ta đi, để lâu mất duyên, mất luôn khách đó", "Uống nước chưa? Chưa thì uống, rồi thì uống nữa 💧",
        "Meo. (dịch: sếp ơi cho em nghỉ)", "Mình không lười, mình tiết kiệm năng lượng cho deadline 🔋", "Ai nhắn mà im re vậy ta… seen rồi bỏ mình hả 😭",
        "Cho mình xin cá khô, không có lương thì có cá 🐟", "Ngồi lâu rồi, đứng dậy vươn vai đi kẻo thành hoá thạch 🦴", "Hứ, mình đâu có quan tâm đâu 😼 (có đó)",
        "Họp xong cuộc họp để lên lịch cuộc họp tiếp theo 📅", "Task xong 99%. 1% còn lại là cả cuộc đời", "Hôm nay mình làm việc rất chăm: nằm nghĩ về việc phải làm",
        "Cà phê là nhiên liệu, drama là gia vị ☕", "Sếp nhắn 'em rảnh không?' là mình tim ngừng 3 nhịp 💔", "Mình chỉ là con mèo, mà áp lực như con người 🐱",
      ] }),
    mun: fill("Mun", { fur: "#9aa3b2", dark: "#7d8697", belly: "#e3e7ee", inner: "#ffb3c1", cheek: "#ff9db0", ears: CAT_EARS, mark: STRIPES }, {
      intro: "Mun có mặt. Đừng hỏi gì cả 😑",
      lines: ["Mun không nói nhiều. Mun chỉ nhìn 😑", "Việc hôm nay để mai, mai để kia, kia để… mốt", "Đừng reply vội, cho người ta tưởng bạn bận 😎", "Sạc pin xong rồi, giờ tới lượt xả",
        "Cà phê đâu? Không có thì Mun đình công ☕", "Mun thấy bạn lướt rồi nha, làm việc đi", "Đời là một chuỗi họp không cần thiết", "Meo (nghĩa là: kệ đi)"] }),
    bong: fill("Bông", { fur: "#f7d9e6", dark: "#e9b9cf", belly: "#fff3f8", inner: "#ff9fb8", cheek: "#ff8aa8", ears: BUNNY_EARS, mark: () => "" }, {
      intro: "Bông tới rồi nè, mang theo cà rốt 🥕",
      lines: ["Nhảy một cái cho tỉnh táo nào 🐰", "Cà rốt là động lực, deadline là… cà rốt hết hạn", "Bông không trốn việc, Bông chỉ nhảy đi chỗ khác thôi", "Nhắn lại người ta đi, đừng để họ chờ như cà rốt héo",
        "Uống nước nha, Bông nhắc đó 💧", "Làm tí nghỉ tí, sống lâu như thỏ (tầm 10 năm)", "Tai Bông nghe hết, nhưng Bông giả vờ không nghe 🙉", "Ăn rau chưa? Chưa thì ăn đi 🥬"] }),
    luffygear5: {
      name: "Luffy Gear 5", svg: LUFFY_GEARS, css: LUFFY_GEARS_CSS, forms: LUFFY_FORMS,
      intro: "Gear 5 tới rồi, cười lên nào! ☁️",
      lines: [
        "Xong task này rồi đi kiếm thịt nha! 🍖", "Deadline căng quá, kéo giãn nó ra được không? 😆",
        "Thuyền trưởng đang canh thanh chat nè! 🏴‍☠️", "Tóc trắng rồi, còn task vẫn chưa xong! ☁️",
        "Nghỉ một nhịp rồi mình phiêu lưu tiếp! 🥁", "Kho báu hôm nay là nút gửi đúng giờ! ✨",
        "Bụng réo to hơn cả trống giải phóng rồi! 🍖", "Gomu Gomu no… gửi tin nhắn! 💬",
        "Cười một cái cho nhẹ đầu nào! 😁", "Đồng đội ơi, uống nước rồi làm tiếp! 💧",
        "Đi họp cũng là một chuyến phiêu lưu hả? 🧭", "Hết ca rồi, giương buồm về thôi! ⛵",
      ],
      typing: ["Gõ xong rồi chia mình miếng thịt nha! 🍖", "Viết từ từ thôi, thuyền trưởng đợi được! 😁", "Tin nhắn này dài bằng cả hải trình nè! 🧭"],
      mad: ["Chọc hoài, mình giãn tay lấy thịt đó! 🍖", "Thuyền trưởng đổi chỗ đây, nhột quá! 😆", "Để mình cười lấy hơi cái đã! ☁️"],
      gags: {
        pistol: [2200, ["Gomu Gomu no Pistol! ✊", "Đấm xa chút để lấy phần thịt kia! 🍖", "Cánh tay cao su xuất phát! 💨"]],
        jet: [2200, ["Jet Gatling, nhanh như giờ tan ca! 💨", "Liên hoàn đấm, liên hoàn đói! 🍖", "Gear 2 tăng tốc, đồng đội bám chắc! ✊"]],
        giant: [2200, ["Gigant Pistol, nắm đấm khổng lồ! ✊", "Tay to vậy ôm hết phần thịt được chưa? 🍖", "Gear 3, một đấm cho thật hoành tráng! 💥"]],
        kong: [2200, ["Kong Gun, Boundman tung chiêu! 🔥", "Nén tay lấy đà, bật tung deadline! ✊", "Haki sẵn sàng, thịt đâu rồi? 🍖"]],
        dawn: [2200, ["Gear 5, cao su tự do tung chiêu! ☁️", "Tay giãn hết cỡ, cười hết ga! 😁", "Tung chiêu xong mình đi ăn nha! 🍖"]],
        cry: [3500, ["Ai ăn mất phần thịt của mình rồi! 😭", "Huhu, đi họp mà không có đồ ăn! 🍖"]],
        faint: [3200, ["Hết thịt là thuyền trưởng hết pin! 💤", "Gear 5 nghỉ tí, lát quậy tiếp! ☁️"]],
      },
    },
  };

  // ---- chọn + áp dụng ----
  const load = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEF }; } };
  const keys = [...new Set(Object.values(THEMES).flatMap((t) => Object.keys(t.vars)))];
  const apply = () => {
    const s = load(), t = THEMES[s.theme] || THEMES.glass, root = document.documentElement.style;
    const lk = document.querySelector('link[href="zalo-glass-theme.css"]'); if (lk) lk.disabled = !!t.native;
    keys.forEach((k) => root.removeProperty(k));
    Object.entries(t.vars).forEach(([k, v]) => root.setProperty(k, v));
    // Chromium của Electron 22 chưa có color-mix() → tính sẵn các sắc độ của --zg-primary (d = pha đen, l = pha trắng; số = % giữ lại màu gốc)
    const c = t.vars["--zg-primary"].split(" ").map(Number);
    [["d", 80], ["d", 66], ["l", 55], ["l", 78], ["l", 38]].forEach(([k, p]) => root.setProperty(`--zg-p-${k}${p}`, c.map((x) => Math.round(x * p / 100 + (k === "l" ? 255 * (100 - p) / 100 : 0))).join(" ")));
    dispatchEvent(new Event("zg-tpl"));
  };
  const zg = globalThis.__zg = { THEMES, PETS, get: () => load(), set: (k, v) => { try { localStorage.setItem(KEY, JSON.stringify({ ...load(), [k]: v })); } catch {} apply(); } };
  zg.pet = () => PETS[load().pet] || PETS.mochi;
  addEventListener("storage", (e) => e.key === KEY && apply()); // cửa sổ khác đổi → theo
  apply();
})();
