(() => {
  "use strict";
  const RAW = window.LEVELS || { latin: [], arabic: [] };
  const PHOTOS = Array.isArray(window.PHOTOS) ? window.PHOTOS : [];
  const $ = (id) => document.getElementById(id);

  const GIFT_EVERY = 3;
  const GIFT_TOTAL = 168;
  const PER_CHAPTER = 12;
  const CHAPTERS = [
    ["La Casbah", "Les ruelles d'Alger"], ["Tipaza", "Les ruines face à la mer"], ["Oran", "El Bahia, la radieuse"],
    ["Tlemcen", "La perle du Maghreb"], ["Béjaïa", "Le golfe et Yemma Gouraya"], ["Constantine", "La ville des ponts"],
    ["Djurdjura", "Les montagnes de Kabylie"], ["Annaba", "La coquette de l'Est"], ["Ghardaïa", "La vallée du M'zab"],
    ["Sétif", "Les hauts plateaux"], ["Biskra", "La reine des Ziban"], ["Cherchell", "L'ancienne Césarée"],
    ["Jijel", "La corniche"], ["Mostaganem", "La ville de Sidi Lakhdar"], ["Blida", "La ville des roses"],
    ["Timimoun", "L'oasis rouge"], ["Taghit", "Les dunes de la Saoura"], ["El Kala", "Les lacs et la forêt"],
    ["Tamanrasset", "Les portes du Hoggar"], ["Djanet", "Les fresques du Tassili"], ["Assekrem", "Le lever du soleil sur le Hoggar"],
  ];
  // ---------- Dictons : répétition espacée ----------
  // Un dicton nouveau revient 4, 12, 30 puis 70 victoires plus tard : assez pour s'en souvenir,
  // pas assez pour s'en lasser. Les trois familles alternent pour varier.
  const SAYINGS = Array.isArray(window.SAYINGS) ? window.SAYINGS : [];
  const KIND_LABEL = { proverbe: "Proverbe", rue: "Expression de la rue", rai: "Raï & chaâbi" };
  const REVIEW_GAPS = [4, 12, 30, 70];
  const SCHEDULE = (() => {
    const byKind = {};
    SAYINGS.forEach((x, i) => (byKind[x.k] = byKind[x.k] || []).push(i));
    const order = [];
    const kinds = Object.keys(byKind);
    for (let r = 0; order.length < SAYINGS.length; r++) kinds.forEach((k) => { if (byKind[k][r] !== undefined) order.push(byKind[k][r]); });
    const due = {}, pending = [], last = {}, seq = [];
    let next = 0;
    for (let step = 0; step < 2000 && SAYINGS.length; step++) {
      (due[step] || []).forEach((i) => pending.push(i));
      let id;
      if (pending.length) id = pending.shift();
      else if (next < order.length) {
        id = order[next++];
        REVIEW_GAPS.forEach((g) => (due[step + g] = due[step + g] || []).push(id));
      } else id = order.reduce((a, b) => ((last[a] ?? -1) <= (last[b] ?? -1) ? a : b)); // révision du plus ancien
      last[id] = step;
      seq.push(id);
    }
    return seq;
  })();

  // ---------- Sauvegarde (dans le navigateur du téléphone) ----------
  const STORE_KEY = "daridja-v2";
  const blank = () => ({ xp: 0, theme: "auto", streak: { count: 0, last: "" }, sayStep: 0, seenSay: {},
                         modes: { latin: { stars: {} }, arabic: { stars: {} } } });
  let store = blank();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) store = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} };

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const today = () => dayKey(new Date());
  const yesterday = () => dayKey(new Date(Date.now() - 864e5));
  const streakCount = () => (store.streak.last === today() || store.streak.last === yesterday() ? store.streak.count : 0);
  const starsOf = (m) => store.modes[m].stars;
  const totalStars = (m) => Object.values(starsOf(m)).reduce((a, b) => a + b, 0);
  const completed = () => Object.keys(starsOf("latin")).length + Object.keys(starsOf("arabic")).length;
  const unlockedGifts = () => Math.min(GIFT_TOTAL, Math.floor(completed() / GIFT_EVERY));
  const levelsBeforeGift = () => GIFT_EVERY - (completed() % GIFT_EVERY);
  const frontier = (m) => {
    const done = Object.keys(starsOf(m)).map(Number);
    return Math.min(RAW[m].length, (done.length ? Math.max(...done) : 0) + 1);
  };
  const chapterOf = (n) => CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor((n - 1) / PER_CHAPTER))];

  // ---------- Thème ----------
  function applyTheme() {
    const t = store.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    document.querySelectorAll("[data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.themeSet === t));
  }
  document.querySelectorAll("[data-theme-set]").forEach((b) => {
    b.onclick = () => { store.theme = b.dataset.themeSet; save(); applyTheme(); };
  });

  // ---------- Vues ----------
  function show(view) { ["home", "map", "game", "gallery", "carnet"].forEach((v) => { $(v).hidden = v !== view; }); }

  function renderHome() {
    $("statXp").textContent = store.xp;
    $("statStreak").textContent = streakCount();
    $("statStars").textContent = totalStars("latin") + totalStars("arabic");
    [["latin", "Latin"], ["arabic", "Arabic"]].forEach(([m, k]) => {
      const total = RAW[m].length;
      const done = Object.keys(starsOf(m)).length;
      $("bar" + k).style.width = `${(done / total) * 100}%`;
      $("lvl" + k).textContent = done
        ? `Niveau ${frontier(m)} sur ${total} · ${chapterOf(frontier(m))[0]}`
        : `${total} niveaux, du plus simple au plus corsé`;
    });
    const learned = Object.keys(store.seenSay).length;
    $("barSay").style.width = `${SAYINGS.length ? (learned / SAYINGS.length) * 100 : 0}%`;
    $("lvlSay").textContent = learned
      ? `${learned} dicton${learned > 1 ? "s" : ""} rencontré${learned > 1 ? "s" : ""} sur ${SAYINGS.length}`
      : `${SAYINGS.length} dictons à découvrir en jouant`;
    const g = unlockedGifts();
    $("barGift").style.width = `${(g / GIFT_TOTAL) * 100}%`;
    $("lvlGift").textContent = `${g} photo${g > 1 ? "s" : ""} sur ${GIFT_TOTAL} · la prochaine dans ${levelsBeforeGift()} niveau${levelsBeforeGift() > 1 ? "x" : ""}`;
    show("home");
  }

  // ---------- Carte ----------
  let mode = "latin";

  function renderMap() {
    const levels = RAW[mode];
    $("mapTitle").innerHTML = `${mode === "arabic" ? "Lettres arabes" : "Lettres latines"}<small>Touche n'importe quel niveau pour y aller</small>`;
    $("mapStars").textContent = totalStars(mode);
    const left = levelsBeforeGift();
    $("mapGift").textContent = `♥ ${left}`;
    $("mapGift").setAttribute("aria-label", `Prochaine photo dans ${left} niveaux`);
    const scroll = $("mapScroll");
    scroll.innerHTML = "";
    const front = frontier(mode);
    const STEP = 96;
    const nChapters = Math.ceil(levels.length / PER_CHAPTER);
    for (let ch = nChapters - 1; ch >= 0; ch--) {
      const first = ch * PER_CHAPTER + 1;
      const count = Math.min(PER_CHAPTER, levels.length - first + 1);
      const [name, sub] = CHAPTERS[Math.min(ch, CHAPTERS.length - 1)];
      const sec = document.createElement("div");
      sec.className = "chapter";
      sec.innerHTML = `<div class="chapter-head"><b>${name}</b><span>Étape ${ch + 1} · ${sub} · niveaux ${first} à ${first + count - 1}</span></div>`;
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
        b.style.top = `${y - (n === front ? 36 : 30)}px`;
        b.setAttribute("aria-label", `Niveau ${n}${stars ? `, ${stars} étoiles` : ""}`);
        b.innerHTML = `${n}${stars ? `<span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>` : ""}`;
        b.onclick = () => (n > front ? askSkip(n) : startLevel(n));
        if (n === front) b.id = "frontNode";
        path.appendChild(b);
      }
      const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
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

  // ---------- Niveau : la grille se reconstruit à partir des mots ----------
  function expand(lv) {
    const s = lv.s;
    const cells = Array.from({ length: s }, () => Array.from({ length: s }, () => ({ t: "B" })));
    const words = lv.w.map(([word, clue, latin, ar, r, c, d]) => ({ word, chars: [...word], clue, latin, ar, r, c, dir: d ? "down" : "right" }));
    words.forEach((w) => {
      const [cr, cc] = w.dir === "right" ? [w.r, w.c - 1] : [w.r - 1, w.c];
      if (cells[cr][cc].t !== "C") cells[cr][cc] = { t: "C", clues: {} };
      cells[cr][cc].clues[w.dir] = w.clue;
      w.chars.forEach((ch, i) => {
        const [r, c] = w.dir === "right" ? [w.r, w.c + i] : [w.r + i, w.c];
        cells[r][c] = { t: "L", a: ch };
      });
    });
    return { n: lv.n, size: s, cells, words };
  }

  // ---------- Jeu ----------
  let L = null;
  let rtl = false;
  let entries = {};
  let revealed = new Set();
  let sel = null;
  let hintsLeft = 3, hintsUsed = 0, wrongChecks = 0;
  const key = (r, c) => `${r},${c}`;
  const cellEl = {};

  function wordAt(r, c, d) {
    return L.words.find((w) => w.dir === d &&
      (d === "right" ? w.r === r && c >= w.c && c < w.c + w.chars.length
                     : w.c === c && r >= w.r && r < w.r + w.chars.length));
  }
  const cellsOf = (w) => w.chars.map((_, i) => (w.dir === "right" ? [w.r, w.c + i] : [w.r + i, w.c]));
  const answer = (r, c) => L.cells[r][c].a;

  function startLevel(n) {
    L = expand(RAW[mode][n - 1]);
    rtl = mode === "arabic";
    entries = {}; revealed = new Set(); hintsLeft = 3; hintsUsed = 0; wrongChecks = 0;
    $("gameTitle").innerHTML = `Niveau ${n}<small>${chapterOf(n)[0]} · ${L.words.length} mots</small>`;
    $("xpPill").textContent = `${store.xp} XP`;
    $("btnHint").disabled = true;
    $("hintCount").textContent = hintsLeft;
    $("kbInput").blur();
    renderBoard();
    show("game");
    fitBoard();
    select(L.words[0].r, L.words[0].c, L.words[0].dir);
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
          s.onclick = () => { d === "right" ? select(r, c + 1, d) : select(r + 1, c, d); openKeyboard(); };
          el.appendChild(s);
        });
      } else if (cell.t === "L") {
        el.setAttribute("role", "gridcell");
        el.onclick = () => {
          // Premier toucher : ouvre le clavier. Toucher à nouveau la case choisie : change de sens.
          if (sel && sel.r === r && sel.c === c && keyboardOpen()) {
            const other = sel.dir === "right" ? "down" : "right";
            if (wordAt(r, c, other)) select(r, c, other);
          } else select(r, c, sel ? sel.dir : "right");
          openKeyboard();
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
    const [cr, cc] = w.dir === "right" ? [w.r, w.c - 1] : [w.r - 1, w.c];
    const clueEl = document.querySelector(`.clue[data-r="${cr}"][data-c="${cc}"][data-d="${w.dir}"]`);
    if (clueEl) clueEl.classList.add("active");
    $("cluebar").classList.remove("alert");
    $("clueArrow").textContent = w.dir === "down" ? "▾" : rtl ? "◂" : "▸";
    $("clueText").textContent = w.clue;
    $("clueLen").textContent = `${w.chars.length} lettres`;
  }

  const currentWord = () => sel && wordAt(sel.r, sel.c, sel.dir);

  function step(delta) {
    const w = currentWord();
    const cells = cellsOf(w);
    const i = cells.findIndex(([r, c]) => r === sel.r && c === sel.c);
    const j = i + delta;
    if (j >= 0 && j < cells.length) select(cells[j][0], cells[j][1], w.dir);
  }

  function setEntry(r, c, v) {
    const k = key(r, c);
    if (revealed.has(k)) return;
    if (v) entries[k] = v; else delete entries[k];
    cellEl[k].classList.remove("bad", "good");
    paintCell(r, c);
  }

  function type(ch) {
    if (!sel || !$("scrim").hidden) return;
    if (ch === "⌫") return erase();
    setEntry(sel.r, sel.c, ch);
    step(1);
  }

  function erase() {
    const k = key(sel.r, sel.c);
    if (entries[k] && !revealed.has(k)) return setEntry(sel.r, sel.c, "");
    step(-1);
    setEntry(sel.r, sel.c, "");
  }

  // ---------- Clavier de l'iPhone ----------
  // Un champ invisible reçoit la frappe. Il contient toujours une espace « témoin » :
  // si elle disparaît, c'est que la touche effacer a été pressée (l'iPhone n'envoie rien d'autre).
  const kbInput = $("kbInput");
  const SENTINEL = " ";
  let composing = false;
  let warned = false;
  const keyboardOpen = () => document.activeElement === kbInput;
  function resetInput() { kbInput.value = SENTINEL; try { kbInput.setSelectionRange(1, 1); } catch (e) {} }
  function openKeyboard() {
    kbInput.lang = rtl ? "ar" : "fr";
    kbInput.dir = rtl ? "rtl" : "ltr";
    resetInput();
    kbInput.focus({ preventScroll: true });
  }

  // Ramène ce que tape l'iPhone aux lettres de la grille : minuscules, sans accents, sans voyelles arabes.
  function normalize(ch) {
    if (rtl) {
      ch = ch.replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا");
      return /^[\u0621-\u064A]$/.test(ch) ? ch : null;
    }
    ch = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return /^[a-z0-9]$/.test(ch) ? ch : null;
  }

  function feed(text) {
    for (const raw of text) {
      const ch = normalize(raw);
      if (ch) { type(ch); continue; }
      if (raw.trim() && !warned) {
        warned = true;
        flash(rtl ? "Passe au clavier arabe avec la touche 🌐 (Réglages → Général → Clavier → Claviers pour l'ajouter)."
                  : "Passe au clavier français ou anglais avec la touche 🌐.");
      }
    }
  }

  kbInput.addEventListener("compositionstart", () => { composing = true; });
  kbInput.addEventListener("compositionend", () => { composing = false; handleInput(); });
  kbInput.addEventListener("input", () => { if (!composing) handleInput(); });
  function handleInput() {
    const v = kbInput.value;
    if (v.length === 0) erase();                         // l'espace témoin a été effacée
    else feed(v.startsWith(SENTINEL) ? v.slice(1) : v);  // lettres tapées (ou mot proposé par le clavier)
    resetInput();
  }
  kbInput.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && kbInput.value === SENTINEL) { e.preventDefault(); erase(); return; }
    const arrows = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 };
    if (e.key in arrows && sel) {
      const d = e.key === "ArrowUp" || e.key === "ArrowDown" ? "down" : "right";
      const dr = d === "down" ? arrows[e.key] : 0, dc = d === "right" ? arrows[e.key] : 0;
      if (cellEl[key(sel.r + dr, sel.c + dc)]) select(sel.r + dr, sel.c + dc, d);
      e.preventDefault();
    }
    if (e.key === "Enter") { e.preventDefault(); kbInput.blur(); }
  });

  // Quand le clavier apparaît, le jeu se réduit à la partie visible de l'écran : la grille reste au-dessus.
  function fitViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    const open = vv.height < window.innerHeight - 100;
    document.body.classList.toggle("kb-open", open);
    if (open) {
      $("game").style.height = `${vv.height - Math.max(0, parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0)}px`;
      window.scrollTo(0, 0);
    } else {
      $("game").style.height = "";
    }
    fitBoard();
  }
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", fitViewport);
    visualViewport.addEventListener("scroll", () => { if (document.body.classList.contains("kb-open")) window.scrollTo(0, 0); });
  }

  function flash(msg) {
    $("cluebar").classList.add("alert");
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
    flash(`Pas encore : ${parts.join(", ")}.${hintsLeft ? " Un indice ?" : ""}`);
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
    L.cells.forEach((row, r) => row.forEach((cell, c) => { if (cell.t === "L") setEntry(r, c, ""); }));
  }

  // ---------- Victoire, récompense et cadeau ----------
  function photoHtml(i, cls = "") {
    const p = PHOTOS[i];
    return p ? `<img class="${cls}" src="${p.src}" alt="${p.caption ? p.caption.replace(/"/g, "&quot;") : `Photo ${i + 1}`}">`
             : `<div class="placeholder">${i + 1}</div>`;
  }

  function win() {
    const n = L.n;
    const stars = hintsUsed === 0 && wrongChecks === 0 ? 3 : hintsUsed <= 1 && wrongChecks <= 2 ? 2 : 1;
    const prev = starsOf(mode)[n] || 0;
    const giftsBefore = unlockedGifts();
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
    const newGift = unlockedGifts() > giftsBefore ? unlockedGifts() - 1 : -1;
    L.cells.forEach((row, r) => row.forEach((cell, c) => { if (cell.t === "L") cellEl[key(r, c)].classList.add("good"); }));

    let sayingHtml = "";
    if (SCHEDULE.length) {
      const id = SCHEDULE[store.sayStep % SCHEDULE.length];
      const x = SAYINGS[id];
      const seen = store.seenSay[id] || 0;
      store.seenSay[id] = seen + 1;
      store.sayStep++;
      save();
      const tag = seen ? `À revoir · ${seen + 1}ᵉ fois` : "Nouveau";
      sayingHtml = `<div class="reward ${x.k}">
          <span class="kicker">${KIND_LABEL[x.k]} · <b>${tag}</b></span>
          <span class="dz">${x.dz}</span>
          <span class="dz" dir="rtl" lang="ar">${x.ar}</span>
          <span class="fr">${x.fr}</span>
        </div>`;
    }
    const chapterEnd = n % PER_CHAPTER === 0;
    const recap = L.words.map((w) => rtl
      ? `<span class="chip"><b lang="ar">${w.ar}</b> · ${w.latin} · ${w.clue}</span>`
      : `<span class="chip"><b>${w.latin}</b> · ${w.clue}</span>`).join("");
    const left = levelsBeforeGift();
    const giftBlock = newGift >= 0
      ? `<div class="giftcard"><span class="kicker">Cadeau débloqué · photo ${newGift + 1} sur ${GIFT_TOTAL}</span>
           <button id="openGift" aria-label="Voir la photo en grand">${photoHtml(newGift)}</button>
           ${PHOTOS[newGift] && PHOTOS[newGift].caption ? `<span class="caption">${PHOTOS[newGift].caption}</span>` : ""}</div>`
      : unlockedGifts() < GIFT_TOTAL
        ? `<div class="next-gift"><span class="dots">${[0, 1, 2].map((i) => `<i class="${i < GIFT_EVERY - left ? "on" : ""}"></i>`).join("")}</span>Prochaine photo dans ${left} niveau${left > 1 ? "x" : ""}</div>`
        : "";
    const last = n >= RAW[mode].length;
    setTimeout(() => {
      openSheet(`
        <h3>${rtl ? "صحة !" : "Sa7a !"}</h3>
        <p class="sub">${chapterEnd ? `Étape ${chapterOf(n)[0]} terminée` : `Niveau ${n} réussi`}</p>
        <div class="bigstars" aria-label="${stars} étoiles sur 3">${[1, 2, 3].map((i) => `<span class="${i <= stars ? "on" : ""}">★</span>`).join("")}</div>
        <p class="xp">${gained ? `+${gained} XP` : "Tu avais déjà fait mieux sur ce niveau"}</p>
        ${giftBlock}
        ${sayingHtml}
        <div class="recap">${recap}</div>
        <div class="buttons">
          <button class="btn" id="toMap">Carte</button>
          <button class="btn primary" id="toNext">${last ? "Revoir la carte" : `Niveau ${n + 1}`}</button>
        </div>`);
      if (newGift >= 0) $("openGift").onclick = () => openLightbox(newGift);
      $("toMap").onclick = () => { closeSheet(); renderMap(); };
      $("toNext").onclick = () => { closeSheet(); last ? renderMap() : startLevel(n + 1); };
      confetti(newGift >= 0);
    }, 450);
  }

  // ---------- Carnet de dictons ----------
  function renderCarnet() {
    const seen = SAYINGS.map((x, i) => ({ ...x, i, n: store.seenSay[i] || 0 })).filter((x) => x.n);
    $("carnetSub").textContent = `${seen.length} sur ${SAYINGS.length} · ils reviennent tout seuls au fil des niveaux`;
    const list = $("carnetList");
    list.innerHTML = seen.length ? "" : '<p class="empty">Gagne un niveau pour découvrir ton premier dicton.</p>';
    ["proverbe", "rue", "rai"].forEach((k) => {
      const items = seen.filter((x) => x.k === k);
      if (!items.length) return;
      list.insertAdjacentHTML("beforeend", `<h3 class="carnet-h">${KIND_LABEL[k]}</h3>` + items.map((x) => `
        <div class="reward ${k}">
          <span class="dz">${x.dz}</span>
          <span class="dz" dir="rtl" lang="ar">${x.ar}</span>
          <span class="fr">${x.fr}</span>
          <span class="kicker">Vu ${x.n} fois</span>
        </div>`).join(""));
    });
    show("carnet");
  }

  // ---------- Galerie ----------
  function renderGallery() {
    const g = unlockedGifts();
    $("gallerySub").textContent = `${g} photo${g > 1 ? "s" : ""} débloquée${g > 1 ? "s" : ""} sur ${GIFT_TOTAL}`;
    $("galleryGrid").innerHTML = '<div class="thumbs"></div>';
    const grid = $("galleryGrid").firstChild;
    for (let i = 0; i < GIFT_TOTAL; i++) {
      const b = document.createElement("button");
      if (i < g) {
        const p = PHOTOS[i];
        b.className = "thumb";
        b.innerHTML = p ? `<img src="${p.thumb || p.src}" alt="Photo ${i + 1}" loading="lazy">` : `<span class="ph">${i + 1}</span>`;
        b.setAttribute("aria-label", `Voir la photo ${i + 1}`);
        b.onclick = () => openLightbox(i);
      } else {
        b.className = "thumb locked";
        b.disabled = true;
        b.innerHTML = `<span class="num">${i + 1}</span>`;
        b.setAttribute("aria-label", `Photo ${i + 1}, pas encore débloquée`);
      }
      grid.appendChild(b);
    }
    show("gallery");
  }

  let lbIndex = 0;
  function openLightbox(i) {
    lbIndex = i;
    const g = unlockedGifts();
    $("lbImg").innerHTML = photoHtml(i);
    $("lbCount").textContent = `${i + 1} / ${GIFT_TOTAL}`;
    $("lbCap").textContent = (PHOTOS[i] && PHOTOS[i].caption) || "";
    $("lbPrev").disabled = i === 0;
    $("lbNext").disabled = i >= g - 1;
    $("lightbox").hidden = false;
  }
  $("lbClose").onclick = () => { $("lightbox").hidden = true; };
  $("lbPrev").onclick = () => { if (lbIndex > 0) openLightbox(lbIndex - 1); };
  $("lbNext").onclick = () => { if (lbIndex < unlockedGifts() - 1) openLightbox(lbIndex + 1); };
  let touchX = null;
  $("lightbox").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  $("lightbox").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (dx > 50) $("lbPrev").click(); else if (dx < -50) $("lbNext").click();
  });

  // ---------- Feuille du bas ----------
  function openSheet(html) { $("sheet").innerHTML = html; $("scrim").hidden = false; $("sheet").scrollTop = 0; }
  function closeSheet() { $("scrim").hidden = true; }
  $("scrim").addEventListener("click", (e) => { if (e.target === $("scrim")) closeSheet(); });

  // ---------- Confettis ----------
  function confetti(hearts) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("confetti");
    cv.hidden = false;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = hearts ? ["#e98aa0", "#f2b33d", "#f6c3cf", "#3d7fd9"] : ["#3d7fd9", "#f2b33d", "#2f9e70", "#dc5a49", "#9cc2f0"];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35,
      vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4,
      s: 6 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .3,
      col: colors[(Math.random() * colors.length) | 0], heart: hearts && Math.random() < .5,
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col;
        if (p.heart) { ctx.font = `${p.s * 2}px sans-serif`; ctx.fillText("♥", -p.s / 2, p.s / 2); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (t - t0 < 2600) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.hidden = true; }
    })(t0);
  }

  // ---------- Taille de la grille ----------
  function fitBoard() {
    if (!L || $("game").hidden) return;
    const wrap = $("boardwrap");
    const side = Math.min(wrap.clientWidth, wrap.clientHeight - 16, 480);
    const cs = Math.max(22, Math.floor((side - 4 - (L.size - 1) * 2) / L.size));
    $("board").style.setProperty("--cs", `${cs}px`);
  }
  if (window.ResizeObserver) new ResizeObserver(fitBoard).observe($("boardwrap"));
  window.addEventListener("resize", fitBoard);

  // ---------- Clavier d'ordinateur et visionneuse ----------
  document.addEventListener("keydown", (e) => {
    if (!$("lightbox").hidden) {
      if (e.key === "Escape") $("lbClose").click();
      if (e.key === "ArrowLeft") $("lbPrev").click();
      if (e.key === "ArrowRight") $("lbNext").click();
      return;
    }
    // Sur ordinateur, taper sans avoir touché de case envoie quand même les lettres dans la grille.
    if ($("game").hidden || !$("scrim").hidden || !sel || keyboardOpen()) return;
    if (e.key.length === 1 || e.key === "Backspace" || e.key.startsWith("Arrow")) openKeyboard();
  });

  // ---------- Branchements ----------
  document.querySelectorAll(".card[data-mode]").forEach((b) => { b.onclick = () => { mode = b.dataset.mode; renderMap(); }; });
  $("openGallery").onclick = renderGallery;
  $("openCarnet").onclick = renderCarnet;
  $("carnetBack").onclick = renderHome;
  $("mapBack").onclick = renderHome;
  $("galleryBack").onclick = renderHome;
  $("gameBack").onclick = () => { kbInput.blur(); renderMap(); };
  $("btnCheck").onclick = check;
  $("btnHint").onclick = hint;
  $("btnClear").onclick = clearGrid;

  applyTheme();
  renderHome();
})();
