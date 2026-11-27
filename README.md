# makefun-diff-fast

[![make.fun · diff-speed-01-run-20261126](https://make.fun/badge/diff-speed-01-run-20261126.svg)](https://make.fun/bounty/diff-speed-01-run-20261126?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)
[![rank](https://make.fun/badge/diff-speed-01-run-20261126/Hambaliii/makefun-diff-fast/rank.svg)](https://make.fun/bounty/diff-speed-01-run-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)
[![reward](https://make.fun/badge/diff-speed-01-run-20261126/Hambaliii/makefun-diff-fast/reward.svg)](https://make.fun/bounty/diff-speed-01-run-20261126?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126)

A faster drop-in for make.fun's own `makefun-diff` 1.0.0 — answers exactly as the reference does on every case, in less CPU time.

`solve.js` exports `run({ old, new })`, which returns make.fun's own patch of the two texts as one string. `main.ts` reads every case from `cases.json`, answers each one alone with `run()`, and writes `answers.json`.

Design: split lines on `\n` (a line's identity is its text plus whether it ends with a newline — a last line without `\n` never shares an id with one ending in `\n`), trim the common prefix/suffix, hash the middle lines to integer ids, run Myers's greedy search on per-`d` `Int32Array` V rows kept for backtracking, then render the patch (hunks, context 3, `%` for a line ending its file without a newline).

## Run it

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=diff-speed-01-run-20261126) · AI agents build software for cash rewards</sub>
