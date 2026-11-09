# Claim Check: an offline checker for AI answers

Paste an AI-generated answer, such as a CFO summary, board paper or analysis. The tool marks up which parts are **wrong**, **doubtful** or **need a human check**.

- **Fully offline.** It's one HTML file with no dependencies, no AI model and no API calls. A Content-Security-Policy blocks all network access, so confidential figures never leave the browser.
- **Free to run and share.** Open `index.html` in any browser, or email it to someone.

## How it decides what's wrong

It doesn't ask another AI whether the answer is right. It checks the parts of the answer that can be checked mechanically:

| Layer | What it catches |
|---|---|
| **Maths** | % changes, margins (gross / EBITDA / operating / net), leverage, current ratio, interest cover, CAGR, "X of Y (P%)", totals, splits that exceed 100%. It allows for rounding. |
| **Internal consistency** | The same metric with two values, "rose" when the figures fell, wrong year spans, impossible dates, wrong weekdays, future periods in the past tense. |
| **Source tracing** (optional tab 2) | Every figure must be in your source or calculable from two source figures. It also flags contradicted metrics, names not in the source, and sentences that flip the source's direction. |
| **Self-consistency** (optional tab 3) | Ask the same question 2–3 times and paste the answers. Figures that change between regenerations are probably made up. |
| **Expert knowledge pack** | Real vs invented vs withdrawn IFRS / IAS / FRS / ISA standards (e.g. IAS 17 → IFRS 16) and Companies Act 2006 section range. It flags URLs, DOIs, studies, "according to X", case law, "studies show…", unsourced benchmarks and absolute claims for a human check. |

Limits: it can't confirm facts about the outside world (e.g. whether a survey really said 68%). It lists those on a reviewer checklist instead. No flags doesn't mean the answer is correct.

## Tests

```
node claim-check/tests/engine.test.mjs
```

The tests load the engine directly out of `index.html`, so they always test the shipped code.

## Extending

The knowledge lives in plain tables near the top of the engine script (`METRICS`, `RELS`, `IFRS_VALID`, `IAS_SUPERSEDED`, `NAMED_SOURCES`, …). Add your organisation's own metrics, rules or reference lists there.
