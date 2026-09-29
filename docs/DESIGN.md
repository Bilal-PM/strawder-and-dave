# LINESIDE · The Kestrel Vale Line: game design

## The pitch

Harrowby's branch line closed "temporarily" in 2009. The track is worn out, and the only train, **Ruby**, a 1961 diesel railcar, has been standing in the depot ever since. You're the project lead brought in to reopen the line: renew the track, restore the train, test it all, open the railway, and watch a valley town come back to life.

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
| 1 | **Make the Case** ✅ | Feasibility & funding | Induction, track walk (judge 5 defects), Ruby's health check, works-plan sequencing & critical path, community drop-in, Funding Panel gate review | Optimism bias; ranges not dates; honesty with the public |
| 2 | **Strip Down** | Mobilisation | Ruby comes apart (surprises inside), ecology survey vs nesting season, booking the first possession, procurement of wheelsets | Scope creep; supplier risk; the first echoes land (the mug, the poster, the lorries) |
| 3 | **The Relay** | Track renewal | Drainage first, then sleepers, rail and ballast; the tamper ("Tina"); weather windows; quality hold points | Pressure to cut corners when behind; stopping the job |
| 4 | **Crossing Lines** | Level crossing & junction | Crag Lane crossing design with the council and regulator; the school safety talk; the main-line junction tie-in during a short possession | Stakeholders with a veto; the one interface you can't get wrong |
| 5 | **First Movement** | Testing & commissioning | Static tests in the depot, the first movement, test runs, driver training, the horn finally works | "Green" status reports that aren't; declaring "done" honestly |
| 6 | **The Big Day** | Grand opening & handover | Opening-day logistics, the brass band, the ribbon; handover to the operator; the economy returns (shops reopen, June's Ruby buns) | Credit, fairness and lessons learned; Moira's story completes |

The chapter structure mirrors a real project lifecycle and gate process (feasibility → mobilisation → delivery → integration → commissioning → handover).

## Chapter 1 in detail (built)

**Flow and gating** (`PACK.c1.tasks`):

```
cold open (Sunday) ─> Monday: Helen's first question
induction ─┬─> track walk ──┬───────────────────────────────> drop-in ─────┐
           └─> health check ┴─> works plan ─> forecast Call ─> date Call ─┴─> Funding Panel
```

- **Cold open** (`c1.coldOpen`): Sunday at dawn, the depot door open a crack, three torch-lit finds (Ruby under a dust sheet, a warm flask, one clean cab window), then Moira: "That's my tea." An ungraded first impression, her advice ("Look before you promise"), then Monday on the platform with Helen and the first graded judgment: "So… can we open by next summer?"
- **Induction** (Hannah) gives you PPE, which opens "on or near the line" (within 3 m of the rails, including the depot siding) and the depot. On the line you work under Tom's safe system of work. Beyond the junction stop board is the live main line, which stays closed. The collision grid enforces it; the level crossing is always public.
- **Track walk** (Tom): five defects on the line, each judged with three graded options.
- **Health check** (Gaz): five areas of Ruby (including possible asbestos, an air horn with an empty tank, structural rust and accessibility), with fun follow-ups (the horn, Kevin the pigeon), a hint that someone has been secretly maintaining her, and then one decision (`c1.healthDecision`): what to do first the week the money lands.
- **Works plan** (Jo): order two lanes of cards by dependency, then answer two questions on test-run timing and the critical path. Counting from the start on site (programme week 9): the track takes 28 weeks against Ruby's 20, so Ruby has 8 weeks of float. Grey rows (`plan.background`) show what isn't on the board: designs, approvals and the junction booking before, and 10 weeks of test runs, driver training, trial running and sign-off after.
- **Drop-in** (Priya and Cllr Brian), after the track walk: four resident questions (the mug, the crossing, lorries, night working). Honest answers build support; over-promises create **echoes** for Chapter 2.
- **Calls**: *The Ridership Forecast* (independent check and a range) and *Name the Date* (a range, narrowed at each stage), each with a confidence rating.
- **Funding Panel**: your case on one page (track, train, plan, forecast, date, community, safety and approvals), three panel questions (contingency, the biggest risk to the date, and where the train goes and who runs it), then a readiness score out of 100: **≥75 Approved to proceed** (the £4.8M released stage by stage, plus £100k of funder's risk allowance), **50–74 Approved with conditions** (naming your weakest area), **<50 Deferred** (−4 weeks of float). The outcome carries into Chapter 2.
- **Time passes**: six weeks with changing light and weather as tasks complete.

**Scoring**

| Decision | JP (best / ok / poor) |
|---|---|
| First conversation with each lead, and Helen's first question | 20 / 10 / 0 |
| The health-check decision | 20 / 10 / 0 |
| Each track defect | 30 / 15 / 0 |
| Each health-check area | 10 (for being thorough) |
| Works-plan sequence (first attempt) | up to 100, in proportion to cards placed correctly |
| Each plan question | 25 / 12 / 0 |
| Each drop-in answer | 30 / 10 / 0 |
| Each Call | 100 / 60 / 20, plus a calibration bonus of up to +20 or down to −20 |
| Each panel question | 25 / 10 / 0 |
| Panel outcome | 100 / 50 / 0 |

Ranks: Graduate PM (0) → Assistant PM (200) → Project Manager (500) → Senior PM (800) → Programme Director (1600). Excellent play in Chapter 1 reaches Senior PM; Programme Director needs the whole game.

**Achievements (13)**: Kettle's On, Peep Peep, Pigeon Whisperer, Where's Sleeper?, Eagle Eye, Order, Order!, Biscuit Diplomacy, Measure Twice, Home on the Range, Local Knowledge, Anorak, First Page, Green Light. They persist across playthroughs; hints show for locked ones.

## The Director (unpredictability)

A small, rule-based "AI director" (in `game.js`, with data in `PACK.c1.events`) throws up to three surprises per chapter, drawn from a seeded random stream so every playthrough differs. Chapter 1 has nine events: the flood warning, the Gazette rumour, trespassers on the bridge, bargain wheelsets with no paperwork, an unpriced £60k, the main-line junction booking deadline, bats in Beck Bridge, a farmer's forgotten crossing, and scope creep from the sponsor. Each event has a `weight(S)` that reacts to the world: a wet week makes the flood event likely, low town support makes rumours likely, a weak level-crossing judgment makes trespass and the junction deadline likely, and thin evidence makes cost holes likely. Only the farmer's call can come straight after the induction, so the first surprise varies. Money and float follow the plan: only critical-path work (track, crossing, junction) costs weeks; delays on Ruby's lane cost money, because she has float. Events are graded decisions (JP 40/20/0); some carry `luck`, where the dice decide the outcome. The game then points out when a good decision got an unlucky result, or the other way round, because JP judge the decision, not the dice.

Why rules rather than a language model in the browser: a local model is a 1–4 GB download, runs slowly on phones and school laptops, can say things that are wrong about safety, and can't be graded consistently. A cloud-hosted AI coach for free-text debriefs is a possible later add-on, but it needs a server and content guardrails.

## Content rules

No real suppliers, infrastructure managers, operators, regulators or brands are named. Generic terms are used instead ("the national infrastructure manager", "the regulator", "a heritage railway").

## Cast

Names are deliberately ordinary and UK-relatable.

| Character | Role | Voice |
|---|---|---|
| Moira Kell | Harrowby's last station master, mentor | Dry, kind, never gives the answer. Secretly kept Ruby ticking over for 17 years |
| Helen Walsh | Director, Vale Transport Authority (sponsor) | Wants a poster date; warm underneath |
| Jo Adeyemi | Engineering lead | Sticky notes, coffee, precise |
| Tom Brennan | Track & site manager | 22 years on track; plain-spoken |
| Hannah Clarke | Safety lead | "I'd rather be annoying now than right at an inquiry later" |
| Steve Hale | Commercial manager | Deadpan about numbers |
| Priya Nair | Community & comms | Everyone has her mobile number |
| Gaz Whitfield | Depot fitter | Ruby's biggest fan |
| Cllr Brian Pike | Parish council chair | Biscuit protocol |
| Len, June, Dev, Jess | Townsfolk | Sceptical at first; hopeful as support grows |
| Sue Bennett, Raj Patel | Funding Panel | Money; difficult questions |
| Ruby, Sleeper, Kevin | Railcar, depot cat, pigeon | — |
