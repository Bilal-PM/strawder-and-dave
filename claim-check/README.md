# Claim Check: an offline checker for AI answers

Paste an AI-generated answer, such as a CFO summary, board paper or analysis. The tool marks up which parts are **wrong**, **doubtful** or **need a human check**, and gives a claim-by-claim verdict.

- **Standalone.** It's one HTML file with no dependencies, no AI model, no API calls and no install. Open `index.html` in any browser, or email it to someone.
- **Private.** A Content-Security-Policy blocks all network access, so confidential figures never leave the browser.
- **Evergreen.** It doesn't depend on any AI model, version or provider, and the knowledge that can age is user-editable (see below).

## What it checks

| Layer | What it catches |
|---|---|
| **Maths** | % changes, margins, leverage, current ratio, interest cover, CAGR, "X of Y (P%)", "15% of £10m is …", written-out sums ("£2m + £3m = £6m"), totals, splits over 100%, "doubled/halved". It allows for rounding. |
| **Internal consistency** | The same metric with two values, "rose" when figures fell, wrong year spans, impossible dates, wrong weekdays, future periods in the past tense. |
| **Source tracing** (tab 2) | Every figure must be in your source or calculable from two source figures. It catches a figure attached to the **wrong item** (e.g. the net debt number quoted as cash), names not in the source, and sentences that flip the source's direction. For each unsupported figure it shows the closest source line. |
| **Self-consistency** (tab 3) | Paste 2–3 regenerations of the same question. Figures, names and whole points that don't come back are flagged. |
| **Your rules** (tab 4) | Known facts, withdrawn terms (with effective dates), new standards, banned phrases. |
| **Built-in knowledge** | Real, invented and withdrawn IFRS / IAS / FRS / ISA (e.g. IAS 17 → IFRS 16), Companies Act 2006 section range, LIBOR → SONIA/SOFR, and IAS 1 → IFRS 18 from 1 Jan 2027. It also flags references, studies, "according to X", "studies show…", unsourced benchmarks and absolute language. |

The **claim-by-claim** table puts every check-worthy sentence (filler and headings are skipped) into one bucket: Verified, Wrong, Doubtful, Needs checking or Not checked. "Can't verify" is never counted as true.

## Keeping it up to date

The checks themselves (arithmetic, consistency, source tracing, cross-answer agreement) don't age. Only reference knowledge does, and the tool handles that in three ways:

1. **Dated rules.** A change with an effective date (e.g. IFRS 18 replacing IAS 1 from 2027-01-01) is shown as "being replaced" before that date and "replaced" after it, judged against today's date. Nobody has to remember to update it.
2. **Your rules tab.** No code needed:
   ```
   fact: Corporation tax main rate is 25%
   withdrawn: LIBOR -> SONIA | from 2023-07-01
   valid: IFRS 20
   flag: guaranteed returns | error | Never promise guaranteed returns
   ```
   Save the rules to a file and share it, so a whole team uses the same rules.
3. **Staleness warning.** When the built-in standards list is more than a year old, the report says so whenever it relies on it.

## Limits

It can't confirm facts about the outside world (e.g. whether a survey really said 68%). It puts those on a reviewer checklist instead. No flags doesn't mean the answer is correct.

## Prior work it learned from (ideas only, no code copied)

| Project | Licence | Idea used here |
|---|---|---|
| Self-consistency research: SelfCheckGPT (2023), semantic entropy (Nature 2024), UQLM (2026) | MIT / Apache-2.0 | Invented details vary between regenerations. Best-match agreement per claim, averaged over answers. |
| FActScore, Loki (OpenFactVerification) | MIT | Split into claims, score only decidable claims, never count unverifiable as true. |
| factool | Apache-2.0 | Re-compute every written-out calculation. |
| RefChecker (Amazon) | Apache-2.0 | Entailment / neutral / contradiction. A real number attached to the wrong subject is a contradiction. |
| ClaimBuster | GPL-3.0 (no code used) | Which sentences are check-worthy (numbers, money, comparatives vs opinion words). |
| Full Fact stat-claim spotter | MIT | Statistical-claim cues. Ignore label numbers like "Article 37". |
| LettuceDetect / TinyLettuce, MiniCheck, Vectara HHEM | MIT / Apache-2.0 | Possible future **optional** local AI model add-on (17–68M parameters). Left out to keep the file small and standalone. |

## Tests

```
node claim-check/tests/engine.test.mjs
```

The tests load the engine directly out of `index.html`, so they always test the shipped code. 25 tests cover every check above, plus clean-text cases that must produce no flags.
