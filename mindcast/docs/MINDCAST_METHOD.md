# The Mindcast method

A Mindcast carries one real railway mechanism across to leadership and delivery. It works by shared structure: the same pattern of cause, constraint and effect on both sides. It does not work by shared words. "Our project is off the rails" shares a word with the railway and nothing else. "A rail that is stopped from expanding stores the force instead, and the force comes out sideways at the weakest point" shares a structure with a team that is told it may not raise problems.

This document defines the six steps, the reasoning behind them, and the automatic integrity check the app runs on every Mindcast (seed content and user-written ones).

## 1. What the science says, and what we take from it

Source: Keith J. Holyoak, *The Human Edge: Analogy and the Roots of Creative Intelligence* (MIT Press, 2025). Paraphrased, not quoted. The book is open access under CC BY-NC-ND; we read it to inform design only. Chapter numbers below refer to that book. The text we could read covered chapters 1 to 4 in full; later chapters (7 "Communicating with Relations", 8 "Teaching with Analogy") are listed for further reading and are not relied on here.

| Finding | Where | What it means for a Mindcast |
|---|---|---|
| An analogy is a comparison where the source and target are known to be different things, and the comparison rests at least partly on explicit relations between entities, not just on features of the entities. | Ch. 1 | Every mapping pair must state a relation (holds, causes, prevents, builds up), not just an object ("rail = team"). |
| People judge similarity from two separate pools: entity similarity (what things look like) and relational similarity (how things act on each other). Entity similarity is processed first and is the default under time pressure, anxiety or a busy mind. Rich, detailed objects pull attention towards entity matches. | Ch. 2 | Keep the railway picture plain and the relation loud. Puns and railway vocabulary in the target side pull readers towards surface matches, which is exactly what we do not want. Hence the surface-only warning and the cliché check. |
| In evidential analogy, causal relations are the "cement". A credible inference needs (1) some prior similarity, (2) causal overlap: known causes in the source that correspond to known elements of the target, of the same general type, and (3) adjustment for causal differences: factors present on one side and absent on the other. This is Holyoak's generalisation of the philosopher Mary Hesse's conditions. | Ch. 3 | Step 2 (Mechanism) must name the cause, the constraint and the effect. Step 4 (Limits) is condition 3 made compulsory. |
| Many teaching analogies are evocative, not evidential: the mapping is coherent but the underlying causes are of a different type (the factory as a model of a cell). Evocative analogies can still help people think, but they are not evidence. "Reality trumps analogy." | Ch. 1, 3 | Steel and people are not the same kind of cause. Most Mindcasts are evocative. They give leaders a better question to ask, not proof. The Limits step must say so plainly when the causal type differs. |
| A psychologically coherent analogy approximates a one-to-one mapping, keeps relations consistent (if A holds B on one side, the matched A' holds B' on the other), maximises similarity, and focuses on what is relevant to the reader's goal. | Ch. 4 (multiconstraint theory) | Mapping pairs must be one-to-one and structurally consistent. If "rail" maps to "team" in pair 1, it cannot map to "budget" in pair 2. |
| Adults can only integrate about three, at most four, relations at once without external aids. | Ch. 4 | Two to four mapping pairs. Never more than four. |
| Good mappings make differences easier to see: you can only state a meaningful difference between things you have first aligned. | Ch. 4 | A strong mapping should make the Limits step easy to write. If Limits is hard to write, the mapping is probably weak. |
| People often fail to retrieve a useful far analogy on their own. Comparing two analogous cases and writing down what they share produces an abstract schema, and people with a good schema transfer it far better, even a week later. A stated principle helps, but only when there are two cases to compare. Ordering examples from easy (shared objects and relations) to hard (shared relations only) helps further. | Ch. 4 | Step 5 (Principle) is the schema, stated in one plain sentence. The app should pair each Mindcast with a second case that shares the principle (a second railway mechanism, or the learner's own example), and the season runs from near analogies to far ones. |

One idea comes from outside the chapters above: Dedre Gentner's structure-mapping theory (Gentner, 1983), which Holyoak's chapter 2 builds on through her cross-mapping studies. Its "systematicity" principle says people prefer mappings that carry a connected system of higher-order relations (a cause that produces an effect that in turn constrains something else) over a set of isolated matches. We use it in the mapping score: a pair that carries a chain of two relations counts for more than a pair that carries one.

## 2. The six steps

Each step maps to one field of the `Mindcast` type in `src/domain/types.ts`.

### Step 1. Observe (`observe`)
One real, specific, checkable railway fact. Somebody with the right book or a walk along the cess could confirm it.

- Include at least one of: a number with a unit, a named component, a condition (when, above, below, until).
- Write what happens, not what it means. No lesson yet.
- It must be true. Prefer "about" to a precise figure you cannot source, and prefer no number to a wrong number.
- Good: "On jointed track the gap at each rail joint is set by temperature: wide in winter, closed up tight on a hot day."
- Bad: "Railways have to deal with lots of challenges."

### Step 2. Mechanism (`mechanism`)
Why it happens, in engineering terms. Name three things:

1. **Cause**: the driver (heat, load, water, time, traffic).
2. **Constraint**: what resists or limits it (fastenings, ballast, a rule, a gap).
3. **Effect**: what happens when the cause beats the constraint, and where.

The reader should come away able to predict the failure, not just name it. This is Holyoak's causal-overlap condition: we can only carry across a cause we have actually stated.

### Step 3. Mapping (`mapping`)
Two to four pairs. Each pair is `{ railway, target }`, and each side is a relation, written as a short clause with a verb.

- Map relations, not objects. "Ballast → people" is an object pair and fails. "Ballast shoulders resist the rail moving sideways → slack in a plan resists a late change pushing the whole plan out of line" is a relation pair.
- Keep it one-to-one and consistent across pairs.
- At least one pair should carry a chain (cause leads to effect leads to consequence). That is where the analogy becomes useful rather than decorative.
- Do not reuse railway words on the target side. If the target needs the word "track" to make sense, the relation has not been carried across.

### Step 4. Limits (`limits`)
Where the analogy stops working. Every honest analogy has an edge.

- Name at least one causal difference: something that drives the railway case and has no match in the target, or the reverse.
- Say whether the causal type differs (steel obeys physics; people choose, adapt and remember).
- Where useful, say what that difference means in practice ("so check the people, not the plan").

### Step 5. Principle (`principle`)
The schema, in one plain sentence. Twenty-five words or fewer. No railway words, no slogans. It should still be true if you had never heard of a railway.

### Step 6. Action (`action`)
One thing the reader can do this week. Starts with a verb. Names a concrete object (a list, a meeting, a calendar entry, a question) and a size or time (one, three, by Friday, in your next stand-up). Not "reflect on", "be more", "embrace".

### What a Mindcast is not
- Not a pun. No railway idioms on the leadership side.
- Not a metaphor stretched to cover everything. Two to four relations, then stop.
- Not invented authority. Seed casts are "Groundwork editorial". Never a made-up person.

## 3. The integrity check

The app scores every Mindcast automatically. The score is a guide for the author, not a verdict. It is deterministic and runs on text only.

### 3.0 Normalisation
Before any rule:
1. Lowercase.
2. Replace curly quotes and apostrophes with straight ones; replace en and em dashes with a space.
3. Collapse whitespace.
4. Tokenise words with `/[a-z0-9]+(?:[-'][a-z0-9]+)*/g`. A "phrase match" means the phrase occurs with a word boundary at each end (`\b` on both sides of the escaped phrase).
5. Three match modes:
   - **Phrase match**: for any entry containing a space or a non-letter. The exact phrase, with a word boundary at each end.
   - **Inflection match**: for single words in the relation cues and the railway lexicons. The word itself plus an optional `-s`, `-es`, `-d`, `-ed` or `-ing`, allowing a doubled final consonant (`stopped`) or a dropped final `e` (`releasing`) and `-y` to `-ies`/`-ied`. So "train" matches "trains" but not "training"; "track" matches "tracks" but not "tracking".
   - **Prefix match**: for single-word cliché entries only. The word starts with the entry, so "derail" matches "derailed" and "derailment", "unlock" matches "unlocking".

Field groups used below:
- **Railway side**: `observe`, `mechanism`, every `mapping[i].railway`.
- **Target side**: `title`, every `mapping[i].target`, `principle`, `action`.
- `limits` straddles both and has its own rule.

### 3.1 Shared word lists
These live in code next to the checker (`src/domain/railway/cliches.ts` holds the cliché lists; the others can live in the checker module). They are listed here so the rules are complete.

**Relation cues** (a verb or connective that expresses how one thing acts on another). Inflection match for verbs, phrase match for connectives:
`cause, lead, leads to, result, give, take, send, return, need, use, cost, cover, guide, steer, pass, prevent, stop, allow, let, enable, force, push, pull, hold, resist, restrain, absorb, spread, transfer, carry, store, release, build, accumulate, grow, shrink, expand, contract, reduce, increase, raise, lower, limit, depend, trigger, protect, hide, mask, remove, add, replace, drain, block, clog, wear, weaken, strengthen, lock, free, slow, speed, delay, keep, lose, fail, break, buckle, settle, shift, move, act, react, compensate, balance, offset, absorb, feed, starve, warn, signal, detect, measure, reveal, outrun, exceed, overload, recover, restore, correct, match`
plus connectives: `because, so that, so, which means, until, unless, before, after, when, if, instead of, rather than, more, less, faster, slower, earlier, later`.

**Condition cues** (for specificity). Phrase match:
`when, if, unless, until, above, below, over, under, more than, less than, at least, at most, during, after, before, every, per, each, between, within, once`.

**Railway lexicon, strong** (words that only make sense on a railway). Inflection match:
`rail, railway, railhead, track, trackbed, sleeper, ballast, fishplate, cess, cant, tamp, tamping, tamper, stoneblower, stoneblowing, cwr, thermit, alumino, flash butt, pandrol, baseplate, chair screw, check rail, stock rail, switch blade, switch rail, crossing nose, turnout, s&c, catenary, pantograph, contact wire, dropper, ohle, locomotive, train, wagon, bogie, wheelset, flange, signaller, signal box, block section, track circuit, interlocking, possession, handback, lookout, permanent way, formation, sub-grade, subgrade, catchpit, adjustment switch, stressing, tensor, gauge corner`.

**Railway lexicon, weak** (common English words that are also railway words): `line, points, signal, station, platform, junction, siding, buffer, gauge, brake, switch, crossing, weld, tension, sleeper`. Phrase match on the noun forms.

**Vague action verbs** (fail the action rule if present). Phrase match:
`reflect on, think about, consider, be more, be less, embrace, strive, aim to, try to, remember to, keep in mind, foster, cultivate, explore, focus on being, commit to being, lean into`.

**Concrete artefacts** (things you can point at): `list, note, notes, meeting, stand-up, standup, calendar, diary, email, message, board, log, register, plan, programme, review, chart, checklist, question, conversation, one-to-one, 1:1, agenda, minutes, walk, document, sheet, spreadsheet, timer, slot, column, risk, action, decision`.

**Time or size markers**: any digit; number words `one, two, three, four, five, ten, twenty, thirty`; `today, tomorrow, this week, by friday, monday, tuesday, wednesday, thursday, friday, next meeting, next stand-up, each day, every day, daily, per day`.

### 3.2 The six checks

Each check produces points. The total is out of 100.

**(a) Specificity, 20 points.** Text: `observe` + `mechanism`.
- `n` = count of distinct numeric tokens (contain a digit), capped at 2.
- `c` = count of distinct railway lexicon terms (strong and weak) found, capped at 3.
- `k` = count of distinct condition cues found, capped at 2.
- Raw = `n + c + k` (0 to 7). Points = `round(20 × raw / 7)`.
- **Pass** if `c ≥ 2` and (`n ≥ 1` or `k ≥ 2`).
- Note shown to author on fail: "Name the component, add a number or a condition."

**(b) Relational mapping, 25 points.** Text: `mapping[]`.
- A pair is **relational** if both `railway` and `target` have at least 5 words and each contains at least one relation cue.
- A side is **chained** if it contains at least two relation cues (counted as distinct cue occurrences, not distinct words).
- A pair is **systematic** if it is relational and at least one side is chained.
- Also flag **inconsistency**: if the same target noun phrase (first noun after the verb is too hard; use the first 2-word sequence of the `target` side) is reused by two pairs whose railway sides start with different words, raise a soft warning only (no points lost).
- `r` = relational pairs, `s` = systematic pairs, `total` = number of pairs.
- Points: `r = 0 or 1` → 0; `r = 2` → 15; `r ≥ 3` → 20; plus 5 if `s ≥ 1`. Minus 5 if `total > 4` (too many to hold in mind).
- **Hard fail** if `r < 2`.

**(c) Surface-only warning, 10 points.** Text: target side (`title` excluded, since titles may name the railway topic; `limits` excluded).
- `strong` = strong railway lexicon hits in `mapping[].target`, `principle`, `action`.
- `weak` = weak lexicon hits in the same fields.
- `surface = strong + floor(weak / 2)`.
- Additionally, for each pair whose `railway` side has no relation cue but whose `target` contains a railway word, add 1 to `surface`.
- Points: `surface = 0` → 10; `1` → 5; `≥ 2` → 0. Show a warning for every hit, naming the word and the field.

**(d) Cliché hits, 15 points.**
- `railwayIdioms` (prefix match for single words, phrase match otherwise) are matched in `title`, `mapping[].target`, `limits`, `principle`, `action`.
- `slopPhrases` are matched in every field.
- `h` = total hits (each occurrence counts).
- Points: `max(0, 15 − 5h)`.
- **Hard fail** if `h ≥ 3`.

**(e) Limits stated, 15 points.** Text: `limits`.
- `w` = word count. Needs `w ≥ 15`.
- Needs at least one contrast marker: `but, unlike, whereas, except, however, does not, doesn't, cannot, can't, no equivalent, not the same, differs, breaks, fails, stops working, only works`.
- Needs at least one anchor: a railway lexicon word (strong or weak) or any content word (4+ letters) that also appears in `mapping[]`, so the limit is about this analogy and not generic.
- Points: all three present → 15; length and marker but no anchor → 8; otherwise 0.
- **Hard fail** if points = 0.

**(f) Action, 15 points.** Text: `action`.
- `w` between 8 and 45 words.
- First word is not a pronoun or hedge (`you, we, i, it, this, try, maybe, perhaps, consider`); treat that as "starts with an imperative".
- Contains at least one concrete artefact.
- Contains at least one time or size marker.
- Contains no vague action verb.
- Points: 3 per condition met (5 conditions, 15 points).
- Pass if points ≥ 12.

**Principle, no points, soft warnings only.** One sentence (exactly one of `.`, `!`, `?` at the end and none inside, ignoring decimals), at most 25 words, no strong railway words.

### 3.3 Result

- `score` = sum of (a) to (f), 0 to 100.
- `hardFails` = list of triggered hard fails: (b) fewer than 2 relational pairs, (d) 3 or more cliché hits, (e) no limits.
- **Verdict**:
  - `strong`: score ≥ 85 and no hard fails.
  - `sound`: score ≥ 70 and no hard fails.
  - `needs work`: anything else.
- Seed content must be `strong` or `sound`.
- Show the author each failing check with its one-line fix. Never show a bare number without the reasons.

### 3.4 What the checker cannot see
A checker on text cannot tell if a fact is true, if the causal type matches, or if the action is wise. Those need a human. Seed content carries `sources`; user content should be shown with "Not checked by Groundwork" until reviewed. Treat the score as spellcheck for structure.

## 4. Worked example

**Observe.** On jointed track the gap at each rail joint is set by temperature: wide in winter, closed tight on a hot day. A Network Rail booklet gives a target gap that steps down from about 10 mm in cold weather to none in very hot weather.

**Mechanism.** Steel expands as it warms and contracts as it cools. The gap gives the expansion somewhere to go. If the fishplates seize and the rail cannot slide into its gap, the expansion becomes compressive force in the rail, and with weak ballast at the sleeper ends the rail moves sideways instead.

**Mapping.**
1. The gap gives expansion a planned place to go → a regular, safe slot for bad news gives pressure in a team a planned place to go.
2. A seized joint stops the rail sliding, so the force builds until it moves the track sideways → when people are blocked from raising problems, pressure builds until it comes out somewhere unplanned, often away from where it started.
3. Ballast at the sleeper ends resists sideways movement → steady working relationships resist a stressed team pulling apart.

**Limits.** Steel expands by a fixed, predictable amount for each degree. People do not. Pressure in a team can also fade, change shape or be released by one honest conversation, which has no equivalent in a rail. So use the gap as a reason to make room, not as a way to measure people.

**Principle.** Give pressure a planned place to go, or it will find an unplanned one.

**Action.** Add one standing five-minute "what's stuck?" slot to your team meeting this week and leave it in the agenda even when nobody uses it.

Score: (a) 20 (numbers, components, conditions); (b) 25 (three relational pairs, pair 2 chained); (c) 10; (d) 15; (e) 15; (f) 15. Verdict: strong.

## 5. Writing rules (all content)
- British spelling. Short sentences. No em-dashes. No hype.
- Steel expands and contracts. It never "grows".
- Say "about" for figures that vary by standard or site. Prefer no number to a wrong number.
- No railway puns in lenses. Railway words belong on the railway side.
- Never a made-up person. Seed content is "Groundwork editorial".

## References
- Holyoak, K. J. (2025). *The Human Edge: Analogy and the Roots of Creative Intelligence*. MIT Press. Chapters 1 to 4. Open access, CC BY-NC-ND.
- Gentner, D. (1983). Structure-mapping: a theoretical framework for analogy. *Cognitive Science*, 7(2), 155-170. (Background; discussed via Holyoak ch. 2.)
- Hesse, M. (1966). *Models and Analogies in Science*. (Via Holyoak ch. 3.)
- Gick, M. L. and Holyoak, K. J. (1983). Schema induction and analogical transfer. *Cognitive Psychology*, 15, 1-38. (Via Holyoak ch. 4.)
