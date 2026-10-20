(() => {
  "use strict";
  const LEVELS = window.LEVELS || { latin: [], arabic: [] };
  const $ = (id) => document.getElementById(id);

  const CHAPTERS = [
    { name: "La Casbah", sub: "Les ruelles d'Alger" },
    { name: "Oran", sub: "El Bahia, la radieuse" },
    { name: "Tlemcen", sub: "La perle du Maghreb" },
    { name: "Djurdjura", sub: "Les montagnes de Kabylie" },
    { name: "Tassili", sub: "Le Grand Sud" },
  ];
  const PER_CHAPTER = 6;

  const PROVERBS = [
    ["Elli fat mat", "اللي فات مات", "Ce qui est passé est mort : on regarde devant."],
    ["Lyed wa7da ma tsaffaqch", "اليد وحدة ما تصفقش", "Une seule main n'applaudit pas."],
    ["Qatra qatra ysil lwad", "قطرة قطرة يسيل الواد", "Goutte après goutte, la rivière finit par couler."],
    ["Kima tezra3 te7ssed", "كيما تزرع تحصد", "On récolte ce qu'on a semé."],
    ["Elli bgha l3sel ysber lqris n7al", "اللي بغا العسل يصبر لقريص النحل", "Qui veut le miel supporte les piqûres des abeilles."],
    ["Koul khanfous 3and yemmah ghzal", "كل خنفوس عند يماه غزال", "Aux yeux de sa mère, chaque scarabée est une gazelle."],
    ["Ejjar qbel eddar", "الجار قبل الدار", "Choisis le voisin avant la maison."],
    ["Dir el khir w ensah", "دير الخير وانساه", "Fais le bien et oublie-le."],
    ["Sbar tnal", "اصبر تنال", "Sois patient et tu obtiendras ce que tu veux."],
    ["El 3qal zina", "العقل زينة", "La sagesse est une parure."],
    ["Ma ta3ref khirou 7atta tjarreb ghirou", "ما تعرف خيرو حتى تجرب غيرو", "On ne connaît la valeur de quelqu'un qu'après en avoir essayé un autre."],
    ["Zid el ma zid eddqiq", "زيد الما زيد الدقيق", "Plus d'eau, plus de farine : chaque solution demande un ajustement."],
  ];

  const KEYBOARDS = {
    latin: ["azertyuiop", "qsdfghjklm", ["3", "7", "w", "x", "c", "v", "b", "n", "⌫"]],
    arabic: ["ضصقفغعهخحج", "شسيبلاتنمكط", ["ذ", "ث", "ر", "ى", "ة", "و", "ز", "ظ", "د", "ء", "⌫"]],
  };

  // ---------- Sauvegarde ----------
  const STORE_KEY = "daridja-v1";
  const blank = () => ({ xp: 0, streak: { count: 0, last: "" }, modes: { latin: { stars: {} }, arabic: { stars: {} } } });
  let store = blank();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) store = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} };

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const yesterday = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const streakCount = () => (store.streak.last === today() || store.streak.last === yesterday() ? store.streak.count : 0);
  const starsOf = (mode) => store.modes[mode].stars;
  const totalStars = (mode) => Object.values(starsOf(mode)).reduce((a, b) => a + b, 0);
  const frontier = (mode) => {
    const done = Object.keys(starsOf(mode)).map(Number);
    return Math.min(LEVELS[mode].length, (done.length ? Math.max(...done) : 0) + 1);
  };

  // ---------- Vues ----------
  function show(view) {
    ["home", "map", "game"].forEach((v) => { $(v).hidden = v !== view; });
  }

  function renderHome() {
    $("statXp").textContent = store.xp;
    $("statStreak").textContent = streakCount();
    $("statStars").textContent = totalStars("latin") + totalStars("arabic");
    [["latin", "Latin"], ["arabic", "Arabic"]].forEach(([m, k]) => {
      const total = LEVELS[m].length;
      const done = Object.keys(starsOf(m)).length;
      $("bar" + k).style.width = `${(done / total) * 100}%`;
      $("lvl" + k).textContent = done ? `Niveau ${frontier(m)} sur ${total} · ${totalStars(m)} ★` : `${total} niveaux, du plus simple au plus corsé`;
    });
    show("home");
  }

  // ---------- Carte ----------
  let mode = "latin";

  function renderMap() {
    const levels = LEVELS[mode];
    $("mapTitle").innerHTML = `${mode === "arabic" ? "Lettres arabes" : "Lettres latines"}<small>${levels.length} niveaux · touche n'importe quel niveau</small>`;
    $("mapStars").textContent = totalStars(mode);
    const scroll = $("mapScroll");
    scroll.innerHTML = "";
    const front = frontier(mode);
    const STEP = 100;
    for (let ch = CHAPTERS.length - 1; ch >= 0; ch--) {
      const first = ch * PER_CHAPTER + 1;
      if (first > levels.length) continue;
      const count = Math.min(PER_CHAPTER, levels.length - first + 1);
      const sec = document.createElement("div");
      sec.className = "chapter";
      sec.innerHTML = `<div class="chapter-head"><b>${CHAPTERS[ch].name}</b><span>Chapitre ${ch + 1} · ${CHAPTERS[ch].sub}</span></div>`;
      const path = document.createElement("div");
      path.className = "path";
      path.style.height = `${count * STEP}px`;
      const pts = [];
      for (let k = 0; k < count; k++) {
        const n = first + k;
        const x = 50 + 28 * Math.sin((n - 1) * 0.95);
        const y = (count - 1 - k) * STEP + STEP / 2;
        pts.push([x, y]);
        const stars = starsOf(mode)[n] || 0;
        const b = document.createElement("button");
        b.className = "node" + (stars ? " done" : "") + (n === front ? " current" : "");
        b.style.left = `${x}%`;
        b.style.top = `${y - (n === front ? 38 : 32)}px`;
        b.setAttribute("aria-label", `Niveau ${n}${stars ? `, ${stars} étoiles` : ""}`);
        b.innerHTML = `${n}${stars ? `<span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>` : ""}${n > front ? '<span class="lock" aria-hidden="true">⇡</span>' : ""}`;
        b.onclick = () => (n > front ? askSkip(n) : startLevel(n));
        if (n === front) b.id = "frontNode";
        path.appendChild(b);
      }
      const d = pts.map((p, i) => (i ? `L ${p[0]} ${p[1]}` : `M ${p[0]} ${p[1]}`)).join(" ");
      path.insertAdjacentHTML("afterbegin",
        `<svg viewBox="0 0 100 ${count * STEP}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--sea-soft)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${d}" fill="none" stroke="var(--surface)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`);
      sec.appendChild(path);
      scroll.appendChild(sec);
    }
    show("map");
    const node = $("frontNode");
    if (node) node.scrollIntoView({ block: "center" });
  }

  function askSkip(n) {
    openSheet(`
      <h3>Niveau ${n} ?</h3>
      <p class="sub">Tu peux sauter directement à ce niveau. Ceux d'avant restent ouverts, tu pourras y revenir quand tu veux.</p>
      <div class="buttons"><button class="btn" id="skipNo">Annuler</button><button class="btn primary" id="skipYes">Jouer le niveau ${n}</button></div>`);
    $("skipNo").onclick = closeSheet;
    $("skipYes").onclick = () => { closeSheet(); startLevel(n); };
  }

  // ---------- Jeu ----------
  let L = null;          // niveau courant
  let rtl = false;
  let entries = {};      // "r,c" -> lettre saisie
  let revealed = new Set();
  let sel = null;        // { r, c, dir }
  let hintsLeft = 3, hintsUsed = 0, wrongChecks = 0;
  const key = (r, c) => `${r},${c}`;
  const cellEl = {};

  function wordAt(r, c, d) {
    return L.words.find((w) => w.dir === d &&
      (d === "right" ? w.r === r && c >= w.c && c < w.c + w.word.length
                     : w.c === c && r >= w.r && r < w.r + w.word.length));
  }
  const cellsOf = (w) => [...w.word].map((_, i) => (w.dir === "right" ? [w.r, w.c + i] : [w.r + i, w.c]));
  const answer = (r, c) => L.cells[r][c].a;

  function startLevel(n) {
    L = LEVELS[mode][n - 1];
    rtl = mode === "arabic";
    entries = {}; revealed = new Set(); hintsLeft = 3; hintsUsed = 0; wrongChecks = 0;
    const ch = CHAPTERS[Math.floor((n - 1) / PER_CHAPTER)];
    $("gameTitle").innerHTML = `Niveau ${n}<small>${ch ? ch.name : ""} · ${L.words.length} mots</small>`;
    $("xpPill").textContent = `${store.xp} XP`;
    $("btnHint").disabled = true;
    $("hintCount").textContent = hintsLeft;
    renderKeyboard();
    renderBoard();
    show("game");
    fitBoard();
    const w = L.words[0];
    select(w.r, w.c, w.dir);
  }

  function renderBoard() {
    const board = $("board");
    board.innerHTML = "";
    board.classList.toggle("rtl", rtl);
    board.setAttribute("dir", "ltr");
    board.style.setProperty("--n", L.size);
    for (const k in cellEl) delete cellEl[k];
    L.cells.forEach((row, r) => row.forEach((cell, c) => {
      const el = document.createElement("div");
      el.className = `cell ${cell.t}`;
      el.style.gridRow = r + 1;
      el.style.gridColumn = (rtl ? L.size - 1 - c : c) + 1;
      if (cell.t === "C") {
        ["right", "down"].forEach((d) => {
          if (!cell.clues[d]) return;
          const s = document.createElement("div");
          s.className = `clue ${d}`;
          s.textContent = cell.clues[d];
          s.dataset.r = r; s.dataset.c = c; s.dataset.d = d;
          s.onclick = () => (d === "right" ? select(r, c + 1, d) : select(r + 1, c, d));
          el.appendChild(s);
        });
      } else if (cell.t === "L") {
        el.setAttribute("role", "gridcell");
        el.onclick = () => {
          if (sel && sel.r === r && sel.c === c) {
            const other = sel.dir === "right" ? "down" : "right";
            if (wordAt(r, c, other)) select(r, c, other);
          } else select(r, c, sel ? sel.dir : "right");
        };
        cellEl[key(r, c)] = el;
      }
      board.appendChild(el);
    }));
  }

  function paintCell(r, c) {
    const el = cellEl[key(r, c)];
    el.textContent = entries[key(r, c)] || "";
    el.classList.toggle("hint", revealed.has(key(r, c)));
  }

  function select(r, c, dir) {
    const w = wordAt(r, c, dir) || wordAt(r, c, dir === "right" ? "down" : "right");
    if (!w) return;
    sel = { r, c, dir: w.dir };
    document.querySelectorAll(".cell.hl, .cell.sel").forEach((el) => el.classList.remove("hl", "sel"));
    document.querySelectorAll(".clue.active").forEach((el) => el.classList.remove("active"));
    cellsOf(w).forEach(([rr, cc]) => cellEl[key(rr, cc)].classList.add("hl"));
    cellEl[key(r, c)].classList.add("sel");
    const cr = w.dir === "right" ? w.r : w.r - 1, cc = w.dir === "right" ? w.c - 1 : w.c;
    const clueEl = document.querySelector(`.clue[data-r="${cr}"][data-c="${cc}"][data-d="${w.dir}"]`);
    if (clueEl) clueEl.classList.add("active");
    $("clueArrow").textContent = w.dir === "down" ? "▾" : rtl ? "◂" : "▸";
    $("clueText").textContent = w.clue;
    $("clueLen").textContent = `${w.word.length} lettres`;
  }

  function currentWord() { return sel && wordAt(sel.r, sel.c, sel.dir); }

  function step(delta) {
    const w = currentWord();
    const cells = cellsOf(w);
    const i = cells.findIndex(([r, c]) => r === sel.r && c === sel.c);
    const j = i + delta;
    if (j >= 0 && j < cells.length) select(cells[j][0], cells[j][1], w.dir);
  }

  function type(ch) {
    if (!sel) return;
    if (ch === "⌫") return erase();
    const k = key(sel.r, sel.c);
    if (!revealed.has(k)) {
      entries[k] = ch;
      cellEl[k].classList.remove("bad", "good");
      paintCell(sel.r, sel.c);
    }
    step(1);
  }

  function erase() {
    const k = key(sel.r, sel.c);
    if (entries[k] && !revealed.has(k)) {
      delete entries[k];
      cellEl[k].classList.remove("bad", "good");
      paintCell(sel.r, sel.c);
      return;
    }
    step(-1);
    const k2 = key(sel.r, sel.c);
    if (!revealed.has(k2)) {
      delete entries[k2];
      cellEl[k2].classList.remove("bad", "good");
      paintCell(sel.r, sel.c);
    }
  }

  function renderKeyboard() {
    const kb = $("kb");
    kb.className = `kb ${rtl ? "ar" : ""}`;
    kb.setAttribute("dir", rtl ? "rtl" : "ltr");
    kb.innerHTML = "";
    KEYBOARDS[mode].forEach((row) => {
      const div = document.createElement("div");
      div.className = "row";
      [...row].forEach((ch) => {
        const b = document.createElement("button");
        b.className = "key" + (ch === "⌫" ? " wide" : "");
        b.textContent = ch;
        b.setAttribute("aria-label", ch === "⌫" ? "Effacer la lettre" : ch);
        b.onclick = () => type(ch);
        div.appendChild(b);
      });
      kb.appendChild(div);
    });
  }

  function flash(msg) {
    $("clueText").textContent = msg;
    $("clueLen").textContent = "";
  }

  function check() {
    let empty = 0, wrong = 0;
    L.cells.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.t !== "L") return;
      const el = cellEl[key(r, c)];
      el.classList.remove("bad", "good");
      const v = entries[key(r, c)];
      if (!v) { empty++; return; }
      if (v !== cell.a) { wrong++; void el.offsetWidth; el.classList.add("bad"); }
    }));
    if (!empty && !wrong) return win();
    wrongChecks++;
    $("btnHint").disabled = hintsLeft === 0;
    const parts = [];
    if (wrong) parts.push(`${wrong} lettre${wrong > 1 ? "s" : ""} fausse${wrong > 1 ? "s" : ""}`);
    if (empty) parts.push(`${empty} case${empty > 1 ? "s" : ""} vide${empty > 1 ? "s" : ""}`);
    flash(`Pas encore : ${parts.join(", ")}. Un indice ?`);
  }

  function hint() {
    if (!hintsLeft) return;
    const needs = ([r, c]) => entries[key(r, c)] !== answer(r, c);
    let target = currentWord() && cellsOf(currentWord()).find(needs);
    if (!target) {
      for (const w of L.words) { target = cellsOf(w).find(needs); if (target) { select(target[0], target[1], w.dir); break; } }
    }
    if (!target) return;
    const [r, c] = target;
    entries[key(r, c)] = answer(r, c);
    revealed.add(key(r, c));
    cellEl[key(r, c)].classList.remove("bad");
    paintCell(r, c);
    hintsLeft--; hintsUsed++;
    $("hintCount").textContent = hintsLeft;
    $("btnHint").disabled = hintsLeft === 0;
  }

  let clearTimer = null;
  function clearGrid() {
    const b = $("btnClear");
    if (!b.dataset.armed) {
      b.dataset.armed = "1"; b.textContent = "Sûr ?";
      clearTimer = setTimeout(() => { delete b.dataset.armed; b.textContent = "Effacer"; }, 2500);
      return;
    }
    clearTimeout(clearTimer); delete b.dataset.armed; b.textContent = "Effacer";
    Object.keys(entries).forEach((k) => { if (!revealed.has(k)) delete entries[k]; });
    L.cells.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.t === "L") { cellEl[key(r, c)].classList.remove("bad", "good"); paintCell(r, c); }
    }));
  }

  function win() {
    const n = L.n;
    const stars = hintsUsed === 0 && wrongChecks === 0 ? 3 : hintsUsed <= 1 && wrongChecks <= 2 ? 2 : 1;
    const prev = starsOf(mode)[n] || 0;
    let gained = 0;
    if (stars > prev) {
      gained = (stars - prev) * 10 + (prev ? 0 : L.words.length * 2);
      starsOf(mode)[n] = stars;
      store.xp += gained;
    }
    if (store.streak.last !== today()) {
      store.streak.count = store.streak.last === yesterday() ? store.streak.count + 1 : 1;
      store.streak.last = today();
    }
    save();
    L.cells.forEach((row, r) => row.forEach((cell, c) => { if (cell.t === "L") cellEl[key(r, c)].classList.add("good"); }));

    const p = PROVERBS[(n - 1) % PROVERBS.length];
    const chapterEnd = n % PER_CHAPTER === 0 && CHAPTERS[n / PER_CHAPTER - 1];
    const recap = L.words.map((w) => rtl
      ? `<span class="chip"><b lang="ar">${w.ar}</b> · ${w.latin} · ${w.clue}</span>`
      : `<span class="chip"><b>${w.latin}</b> · ${w.clue}</span>`).join("");
    const last = n >= LEVELS[mode].length;
    setTimeout(() => {
      openSheet(`
        <h3>${rtl ? "صحة !" : "Sa7a !"}</h3>
        <p class="sub">${chapterEnd ? `Chapitre ${chapterEnd.name} terminé` : `Niveau ${n} réussi`}</p>
        <div class="bigstars" aria-label="${stars} étoiles sur 3">${[1, 2, 3].map((i) => `<span class="${i <= stars ? "on" : ""}">★</span>`).join("")}</div>
        <p class="xp">${gained ? `+${gained} XP` : "Tu avais déjà fait mieux sur ce niveau"}</p>
        <div class="reward">
          <span class="kicker">Ta récompense · un proverbe</span>
          <span class="dz">${p[0]}</span>
          <span class="dz" dir="rtl" lang="ar">${p[1]}</span>
          <span class="fr">${p[2]}</span>
        </div>
        <div class="recap">${recap}</div>
        <div class="buttons">
          <button class="btn" id="toMap">Carte</button>
          <button class="btn primary" id="toNext">${last ? "Revoir la carte" : `Niveau ${n + 1}`}</button>
        </div>`);
      $("toMap").onclick = () => { closeSheet(); renderMap(); };
      $("toNext").onclick = () => { closeSheet(); last ? renderMap() : startLevel(n + 1); };
      confetti();
    }, 450);
  }

  // ---------- Feuille du bas ----------
  function openSheet(html) { $("sheet").innerHTML = html; $("scrim").hidden = false; }
  function closeSheet() { $("scrim").hidden = true; }
  $("scrim").addEventListener("click", (e) => { if (e.target === $("scrim")) closeSheet(); });

  // ---------- Confettis ----------
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("confetti");
    cv.hidden = false;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#2f6fb0", "#eeac35", "#3fa77c", "#d9594a", "#8fb8e6"];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35,
      vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4,
      s: 5 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .3,
      col: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t - t0 < 2600) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.hidden = true; }
    })(t0);
  }

  // ---------- Taille de la grille ----------
  function fitBoard() {
    if (!L || $("game").hidden) return;
    const wrap = $("boardwrap");
    const side = Math.min(wrap.clientWidth, wrap.clientHeight - 20, 480);
    const cs = Math.max(22, Math.floor((side - 4 - (L.size - 1) * 2) / L.size));
    $("board").style.setProperty("--cs", `${cs}px`);
  }
  if (window.ResizeObserver) new ResizeObserver(fitBoard).observe($("boardwrap"));
  window.addEventListener("resize", fitBoard);

  // ---------- Clavier physique ----------
  document.addEventListener("keydown", (e) => {
    if ($("game").hidden || !$("scrim").hidden || !sel) return;
    if (e.key === "Backspace") { erase(); e.preventDefault(); return; }
    const arrows = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 };
    if (e.key in arrows) {
      const d = e.key === "ArrowUp" || e.key === "ArrowDown" ? "down" : "right";
      const dr = d === "down" ? arrows[e.key] : 0, dc = d === "right" ? arrows[e.key] : 0;
      if (cellEl[key(sel.r + dr, sel.c + dc)]) select(sel.r + dr, sel.c + dc, d);
      e.preventDefault(); return;
    }
    const ch = e.key.toLowerCase();
    if (ch.length === 1 && KEYBOARDS[mode].some((row) => [...row].includes(ch))) { type(ch); e.preventDefault(); }
  });

  // ---------- Branchements ----------
  document.querySelectorAll(".mode").forEach((b) => { b.onclick = () => { mode = b.dataset.mode; renderMap(); }; });
  $("mapBack").onclick = renderHome;
  $("gameBack").onclick = renderMap;
  $("btnCheck").onclick = check;
  $("btnHint").onclick = hint;
  $("btnClear").onclick = clearGrid;

  renderHome();
})();
