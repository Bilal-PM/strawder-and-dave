# LINESIDE · The Kestrel Vale Line: game design

## The pitch

Harrowby's branch line closed "temporarily" in 2009. The track is worn out, and the only train, **Marjorie**, a 1961 diesel railcar, has been standing in the depot ever since. You're the project lead brought in to reopen the line: renew the track, restore the train, test it all, open the railway, and watch a valley town come back to life.

It's a game about **judgment**: making good calls under uncertainty when goods compete and consequences are delayed. It's remixed from how real UK rail projects work (gate reviews, possessions, level crossing risk, optimism bias, critical paths), made fun, relatable and warm. The humour is never dark or rude.

## Design principles

1. **Go and see before you promise.** Every chapter makes you look at the real thing (the track, the train, the town) before you commit.
2. **Engineering logic is gameplay.** Work happens in a sequence, and the world enforces it: PPE for the closed line, no test runs before the track is relaid, no opening before the level crossing is signed off.
3. **Points that mean something.** A dashboard in real units (float in weeks, contingency in £k, town support %) is kept separate from **Judgment Points**, which reward decision quality and calibration, never luck.
4. **Consequences echo.** Promises made early come back in later chapters, so players learn to judge decisions, not outcomes.
5. **People change.** The team and the town start sceptical. Their attitudes move with how you treat them, and the town visibly revives as the line comes back.

## Chapters

| # | Chapter | Real-world phase | Core activities | Signature judgment |
|---|---|---|---|---|
| 1 | **Make the Case** ✅ | Feasibility & funding | Induction, track walk (judge 5 defects), Marjorie's health check, works-plan sequencing & critical path, community drop-in, Funding Panel gate review | Optimism bias; ranges not dates; honesty with the public |
| 2 | **Strip Down** | Mobilisation | Marjorie comes apart (surprises inside), ecology survey vs nesting season, booking the first possession, procurement of wheelsets | Scope creep; supplier risk; the first echoes land (the mug, the poster, the lorries) |
| 3 | **The Relay** | Track renewal | Drainage first, then sleepers, rail and ballast; the tamper ("Tina"); weather windows; quality hold points | Pressure to cut corners when behind; stopping the job |
| 4 | **Crossing Lines** | Level crossing & junction | Crag Lane crossing design with the council and regulator; the school safety talk; the main-line junction tie-in during a short possession | Stakeholders with a veto; the one interface you can't get wrong |
| 5 | **First Movement** | Testing & commissioning | Static tests in the depot, the first movement, test runs, driver training, the horn finally works | "Green" status reports that aren't; declaring "done" honestly |
| 6 | **The Big Day** | Grand opening & handover | Opening-day logistics, the brass band, the ribbon; handover to the operator; the economy returns (shops reopen, June's Marjorie buns) | Credit, fairness and lessons learned; Moira's story completes |

The chapter structure mirrors a real project lifecycle and gate process (feasibility → mobilisation → delivery → integration → commissioning → handover).

## Chapter 1 in detail (built)

**Flow and gating** (`PACK.c1.tasks`):

```
induction ─┬─> track walk ──┐
           └─> health check ┴─> works plan ─> forecast Call ─> date Call ─┐
drop-in (any time) ───────────────────────────────────────────────────────┴─> Funding Panel
```

- **Induction** (Hannah) gives you PPE, which opens the trackbed and the depot. The collision grid enforces it.
- **Track walk** (Tom): five defects on the line, each judged with three graded options.
- **Health check** (Gaz): five areas of Marjorie, with fun follow-ups (the horn, Kevin the pigeon) and a hint that someone has been secretly maintaining her.
- **Works plan** (Jo): order two lanes of cards by dependency, then answer two questions on test-run timing and the critical path (track: 20 weeks against Marjorie's 16, so Marjorie has 4 weeks of float).
- **Drop-in** (Priya and Cllr Brian): three resident questions. Honest answers build support; over-promises create **echoes** for Chapter 2.
- **Calls**: *The Ridership Forecast* (independent check and a range) and *Name the Date* (a range, narrowed at each stage), each with a confidence rating.
- **Funding Panel**: your case on one page (track, train, plan, forecast, date, community), two panel questions, then a readiness score out of 100: **≥75 Approved** (plus £100k risk allowance), **50–74 Approved with conditions** (naming your weakest area), **<50 Deferred** (−4 weeks of float). The outcome carries into Chapter 2.
- **Time passes**: six weeks with changing light and weather as tasks complete.

**Scoring**

| Decision | JP (best / ok / poor) |
|---|---|
| First conversation with each lead | 20 / 10 / 0 |
| Each track defect | 30 / 15 / 0 |
| Each health-check area | 10 (for being thorough) |
| Works-plan sequence (first attempt) | up to 100, in proportion to cards placed correctly |
| Each plan question | 25 / 12 / 0 |
| Each drop-in answer | 30 / 10 / 0 |
| Each Call | 100 / 60 / 20, plus a calibration bonus of up to +20 or down to −20 |
| Each panel question | 25 / 10 / 0 |
| Panel outcome | 100 / 50 / 0 |

Ranks: Graduate PM (0) → Assistant PM (200) → Project Manager (500) → Senior PM (800) → Programme Director (1600). Excellent play in Chapter 1 reaches Senior PM; Programme Director needs the whole game.

**Achievements (13)**: Kettle's On, Peep Peep, Pigeon Whisperer, Where's Sleeper?, Eagle Eye, Order Order!, Biscuit Diplomacy, Measure Twice, Range Rover, Local, Anorak, First Page, Green Light. They persist across playthroughs; hints show for locked ones.

## Cast

Names are deliberately ordinary and UK-relatable.

| Character | Role | Voice |
|---|---|---|
| Moira Kell | Harrowby's last station master, mentor | Dry, kind, never gives the answer. Secretly kept Marjorie ticking over for 17 years |
| Helen Walsh | Director, Vale Transport Authority (sponsor) | Wants a poster date; warm underneath |
| Jo Adeyemi | Engineering lead | Sticky notes, coffee, precise |
| Tom Brennan | Track & site manager | 22 years on track; plain-spoken |
| Hannah Clarke | Safety lead | "I'd rather be annoying now than right at an inquiry later" |
| Steve Hale | Commercial manager | Deadpan about numbers |
| Priya Nair | Community & comms | Everyone has her mobile number |
| Gaz Whitfield | Depot fitter | Marjorie's biggest fan |
| Cllr Brian Pike | Parish council chair | Biscuit protocol |
| Len, June, Dev, Jess | Townsfolk | Sceptical at first; hopeful as support grows |
| Sue Bennett, Raj Patel | Funding Panel | Money; difficult questions |
| Marjorie, Sleeper, Kevin | Railcar, depot cat, pigeon | — |
