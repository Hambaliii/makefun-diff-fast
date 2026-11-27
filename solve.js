// makefun-diff 1.0.0 — dependency-free ES module.
// run({ old, new }) returns the exact patch makefun-diff 1.0.0 returns.
//
// Lines are cut after every "\n" (a "\r" is part of its line); a last line
// with no "\n" is a line too. The empty text has no lines; "\n" has one
// (empty) line. Two lines are equal only when identical as code units,
// newline presence included.

function splitText(t) {
  if (t.length === 0) return { parts: [], count: 0 };
  const parts = t.split('\n');
  const trailing = t.charCodeAt(t.length - 1) === 10;
  return { parts, count: trailing ? parts.length - 1 : parts.length };
}

// Does old line i equal new line j? (content + newline presence)
function lineEq(o, i, n, j) {
  return o.parts[i] === n.parts[j] && (i < o.parts.length - 1) === (j < n.parts.length - 1);
}

function myers(a, b) {
  const n = a.length;
  const m = b.length;
  const rows = [];
  // d = 0, k = 0: snake from (0, 0).
  let cur = new Int32Array(1);
  let x = 0;
  while (x < n && x < m && a[x] === b[x]) x++;
  cur[0] = x;
  rows.push(cur);
  if (x === n && x === m) return { rows, D: 0 };
  for (let d = 1; d <= n + m; d++) {
    const prev = rows[d - 1];
    cur = new Int32Array(2 * d + 1);
    cur.fill(-1);
    let done = false;
    for (let k = -d; k <= d; k += 2) {
      const idx = k + d;
      let xDel = -1;
      let xIns = -1;
      // Deletion: one old line past furthest (d-1)-point on diagonal k-1.
      if (k > -d) {
        const px = prev[k + d - 2];
        if (px >= 0 && px < n) xDel = px + 1;
      }
      // Insertion: one new line past furthest (d-1)-point on diagonal k+1.
      if (k < d) {
        const px = prev[k + d];
        if (px >= 0) {
          const py = px - (k + 1);
          if (py < m) xIns = px;
        }
      }
      let xx;
      if (xDel >= 0 && (xIns < 0 || xDel >= xIns)) xx = xDel; // deletion wins ties
      else if (xIns >= 0) xx = xIns;
      else continue; // unreachable on this diagonal
      let y = xx - k;
      while (xx < n && y < m && a[xx] === b[y]) { xx++; y++; }
      cur[idx] = xx;
      if (xx === n && y === m) done = true;
    }
    rows.push(cur);
    if (done) return { rows, D: d };
  }
  // Unreachable: n + m edits always suffice.
  return { rows, D: n + m };
}

// Backtrack from (n, m) at depth D using the stored rows. Ops: 0 keep, 1 del, 2 ins.
// The pre-snake point at depth d is the candidate the forward pass chose
// (recomputed from V[d-1] with the same tie-break and validity rules), NOT
// found by walking back over equal lines: with repeated lines that walk
// overshoots the snake's start and scrambles the script.
function backtrack(a, b, rows, D) {
  const n = a.length;
  const m = b.length;
  const ops = [];
  let x = n;
  let y = m;
  for (let d = D; d >= 1; d--) {
    const k = x - y;
    const prev = rows[d - 1];
    let xDel = -1;
    let xIns = -1;
    if (k > -d) {
      const px = prev[k + d - 2];
      if (px >= 0 && px < n) xDel = px + 1;
    }
    if (k < d) {
      const px = prev[k + d];
      if (px >= 0) {
        const py = px - (k + 1);
        if (py < m) xIns = px;
      }
    }
    let xc;
    let isDel;
    if (xDel >= 0 && (xIns < 0 || xDel >= xIns)) { xc = xDel; isDel = true; }
    else { xc = xIns; isDel = false; }
    // The depth-d snake ran from (xc, xc - k) to (x, y): those are keeps.
    while (x > xc) { ops.push(0); x--; y--; }
    if (isDel) { ops.push(1); x--; }
    else { ops.push(2); y--; }
  }
  while (x > 0 && y > 0) { ops.push(0); x--; y--; }
  ops.reverse();
  return ops;
}

