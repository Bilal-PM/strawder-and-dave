/* LINESIDE: Learning World, Module 1: Project Planning (data only).
 *
 * The first "Lineside Loop" (docs/LEARNING_WORLD.md §3): Board (explainer) → Bench (explorable + three puzzles) →
 * Brew (discussion) → Out on the line ("Hour Eight") → Logbook. The engine in js/learn/*.js runs any module written
 * in this shape (schema: docs/LEARNING_WORLD.md §5), so a new topic is a new data file, not new code.
 *
 * ALL PUZZLE AND SCENARIO NUMBERS ARE ILLUSTRATIVE, AWAITING RAIL PM SIGN-OFF (docs/TEAM.md pipeline).
 * They are copied from the spec and re-checked by the engine's own critical-path pass at runtime (see the
 * `selfCheck` block at the bottom and tests/suites/learning.js), so a typo here shows up as a failing check.
 *
 * Content rules: UK English, warm and gently funny, fictional names only. Durations: tea in minutes, the drain job in
 * days, the possession and Hour Eight in hours.
 */
window.LS = window.LS || {};
LS.MODULES = LS.MODULES || {};
LS.MODULES.planning = {
  id: 'planning',
  title: 'Project Planning',
  subtitle: 'Sequencing, the critical path and float',
  version: '0.1.0',
  signOff: 'Numbers illustrative, awaiting UK rail PM sign-off',
  unlock: { needs: [] },
  host: 'jo',
  place: { room: 'office', label: 'The back room of the project office', board: [10, 1], bench: [10, 4], brew: [1, 2] },
  lens: { id: 'planning', label: 'Planning Lens', desc: 'Dependency threads between jobs, with the critical chain lit in lamp amber.' },
  lamp: { label: 'The Planning lamp', where: 'by the project office door' },
  minutes: 45,

  outcomes: [
    { id: 'P1', text: 'Break a job into activities and link them by what has to finish first (finish-to-start).' },
    { id: 'P2', text: 'Find the critical path and the finish time of a small network, and work out float.' },
    { id: 'P3', text: 'Predict what a delay or a speed-up does to the finish, including when the critical path moves.' },
    { id: 'P4', text: 'Plan against a fixed end, like a possession handback or a road reopening, and keep a margin.' },
    { id: 'P5', text: 'In a live situation, find the real critical problem among louder ones, re-plan safely and tell people clearly.' }
  ],

  // ---------------------------------------------------------------------------------------------------------------
  // The concept card: the only facts any character (or the optional model) may state.
  // ---------------------------------------------------------------------------------------------------------------
  concept: {
    title: 'Project planning and the critical path',
    keyIdeas: [
      { id: 'K1', text: 'An activity is a piece of work with a duration and a clear finish.' },
      { id: 'K2', text: 'A dependency means one activity must finish before another starts (finish-to-start).' },
      { id: 'K3', text: 'A path is any chain of dependent activities from start to finish.' },
      { id: 'K4', text: 'The critical path is the longest path by total duration. It sets the earliest finish.' },
      { id: 'K5', text: 'Float is how far an activity can slip without moving the finish. Critical activities have zero float.' },
      { id: 'K6', text: 'Float belongs to the project, not to whoever owns an activity. Using it up makes the path critical.' },
      { id: 'K7', text: 'Shortening a critical activity can shorten the finish, but only until another path becomes the longest.' },
      { id: 'K8', text: 'Adding people helps only critical work, only if the work can be split, and only up to a limit.' },
      { id: 'K9', text: 'Railway work often has a fixed end. Plans need a margin before it, and a checkpoint to carry on or fall back.' },
      { id: 'K10', text: 'The critical path can change as work progresses. Re-plan from the actual status, not the original plan.' }
    ],
    workedExamples: ['Tea round: 7 min, float 1.5 min', 'Drain job: 14 days, B has 2 days of float', 'Possession: 48 h, 8 h of margin'],
    outOfScope: ['resource levelling algorithms', 'lag and lead types', 'software brands', 'contract clauses'],
    // Misconceptions: cue phrases (the listener's rules), labelled examples, and the authored counter move.
    // `ai` maps to the matching misconception in the tutor's classifier (js/ai/tutor.js), when there is one.
    misconceptions: [
      { id: 'M1', ai: 'longest_task', text: 'The longest task is the critical path', short: 'the longest job is critical',
        cues: ['\\b(longest|biggest|largest|slowest)\\s+(single\\s+)?(task|job|activity)\\b(?![^.?!]{0,30}\\b(chain|path)\\b)'],
        examples: ['the critical path is just the longest task', 'the pipes take longest so they are critical'],
        counter: { who: 'pat', say: 'In ’94 we had a crane job everyone swore was the long pole. It had three days in hand. The drainage chain behind it didn’t. B is the biggest job here, and it’s got two days of float. Add up A, C and D.' } },
      { id: 'M2', ai: 'float_owned', text: 'Float belongs to the task owner, so it’s free to spend', short: 'float is the owner’s to spend',
        cues: ['\\b(float|slack)\\b[^.?!]{0,40}\\b(belongs? to|is)\\b[^.?!]{0,12}\\b(supplier|tom|his|hers|theirs|the owner|whoever)\\b', '\\b(supplier|tom|owner)\\b[^.?!]{0,25}\\b(owns?|keeps?|gets?)\\b[^.?!]{0,12}\\b(float|slack)\\b'],
        examples: ['the float is the supplier’s', 'Tom’s crew can use their two days'],
        counter: { who: 'amira', say: 'Here’s the thing I love about float: it’s shared. If the supplier quietly uses the two days, the pipes go critical and nobody’s told. The project holds it, so the project decides when it’s spent.' } },
      { id: 'M3', ai: 'more_people', text: 'Adding people always shortens it', short: 'more people always means faster',
        cues: ['\\b(more|extra|four|another)\\s+(gangs?|people|crews?|hands|fitters)\\b[^.?!]{0,30}\\b(faster|quicker|shorter|sooner|always)\\b'],
        examples: ['just add more gangs and it goes faster', 'four gangs will dig it in a day so we finish sooner'],
        counter: { who: 'tom', say: 'Four gangs in one trench is a crowd, not a plan. They get in each other’s way, somebody has to supervise them, and once the dig’s quick the pipes are the long chain anyway.' } },
      { id: 'M4', ai: 'cp_static', text: 'The critical path never changes', short: 'the critical path never changes',
        cues: ['\\bcritical path\\b[^.?!]{0,25}\\b(never|doesn’t|doesn\'t|won’t|won\'t)\\s+(change|move|shift)', '\\b(once|always)\\b[^.?!]{0,20}\\bcritical\\b[^.?!]{0,15}\\balways\\b'],
        examples: ['once you know the critical path it stays the same', 'the kettle is always the critical path'],
        counter: { who: 'jo', say: 'Remember the urn? Swap the kettle out and the mugs chain took over. Change one job and a different chain can become the longest. Keep looking.' } },
      { id: 'M5', text: 'A plan is a list of dates', short: 'a plan is just a list of dates',
        cues: ['\\b(plan|programme)\\b[^.?!]{0,20}\\b(is|’s|\'s)\\s+(just|only|really)?\\s*(a list of|the)\\s+dates\\b', '\\bdon’?\'?t need (the )?(arrows|logic|links)\\b'],
        examples: ['a plan is just a list of dates', 'we do not need the arrows, just the dates'],
        counter: { who: 'amira', say: 'A list of dates can’t tell you what moves when something slips. The arrows can. Dates are what the logic gives you, not the other way round.' } },
      { id: 'M6', text: 'The handback is flexible', short: 'the handback can slip a bit',
        cues: ['\\b(hand(ing)? (it )?back|handback|reopen\\w*)\\b[^.?!]{0,25}\\b(late|a bit late|later|slip)\\b', '\\bonly a bit (late|over)\\b'],
        examples: ['hand back late, it is only a bit', 'we can reopen the road a bit late'],
        counter: { who: 'tom', say: 'The handback is a wall. On a working railway, late means trains and passengers delayed, and it’s treated as a serious failure. The plan fits inside the wall, with room to spare.' } },
      { id: 'M7', text: 'Critical means the most important or risky', short: 'critical means most important',
        cues: ['\\bcritical\\b[^.?!]{0,20}\\b(means|is)\\b[^.?!]{0,15}\\b(most important|riskiest|most risky|dangerous|biggest risk)\\b'],
        examples: ['critical means the most important job', 'the critical path is the riskiest work'],
        counter: { who: 'jo', say: 'Critical is about time, not importance. The clearing is critical because of the chain it sits on. Risky jobs off the critical path still need managing, just for a different reason.' } },
      { id: 'M8', text: 'Speeding up a non-critical job brings the finish forward', short: 'speeding anything up saves time',
        cues: ['\\b(speed|hurry|rush)\\w*\\s+up\\b[^.?!]{0,30}\\b(mugs|pipes|any job|anything)\\b[^.?!]{0,30}\\b(earlier|sooner|faster)\\b'],
        examples: ['if we fetch the mugs faster the tea is ready sooner'],
        counter: { who: 'jo', say: 'Shorten the mugs and nothing moves: they were never the long chain. Only time taken off the critical path comes off the finish.' } },
      { id: 'M9', text: 'Non-critical work can be ignored', short: 'non-critical work can be ignored',
        cues: ['\\b(ignore|forget about|stop watching)\\b[^.?!]{0,30}\\b(float|non-critical|the pipes|the rest)\\b'],
        examples: ['the pipes have float so we can ignore them'],
        counter: { who: 'amira', say: 'Float runs out. The pipes had two days, and two days late used every one of them. Now there are two critical paths and no slack at all.' } },
      { id: 'M10', text: 'Margin is waste, so plan to the wall', short: 'margin is wasted time',
        cues: ['\\b(margin|contingency|buffer)\\b[^.?!]{0,20}\\b(is )?(waste|wasted|pointless)\\b', '\\bplan (right )?(up )?to the (wall|handback)\\b'],
        examples: ['margin is wasted time, plan to the handback'],
        counter: { who: 'pat', say: 'The tamper broke at 02:00 in ’94. The margin is what saved that weekend. It’s not spare time, it’s where the faults go.' } }
    ]
  },

  // ---------------------------------------------------------------------------------------------------------------
  // SEE: the Board. Beats run on the tea-round network below; `visual` names the stage the board draws.
  // `tell` is the longer, story-led version for learners who chose "Tell me".
  // ---------------------------------------------------------------------------------------------------------------
  see: {
    open: {
      who: 'jo',
      say: 'Welcome to the back room. Board, Bench, Brew, then out on the line. First, how do you like to learn?',
      styles: [
        { id: 'show', t: 'Show me', d: 'Seven quick visual beats on the whiteboard, then a live model to poke.' },
        { id: 'tell', t: 'Tell me', d: 'The same beats with Jo’s story of the tea round, told in full.' },
        { id: 'try', t: 'Let me have a go first', d: 'Straight to the live model. Get stuck, then hear the idea.' }
      ],
      levels: [
        { id: 'new', t: 'I’m new to this' },
        { id: 'pro', t: 'I do this for a living', d: 'Offers a test-out: pass the last puzzle first time and go straight to the Brew.' }
      ]
    },
    beats: [
      { id: 'B1', title: 'A plan is an order, not a list of dates', visual: 'notes', ask: 'first',
        say: 'Six jobs. What’s the first thing you’d do? Wrong answers welcome.',
        tell: 'Every morning at ten somebody makes the crew’s tea, and every morning it takes longer than it should. Six little jobs. Before we draw anything: which one would you start with?',
        teaches: 'Activities and durations' },
      { id: 'B2', title: 'Some jobs wait for others', visual: 'links',
        say: 'You can’t pour before it’s boiled. That’s a dependency: this one finishes, then that one starts.',
        tell: 'Nobody pours cold water on a teabag, not twice anyway. Pour waits for the kettle and the teabags. Brew waits for pour. Each arrow means: this finishes, then that starts. Finish-to-start.',
        teaches: 'Finish-to-start logic' },
      { id: 'B3', title: 'Jobs can run side by side', visual: 'timeline',
        say: 'While the kettle boils, you fetch the mugs. That’s free time, and a good plan spots it.',
        tell: 'Lay the jobs along a clock and something nice happens. The mugs and teabags don’t need the kettle, so they happen while it boils. Two lanes at once. That’s the first thing a plan buys you: parallel work.',
        teaches: 'Parallel paths' },
      { id: 'B4', title: 'The longest chain sets the finish', visual: 'critical',
        say: 'Follow every chain start to finish. The longest one is the critical path. Delay anything on it and the tea’s late.',
        tell: 'Trace each chain with your finger. The kettle chain is seven minutes. The mugs chain is a minute and a half, then it waits. The longest chain decides when the tea’s ready. That’s the critical path, and I colour it like a lamp.',
        teaches: 'Critical path' },
      { id: 'B5', title: 'Float', visual: 'float',
        say: 'The mugs can be a minute and a half late and nobody notices. That’s float. It belongs to the plan, not to whoever fetches the mugs.',
        tell: 'See that grey ghost bar? The mugs could turn up a minute and a half late and the tea would still be on time. That’s float. It’s tempting to think it’s the mug-fetcher’s to spend. It isn’t. It belongs to the plan.',
        teaches: 'Float, and who owns it' },
      { id: 'B6', title: 'On the railway, the finish is often a wall', visual: 'wall',
        say: 'On a railway job you don’t finish when you finish. You finish before the line’s handed back, and the gap before that wall is your margin.',
        tell: 'Now zoom out to a weekend. The line’s handed back at six on Monday morning, and trains are waiting. That red line is a wall, not a target. The gap between your finish and the wall is your margin, and you guard it.',
        teaches: 'Fixed ends, margin' },
      { id: 'B7', title: 'The critical path can move', visual: 'shift',
        say: 'Change one job and a different chain can become the longest. Keep looking.',
        tell: 'Somebody has to wash the mugs first. Mugs goes from one minute to three, and look: the chains swap colour. The critical path isn’t a fact about a job. It’s a fact about today’s plan, so you keep looking.',
        teaches: 'Criticality shifts' }
    ],
    // B1 reaction: tap a note, Jo replies (every answer is welcome).
    firstPick: {
      kettle: 'That’s the one. Longest job, and everything waits for hot water. Get it on first.',
      mugs: 'Fair, but the kettle takes three minutes. Put it on, then fetch the mugs while it boils.',
      bags: 'Can’t, there’s nothing to put them in yet. Mugs first, then teabags.',
      pour: 'Pouring cold water? Brave. The kettle has to boil first.',
      brew: 'Brewing needs water on the bags. That’s two jobs away.',
      milk: 'Milk first is a debate for another day. It has to wait for the brew.'
    },
    explorable: {
      template: 'network_table',
      config: {
        unit: 'min', unitLong: 'minutes', step: 0.5, max: 9, title: 'Jo’s Planning Table', subtitle: 'The tea round',
        acts: [
          { id: 'kettle', t: 'Boil kettle', dur: 3, preds: [], row: 0 },
          { id: 'mugs', t: 'Fetch mugs', dur: 1, preds: [], row: 1 },
          { id: 'bags', t: 'Teabags in', dur: 0.5, preds: ['mugs'], row: 2 },
          { id: 'pour', t: 'Pour', dur: 0.5, preds: ['kettle', 'bags'], row: 3 },
          { id: 'brew', t: 'Brew', dur: 3, preds: ['pour'], row: 4, locked: 'Nobody’s having weak tea on my watch.' },
          { id: 'milk', t: 'Milk and serve', dur: 0.5, preds: ['brew'], row: 5 }
        ],
        tray: [
          { id: 'urn', t: 'Use the hall urn', dur: 0, preds: [], note: 'On since 1987', replaces: 'kettle', challenge: 2 },
          { id: 'shop', t: 'Fetch milk from the shop', dur: 5, preds: [], note: 'Needed before Milk and serve', challenge: 3 }
        ],
        wall: null, loopLine: 'That’d make the kettle wait for itself.'
      },
      challenges: [
        { id: 'C1', title: 'Make the mugs critical', goal: 'Add time to the mugs chain until it sets the finish.',
          hint: 'The mugs chain has a minute and a half of float. Use it up. Select Fetch mugs and press +.',
          check: { critical: 'mugs' }, done: 'There. Float ran out, and now the mugs chain is critical too. Two chains, no slack.', teaches: 'Float runs out, and then the path changes.' },
        { id: 'C2', title: 'Tea in under 6 minutes', goal: 'Get the finish flag below 6 minutes.',
          hint: 'You can’t hurry the brew. Look in the tray: there’s something quicker than a kettle.',
          check: { finishBelow: 6 }, done: 'Five and a half. The urn took the kettle off the critical path, so the mugs chain took over. Shorten the critical path and another path takes over.', teaches: 'Some durations are fixed by physics or quality, like brewing, curing or cooling.' },
        { id: 'C3', title: 'Add the milk run', goal: 'Place the milk run before Milk and serve, then stretch it to 7 minutes.',
          hint: 'Place the shop card, link it to Milk and serve (tap the shop card, then Milk and serve), then press + until it reads 7.',
          check: { linked: ['shop', 'milk'], dur: ['shop', 7], finish: 7.5 }, done: 'At five minutes the milk run had float and didn’t matter. At seven it ran out of float and became the critical path: 7.5 minutes. A late delivery only matters if it’s on the critical path, or runs out of float onto it.', teaches: 'One late delivery only matters if it’s on, or runs out of float onto, the critical path.' }
      ],
      bridge: { title: 'Load the real job', say: 'Same table, real job. Tom’s crew have a blocked cess drain near Crag Lane. Over to the Bench.' }
    }
  },

  // ---------------------------------------------------------------------------------------------------------------
  // TRY: the Bench. Confidence first, two tries, feedback worded for the mistake, hints free but recorded.
  // ---------------------------------------------------------------------------------------------------------------
  try: [
    { id: 'p1', lo: 'P2', template: 'network', title: 'Find the critical path', tag: 'The Crag Lane cess drain',
      intro: 'Tom’s crew are renewing 60 metres of blocked cess drain near Crag Lane. Here’s the job.',
      ask: 'Tap the activities on the critical path, then give the finish day and the float on B.',
      unit: 'day',
      data: { acts: [
        { id: 'A', t: 'Survey and mark out', dur: 2, preds: [] },
        { id: 'B', t: 'Order and deliver new pipes', dur: 5, preds: ['A'] },
        { id: 'C', t: 'Clear vegetation (ecologist present)', dur: 3, preds: ['A'] },
        { id: 'D', t: 'Dig the trench', dur: 4, preds: ['C'] },
        { id: 'E', t: 'Lay and joint the pipes', dur: 3, preds: ['B', 'D'] },
        { id: 'F', t: 'Backfill and reinstate the cess', dur: 2, preds: ['E'] }
      ], finishOptions: [12, 14, 19], floatOptions: [0, 2, 5] },
      answer: { path: ['A', 'C', 'D', 'E', 'F'], finish: 14, float: { B: 2 } },
      hints: ['Work out when each job can start: it’s when the last thing it waits for has finished.', 'E waits for both B and D. Which of the two finishes later?', 'A-C-D is 9 days before E can start. A-B is only 7.'],
      feedback: [
        { when: 'correct', say: 'Spot on. A, C, D, E, F: 14 days. The pipes are the biggest single job, but they’re not the longest chain. They’ve got two days in hand.' },
        { when: 'M1', say: 'B is the longest single job, but critical is about the longest chain. Add up A-C-D: that’s 9 days before E can start. A-B is only 7.', flags: ['M1'] },
        { when: 'M5', say: 'That’s every job end to end, as if one person did them all. C and D can run while the pipes are on order.', flags: ['M5'] },
        { when: 'float', say: 'Nearly. B finishes on day 7 and E starts on day 9. The gap is B’s float.' },
        { when: 'path', say: 'Not quite. Follow each chain from A to F and add it up. The longest one is critical, and every job on it has zero float.' },
        { when: 'finish', say: 'The path’s right, so add it up: 2 + 3 + 4 + 3 + 2.' }
      ] },
    { id: 'p2', lo: 'P1 P4', template: 'sequence', title: 'The weekend possession', tag: 'Renewing a length of track',
      intro: 'A possession of the branch runs from 22:00 Friday to handback at 06:00 Monday: 56 hours. Nine jobs renew a length of track.',
      ask: 'Put them in order on the table (some can run side by side), then say when you’d be ready to hand back.',
      unit: 'h', start: { day: 'Friday', hour: 22 }, wall: 56, wallLabel: 'HANDBACK 06:00 MON',
      data: { acts: [
        { id: '1', t: 'Take the possession and set up the worksite', dur: 2, preds: [], clue: 'Nothing starts until the site’s set up and protected.' },
        { id: '2', t: 'Remove the old track', dur: 6, preds: ['1'] },
        { id: '3', t: 'Dig out old ballast, lay new drainage', dur: 10, preds: ['2'], clue: 'Needs the old track out.' },
        { id: '4', t: 'Drop bottom ballast from the engineering train', dur: 4, preds: ['3'], clue: 'Goes on the new formation.' },
        { id: '5', t: 'Lay new sleepers and rail', dur: 12, preds: ['4'], clue: 'Needs bottom ballast down.' },
        { id: '6', t: 'Top ballast and first tamp', dur: 8, preds: ['5'], clue: 'Needs the rails in.' },
        { id: '7', t: 'Welding rail joints', dur: 6, preds: ['5'], clue: 'Needs the rails in. Can run alongside the ballasting on a different length.' },
        { id: '8', t: 'Second tamp and check track geometry', dur: 4, preds: ['6', '7'], clue: 'Needs both 6 and 7.' },
        { id: '9', t: 'Final inspection and hand back', dur: 2, preds: ['8'], clue: 'Last.' }
      ], handbackOptions: [{ h: 48, t: '22:00 Sunday' }, { h: 54, t: '04:00 Monday' }, { h: 56, t: '06:00 Monday' }, { h: 60, t: '10:00 Monday' }] },
      answer: { order: [['1'], ['2'], ['3'], ['4'], ['5'], ['6', '7'], ['8'], ['9']], handback: 48, margin: 8, float: { '7': 2 } },
      followUp: {
        ask: 'The tamper develops a fault and the first tamp takes 13 hours instead of 8. Can you still hand back on time?',
        options: [
          { id: 'yes3', t: 'Yes, at 03:00 Monday, with 3 hours to spare', correct: true },
          { id: 'late', t: 'No, we’d be 5 hours late', mc: null },
          { id: 'mc6', t: 'Hand back a bit late, it’s only a bit', mc: 'M6' },
          { id: 'weld', t: 'Yes, and now the welding is critical', mc: 'M4' }
        ],
        feedback: {
          yes3: 'Correct. And notice the margin went from 8 to 3. Margin is for faults like this. Don’t budget it away on Friday. (Welding now has 7 hours of float.)',
          late: 'Not quite. You had 8 hours of margin, and the fault costs 5 of them. You hand back at 03:00 with 3 to spare.',
          mc6: 'On a working railway a late handback delays trains and passengers, and it’s treated as a serious failure. The handback time is a wall. The plan has to fit inside it, with room to spare.',
          weld: 'Other way round. Welding runs alongside the tamp, so a longer tamp gives welding more float: 7 hours now. The tamp chain is still critical.'
        }
      },
      hints: ['Read the clue on each card: it tells you what the job needs first.', 'Welding and the first tamp both need the rails in, and they happen on different lengths.', 'Run 6 and 7 alongside each other. The step takes as long as the longer job.'],
      feedback: [
        { when: 'correct', say: 'That’s the one: 48 hours, so you’re ready at 22:00 Sunday with 8 hours of margin before the wall. Welding has 2 hours of float alongside the tamp.' },
        { when: 'series', say: 'Works, but you’ve spent 6 hours you had for free. Welding and ballasting happen on different lengths, so run them together.' },
        { when: 'order', say: 'Something’s waiting for a job that hasn’t happened yet. Read the clues again: each card says what it needs first.' },
        { when: 'handback', say: 'Your order’s right, so add the steps up. The longest job in each step counts. 2 + 6 + 10 + 4 + 12 + 8 + 4 + 2.' },
        { when: 'M6', say: 'On a working railway a late handback delays trains and passengers, and it’s treated as a serious failure. The handback time is a wall.', flags: ['M6'] }
      ],
      signOff: 'Durations illustrative. On a real job, stressing may happen in a later shift; if so, card 7’s clue says so.' },
    { id: 'p3', lo: 'P3', template: 'what_if', title: 'What slips if…', tag: 'Back to the drain job', testOut: true,
      intro: 'Back to the drain job. Each question starts from the original plan: finish on day 14.',
      ask: 'What does each change do to the finish?', unit: 'day', base: 'p1',
      questions: [
        { id: 'a', change: 'The pipes arrive 2 days late (B: 5 → 7)', set: { B: 7 }, options: [14, 16, 12], answer: 14,
          say: 'No change: B had exactly two days of float. But now there are two critical paths, and you’ve no slack left on the pipes.', mc: { 16: 'M9' } },
        { id: 'b', change: 'Clearing takes an extra day (C: 3 → 4)', set: { C: 4 }, options: [14, 15, 17], answer: 15,
          say: 'C is on the critical path, so every day there is a day at the end.' },
        { id: 'c', change: 'Tom adds a second gang and the trench takes 2 days (D: 4 → 2)', set: { D: 2 }, options: [12, 10, 14], answer: 12,
          say: 'Two days saved, because D was critical. But look: A-B-E-F is 12 as well now.' },
        { id: 'd', change: 'Tom offers four gangs to dig in 1 day (D: 4 → 1)', set: { D: 1 }, options: [11, 12, 13], answer: 12,
          say: 'No better than two gangs. The pipes are now the long chain (A-B is 7 days). And four gangs in one trench is a crowd, not a plan.', mc: { 11: 'M3' } }
      ],
      pass: 3, answer: { all: 4 },
      feedback: [{ when: 'correct', say: 'Four out of four. You can see what moves before it moves. That’s planning.' }] }
  ],

  // ---------------------------------------------------------------------------------------------------------------
  // TALK: the Brew. Jo chairs. Pat and Amira disagree on purpose; Tom grounds them; Dev asks for the teach-back.
  // ---------------------------------------------------------------------------------------------------------------
  talk: {
    chair: 'jo',
    intro: [
      ['jo', 'Kettle’s on. Pull up a chair. You’ve met Tom. This is Pat, who has planned more possessions than I’ve had hot dinners, and Amira, who joined us from the graduate scheme.'],
      ['pat', 'Thirty-four years. I’ve a pencil for every one of them.'],
      ['amira', 'And I’ve a laptop covered in stickers. We disagree about almost everything. It’s lovely.']
    ],
    personas: [
      { id: 'pat', name: 'Pat Doyle', role: 'Possession planner · 34 years', stance: 'peer',
        look: { skin: '#e9c3a4', hair: '#b8b3ad', hairStyle: 'short', top: '#7a6a4e', topStyle: 'jacket', glasses: true, bg: '#e6dcc6' },
        voice: 'dry, anecdotal and warm; stories begin “In ’94 we had a tamper that…”; trusts experience and a paper bar chart',
        openers: ['In ’94…', 'Now then.', 'Here’s a story.', 'Mm.'], praise: ['That’s the ticket.', 'Wish I’d had you in ’94.', 'Aye, that’s it.'],
        thinking: ['I’ve seen that go both ways.', 'Let me tell you what the ballast thinks.'], tics: ['The software’s only as good as the fella feeding it.'],
        sample: 'In ’94 we’d have asked the same. Which job’s everyone waiting on?' },
      { id: 'amira', name: 'Amira Shah', role: 'Graduate planner · 23', stance: 'peer',
        look: { skin: '#b07852', hair: '#1d1512', hairStyle: 'long', top: '#6b8f7a', topStyle: 'cardigan', bg: '#d6e6dc' },
        voice: 'quick and precise; gets excited about float; “if it’s not in the logic, it’s not in the plan”',
        openers: ['Ooh.', 'Okay, so.', 'Right!', 'Yes.'], praise: ['Yes! Exactly that.', 'That’s the logic talking.', 'Lovely.'],
        thinking: ['Let’s check the logic.', 'Hang on, let me draw it.'], tics: ['If it’s not in the logic, it’s not in the plan.'],
        sample: 'Okay, so. If the pipes use their float, what happens to the finish?' },
      { id: 'tom', name: 'Tom Brennan', role: 'Track & Site Manager', stance: 'tutor', cast: true },
      { id: 'dev', name: 'Dev Mistry', role: '17 · wants to study engineering', stance: 'peer', town: true,
        voice: 'curious and keen, 17; asks for things to be explained simply', openers: ['Okay.', 'Right.', 'Ooh.'], praise: ['Oh, that makes sense.', 'Nice.'],
        thinking: ['Wait, let me get this.'], tics: ['I’m writing that down.'], sample: 'So what actually sets when you finish?' }
    ],
    // The prompts run in order. Each has chips (with the move they trigger) and accepts free text.
    prompts: [
      { id: 's1', who: 'jo', good: ['\\b(chain|path|sequence|in a row|one after|add(ed)? up|waits?)\\b'], targets: ['K3', 'K4', 'M1'], facet: 'critical_path',
        text: 'In the drain job, B was the longest job but not critical. Why is “longest job” such a tempting mistake?',
        chips: [
          { t: 'Big jobs feel important, but the finish is set by the longest chain of jobs that wait for each other.', move: 'correct' },
          { t: 'It isn’t a mistake really. The longest job usually is the critical path.', move: 'M1' },
          { t: 'Because people forget there’s float.', move: 'partial' }
        ],
        affirm: { who: 'amira', say: 'Yes. And that’s why the pipes need watching now: they’re the biggest job and they’ve only two days in hand.' },
        probe: { who: 'jo', say: 'Say more. Which chain did you add up to get the finish?' } },
      { id: 's2', who: 'pat', good: ['\\b(arrows?|logic|links?|what moves|slips?|depend\\w*|knock-?on|everyone can see|worth it|yes)\\b'], targets: ['K1', 'K2', 'M5'], facet: 'dependencies', debate: { who: 'amira', say: 'But you drew the logic in your head, Pat. Put it on paper and everyone can see what moves when something slips.' },
        text: 'I never needed arrows. I knew what came next. Is drawing the logic worth the time on a small job?',
        chips: [
          { t: 'Yes. The arrows show what moves when something slips. A list of dates can’t.', move: 'correct' },
          { t: 'Pat’s right. Just write down the dates and get on with it.', move: 'M5' },
          { t: 'Draw it, then check it with someone like Pat who’s done it.', move: 'correct' }
        ],
        affirm: { who: 'pat', say: 'Hmph. Fair. The arrows would’ve saved me a Sunday in ’94. Don’t tell anyone I said so.' },
        probe: { who: 'jo', say: 'Go on. What would a list of dates miss when the pipes turn up late?' } },
      { id: 's3', who: 'amira', good: ['\\b(project|shared|plan|everyone|whole|nobody|not (the supplier|tom))\\b'], targets: ['K5', 'K6', 'M2'], facet: 'float',
        text: 'The pipes have two days of float. Whose two days are they: the supplier’s, Tom’s or the project’s?',
        chips: [
          { t: 'The project’s. Use them up and the pipes go critical, so the whole plan needs to know.', move: 'correct' },
          { t: 'The supplier’s. It’s their job, so it’s their spare time.', move: 'M2' },
          { t: 'Tom’s. He’s in charge of the drain.', move: 'M2' }
        ],
        affirm: { who: 'amira', say: 'Yes! It’s shared. Spend it quietly and somebody else’s job goes critical without being told.' },
        probe: { who: 'jo', say: 'Close. If the supplier uses both days, what happens to the finish, and who should know?' } },
      { id: 's4', who: 'tom', good: ['\\b(way|crowd|space|room|supervis\\w*|pipes?|chain|trip over|too many|safety|split)\\b'], targets: ['K7', 'K8', 'M3'], facet: 'resources',
        text: 'Four gangs in one trench. What goes wrong that the plan doesn’t show?',
        chips: [
          { t: 'They get in each other’s way and need supervising, and the pipes become the long chain anyway.', move: 'correct' },
          { t: 'Nothing. More hands, faster finish.', move: 'M3' },
          { t: 'It costs more, but it’s quicker.', move: 'partial' }
        ],
        affirm: { who: 'tom', say: 'Right. Two gangs was worth it. Four’s a crowd, and the plan wouldn’t have finished a day sooner.' },
        probe: { who: 'tom', say: 'Picture the trench. Sixty metres, one digger. Where do the extra gangs stand?' } },
      { id: 's5', who: 'tom', good: ['\\b(margin|checkpoint|fallback|plan b|not start|wouldn|no\\b|buffer|contingency)\\b'], targets: ['K9', 'M6', 'M10'], facet: 'change',
        text: 'A plan with zero margin before the handback. Would you start that possession? What would you want first?',
        chips: [
          { t: 'Not as it stands. I’d want a margin, a checkpoint and a fallback agreed before we start.', move: 'correct' },
          { t: 'Yes. If it runs over we hand back a bit late.', move: 'M6' },
          { t: 'Yes. Margin’s wasted time anyway.', move: 'M10' }
        ],
        affirm: { who: 'tom', say: 'That’s what I’d want. A plan that only works if nothing goes wrong isn’t a plan. It’s a hope.' },
        probe: { who: 'pat', say: 'And if the tamper breaks at 02:00, what’s your plan then?' } }
    ],
    teachBack: { who: 'dev', text: 'Can you explain critical path to me like I’ve never seen a plan?',
      keyPoints: [
        { id: 'K3', label: 'Jobs link into chains', re: '\\b(chain|path|sequence|order|depend\\w*|wait\\w* (for|on)|after|before|one after)\\b' },
        { id: 'K4', label: 'The longest chain sets the finish', re: '\\b(longest|long)\\b[^.?!]{0,30}\\b(chain|path|sequence|route|string)\\b|\\bsets? (the )?(finish|end|date)\\b|\\b(chain|path)\\b[^.?!]{0,30}\\blongest\\b' },
        { id: 'K5', label: 'Other jobs have float', re: '\\b(float|slack|spare time|leeway|in hand|can slip|room to slip)\\b' },
        { id: 'K7', label: 'It can change', re: '\\b(change|changes|move|moves|shift|swap|switch|another chain|different chain|takes over)\\b' }
      ],
      chips: ['Jobs link up into chains: one has to finish before the next starts.', 'The longest chain sets when you finish. That’s the critical path.', 'Jobs off it have float: they can slip a bit without making you late.', 'It can change: speed one chain up and another can take over.'] },
    takeaways: ['The longest chain sets the finish, and the chain can change.', 'Float belongs to the plan, not to whoever owns the job.', 'The handback is a wall. Plan inside it, with room to spare.', 'Only time off the critical path comes off the finish.'],
    // Off-topic and safety handling: the tutor's authored lines are used (never generated).
    redirect: { who: 'tom', say: 'Good question for the pub. For now, the trench.' },
    // Grounding for the AI tutor (js/ai/tutor.js): the module registers a concept 'planning-m1' built on the tutor's
    // own 'project-planning' card, with its probes, examples and follow-ups re-set in this module's examples.
    ai: {
      concept: 'planning-m1',
      probes: {
        longest_task: ['Is it the longest single job, or the longest run of jobs that have to happen one after another?', 'B takes five days on its own. A, C and D take nine in a row. Which sets when E can start?', 'If the longest job had nothing waiting for it, would it still decide the finish?'],
        more_people: ['Would four gangs make the pipes arrive any sooner?', 'If you put four gangs in one sixty-metre trench, where do they all stand?', 'Which of the drain jobs are waiting on time rather than on hands?'],
        float_owned: ['If the supplier uses both days of float, how much is left for anyone else?', 'Who should decide when float gets spent: the person doing one job, or the person holding the whole plan?', 'If the pipes quietly use their two days, which chain is critical then?'],
        fixed_plan: ['When Tom found the clay pipe, should the plan carry on pretending it wasn’t there?', 'What’s the difference between changing a plan and losing control of it?', 'If the plan never changed, what would it tell you about Sunday?'],
        cp_static: ['When we swapped the kettle for the urn, which chain set the finish?', 'What would have to happen for a chain with float to become critical?', 'If you only ever watch the critical path, what might sneak up on you?']
      },
      examples: {
        longest_task: 'The pipes are the longest single job at five days. But it’s the A-C-D-E-F chain, fourteen days end to end, that sets the finish.',
        more_people: 'Four gangs got the trench down to a day, and the finish didn’t move: the pipes became the long chain.',
        float_owned: 'The pipes had two days of float. Use them and the pipes are critical too, with nobody told.',
        fixed_plan: 'The agreed plan is the baseline. When facts change, like a clay pipe nobody drew, you re-plan against it and say why.',
        cp_static: 'The kettle chain was critical until the urn arrived. Then the mugs chain took over.'
      },
      followUps: {
        activities: ['What separate jobs would you list for the drain before you could plan it?', 'How would you break “renew the drain” into jobs someone could actually do?'],
        durations: ['Where would a number like “five days for the pipes” come from, and how sure are we of it?', 'Would you give a single number for a duration, or a range? Why?'],
        dependencies: ['Pick one drain job that can’t start until another has finished. Why that one?', 'Which two drain jobs could happen at the same time, and why?'],
        critical_path: ['How would you find the chain that sets the finish on the drain job?', 'Why do we care more about one chain than the others?', 'What would you tell Helen the critical path is, in plain words?'],
        float: ['If the pipes slip by one day, does the finish move? Why?', 'How would you work out how far a job can slip before it hurts?', 'What does zero float tell you about a job?'],
        change: ['What would make the critical path switch from one chain to another?', 'When would you re-plan, and who would you tell?']
      },
      teachBack: {
        critical_path: 'What’s the critical path, in your own words, and why should Tom care?',
        float: 'What does float mean on the drain job, and who does it belong to?',
        change: 'Why might the critical path be different by Sunday?'
      }
    }
  },

  // ---------------------------------------------------------------------------------------------------------------
  // DO: Hour Eight. Saturday, 06:10. You take over from Tom at the Crag Lane crossing renewal.
  // Hours are counted from 22:00 Friday. Clock minutes are real minutes from 06:10 Saturday.
  // ---------------------------------------------------------------------------------------------------------------
  do: {
    id: 'hour-eight', title: 'Hour Eight', where: 'Crag Lane level crossing', when: 'Saturday · 06:10',
    setup: 'Hour eight of 56. You’re taking over from Tom, who has run the night shift on the Crag Lane level crossing deck and culvert renewal. He goes off at 06:30 to rest: the working-hours limits apply to everyone. The road is closed under a council permit until 06:00 Monday, when the school buses need it. At 07:00 Helen and the council’s highways officer expect a status call.',
    arrive: 'You arrive at the site cabin by the crossing with a mug of tea and very little information.',
    clock: { start: '06:10', startMin: 370, callMin: 420, budgetMin: 50, tomLeavesMin: 390, startHour: 22, startDay: 'Friday', nowHour: 8 },
    plan: {
      unit: 'h', wall: 56, wallLabel: 'ROAD REOPENS 06:00 MON',
      acts: [
        { id: 'S1', t: 'Set up the worksite and road closure', dur: 2, preds: [] },
        { id: 'S2', t: 'Remove the crossing deck and track', dur: 4, preds: ['S1'] },
        { id: 'S3', t: 'Dig out to the culvert', dur: 6, preds: ['S2'] },
        { id: 'S4', t: 'Lift out the old culvert, place new precast units', dur: 8, preds: ['S3'], window: { res: 'crane', to: 22 } },
        { id: 'S5', t: 'Backfill and compact', dur: 4, preds: ['S4'] },
        { id: 'BAL', t: 'Ballast delivery arrives', dur: 12, preds: [], milestone: true, ghost: true },
        { id: 'S6', t: 'Bottom ballast', dur: 4, preds: ['S5', 'BAL'] },
        { id: 'S7', t: 'Relay the track', dur: 10, preds: ['S6'] },
        { id: 'S8', t: 'Top ballast and tamp', dur: 6, preds: ['S7'] },
        { id: 'S9', t: 'New crossing deck and road surface', dur: 6, preds: ['S8'] },
        { id: 'S10', t: 'Test crossing lights and barriers, inspect, reopen the road', dur: 3, preds: ['S9'], fixed: 'Hannah: the tests take as long as they take.' }
      ],
      crane: { from: 12, to: 22, label: 'Crane hired 10:00–20:00 Sat' },
      baselineFinish: 53, baselineMargin: 3
    },
    // Evidence: where, cost in minutes, what you learn, and the signal it carries.
    evidence: [
      { id: 'tom', where: 'Site cabin', who: 'tom', label: 'Tom’s handover', cost: 10, until: 390, signal: 'critical', reveals: { S3: 3 },
        say: 'Dig-out’s behind. We found an old clay pipe nobody drew. Needs cutting out and capping: three hours extra, I reckon.', map: [18, 58] },
      { id: 'sheet', where: 'Site cabin', label: 'Handover sheet', cost: 5, after: 390, signal: 'critical', vague: true, reveals: { S3: '?' },
        say: '“Unrecorded pipe at culvert. Extra time TBC.” Tom’s handwriting, and not much of it.', map: [18, 58] },
      { id: 'dig', where: 'The dig', label: 'Walk down to the dig', cost: 10, signal: 'critical', reveals: { S3: 3 }, lens: 'S3',
        say: 'The trench is about 40% dug. The old clay pipe is right there across the culvert line, and the gang are waiting on a cutter. Tom’s three hours looks about right.', map: [50, 50] },
      { id: 'steve', where: 'Phone', who: 'steve', label: 'Ring Steve about the ballast', cost: 5, signal: 'distractor', reveals: { BAL: 16 },
        say: 'Ballast train’s lost its path. New arrival 14:00 instead of 10:00. Everyone’s talking about it.', map: [84, 20] },
      { id: 'crane', where: 'Compound', label: 'Crane hire sheet', cost: 5, signal: 'constraint', reveals: { crane: true },
        say: 'Dale Lifting (fictional, like everyone round here): hire ends 20:00 Saturday. Extension £1,800 if booked before 09:00.', map: [72, 72] },
      { id: 'permit', where: 'Crossing barrier', label: 'Council road permit', cost: 5, signal: 'constraint', reveals: { wall: true },
        say: '“Road closed until 06:00 Monday. Extension only by prior agreement.” Laminated, cable-tied and final.', map: [40, 26] },
      { id: 'gaz', where: 'Compound', who: 'gaz', label: 'Gaz and the deck panels', cost: 5, signal: 'opportunity', reveals: { D3: true },
        say: 'Panels and kerbs are all here. I could pre-assemble them on the hardstanding today if you give me two fitters.', map: [80, 80] },
      { id: 'hannah', where: 'Welfare cabin', who: 'hannah', label: 'Hannah in the welfare cabin', cost: 5, signal: 'safety', reveals: { D1: true },
        say: 'There’s a second gang available from 10:00. They’ll need a proper briefing first. And nobody extends a shift past its limit. Not Tom’s lot, not anyone.', map: [10, 36] },
      { id: 'jess', where: 'Crossing', who: 'jess', label: 'Jess, walking the dog', cost: 5, signal: 'stakeholder',
        say: 'The 07:30 school bus on Monday: will it get through? Only I’ve three to get to school and one of them’s me.', map: [30, 14] },
      { id: 'weather', where: 'Anywhere', label: 'Weather board', cost: 2, signal: 'minor',
        say: 'Showers Sunday afternoon. Nothing heavy.', map: [60, 10] }
    ],
    diagnose: {
      q1: { ask: 'What’s the critical problem right now?', options: [
        { id: 'S3', t: 'The unrecorded pipe at the culvert: the dig-out (S3) is 3 hours behind', correct: true },
        { id: 'BAL', t: 'The ballast train: it’s 4 hours late', mc: 'M1' },
        { id: 'weather', t: 'The showers on Sunday afternoon' },
        { id: 'none', t: 'Nothing yet: we’re still on plan' }] },
      q2: { ask: 'With S3 three hours longer, when do you finish?', options: [
        { id: '53', t: 'Hour 53: 3 hours of margin', h: 53 }, { id: '56', t: 'Hour 56: zero margin, right on the wall', h: 56, correct: true }, { id: '59', t: 'Hour 59: 3 hours late', h: 59 }] },
      q3: { ask: 'Does the slip threaten anything else?', options: [
        { id: 'crane', t: 'Yes: S4 now runs to hour 23, an hour after the crane goes home', correct: true },
        { id: 'ballast', t: 'Yes: the late ballast becomes critical', mc: 'M4' },
        { id: 'nothing', t: 'No, just the finish' }] }
    },
    decisions: [
      { id: 'D1', t: 'Brief the second gang for 10:00 and dig from the other side', cost: 3200, effect: { S3: -1.5 }, needs: 'hannah',
        d: 'Two gangs, one either side of the culvert, properly briefed.' },
      { id: 'D2', t: 'Extend the crane hire by 2 hours', cost: 1800, effect: { crane: 2 }, d: 'Book it before 09:00.' },
      { id: 'D3', t: 'Gaz pre-assembles the deck panels in the compound', cost: 900, effect: { S9: -3 }, needs: 'gaz', d: 'Two fitters on the hardstanding today.' },
      { id: 'D4', t: 'Spend the morning chasing the ballast train', cost: 0, costLabel: 'Your time', effect: {}, trap: true, d: 'It’s all anyone’s talking about.' },
      { id: 'D5', t: 'Cut the crossing tests to 1 hour', cost: 0, safetyFail: true, refusedBy: 'hannah', effect: {},
        refusal: 'No. The lights and barriers are what stop a school bus meeting a train. The tests take as long as they take, and I’ll not sign a crossing off early. Find the time somewhere else.' },
      { id: 'D6', t: 'Give the council early warning now: at risk, low margin, next update at a set time', cost: 0, effect: {}, comms: true, d: 'Free. Builds trust, and starts the fallback conversation early.' },
      { id: 'D7', t: 'Set a checkpoint: if the relay isn’t finished by hour 42 (16:00 Sunday), start the fallback', cost: 0, effect: {}, control: true, d: 'Fallback: a temporary road surface, and the track finished in a later possession.' },
      { id: 'D8', t: 'Ask Tom’s gang to stay on through the morning', cost: 0, safetyFail: true, refusedBy: 'hannah', effect: {},
        refusal: 'They’ve done a full night. Tired people make mistakes near moving machines, and the limits are there for a reason. They go home. The second gang comes in at ten.' }
    ],
    report: {
      status: { label: 'Status', chips: [{ id: 'on', t: 'On plan' }, { id: 'risk', t: 'At risk', correct: true }, { id: 'late', t: 'Late' }] },
      why: { label: 'Why', chips: [{ id: 'pipe', t: 'Unrecorded pipe at the culvert, about +3 h', correct: true }, { id: 'ballast', t: 'The ballast train is late' }, { id: 'crane', t: 'The crane' }] },
      doing: { label: 'What we’re doing', fromDecisions: true },
      margin: { label: 'Margin now', computed: true },
      next: { label: 'Next update / decision point', chips: [{ id: '18', t: 'Next update at 18:00', correct: true }, { id: 'mon', t: 'I’ll update you on Monday' }, { id: 'none', t: 'I’ll call if anything changes' }] },
      need: { label: 'What I need from you', chips: [{ id: 'fallback', t: 'Agree the fallback now: temporary road surface if the relay isn’t done by 16:00 Sunday', correct: true }, { id: 'extend', t: 'An extension to the road closure' }, { id: 'nothing', t: 'Nothing for now' }] }
    },
    expertLine: 'At risk. An unrecorded pipe at the culvert has added about 3 hours to the dig-out. We’re bringing in a second gang at 10:00 and pre-assembling the deck panels, which gets us back to about 4½ hours in hand. The ballast train is late but it isn’t on the critical path. Next update at 18:00. If the relay isn’t finished by 16:00 tomorrow we move to the temporary road surface so the buses get through on Monday.',
    expertOrder: ['tom', 'dig', 'crane', 'permit', 'hannah', 'gaz'],
    coach: { who: 'jo', ladder: [
      'What’s everyone waiting on right now?',
      'Have you been down to the dig yet? And when does the crane go home?',
      'Put the new times on the cabin board: stretch S3 by what you found, and see what S4 does against the crane window.'
    ], safety: { who: 'hannah', say: 'That’s not a planning question, it’s mine. Tests, shifts, protection: they’re set by the safe system of work, not traded for time. Ask me, and the answer will be no.' } },
    rubric: [
      { dim: 'Find out', points: 20, rule: 'Heard Tom before 06:30 or went to the dig; checked the crane sheet and the permit' },
      { dim: 'Diagnose', points: 25, rule: 'Named S3 as the critical problem, gave the new finish (hour 56, zero margin) and the crane clash; did not call the ballast critical' },
      { dim: 'Decide', points: 25, rule: 'Margin restored to at least 2 h; no unsafe option; no money spent for nothing' },
      { dim: 'Tell', points: 20, rule: 'Status update includes cause, action, margin, next update and the fallback' },
      { dim: 'Control', points: 10, rule: 'Set a checkpoint (D7) or an equivalent trigger' }
    ],
    bands: [{ min: 85, id: 'gold', t: 'Gold lamp' }, { min: 65, id: 'silver', t: 'Silver lamp' }, { min: 45, id: 'bronze', t: 'Bronze lamp' }, { min: 0, id: 'notyet', t: 'Not yet' }],
    // A random variation shown as luck in the Logbook: it never changes the grade.
    luck: [
      { p: 0.5, good: true, t: 'The cutter turned up twenty minutes early. Lucky: it didn’t change your grade, and it shouldn’t have changed your plan.' },
      { p: 0.5, good: false, t: 'The cutter turned up late and the gang lost half an hour. Unlucky: your margin was there for exactly this, and your grade doesn’t change.' }
    ],
    variants: [
      { id: 'v2', note: 'A buried cable instead of the clay pipe (+3 h), and the crane hire ends at 19:00.', craneTo: 21, craneLabel: 'Crane hired 10:00–19:00 Sat',
        say: { tom: 'Dig-out’s behind. There’s an old signal cable across the culvert line that isn’t on any drawing. It needs diverting before we go deeper: three hours, I reckon.',
               sheet: '“Undrawn cable at culvert. Diversion needed. Time TBC.” Tom’s handwriting, and not much of it.',
               dig: 'The trench is about 40% dug. An old cable crosses the culvert line and the gang are waiting on the diversion kit. Tom’s three hours looks about right.',
               crane: 'Dale Lifting (fictional, like everyone round here): hire ends 19:00 Saturday. Extension £1,800 if booked before 09:00.' },
        expertLine: 'At risk. An undrawn cable at the culvert has added about 3 hours to the dig-out. We’re bringing in a second gang at 10:00, extending the crane by two hours and pre-assembling the deck panels, which gets us back to about 4½ hours in hand. The ballast train is late but it isn’t on the critical path. Next update at 18:00. If the relay isn’t finished by 16:00 tomorrow we move to the temporary road surface so the buses get through on Monday.' }
    ]
  },

  // ---------------------------------------------------------------------------------------------------------------
  // LOOK BACK: the Logbook, at Moira's kitchen table.
  // ---------------------------------------------------------------------------------------------------------------
  lookBack: {
    where: 'Moira’s kitchen table, Beck Cottage',
    moira: {
      digFirst: 'You went to the dig. Most people ring someone first.',
      tomFirst: 'You caught Tom before he went home. The best information walks off site at half six.',
      ballastFirst: 'You rang about the ballast first. Everyone does. The loud problem isn’t always the critical one.',
      unsafe: 'You asked for something Hannah had to refuse. We’ll do it again, and this time the time comes from somewhere else.',
      default: 'You made a plan and told people the truth about it. That’s most of the job.'
    },
    expertLine: 'Find out what everyone’s waiting on, put the new times on the plan, fix the cause not the symptom, keep a margin, set a checkpoint, and tell people early.',
    lampChecks: [
      { id: 'lc1', who: 'june', lo: 'P2', template: 'choose', ask: 'If the oven’s 10 minutes late warming, are the rolls late, or just the scones?',
        context: 'The rolls wait for the oven. The scones are mixed while it warms, and the mixing takes 15 minutes.',
        options: [{ t: 'Neither: the mixing takes longer than the delay', correct: true }, { t: 'Both are late by 10 minutes' }, { t: 'Only the rolls' }],
        answer: 0, say: 'Right. The oven had float behind the mixing. Ten minutes of it, as it happens.' },
      { id: 'lc2', who: 'len', lo: 'P2', template: 'choose', ask: 'When we had one train on the branch, did the fireman’s tea break hold the train up?',
        context: 'He took it while the coal was loaded, which took longer than the tea.',
        options: [{ t: 'No: it ran alongside the coaling, which was the longer job', correct: true }, { t: 'Yes, every time' }],
        answer: 0, say: 'That’s it. Tea off the critical path. The coaling set the time.' },
      { id: 'lc3', who: 'jess', lo: 'P3', template: 'choose', ask: 'If I get the kids’ shoes on earlier, do we leave earlier?',
        context: 'Shoes take 2 minutes. Finding the youngest’s bag takes 10. You can’t leave without either.',
        options: [{ t: 'No: the bag hunt sets the time, so start that earlier', correct: true }, { t: 'Yes, by 2 minutes' }],
        answer: 0, say: 'Exactly. Speed up a job off the critical path and nothing moves. Find the bag first.' }
    ],
    retrieval: [1, 3, 7, 21]
  },

  // Numbers the engine re-derives on load (and the test suite checks): if any disagree, the module warns loudly.
  selfCheck: [
    { what: 'tea round finish', net: 'see.explorable.config.acts', finish: 7, float: { mugs: 1.5, bags: 1.5 } },
    { what: 'drain job finish', net: 'try.0.data.acts', finish: 14, float: { B: 2 } },
    { what: 'possession finish', net: 'try.1.data.acts', finish: 48, float: { '7': 2 } },
    { what: 'Hour Eight baseline', net: 'do.plan.acts', finish: 53 }
  ]
};
