# 11 — Commit Convention & RFQ Sequence

> The single source of truth for how commits are numbered and formatted in
> Rafeeq — for anyone (you, the team, or Kiro) working on this repo.
> **اقرأ هذا الملف قبل أي كوميت.**

---

## ✅ Canonical format (from `RFQ-350` onward)

```
[RFQ-<n>] <type>(<scope>): <concise summary in English>

- optional detail line
- optional detail line
```

**Rules:**

1. **`RFQ-<n>`** is a strictly increasing integer — **+1 for every meaningful
   commit** (feature / fix / docs / chore). **No gaps. No reuse. No going back.**
2. **Type**: one of `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `perf` · `ci`.
3. **Scope**: the area touched — e.g. `pricing`, `ads`, `security`, `admin`, `student`, `driver`, `shared`, `docs`.
4. **Summary**: imperative, English, ≤ ~70 chars on the first line.
5. `RFQ-2026-#####` is a **different** thing (a CliQ payment reference) — unrelated to commit numbering.

**Examples:**

```
[RFQ-350] chore(security): force HTTPS in prod + lock security headers with a test
[RFQ-351] feat(ai): GPT-powered smart destination suggestions on student home
[RFQ-352] fix(wallet): guard double capture on concurrent boarding confirmations
```

---

## 🔢 The single next number

- **Last used: `RFQ-350`.**
- **Next commit MUST be: `RFQ-351`.**
- Before committing: take the last used number, add 1. Update the tracker in
  [01-MASTER-PLAN](./01-MASTER-PLAN.md) when a phase/part is finished.

---

## 🗺️ Historical map (why the numbers look the way they do)

The project pre-dates this convention, so the published history contains three
eras. **Published/merged commits are NOT rewritten** — rewriting them needs a
`force-push` to `main`, which corrupts every clone and breaks the 44 merged
pull requests. This table is the authoritative reconciliation instead:

| Era | Commits | Format | Notes |
|-----|---------|--------|-------|
| **1 — Foundation** | `RFQ-111 … RFQ-295` | English `[RFQ-n] type(scope): …` | Original clean convention. |
| **2 — Re-platform (Stitch)** | `RFQ-323 … RFQ-349` | Arabic `RFQ-n — وصف` | Interim era during the full redesign. A numbering slip mapped 293/294/295 → **323/324/325** (see below); a few numbers (328, 338, 340) were consumed by squashed/folded work, leaving harmless gaps. |
| **3 — Canonical (current)** | `RFQ-350 →` | English `[RFQ-n] type(scope): …` | **Returns to Era-1 style.** Strict sequential, no gaps. |

**The 293→323 slip (documented, not rewritten):**

| Commit in history | Shown as | Canonical number |
|-------------------|----------|------------------|
| Stitch design tokens | RFQ-293 | **RFQ-323** |
| Student nav shell | RFQ-294 | **RFQ-324** |
| Student home + logo | RFQ-295 | **RFQ-325** |

From `RFQ-326` the sequence is continuous. Gaps at 328/338/340 are intentional
(those numbers were burned by folded commits) and will **not** be reused.

---

## Why we don't rewrite history

Rewriting merged commits requires `git push --force` on `main`. That:

- rewrites every downstream SHA, so every existing clone/PR breaks;
- invalidates the 44 merged pull-request records;
- is a destructive operation we never run on a shared branch.

Instead, the convention is **forward-clean**: this document maps the past, and
every commit from `RFQ-350` follows the canonical English format with strict
sequential numbering. This gives a clean, professional, fully-documented result
without risking the repository.
