(() => {
  const GRIDS = window.GRIDS || [];
  const LEVEL_NAMES = { facile: "Facile", moyen: "Moyen", difficile: "Difficile" };
  const $ = (id) => document.getElementById(id);
  let grid = null;
  let dir = "right";
  let inputs = {};

  const key = (r, c) => `${r},${c}`;

  function renderLevels(active) {
    $("levels").innerHTML = "";
    Object.keys(LEVEL_NAMES).forEach((lvl) => {
      const b = document.createElement("button");
      b.textContent = LEVEL_NAMES[lvl];
      b.setAttribute("aria-pressed", lvl === active);
      b.onclick = () => openLevel(lvl);
      $("levels").appendChild(b);
    });
  }

  function openLevel(lvl, idx = 0) {
    renderLevels(lvl);
    const list = GRIDS.filter((g) => g.level === lvl);
    $("grids").innerHTML = "";
    list.forEach((g, i) => {
      const b = document.createElement("button");
      b.textContent = `Grille ${i + 1}`;
      b.setAttribute("aria-pressed", i === idx);
      b.onclick = () => openLevel(lvl, i);
      $("grids").appendChild(b);
    });
    renderGrid(list[idx]);
  }

  function wordAt(r, c, d) {
    return grid.words.find((w) => w.dir === d &&
      (d === "right" ? w.r === r && c >= w.c && c < w.c + w.word.length
                     : w.c === c && r >= w.r && r < w.r + w.word.length));
  }

  function highlight(w) {
    document.querySelectorAll(".cell.hl").forEach((el) => el.classList.remove("hl"));
    if (!w) return;
    for (let i = 0; i < w.word.length; i++) {
      const [r, c] = w.dir === "right" ? [w.r, w.c + i] : [w.r + i, w.c];
      inputs[key(r, c)].parentElement.classList.add("hl");
    }
  }

  function focusCell(r, c, d) {
    const w = wordAt(r, c, d) || wordAt(r, c, d === "right" ? "down" : "right");
    if (w) dir = w.dir;
    highlight(w);
    inputs[key(r, c)].focus();
  }

  function renderGrid(g) {
    grid = g; inputs = {}; dir = "right";
    $("status").textContent = "";
    const board = $("board");
    board.innerHTML = "";
    board.style.setProperty("--n", g.cols);
    g.cells.forEach((row, r) => row.forEach((cell, c) => {
      const el = document.createElement("div");
      el.className = `cell ${cell.t}`;
      if (cell.t === "C") {
        ["right", "down"].forEach((d) => {
          if (!cell.clues[d]) return;
          const s = document.createElement("div");
          s.className = `clue ${d}`;
          s.textContent = cell.clues[d];
          s.onclick = () => (d === "right" ? focusCell(r, c + 1, d) : focusCell(r + 1, c, d));
          el.appendChild(s);
        });
      } else if (cell.t === "L") {
        const inp = document.createElement("input");
        inp.maxLength = 1;
        inp.autocomplete = "off";
        inp.setAttribute("aria-label", `Ligne ${r + 1}, colonne ${c + 1}`);
        inp.onfocus = () => highlight(wordAt(r, c, dir) || wordAt(r, c, dir === "right" ? "down" : "right"));
        inp.onclick = () => {
          const other = dir === "right" ? "down" : "right";
          if (document.activeElement === inp && wordAt(r, c, other)) { dir = other; highlight(wordAt(r, c, dir)); }
        };
        inp.oninput = () => {
          inp.value = inp.value.toLowerCase().slice(-1);
          el.classList.remove("bad", "ok");
          if (!inp.value) return;
          const [nr, nc] = dir === "right" ? [r, c + 1] : [r + 1, c];
          if (inputs[key(nr, nc)]) inputs[key(nr, nc)].focus();
        };
        inp.onkeydown = (e) => {
          const moves = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
          if (moves[e.key]) {
            const [dr, dc] = moves[e.key];
            if (inputs[key(r + dr, c + dc)]) focusCell(r + dr, c + dc, dr ? "down" : "right");
            e.preventDefault();
          } else if (e.key === "Backspace" && !inp.value) {
            const [pr, pc] = dir === "right" ? [r, c - 1] : [r - 1, c];
            if (inputs[key(pr, pc)]) { inputs[key(pr, pc)].value = ""; inputs[key(pr, pc)].focus(); }
          }
        };
        inputs[key(r, c)] = inp;
        el.appendChild(inp);
      }
      board.appendChild(el);
    }));
  }

  $("check").onclick = () => {
    let filled = 0, wrong = 0, total = 0;
    grid.cells.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.t !== "L") return;
      total++;
      const inp = inputs[key(r, c)];
      const el = inp.parentElement;
      el.classList.remove("bad", "ok");
      if (!inp.value) return;
      filled++;
      if (inp.value === cell.a) el.classList.add("ok"); else { el.classList.add("bad"); wrong++; }
    }));
    $("status").textContent = wrong === 0 && filled === total ? "Sa7a ! Grille terminée 🎉"
      : `${filled - wrong}/${total} lettres justes`;
  };

  $("clear").onclick = () => renderGrid(grid);

  openLevel("facile");
})();