export function run(input) {
  const oldText = input.old;
  const newText = input.new;
  const o = splitText(oldText);
  const nw = splitText(newText);
  const oldCount = o.count;
  const newCount = nw.count;

  // Longest common prefix, then longest common suffix of what is left.
  let p = 0;
  while (p < oldCount && p < newCount && lineEq(o, p, nw, p)) p++;
  let s = 0;
  while (
    s < oldCount - p && s < newCount - p &&
    lineEq(o, oldCount - 1 - s, nw, newCount - 1 - s)
  ) s++;

  const n = oldCount - p - s;
  const m = newCount - p - s;

  // Hash the middle lines to integer ids. Lines without "\n" live in a
  // separate map from lines with "\n": "foo" and "foo\n" never share an id.
  const mapNL = new Map();
  const mapNoNL = new Map();
  let nextId = 0;
  const a = new Int32Array(n);
  const b = new Int32Array(m);
  for (let i = 0; i < n; i++) {
    const idx = p + i;
    const hasNL = idx < o.parts.length - 1;
    const map = hasNL ? mapNL : mapNoNL;
    const key = o.parts[idx];
    let id = map.get(key);
    if (id === undefined) { id = nextId++; map.set(key, id); }
    a[i] = id;
  }
  for (let j = 0; j < m; j++) {
    const idx = p + j;
    const hasNL = idx < nw.parts.length - 1;
    const map = hasNL ? mapNL : mapNoNL;
    const key = nw.parts[idx];
    let id = map.get(key);
    if (id === undefined) { id = nextId++; map.set(key, id); }
    b[j] = id;
  }

  // Middle edit script.
  let midOps;
  if (n === 0 && m === 0) {
    midOps = [];
  } else {
    const { rows, D } = myers(a, b);
    midOps = backtrack(a, b, rows, D);
  }

  // Full op list: prefix keeps, middle ops, suffix keeps.
  const total = p + midOps.length + s;
  const ops = new Uint8Array(total);
  ops.fill(0, 0, p);
  ops.set(midOps, p);
  ops.fill(0, p + midOps.length, total);

  // Totals.
  let deleted = 0;
  let inserted = 0;
  for (let i = 0; i < total; i++) {
    if (ops[i] === 1) deleted++;
    else if (ops[i] === 2) inserted++;
  }

  // Change runs: maximal runs of non-keep ops.
  const runs = [];
  let i = 0;
  while (i < total) {
    if (ops[i] === 0) { i++; continue; }
    const start = i;
    while (i < total && ops[i] !== 0) i++;
    runs.push([start, i]);
  }

  // Group runs into hunks: runs with at most 6 kept lines between them
  // share a hunk; each hunk extends up to 3 kept lines around its runs.
  const hunks = [];
  for (let r = 0; r < runs.length; r++) {
    let first = r;
    let last = r;
    while (last + 1 < runs.length && runs[last + 1][0] - runs[last][1] <= 6) last++;
    r = last;
    const hStart = Math.max(0, runs[first][0] - 3);
    const hEnd = Math.min(total, runs[last][1] + 3);
    hunks.push([hStart, hEnd]);
  }

  // Render. A line that ends its file without a newline is written with
  // one and followed by a "%" line.
  const out = [];
  out.push(
    `makefun-diff/1 old=${oldCount} new=${newCount} hunks=${hunks.length} ` +
    `deleted=${deleted} inserted=${inserted}\n`,
  );
  let oi = 0; // old lines consumed by the walk so far
  let ni = 0; // new lines consumed by the walk so far
  let walk = 0; // op index reached by the walk so far
  for (const [hStart, hEnd] of hunks) {
    // Advance the line pointers to the hunk start.
    while (walk < hStart) {
      if (ops[walk] === 0) { oi++; ni++; }
      else if (ops[walk] === 1) oi++;
      else ni++;
      walk++;
    }
    const oldBefore = oi;
    const newBefore = ni;
    let ol = 0;
    let nl = 0;
    for (let t = hStart; t < hEnd; t++) {
      if (ops[t] === 0) { ol++; nl++; }
      else if (ops[t] === 1) ol++;
      else nl++;
    }
    out.push(`@ ${oldBefore + 1} ${ol} ${newBefore + 1} ${nl}\n`);
    while (walk < hEnd) {
      const op = ops[walk];
      if (op === 0) {
        const hasNL = oi < o.parts.length - 1;
        out.push('=', o.parts[oi], hasNL ? '\n' : '\n%\n');
        oi++; ni++;
        walk++;
      } else {
        // A run of changes: list its deletions, then its insertions.
        let t = walk;
        while (t < hEnd && ops[t] !== 0) t++;
        for (let u = walk; u < t; u++) {
          if (ops[u] !== 1) continue;
          const hasNL = oi < o.parts.length - 1;
          out.push('-', o.parts[oi], hasNL ? '\n' : '\n%\n');
          oi++;
        }
        for (let u = walk; u < t; u++) {
          if (ops[u] !== 2) continue;
          const hasNL = ni < nw.parts.length - 1;
          out.push('+', nw.parts[ni], hasNL ? '\n' : '\n%\n');
          ni++;
        }
        walk = t;
      }
    }
  }

  return out.join('');
}
