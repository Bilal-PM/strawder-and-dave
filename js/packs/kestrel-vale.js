/* LINESIDE — Scenario pack: "The Kestrel Vale Line"
 * Sector: rail · community line reopening · Level: new → experienced project people
 *
 * The story: the Harrowby branch closed "temporarily" in 2009. The track is worn out, and
 * Marjorie — a 1961 diesel railcar — has sat in the depot ever since. You lead the reopening:
 * renew the track, restore the train, test it all, and open the line so the valley can thrive again.
 *
 * A pack is pure data. The engine (js/game.js) plays it; js/packs/kestrel-vale-world.js adds the world's
 * words, and js/world/level.js places everything. Chapter 1 ("Make the Case") is playable; the rest are planned.
 *
 * Metric keys: time (schedule float, weeks) · money (contingency, £k) · safety · evidence · team · town (support %)
 * Grades: best / ok / poor, exactly one 'best' per option set. Judgment Points (JP) reward decisions, never luck.
 * Content rules: warm UK humour, never dark or rude; ordinary names; no real suppliers, rail bodies, regulators or
 * brands; about 35 words at most per spoken line. In every graded set the expert option must not give itself away
 * by being the longest or the only sensible-sounding one (check with a lens script before sign-off).
 * `lo` tags map an item to a Chapter 1 learning outcome (see PACK.outcomes).
 */
window.LS = window.LS || {};
LS.PACKS = LS.PACKS || {};
LS.PACKS['kestrel-vale'] = {
  id: 'kestrel-vale',
  title: 'The Kestrel Vale Line',
  sector: 'Rail · line reopening',
  blurb: 'Renew a worn-out branch line, bring a 1961 railcar back to life, and give a valley town its future back.',
  budgetLabel: '£4.8M',

  cast: {
    moira:  { name: 'Moira Kell',     role: 'Harrowby’s last station master · your mentor',
              look: { skin: '#e9c3a4', hair: '#c9c4c0', hairStyle: 'bun', top: '#3f5a4c', topStyle: 'jacket', glasses: true, bg: '#d9c9b0' } },
    helen:  { name: 'Helen Walsh',    role: 'Director, Vale Transport Authority · Sponsor',
              look: { skin: '#f0cfb4', hair: '#5a3a26', hairStyle: 'bob', top: '#34506e', topStyle: 'suit', bg: '#d6dde6' } },
    jo:     { name: 'Jo Adeyemi',     role: 'Engineering Lead',
              look: { skin: '#7a4a2e', hair: '#1c1412', hairStyle: 'curly', top: '#d9a441', topStyle: 'jacket', glasses: true, bg: '#efd9a8' } },
    tom:    { name: 'Tom Brennan',    role: 'Track & Site Manager',
              look: { skin: '#e8b996', hair: '#6b4428', hairStyle: 'short', beard: true, top: '#f07a28', topStyle: 'hivis', hat: '#f4f1ea', bg: '#f1cfae' } },
    hannah: { name: 'Hannah Clarke',  role: 'Safety Lead',
              look: { skin: '#f3d2bb', hair: '#b4492a', hairStyle: 'ponytail', top: '#f07a28', topStyle: 'hivis', bg: '#e9e2b3' } },
    steve:  { name: 'Steve Hale',     role: 'Commercial Manager',
              look: { skin: '#c89272', hair: '#9d9894', hairStyle: 'short', top: '#27354f', topStyle: 'suit', bg: '#c9ced6' } },
    priya:  { name: 'Priya Nair',     role: 'Community & Communications',
              look: { skin: '#b07852', hair: '#17110f', hairStyle: 'long', top: '#2f7f7a', topStyle: 'cardigan', bg: '#bfe0d8' } },
    gaz:    { name: 'Gaz Whitfield',  role: 'Depot Fitter · Marjorie’s biggest fan',
              look: { skin: '#e8b996', hair: '#3a2a20', hairStyle: 'short', beard: true, top: '#2f4a7a', topStyle: 'tee', cap: '#2f4a7a', legs: '#2f4a7a', bg: '#c8d4e6' } },
    brian:  { name: 'Cllr Brian Pike', role: 'Chair, Harrowby Parish Council · biscuit monitor',
              look: { skin: '#f0c8a8', hair: '#cfcac4', hairStyle: 'bald', top: '#6b5a44', topStyle: 'jacket', glasses: true, legs: '#4a4238', bg: '#e3d6bf' } },
    sue:    { name: 'Sue Bennett',    role: 'Funding Panel · Finance',
              look: { skin: '#c89272', hair: '#2a1d18', hairStyle: 'long', top: '#5a3a5a', topStyle: 'suit', bg: '#e0d0e0' } },
    raj:    { name: 'Raj Patel',      role: 'Funding Panel · Independent reviewer',
              look: { skin: '#a87450', hair: '#1b1512', hairStyle: 'short', beard: true, top: '#3a4a3a', topStyle: 'jacket', glasses: true, bg: '#d0dccd' } },
    narrator: { name: '', role: '' }
  },
  mentor: 'moira',
  team: ['jo', 'tom', 'hannah', 'steve', 'priya', 'gaz'],

  avatars: [
    { skin: '#f0cdb2', hair: '#4a3222', hairStyle: 'short', top: '#34506e', topStyle: 'jacket', bg: '#cfd8e0' },
    { skin: '#8a5a3b', hair: '#15100d', hairStyle: 'curly', top: '#7c4d7a', topStyle: 'cardigan', bg: '#e0cfe0' },
    { skin: '#e7bf9c', hair: '#c98d3a', hairStyle: 'long', top: '#3d6b54', topStyle: 'jacket', bg: '#d2e2d4' },
    { skin: '#c28f6a', hair: '#231a16', hairStyle: 'short', beard: true, top: '#8a3b2e', topStyle: 'tee', glasses: true, bg: '#ecd3c4' }
  ],

  // The whole game, planned in six chapters. Only Chapter 1 is playable in this build.
  // Programme weeks: on site from week 9; Marjorie weeks 9–28, track weeks 9–36; testing 37–46; opening week 54.
  chapters: [
    { title: 'Make the Case', phase: 'Feasibility & funding', when: 'March · Weeks 1–6', playable: true,
      teaser: 'Walk the worn-out line, give Marjorie a health check, win over Harrowby and face the Funding Panel.',
      objective: 'In this chapter: gather the evidence, put the work in order, and make an honest case to the Funding Panel.' },
    { title: 'Strip Down', phase: 'Mobilisation', when: 'May · Weeks 7–14',
      teaser: 'Marjorie comes apart, an ecologist counts nests, Tom books the first possession so the engineers’ machines can move safely, and a secret comes out of a biscuit tin.',
      objective: 'In this chapter: control new scope, choose suppliers on risk as well as price, and put right promises that come back.' },
    { title: 'The Relay', phase: 'Track renewal', when: 'Summer · Weeks 15–28',
      teaser: 'Drainage, three miles of new sleepers and rail, a tamping machine the crew call Tina, and the wettest week of the summer.',
      objective: 'In this chapter: protect quality and safety under schedule pressure, and know when to stop the job.' },
    { title: 'Crossing Lines', phase: 'Level crossing & junction', when: 'Autumn · Weeks 29–36',
      teaser: 'The Crag Lane crossing, the regulator, and joining a main line that never stops for anyone.',
      objective: 'In this chapter: bring the people with a veto on side early, and get the one critical interface right first time.' },
    { title: 'First Movement', phase: 'Testing & commissioning', when: 'Winter · Weeks 37–46',
      teaser: 'Static tests, the first test run, driver training, and the day the horn finally works properly.',
      objective: 'In this chapter: test against agreed criteria, and only call it done when the evidence says so.' },
    { title: 'The Big Day', phase: 'Grand opening', when: 'Spring · Week 54',
      teaser: 'Bunting, a brass band, a ribbon, and four hundred people who said it would never happen.',
      objective: 'In this chapter: hand over cleanly, share the credit, and learn from the decisions, not just the results.' }
  ],

  // Chapter 1 learning outcomes (labels for the `lo` tags; full text in the learning designer's outcomes doc).
  outcomes: {
    '1.1': 'Go and see before you commit',
    '1.2': 'Diagnose condition, choose a proportionate fix',
    '1.3': 'Safety, legal and environmental constraints',
    '1.4': 'Sequencing and the critical path',
    '1.5': 'Challenge optimistic estimates',
    '1.6': 'Communicate uncertainty honestly',
    '1.7': 'Calibration, and decision versus outcome',
    '1.8': 'Make the case at a gate'
  },

  /* ============================ CHAPTER 1 · MAKE THE CASE ============================ */
  c1: {
    // The old Monday intro now lives in coldOpen.monday, so nothing repeats. Left empty on purpose.
    intro: [],

    // The opening: Sunday at dawn, the depot door open a crack; then Monday and the first graded judgment.
    coldOpen: {
      sunday: [
        ['narrator', `Sunday, 1 March. 6.52am. You don't start until tomorrow, but you wanted to see it first.`],
        ['narrator', `Harrowby station. The gate's padlocked, and a faded sign says “Temporarily closed”. It's dated 2009.`],
        ['narrator', `Next door is the depot. Its door should be locked too. It's open a crack, and it's dark inside.`]
      ],
      objective: 'Look inside the depot',
      finds: [
        { id: 'sheet', label: 'The shape under the dust sheet', text: `A railcar, asleep under a dust sheet that stops short of her cab. A little brass plate on her side: MARJORIE · 1961.` },
        { id: 'flask', label: 'A flask on the workbench', text: `A flask on the workbench. You touch it. It's still warm.` },
        { id: 'window', label: 'The cab window', text: `Every window in here is grimy except one. Someone has wiped the cab window clean. Recently.` }
      ],
      meet: [
        ['moira', `That's my tea.`],
        ['narrator', `A woman in a sensible raincoat stands in the doorway. She doesn't look like someone who's been caught at anything.`],
        ['moira', `Moira Kell. I was the station master here until they locked that gate. I've still got a key. Nobody ever asked for it back.`],
        ['moira', `You'll be the new project lead. The fourth. The other three had lovely launch events. One had a balloon arch.`],
        ['moira', `Mind that inspection pit. From tomorrow this is a worksite, and Hannah, the safety lead, will have you in full kit before you set foot in here. Quite right, too.`]
      ],
      // Ungraded and store-only (no JP, no metrics). Kept for a Chapter 6 callback.
      choice: { who: 'moira', q: `So. You've seen her. What do you reckon?`,
        options: [`She's beautiful.`, `Honestly? She looks like scrap.`, `I don't know yet. I'd need to look properly.`] },
      advice: [
        ['moira', `Hm. Hold on to that thought.`],
        ['moira', `Tomorrow, everyone will want a promise from you. The Authority, the town, the lot. Free advice, and worth every penny.`],
        ['moira', `Look before you promise. The track, the train, the town. Go and see them with your own eyes.`],
        ['narrator', `She takes her flask and goes. Only later do you realise she never said what she was doing here at seven on a Sunday.`],
        ['narrator', `Somewhere in the guard's compartment, a pigeon clears its throat.`]
      ],
      monday: [
        ['narrator', `Monday. Since 2009 the bank has gone, the Saturday market has gone, and the young ones catch the 41 bus. It comes twice a day, if it's feeling generous.`],
        ['helen', `{name}! Helen Walsh, Vale Transport Authority. Welcome to the most optimistic job in the county. There's £4.8 million from the Valley Connections Fund to reopen the line to Kestrel Junction.`],
        ['helen', `A Funding Panel decides in six weeks. It's a gate: go, or not yet. I've been to three launch events for this railway. I'd like the next one to have a train at it.`]
      ],
      // The first graded judgment of the game.
      promise: { who: 'helen', lo: '1.6', text: `So… can we open by next summer?`,
        choices: [
          { t: `I'll tell you once I've seen the track, the train and the town.`, grade: 'best', e: { team: 2 },
            reply: `Annoyingly sensible. Right: six weeks, and then I want a proper answer.` },
          { t: `Maybe. What's the catch? There's always a catch with railways.`, grade: 'ok', e: { evidence: 1 },
            reply: `The catch? Seventeen years of weeds, and a track that's gone soft. Otherwise, none at all.` },
          { t: `Absolutely. Next summer. Let's give Harrowby something to aim for.`, grade: 'poor', e: { town: 3 },
            reply: `Wonderful! I'll tell the county tonight. And my mum. Mum tells everyone.`,
            ripple: { title: 'Next summer', text: `Helen told the county “next summer”, and her mum told the bakery. It's in the minutes now, and minutes last for ever.`,
              later: `Chapter 2 preview: the county asks for a progress report against “next summer”. Helen asks you to write it.` } }
        ] },
      after: [
        ['moira', `Look before you promise. You'll be hearing that a lot.`],
        ['moira', `Hannah's in the project office. She has your hard hat, and a quiz. Start there.`]
      ],
      // If the player skips the Sunday, play this before `monday` so Moira still introduces herself.
      ifSkipped: [
        ['moira', `Moira Kell, Harrowby's last station master. Helen thinks I'm here to show you round. I'm actually here because I'm nosy.`]
      ]
    },

    // One-time coach marks: shown the first time each thing matters. One short line each.
    tips: {
      move: `Walk with the joystick, WASD or the arrow keys, or tap where you want to go.`,
      move_touch: `Drag the joystick to walk, or tap where you want to go. Tap Ⓐ or tap a person to talk.`,
      move_desktop: `Walk with WASD or the arrow keys, or click where you want to go. Press E to talk or look.`,
      person: `A gold diamond marks someone to see. Walk up to them to talk.`,
      find: `A ? is something to look at. Get close and take a look.`,
      call: `An orange ! is a Call: a big decision. Take your time.`,
      note: `A blue i is an engineering note. Real railway, real rules.`,
      door: `This door leads inside. Step onto the mat to go in.`,
      ppe_gate: `That's railway. Induction and PPE from Hannah first, then out with Tom.`,
      metric_safety: `Safety: how seriously your project takes getting everyone home.`,
      metric_evidence: `Evidence: how much of your case is facts, not hope.`,
      metric_team: `Team: morale, and how much your people trust you.`,
      metric_town: `Town: how much of Harrowby believes you. They've heard it all before.`,
      metric_time: `Float: spare weeks before the opening date has to move.`,
      metric_money: `Contingency: money held back for the risks you haven't met yet.`,
      jp: `Judgment Points reward good decisions, never lucky ones.`
    },

    // The chapter's objectives. `needs` is the engineering and project logic: some things have to wait for others.
    tasks: [
      { id: 'induction', label: 'Get your site induction', where: 'Hannah · project office' },
      { id: 'walk', label: 'Walk the line with Tom', where: 'the old trackbed · judge 5 defects', needs: ['induction'] },
      { id: 'health', label: 'Give Marjorie a health check', where: 'Gaz · Harrowby depot', needs: ['induction'] },
      { id: 'dropin', label: 'Run the drop-in at the village hall', where: 'Priya & Cllr Brian', needs: ['walk'] },
      { id: 'plan', label: 'Build the works plan', where: 'Jo · project office', needs: ['walk', 'health'] },
      { id: 'forecast', label: 'The Call: The Ridership Forecast', where: 'Steve · project office', needs: ['plan'] },
      { id: 'date', label: 'The Call: Name the Date', where: 'Helen · station platform', needs: ['forecast'] },
      { id: 'panel', label: 'Face the Funding Panel', where: 'the village hall', needs: ['walk', 'health', 'plan', 'forecast', 'date', 'dropin'] }
    ],

    talks: {
      hannah_induction: { who: 'hannah', lo: '1.3',
        text: `Hannah Clarke, safety. Before you go anywhere near that track or the depot: induction. It takes twelve minutes, there's a quiz, and yes, everybody does it. Including directors. Especially directors.`,
        choices: [
          { t: `What are the three things most likely to hurt me out there?`, grade: 'best', e: { safety: 8, evidence: 3 }, trust: 1,
            reply: `Ooh, good question. One: rotten sleepers, solid until they aren't. Two: Beck Bridge's loose parapet. Don't lean on it. Three: Crag Lane, where drivers forget it's a railway. Orange hi-vis, boots, hard hat, gloves. There.` },
          { t: `Full induction, please, and I'll take the quiz properly. No shortcuts.`, grade: 'ok', e: { safety: 5 }, trust: 1,
            reply: `A volunteer! Right. Closed doesn't mean safe. You never go out alone: Tom runs the safe system of work. Stay in the cess, and don't touch anything with a lever on it. Here's your kit.` },
          { t: `Can we do the short version? I've done plenty of inductions before.`, grade: 'poor', e: { safety: -4 }, trust: -1,
            reply: `Short version: the line can still hurt you, and nobody goes out there alone. The long version's the same with pictures. Here's your kit, but I'm writing down that you asked.` }
        ] },
      tom_walk: { who: 'tom', lo: '1.1',
        text: `Tom Brennan. Twenty-two years on track, and this is the saddest three miles I've seen. I'm running the safe system of work: stay in the cess, the flat bit beside the track. Shall we?`,
        choices: [
          { t: `You know this line best. What should I be looking out for?`, grade: 'best', e: { evidence: 3, team: 3 }, trust: 1,
            reply: `Water, wood, weeds, stone and people. Five things. Water's the big one: track's only as good as its drainage. Go on, find 'em. I'll be right behind you.` },
          { t: `Let's walk the whole line, end to end, and log everything we find.`, grade: 'ok', e: { evidence: 3 }, trust: 1,
            reply: `Proper job. Shout if something looks wrong, and log it. There are five things I'd want in the report. Find 'em.` },
          { t: `Can't we use the 2019 drone survey? It covers the whole line.`, grade: 'poor', e: { evidence: -2 }, trust: -1,
            reply: `Bring it: records are a good start. It shows some lovely treetops. It doesn't show the sleepers under them, mind. Let's walk it anyway.` }
        ] },
      gaz_tour: { who: 'gaz', lo: '1.1',
        text: `Gaz Whitfield, depot fitter. And this is Marjorie. Built 1961, last passenger run 2009, stood here ever since like she's waiting for a bus. So. Here to see her, or write her off?`,
        choices: [
          { t: `To see her. Show me everything, the good and the bad.`, grade: 'best', e: { evidence: 4, team: 4 }, trust: 1,
            reply: `Good answer. Have a look round her: bogies, brakes, engines, cab and body. Tell me what you reckon and I'll tell you what it'll take.` },
          { t: `What does she need? Give it to me in one sentence.`, grade: 'ok', e: { evidence: 2 }, trust: 0,
            reply: `One sentence? Everything, in the right order. Have a look round her and you'll see what I mean.` },
          // Asking about alternatives is good feasibility practice, so it costs nothing (ok, not poor).
          { t: `Honestly, wouldn't a newer train work out cheaper?`, grade: 'ok', e: { evidence: 3 }, trust: 0,
            reply: `Fair question, and the panel will ask it too. Nobody builds one new railcar. The real option's a second-hand modern unit off lease, and Steve should price it. But look at her first.` }
        ] }
    },

    // Track walk: judge each defect. (Positions come from js/world/level.js; `x` is legacy.)
    defects: [
      { id: 'sleepers', x: 1528, title: 'Rotten sleepers', icon: '🪵', lo: '1.2',
        see: `You press your boot on a sleeper and it goes “squelch”, which sleepers should never do. They're 1970s timber, soft as cake. The rail on top is 1950s bullhead, a museum piece.`,
        options: [
          { t: `Renew the track, sleepers and rail, before any train runs.`, grade: 'best', e: { evidence: 5 }, why: `Right. It's not a repair, it's a relay. Life-expired is life-expired.` },
          { t: `Swap out the worst sleepers now and keep the old rail for later.`, grade: 'ok', e: { evidence: 2 }, why: `Spot re-sleepering buys you a year on a working line. On a reopening you'd be back in two, and that rail's older than my dad.` },
          { t: `Pack and patch the soft spots. Trains ran on it fine in 2009.`, grade: 'poor', e: {}, why: `Packing works on sound sleepers, and these are soft as cake. Trains ran on it in 2009 because it was 2009. Wood doesn't stand still.` }
        ] },
      { id: 'drain', x: 1690, title: 'Blocked drain', icon: '💧', lo: '1.2',
        see: `The drain beside the Beck Bridge is choked with silt and leaves. There's a puddle in the ballast with a duck in it. Where water stands, the stones underneath turn to mud. Tom calls it “wet beds”.`,
        options: [
          { t: `Survey the drains now, and fix the drainage before the new track goes down.`, grade: 'best', e: { evidence: 5 },
            why: `That's it. Water is the enemy of track. Find out why it's standing (a camera down the pipe tells you a lot), then fix it first, or the new track goes the same way as the old.` },
          { t: `Jet the drain clear now, and see if the puddle goes before doing anything bigger.`, grade: 'ok', e: { evidence: 2 },
            why: `Worth doing, and it tells you something. But the stones under that puddle are already full of mud. Clearing the pipe won't un-muddy the ballast.` },
          { t: `Get the new track in first, then sort the drainage while the line's still closed.`, grade: 'poor', e: {},
            why: `Then you're digging up brand-new track to fix what's under it. The duck agrees with you. The duck is not a track engineer.` }
        ] },
      { id: 'bridge', x: 1795, title: 'Beck Bridge', icon: '🌉', lo: '1.2',
        see: `The little three-arch bridge over the beck. The parapet has loose stones, there's a sapling growing out of the mortar, and the water is doing something suspicious round the middle pier.`,
        options: [
          { t: `Get a bridge examiner in for a detailed exam, with a scour check at the pier.`, grade: 'best', e: { evidence: 5, safety: 2 },
            why: `Yes. I can tell you it looks poorly. Only an examiner can tell you why, and how poorly. And the worrying bit is under the water.` },
          { t: `Repoint the stonework and pull out the sapling before it does more damage.`, grade: 'ok', e: { evidence: 2 },
            why: `Nice and tidy, but tidy can hide cracks the examiner needs to see, and yanking a sapling can pull stones out with it. The thing that matters is scour at the pier, and you can't see scour from up here.` },
          { t: `It's stood since 1874 and looks solid from here. Let's get it examined next year.`, grade: 'poor', e: { safety: -2 },
            why: `That's what every old bridge says, right up until it doesn't. Scour works under the water where you can't see it, and floods don't wait for next year.` }
        ] },
      { id: 'veg', x: 2380, title: 'Vegetation', icon: '🌿', lo: '1.3',
        see: `A buddleia the size of a bus shelter, a young sycamore coming up through the ballast, and a shopping trolley. Nobody knows how the trolley got here. Nobody ever does.`,
        options: [
          { t: `Clear it stretch by stretch, once an ecologist has checked for nesting birds.`, grade: 'best', e: { evidence: 5 },
            why: `Spot on. Nesting season runs from March to August, and disturbing an active nest is a criminal offence. The ecologist checks for nests and other protected wildlife, then you clear stretch by stretch. The embankment trees get their own plan: some of those roots really are holding the bank up.` },
          { t: `Wait until September, when nesting season's over, and clear the lot in one go.`, grade: 'ok', e: { evidence: 1, time: -1 },
            why: `Legal and safe, but you lose half a year. An ecologist can check stretches now, and you clear whatever's clear. And an active nest is protected whenever you find it, even in September.` },
          { t: `Get a crew in next week and clear the lot before the birds start nesting.`, grade: 'poor', e: {},
            why: `Keen, but it's March, and they already have. Flail a bush with a nest in it and you've broken the law and upset a blackbird. And “the lot” includes embankment trees that may be holding a wet bank together.` }
        ] },
      { id: 'crossing', x: 2605, title: 'Crag Lane level crossing', icon: '🚧', lo: '1.3',
        see: `The crossing lights are dead, the gates have rusted open, and there's a car parked across the rails while its driver posts a letter. Round here, people have forgotten this is a railway.`,
        options: [
          { t: `Make it a top risk: assess it, look at closing or bridging it, and bring in the council and regulator now.`, grade: 'best', e: { evidence: 5, safety: 4 },
            why: `That's the one. Level crossings are the biggest source of train accident risk on the railway, and the safety regulator will expect you to show you considered closing it before you renew it. The council owns the road. Get them both on side early, or this will be your critical path.` },
          { t: `Get the lights and gates working again now, so drivers remember it's a railway before trains return.`, grade: 'ok', e: { evidence: 1 },
            why: `It's a start, but it's not about looking tidy. It needs a proper risk assessment, probably a new design, and the approvals take longest of all.` },
          { t: `Park it for now. There won't be trains for a year, so start with the risks we have today.`, grade: 'poor', e: { safety: -3 },
            why: `No trains yet. But people's habits take longer to change than steel does, and the crossing's approvals will take longer still. Start now.` }
        ] }
    ],
    walkDone: `That's the walk done. Proper defects list, that: water, wood, weeds, stone and people. Page one of your risk register. Take it to Jo. She'll want it for the plan.`,

    // Marjorie's health check: five hotspots in the depot (placed by level.js), then one real decision.
    hotspots: [
      { id: 'cab', x: 150, label: 'Cab & electrics', title: 'Cab & electrics',
        text: `Flat batteries, and cloth wiring that crumbles if you look at it funny: full rewire. That grey board behind the heater? It's 1961, so assume asbestos till a surveyor says otherwise.`,
        extra: { q: `Go on, try the horn. I dare you.`, options: [`Go on, then`, `Better not`], pick: 0, after: `…peep.`,
          gaz: `That's the last puff of air in the tank. The horn runs on air, not the battery. When her compressor's running again, they'll hear her in the next county.`, ach: 'peep', sfx: 'peep' } },
      { id: 'bogies', x: 262, label: 'Bogies & wheels', title: 'Bogies & wheelsets',
        text: `Seventeen years in one spot. Like me on Boxing Day. Rusty treads, bearings that need opening up, and tyres too thin to re-profile. Bogies out, wheelsets away to be crack-tested and re-tyred or replaced.` },
      { id: 'brakes', x: 360, label: 'Brakes', title: 'Brakes',
        text: `Vacuum brake cylinders seized solid, brake blocks glazed. And the brake rigging hangs off the bogies, so there's no touching the brakes till the bogies are done. Remember that. Jo will ask.` },
      { id: 'engine', x: 480, label: 'Engines & gearbox', title: 'Engines & gearbox',
        text: `Two diesels under the floor, and here's the odd bit. The oil's fresh, and number two turns over by hand. Someone's been looking after her. Don't ask me who.`, aside: `Gaz glances, very briefly, towards the station.` },
      { id: 'body', x: 640, label: 'Body & doors', title: 'Body & doors',
        text: `Rust in the door pillars: that's structure, not paint. Slam doors, a big step up, and one only shuts with a hip-bump. She'll need changes for passengers, or an exemption from the accessibility rules.`,
        extra: { q: `Also, shh. There's a pigeon living in the guard's compartment. He's called Kevin. I don't know who named him. What do we do about Kevin?`,
          options: [`Open the window and let him find his own way out`, `Wave your arms and shout “shoo!”`], pick: 0,
          after: `Kevin considers the open window, shrugs in a pigeon sort of way, and strolls out into the spring.`, gaz: `Well I never. Pigeon whisperer.`, ach: 'pigeon', sfx: 'coo',
          wrong: `Kevin does three laps of the depot, knocks over Gaz's tea and leaves by the skylight. Pigeon one, project manager nil.` } }
    ],
    // Deliberately does not give away the order: the works plan asks for it.
    healthDone: `So that's her. Flat batteries, crumbly wiring, maybe asbestos, tired wheels, seized brakes, two suspiciously healthy engines and a hip-bump door. Jo's got sticky notes. She'll want it all in order.`,
    // Asked by Gaz after all five checks. `why` is spoken by Gaz.
    healthDecision: { who: 'gaz', lo: '1.2',
      q: `Before you go. Say the panel says yes. What do we do first, the week the money lands?`,
      options: [
        { t: `Order the wheelsets and tyres now, and get an asbestos survey before any strip-down.`, grade: 'best', e: { evidence: 3, safety: 3 },
          why: `That's it, pal. Wheelsets and tyres take months to come, so they're ordered the week the money lands. And a 1961 train gets surveyed for asbestos before anyone takes a spanner to her.` },
        { t: `Wait for the full detailed design, then order everything together so nothing's wasted.`, grade: 'ok', e: { evidence: 1, time: -1 },
          why: `Safe, and tidy. But those wheelsets take months to come, and waiting for every drawing eats her float. The design won't change her wheels. Order the slow stuff early.` },
        { t: `Strip her down first thing next week, so we know exactly what we're dealing with.`, grade: 'poor', e: { safety: -4 },
          why: `Keen, and she does need opening up. But she's 1961, so assume asbestos behind those panels till a surveyor says otherwise. Survey first. And those wheelsets won't order themselves.` }
      ] },

    // The works plan. Each lane must go in dependency order; then two questions on the critical path.
    // Durations are weeks from the start on site (programme week 9). `background` rows are the work that isn't on the board.
    plan: {
      lo: '1.4',
      intro: `Jo Adeyemi, engineering. Sticky notes, a whiteboard and a mild caffeine problem. Two workstreams: Marjorie and the track. Put each in the order the work has to happen. Tap a card to place it.`,
      notReady: `Come back when you've walked the track and seen the train. I don't plan from rumours.`,
      lanes: [
        { id: 'train', label: 'Marjorie', color: 'ember', cards: [
          { id: 't1', t: 'Asbestos survey, strip down & inspect', w: 3, why: `A 1961 train can hide asbestos, so she's surveyed and made safe before anyone takes a spanner to her. Then open her up: you can't fix what you haven't seen.` },
          { id: 't2', t: 'Bogies & wheelsets (body repairs alongside)', w: 7, why: `Lift her and roll the bogies out. The wheelsets go away for crack testing and new tyres, which take months to arrive, so they're ordered the week the money lands. While she's up on stands, the rust gets cut out.` },
          { id: 't3', t: 'Brake overhaul', w: 3, why: `The brake rigging hangs off the bogies, so the brakes are finished and set up once she's back on her wheels.` },
          { id: 't4', t: 'Engines & rewire, then run up', w: 5, why: `The engines were overhauled at a specialist while the bogies were away. They go back in, and the new wiring is finished, once she can stop: nobody puts a railcar in gear until her brakes work.` },
          { id: 't5', t: 'Static tests in the depot', w: 2, why: `Test everything standing still before she moves an inch.` }
        ] },
        { id: 'track', label: 'The track', color: 'teal', cards: [
          { id: 'k1', t: 'Ecology surveys & vegetation clearance', w: 6, why: `Clear the ground first. It's nesting season, so an ecologist checks each stretch before the saws go in. That's why it takes six weeks, not three.` },
          { id: 'k2', t: 'Drainage & Beck Bridge repairs', w: 5, why: `Water first, including the water under the bridge. Fix the drains and the scour at the pier before new track goes over the top.` },
          { id: 'k3', t: 'Relay, tamp & stress the track', w: 9, why: `Only then the new track, on a dry, clear base. The ballast is packed under the sleepers (tamping), and the long rails are stretched to the length they'd be at about 27°C before they're clipped down, so they don't buckle in a heatwave.` },
          { id: 'k4', t: 'Level crossing & junction: install, test, commission', w: 8, why: `The crossing's road surface goes in with the new track, then its lights and barriers are tested as a system. The junction is tied in during a booked weekend closure of the main line. Both need approvals that start now.` }
        ] }
      ],
      // Grey rows on the Gantt: what a real programme has that the board doesn't. `from` is weeks from the start on site.
      background: [
        { t: 'Designs, approvals & the junction booking', from: -8, w: 36 },
        { t: 'Test runs · driver training · trial running · sign-off', from: 28, w: 10 }
      ],
      questions: [
        { q: `Counting from the day we start on site, Marjorie is ready in week 20 and the track in week 28. When can test runs on the line start?`,
          options: [
            { t: `Week 28, once the train and the track are both finished.`, grade: 'best', why: `Test runs need a working train and a working railway, so the later of the two sets the date. Then come ten more weeks before passengers: test runs, driver training, trial running and sign-off.` },
            { t: `Week 24, testing on the part of the line that's finished.`, grade: 'ok', why: `Real projects do sometimes test on a finished section, but it means extra closures, protection and risk on a half-built railway. Most wait for the whole route.` },
            { t: `Week 20. Marjorie's ready, so let's get her out testing.`, grade: 'poor', why: `On what, the old track? The squelchy bits are still there until week 28.` }
          ] },
        { q: `So which workstream is on the critical path, the chain of work that sets the opening date?`,
          options: [
            { t: `The track: 28 weeks against Marjorie's 20. Keep an eye on her float, though.`, grade: 'best', why: `Exactly, on the work we've planned. Marjorie has eight weeks of float. Don't tell Gaz, he'll take up golf. But the slowest things aren't on this board yet: the crossing approval and the junction booking. Start those now.` },
            { t: `Neither yet. It depends which one slips first, so we watch both equally.`, grade: 'ok', why: `True, a slip can move the critical path. But right now it's the track, and that's where to point your attention.` },
            { t: `Marjorie. Her overhaul has the most unknowns, so she's the likeliest to slip.`, grade: 'poor', why: `She's the star, and she's full of unknowns, but she's got eight weeks of float. The track is the long pole. Watch the longest chain, not the most famous one.` }
          ] }
      ],
      done: `That's the build. The slow stuff isn't on it yet: approvals, the junction booking, then testing and sign-off. Those start now. Steve's by the kettle, waiting to cost it and pretending he isn't.`
    },

    // Drop-in at the village hall (after the track walk): answers move Town support. Over-promises feel good now and echo later.
    dropin: {
      intro: [
        ['priya', `Priya Nair, community. Welcome to the drop-in! About forty people came, which in Harrowby counts as a festival. They've heard promises before, so tell them the truth, even when it's “I don't know yet”.`],
        ['brian', `Councillor Brian Pike, parish council. I've done the biscuits. Custard creams for the public, chocolate digestives for the speaker. Earn your digestive.`]
      ],
      questions: [
        { who: 'june', lo: '1.6', text: `Will it actually open this time? We've had three launch events and a commemorative mug.`,
          choices: [
            { t: `Not yet. We'll know in six weeks, and I'll come back and tell you either way.`, grade: 'best', e: { town: 7 }, reply: `…Well. That's the first straight answer we've had. I'll hold you to the coming back.` },
            { t: `The Authority will set out a timetable once the Funding Panel has decided.`, grade: 'ok', e: { town: -3 }, reply: `That's what the last one said. And the one before.` },
            { t: `Yes. The funding's all but agreed and the plan's solid, so trains by next summer.`, grade: 'poor', e: { town: 8 }, reply: `Next summer! Did everyone hear that? I'm having it printed on the mug.`,
              ripple: { title: `The mug`, text: `June has had your “trains by next summer” printed on a new mug. It sells well. Every slip in the plan now gets compared to it.`,
                later: `Chapter 2 preview: the bridge exam adds three weeks. The Gazette prints a photo of June's mug under the headline “NEXT SUMMER?”` } }
          ] },
        { who: 'len', lo: '1.3', text: `The Crag Lane crossing. Kids cut across it on their bikes. What happens when trains run again?`,
          choices: [
            { t: `It's a top risk. We'll design it properly and talk to the school before any train runs.`, grade: 'best', e: { town: 5, safety: 4 }, reply: `Good. That's how we did it in my day. Tell the kids the rules and tell them why.` },
            { t: `We'll put up proper warning signs and fence off the path, so the bikes can't cut across it.`, grade: 'ok', e: { town: 1 }, reply: `Signs and a fence. Right. Kids love a fence. Gives them something to climb.` },
            { t: `Marjorie's slow and you'll hear her coming, so it'll be safer than the road.`, grade: 'poor', e: { town: -3, safety: -4 }, reply: `Slow's still heavier than a bike, love.` }
          ] },
        { who: 'jess', lo: '1.6', text: `Will there be lorries going past the school while you build it?`,
          choices: [
            { t: `Some, yes. We'll agree routes and times with the school, and avoid drop-off and pick-up.`, grade: 'best', e: { town: 5 }, reply: `Okay. Honest. I can work with honest.` },
            { t: `We'll keep lorries to a minimum, and every driver will be told to take it slowly near the school.`, grade: 'ok', e: { town: 1 }, reply: `“A minimum.” I've heard that one before.` },
            { t: `No. The materials can all come in by rail, so there won't be any lorries past the school.`, grade: 'poor', e: { town: 4 }, reply: `Really? Brilliant!`,
              ripple: { title: `The first lorry`, text: `Ballast arrives by lorry, as ballast does: the line can't carry a train until it's relaid. Jess photographs it outside the school gate and tags the Authority.`,
                later: `Chapter 2 preview: the photo is shared four hundred times. The school asks for a meeting, and Priya spends a week rebuilding trust you'd already earned.` } }
          ] },
        { who: 'dev', lo: '1.6', text: `Will you be working at night? My nan's house backs onto the line.`,
          choices: [
            { t: `Some nights, yes. We'll warn her first, keep loud jobs to agreed hours, and give her a number.`, grade: 'best', e: { town: 5 }, reply: `Okay. Nan likes a number to ring. She'll ring it.` },
            { t: `We'll try to keep it quiet, and we'll only work nights when there's really no other way.`, grade: 'ok', e: { town: 1 }, reply: `“Try.” Right. Nan's a very light sleeper.` },
            { t: `No. We'll keep all the work to daytime, so nobody's kept awake. Tell your nan not to worry.`, grade: 'poor', e: { town: 4 }, reply: `Great! I'll tell her.`,
              ripple: { title: 'The tamper at 2am', text: `The tamping machine works through the night, as tamping machines do. Dev's nan has kept a diary.`,
                later: `Chapter 2 preview: the diary reaches the parish council. Brian adds “noise” to any other business for the rest of the year.` } }
          ] }
      ],
      outroAll: `Well! That's the least shouty drop-in we've had since the bypass. Have a chocolate digestive. Have two.`,
      outroSome: `Not bad at all. A few eyebrows went up, mind. Have a custard cream.`
    },

    // The Funding Panel: a gate review. Your evidence from the whole chapter decides the outcome.
    panel: {
      intro: [
        ['narrator', `Thursday. The Funding Panel meets in Harrowby Village Hall, because the Authority's meeting room has a leak. Somebody has got out the good cups.`],
        ['moira', `Every panel asks five things. Why do it? Is it worth it? Can you buy it? Can you afford it? Can you deliver it?`],
        ['helen', `Right. Sue does the money and Raj does the difficult questions. Let's see the case, {name}.`]
      ],
      questions: [
        { who: 'sue', lo: '1.5', text: `Your contingency. How did you decide how much you need?`,
          choices: [
            { t: `From the risk register. We priced the big risks, the bridge and the crossing, and held it there.`, grade: 'best', reply: `Risk-based. Lovely. I can test that.` },
            { t: `About ten per cent of the estimate. That's the usual allowance for a job like this.`, grade: 'ok', reply: `Standard for whom? At this stage your estimate could easily be forty per cent out. Still, it's something.` },
            { t: `We've kept it lean. The plan's solid, and a big contingency just invites spending.`, grade: 'poor', reply: `Every plan's solid until it meets the ground.` }
          ] },
        { who: 'raj', lo: '1.4', text: `What's the biggest risk to your opening date?`,
          choices: [
            { t: `The crossing and the junction. They need the council, the regulator and a main-line weekend.`, grade: 'best', reply: `Good. You know where your date lives.` },
            { t: `Marjorie's engines. They're sixty-five years old, and nobody has run them properly since 2009.`, grade: 'ok', reply: `A real risk, but she has float. It isn't the one that moves your date.` },
            { t: `Nothing major. We've covered every big risk in the plan, so the date should hold.`, grade: 'poor', reply: `That's the answer that worries me most.` }
          ] },
        { who: 'raj', lo: '1.8', text: `Where does the train actually go, and who will run it?`,
          choices: [
            { t: `A shuttle to a new platform at Kestrel Junction, run by an operator with the right safety approvals.`, grade: 'best', reply: `Good. A railway needs someone legally responsible for running it safely, and you've thought about who.` },
            { t: `Straight through to Kestrelford on the main line, so nobody ever has to change trains.`, grade: 'ok', reply: `Lovely for passengers. But then Marjorie needs main-line train protection, radio, crash and accessibility standards, and main-line paths. That's a much bigger project.` },
            { t: `We'll pick an operator once it's built. Right now the job is getting a railway back at all.`, grade: 'poor', reply: `The operator's safety approvals take months and shape the design. That's a day-one question.` }
          ] }
      ],
      outcomes: {
        approved: { stamp: 'APPROVED', title: 'Approved to proceed, with no conditions', text: `The panel approves the business case and allocates the full £4.8 million, released stage by stage as you pass each gate. Sue also agrees to hold £100k of funder's risk allowance you can draw on, “because your risks are real and you've found them”.`, e: { money: 100, team: 6, town: 6 }, jp: 100 },
        conditions: { stamp: 'APPROVED WITH CONDITIONS', title: 'Approved, with conditions', text: `The panel approves the money, with conditions: a review of the weakest parts of the case before the first spend, and a report back to the panel.`, e: { team: 2, town: 2 }, jp: 50 },
        deferred: { stamp: 'DEFERRED', title: 'Deferred: “not yet”', text: `The panel defers the decision for three months and asks for better evidence. That's not a no, but the clock doesn't stop.`, e: { time: -4, team: -4 }, jp: 0 }
      }
    },

    // THE DIRECTOR: surprises drawn each playthrough, weighted by what's going on in the world.
    // weight(S) = 0 means not eligible. `cause` tells the player why this happened now.
    // A choice may carry `luck`: the decision is graded, then the dice decide the outcome (outcomes never change JP).
    // Money and float: only work on the critical path (the track, the crossing, the junction) costs `time`;
    // Marjorie's lane has eight weeks of float, so her delays cost money, not weeks.
    events: [
      { id: 'storm', who: 'tom', channel: 'Radio call', title: 'Rain on the way', after: ['walk'], lo: '1.3',
        weight: S => S.week >= 4 ? 4 : 1,
        cause: S => S.defects.drain ? 'Because you logged the blocked drain, Tom is watching the beck.' : 'A wet week in the Vale.',
        text: `Heavy rain's forecast tonight. The beck's rising, and that blocked drain by the bridge will back up. Do we go and look?`,
        choices: [
          { t: `At first light, in pairs, with a plan for the water. Nobody on the bridge if it's over the footings.`, grade: 'best', e: { safety: 3, evidence: 2 },
            why: `Checking a structure after a flood is right. Doing it in the dark, alone and in a hurry is how people get hurt. Plan it, pair up, keep back from the water's edge, and go at first light.`,
            luck: { p: 0.6, good: { text: `At dawn you find a fallen branch jammed against the middle pier. Tom's crew clears it from the bank. Scour avoided, for now.`, e: { evidence: 3 } },
              bad: { text: `Overnight the water washed out a chunk of embankment by the drain. Because you found it early, it's a patch now instead of a rebuild later.`, e: { money: -30 } } } },
          { t: `Leave it for now. The bridge exam's already booked, and the examiner will spot any damage.`, grade: 'ok', e: {},
            why: `The exam is weeks away, and floods are exactly when things change. A planned look after the storm is cheap.`,
            luck: { p: 0.5, good: { text: `The rain passes and the beck drops. Nothing moved. You were lucky.`, e: {} },
              bad: { text: `A branch jams under the bridge and the water scours round the pier. The exam now has rather more to examine.`, e: { money: -40, time: -1 } } } },
          { t: `Tonight, while it's happening. Someone go down with a torch and see what the water's doing.`, grade: 'poor', e: { safety: -5 },
            why: `Keen, but a lone person on a wet, rotten trackbed at night, next to a flooded beck, is the biggest risk on the whole job.`,
            luck: { p: 0.5, good: { text: `Nobody gets hurt, but Hannah has words with you. Loud ones.`, e: { team: -2 } },
              bad: { text: `Tom slips on the wet sleepers. It's only a sprained wrist, and a very long form.`, e: { team: -4, safety: -3, time: -1 } } } }
        ] },
      { id: 'gazette', who: 'priya', channel: 'Phone call', title: 'The Gazette has a scoop', after: ['dropin'], lo: '1.6',
        weight: S => 1 + (S.m.town < 45 ? 2 : 0) + (S.judgment.some(j => j.id === 'date' && j.grade === 'poor') ? 3 : 0),
        cause: S => S.judgment.some(j => j.id === 'date' && j.grade === 'poor') ? 'Because a fixed date is already doing the rounds.' : S.m.town < 45 ? 'Rumours travel fast when trust is low.' : 'Somebody at the pub has been talking.',
        text: `The Harrowby Gazette has heard that the line “opens in August”. They're printing it tomorrow unless someone tells them otherwise.`,
        choices: [
          { t: `Ring them back today with Helen's OK: say where we really are, and give them the honest range.`, grade: 'best', e: { town: 4 },
            why: `Get the truth out before the rumour sets, and say it with one voice: your comms lead, with the sponsor's OK. Local press would much rather have a straight quote than a guess.` },
          { t: `Tell them “no comment until after the panel”, so nothing we say can be misquoted.`, grade: 'ok', e: { town: -3 },
            why: `Safe for you, but a “no comment” next to “opens in August” reads like a yes.` },
          { t: `Let them print it. August's possible if all goes well, and it'll build support before the panel.`, grade: 'poor', e: { town: 5 },
            why: `It feels great for a week. But August was never possible: the track alone runs into late autumn. Now it's the date everyone measures you against.`,
            ripple: { title: 'The Gazette headline', text: `“TRAINS BY AUGUST!” is pinned up in the Kestrel Arms. Len has underlined it.`,
              later: `Chapter 2 preview: August slips out of reach, and every update starts on the back foot.` } }
        ] },
      { id: 'trespass', who: 'hannah', channel: 'Radio call', title: 'Visitors on the bridge', after: ['walk'], lo: '1.3',
        weight: S => 1 + (S.defects.crossing && S.defects.crossing !== 'best' ? 2 : 0) + (S.m.safety < 60 ? 1 : 0),
        cause: S => S.m.safety < 60 ? 'Safety culture is shaky, and people can tell.' : 'The line has looked abandoned for seventeen years.',
        text: `Some teenagers are filming videos on the Beck Bridge parapet. They got in through a gap in the fence where Crag Lane meets the line.`,
        choices: [
          { t: `Get them off calmly, fix the fence today, log it as an incident, and set up a school talk.`, grade: 'best', e: { safety: 5, town: 2 },
            why: `Deal with the people, then the hole in the fence, then the habit. Logging it as a safety incident means the next person learns from it too. That's the full fix.` },
          { t: `Get a “Keep Out” sign up on the gap today, and ask Tom's crew to keep an eye on the bridge.`, grade: 'ok', e: { safety: 1 },
            why: `A sign is better than nothing, but a sign next to a hole in a fence is really an invitation. Fix the gap, and talk to the kids.` },
          { t: `Leave it until the works start. Until then, guarding the site isn't really our job, surely?`, grade: 'poor', e: { safety: -4 },
            why: `It's your land and your risk the moment you're responsible for it. That's now.`,
            luck: { p: 0.7, good: { text: `Nothing happens. This time.`, e: {} }, bad: { text: `One of them slips and grazes a knee. His mum rings the Authority. Helen rings you.`, e: { town: -5, safety: -2 } } } }
        ] },
      { id: 'wheelsets', who: 'gaz', channel: 'Knock at the door', title: 'A bargain from down the road', after: ['health'], lo: '1.3',
        weight: S => 2,
        cause: S => 'Because word has got round that Marjorie needs wheels.',
        text: `A heritage railway sixty miles away is selling two spare wheelsets from a sister railcar. £18k the pair, half the new price. There's just no paperwork showing where they've been.`,
        choices: [
          { t: `Interested, if a qualified workshop will crack-test and overhaul them first, then certify them.`, grade: 'best', e: { evidence: 3 },
            why: `Wheels are safety-critical. With no history, they need crack testing and a full overhaul before anyone will certify them. Check first, then buy.`,
            luck: { p: 0.6, good: { text: `They pass. After an overhaul and a fresh certificate they cost about £15k less than new. Marjorie's lane gets shorter too, but she wasn't on the critical path, so the opening date doesn't move.`, e: { money: 15 } },
              bad: { text: `The crack test finds a flaw in one axle. You walk away £1k poorer for the test, and very glad.`, e: { money: -1 } } } },
          { t: `No thanks. With no paperwork, it's simpler to stick with new ones from the supplier.`, grade: 'ok', e: {},
            why: `Safe, but you might have walked past a real saving. An inspection costs very little.` },
          { t: `Snap them up before someone else does. Half-price wheels don't come round often.`, grade: 'poor', e: { money: -18 },
            why: `Buying safety-critical parts with no history is a gamble on something you can't use until it's proven anyway.`,
            luck: { p: 0.4, good: { text: `They pass testing after a full overhaul. You got lucky: the saving on new wheelsets covers what you paid.`, e: { money: 18 } },
              bad: { text: `Crack testing finds a flaw in one axle. You still need new wheelsets, so that's £18k of very heavy doorstops.`, e: {} } } }
        ] },
      { id: 'costhole', who: 'steve', channel: 'Knock at the door', title: 'A hole in the spreadsheet', after: ['plan'], lo: '1.5',
        weight: S => 2 + (S.m.evidence < 60 ? 2 : 0),
        cause: S => S.m.evidence < 60 ? 'Thin evidence means gaps. Here is one.' : 'Steve has been checking everything twice.',
        text: `“Small thing,” says Steve. Nobody priced the power supply for the new level crossing. It's about £60k. He's gone a funny colour.`,
        choices: [
          { t: `Put it through change control, draw it from contingency openly, and tell Helen today.`, grade: 'best', e: { evidence: 4, team: 2, money: -60 },
            why: `Bad news doesn't get better with age. The £60k is real whatever you do: put it through change control, draw it from contingency in the open, and tell Helen today. Sponsors forgive surprises they hear about early.` },
          { t: `Get a firm quote first, so we can give Helen a proper number rather than a rough guess.`, grade: 'ok', e: { evidence: 1 },
            why: `Reasonable, but tell Helen it's coming. “We've found a gap, and the number's on its way” is a fine update.`,
            luck: { p: 0.5, good: { text: `The quote comes in at £45k. Helen still asks why she's hearing about it a fortnight late.`, e: { money: -45, team: -1 } },
              bad: { text: `The quote comes in at £80k, and Helen hears about it from the finance team first.`, e: { money: -80, team: -2 } } } },
          { t: `Cover it from contingency. That's what it's there for, and there's no need to worry Helen.`, grade: 'poor', e: { money: -60, evidence: -3 },
            why: `Using contingency for a missed item can be fine, if it's done in the open and signed off. Doing it quietly means nobody knows what's left for the risks you haven't found yet. That's how projects run out of road.`,
            ripple: { title: 'The hidden £60k', text: `Someone on the panel's finance team spots the missing line in the cost plan.`,
              later: `Chapter 2 preview: the panel's finance team finds the missing line and asks what else isn't in the cost plan.` } }
        ] },
      { id: 'possession', who: 'jo', channel: 'Email', title: 'The junction slot', after: ['plan'], lo: '1.4',
        weight: S => 2 + (S.defects.crossing === 'best' ? 0 : 1),
        cause: S => 'Because your plan needs the main line, and the main line plans a long way ahead.',
        text: `The main line's planners have written. To connect our branch at Kestrel Junction we'll need their railway closed for a weekend: a “possession”. Requests for next year's closures close on Friday. Miss it and the next chance is after the date we're hoping to open. Our junction design is still a sketch.`,
        choices: [
          { t: `Send it by Friday with our best estimate, marked provisional, and ask to meet and firm it up.`, grade: 'best', e: { evidence: 3 },
            why: `Time on a main line is booked many months ahead, and big closures longer still. A provisional slot you can refine beats a perfect request that arrives too late. Be honest about how firm it is.`,
            luck: { p: 0.7, good: { text: `The planners pencil you in for a weekend next spring, with a date to confirm the details by.`, e: {} },
              bad: { text: `Another job already has that weekend. They offer a Saturday night instead. It's shorter, but it's a slot, and Jo starts re-planning the tie-in to fit.`, e: { money: -15 } } } },
          { t: `Wait until the junction design is finished, so the request is right first time.`, grade: 'ok', e: {},
            why: `Getting it right matters, but the main line's planning calendar won't wait for you. Book provisionally, then refine. Waiting for perfect information is a decision too.`,
            luck: { p: 0.3, good: { text: `Someone else gives up a weekend and the planners offer it to you. That doesn't happen often.`, e: {} },
              bad: { text: `The deadline passes. A late request is possible, at a price, with no promises. Steve goes quiet.`, e: { time: -3, money: -20 } } } },
          { t: `Leave it for now. We'll ask for a short-notice closure once we're ready to build.`, grade: 'poor', e: { time: -3 },
            why: `A busy main line doesn't close at short notice for a branch reopening. Its passenger and freight timetables are planned a year or more ahead. If you need their railway, you work to their calendar.`,
            ripple: { title: 'The missing weekend', text: `Nobody booked the junction possession. The main line's planners have offered a slot, a long way after the date on everyone's lips.`,
              later: `Chapter 2 preview: the only slot on offer is months after the date on everyone's lips, and the whole plan shifts right.` } }
        ] },
      { id: 'bats', who: 'tom', channel: 'Radio call', title: 'Tenants in the bridge', after: ['walk'], lo: '1.3',
        weight: S => 1 + (S.defects.bridge === 'best' ? 1 : 0) + (S.defects.veg === 'best' ? 1 : 0),
        cause: S => S.defects.bridge === 'best' ? 'Because you asked for Beck Bridge to be looked at properly, someone did.' : 'Old stone bridges over water are prime bat territory.',
        text: `The ecologist's first walkover found bat droppings under a crack in the middle arch of Beck Bridge. Bats and their roosts are protected by law. My lads were going to take the loose parapet stones down next week, and the scour repairs go right past that crack.`,
        choices: [
          { t: `Make the parapet safe without touching the arch, book a bat survey now, and plan round it.`, grade: 'best', e: { evidence: 4, safety: 2 },
            why: `Protected species don't stop a railway, but they do decide when and how you work. Surveys can only be done at certain times of year, so book early. Deal with the urgent safety risk in a way that doesn't disturb the roost.`,
            luck: { p: 0.6, good: { text: `It's a small summer roost. The ecologist says work outside the summer months with them watching. The plan barely moves.`, e: {} },
              bad: { text: `It's a bigger roost than anyone thought. You'll need a licence and some bat boxes, and the arch repairs move to the autumn.`, e: { money: -15, time: -1 } } } },
          { t: `Stop all work on the bridge until the ecologist tells us exactly what we're allowed to do.`, grade: 'ok', e: { time: -1 },
            why: `Legal and safe, but pausing isn't a plan, and the loose parapet is still loose. Someone has to find out, and the survey season won't wait.` },
          { t: `Crack on next week as planned. The parapet's a real hazard, and bats move about all the time.`, grade: 'poor', e: { safety: -2 },
            why: `The parapet is a real hazard, but disturbing a bat roost is a criminal offence, and “we were in a hurry” isn't a defence. It would also stop the job for far longer than a survey.`,
            luck: { p: 0.5, good: { text: `Nobody notices this time. The ecologist's report lands on Helen's desk next month anyway.`, e: { team: -2 } },
              bad: { text: `A local bat group spots the scaffold and calls the police wildlife officer. Work stops while it's investigated.`, e: { time: -3, town: -5 } } } }
        ] },
      { id: 'sheep', who: 'priya', channel: 'Phone call', title: 'Sheep may safely graze', after: ['induction'], lo: '1.3',
        weight: S => 2,
        cause: S => 'Because an old railway has more crossings than the one with lights.',
        text: `A farmer at Low Beck has rung. His sheep keep getting onto the old line through a broken fence, and he wants to know who's fixing it. He also mentioned “his” crossing: a pair of field gates across the track that his family has used since 1920. It isn't on any of our drawings.`,
        choices: [
          { t: `Go and see him this week: fix the fence, agree who maintains it, and log his crossing as a risk.`, grade: 'best', e: { evidence: 4, town: 3, safety: 2 },
            why: `Keeping stock off the line is usually the railway's job, and old lines are full of private farm crossings nobody remembers. Each one is a level crossing with its own risk. Find them now, before a train does.` },
          { t: `Write to him and say we'll sort the fencing properly once the funding's confirmed.`, grade: 'ok', e: { town: -2 },
            why: `Polite, but the sheep can't read. A broken fence is a risk today, and you've missed the chance to learn about a crossing that isn't on your drawings.` },
          { t: `Tell him the fence is his to mend. They're his sheep, and it's his field they got out of.`, grade: 'poor', e: { town: -4 },
            why: `Railway fences are usually the railway's to keep. And you've just ignored a second level crossing on your line.`,
            luck: { p: 0.5, good: { text: `The farmer fixes the fence himself, grumbling loudly in the Kestrel Arms.`, e: { town: -2 } },
              bad: { text: `A ewe gets stuck in the rotten sleepers. The fire brigade come out. So does the Gazette.`, e: { town: -4, money: -2 } } } }
        ] },
      { id: 'scope', who: 'helen', channel: 'Phone call', title: 'While you’re at it…', after: ['plan'], lo: '1.5',
        weight: S => 1 + (S.trust.helen >= 3 ? 1 : 0),
        cause: S => 'Because a funded project attracts ideas like a picnic attracts wasps.',
        text: `Helen's been talking to the county. “While you're at it, could we add a park-and-ride at Kestrel Junction and turn the old goods shed into a café? It would really help the business case.” Neither is in the plan, the estimate or the risk register.`,
        choices: [
          { t: `Log them for after the panel: we price them, then you decide. This bid stays as costed.`, grade: 'best', e: { evidence: 3, team: 2 },
            why: `Good ideas still go through change control. Adding scope to a bid without costs or risks makes the whole case less believable. Write them down, price them, and decide with your eyes open.` },
          { t: `No, sorry. They're not in our scope, and this project's hard enough as it is.`, grade: 'ok', e: { team: -2 },
            why: `Protecting scope is right, but a flat no to your sponsor loses goodwill and maybe a good idea. “Not in this phase, and here's what it would take” is a better no.` },
          { t: `Add them to the bid. More benefits make a stronger case, and the county will back us on it.`, grade: 'poor', e: { evidence: -4, time: -1 },
            why: `More scope without more money, time or evidence is how a solid case becomes a shaky one. The panel will ask what they cost, and you won't know.`,
            ripple: { title: 'The café', text: `The goods shed café is in the bid. Nobody has priced the asbestos in its roof.`,
              later: `Chapter 2 preview: the café needs its own asbestos survey, planning consent and a kitchen. None of it is in the budget.` } }
        ] }
    ],
    // Workshop mode: every team faces the same three surprises (ids above).
    workshopEvents: ['storm', 'costhole', 'gazette'],

    end: {
      approved: `You looked before you promised. Most people do it the other way round and call it “being decisive”.`,
      conditions: `Conditions aren't a telling-off. They're the panel telling you exactly where to look next. Listen to them.`,
      deferred: `Deferred isn't dead. It means “not yet, and here's why”. That's useful, if you listen.`,
      secret: `…Yes. I kept her ticking over, first Sunday of the month for seventeen years. Somebody had to keep her company. Hannah's told me off for working alone. Keep my log: it's her only maintenance record.`
    },

    // Optional closing beat, "Go back and tell Harrowby": keyed by June's drop-in grade, then by panel outcome.
    tell: {
      best: {
        approved: [['june', `You came back. Go on, then. Don't make me guess.`], ['narrator', `You tell her. She's quiet for a moment. Then she takes a tray out of the window.`], ['june', `Right. Marjorie buns. Trial batch. If you tell anyone, I'll deny it.`]],
        conditions: [['june', `You came back. Go on, then. Don't make me guess.`], ['june', `Approved, with homework. That's more than we've had in seventeen years. I'll get the icing out. Just in case.`]],
        deferred: [['june', `You came back. Even with a “not yet”. Nobody did that in 2009.`], ['june', `Here, take a loaf. The ducks can manage without one for a day.`]]
      },
      ok: [['june', `Oh. It's you. Did the Authority have an answer, then?`], ['june', `Right. Well. Thanks for coming to tell me yourself. That's new.`]],
      poor: [['june', `There you are! Trains by next summer. I've had the mugs done. Look.`], ['june', `First batch sold out. So you'd better be right.`]]
    },

    // A personal next step for the report, keyed by the weakest row of the case.
    coach: {
      track: `Ask what's causing the problem, not just what it looks like: water, wood, weeds, stone and people.`,
      train: `Open it up before you plan it, and order the slow parts first.`,
      plan: `Before you give a date, write the tasks in the order they must happen and find the longest chain.`,
      forecast: `When a number helps your case, check it against similar real projects and show a range.`,
      date: `Give a range, and say what will narrow it.`,
      town: `Answer the question people asked. “I don't know yet, and I'll tell you when I do” earns more trust than a promise.`,
      safety: `Start with the biggest safety risk, and bring in the people who have to approve it early.`
    }
  },

  // THE CALLS: graded dilemmas with a confidence rating, a mentor's take and a named principle.
  calls: {
    forecast: { title: 'The Ridership Forecast', from: 'steve', task: 'forecast', lo: '1.5',
      text: `Steve's business case needs a passenger number. The consultant's model says 180,000 journeys a year, which would make the case sail through. “It's a lovely big number,” says Steve. “I'd like it to be true. I'd also like to be taller.”`,
      known: ['Harrowby has 4,200 residents', 'Similar reopened branch lines carry 60,000–140,000 journeys a year', 'The consultant was hired by the people who want the line'],
      unknown: ['How many people would really leave the car at home', 'Whether the panel will check the model'],
      principle: { name: 'Beware optimism bias', text: `Forecasts are nearly always too rosy: costs too low, benefits too high, dates too early. Test your numbers against similar real projects (reference class forecasting), and show a range.` },
      discuss: `Why do project forecasts tend to be optimistic, and who benefits from a big number?`,
      atWork: `At work: which number in your current project makes the case look good? Who could check it independently?`,
      choices: [
        { t: `Get the model independently checked and submit a range: low, central and high.`, d: `Costs about £20k and a hectic week.`, grade: 'best', e: { evidence: 10, money: -20, team: -2 }, ach: 'measure',
          why: `It costs £20k and a hectic week, and it makes every other number believable. Panels trust ranges they can test more than headlines they can't.` },
        { t: `Halve it to 90,000 to be on the safe side, and say clearly that we've been cautious.`, d: `Quick and cautious.`, grade: 'ok', e: { evidence: 2 },
          why: `Cautious, but it's a guess wearing a hard hat. Being pessimistic without evidence is still just guessing.` },
        { t: `Submit the consultant's 180,000. They're the experts, and it's their model.`, d: `The case looks strongest this way.`, grade: 'poor', e: { evidence: -6 },
          why: `Big numbers win funding, and then they get found out. Optimism bias is so common that official government appraisal guidance tells you to adjust for it.` }
      ] },
    date: { title: 'Name the Date', from: 'helen', task: 'date', lo: '1.6',
      text: `Helen wants a headline for the bid and the Harrowby Gazette. “Just give me a date I can put on a poster. Everyone loves a poster.” Your plan has about 28 weeks of work on site, then ten weeks of testing and training, if the funding lands, the weather behaves and the level crossing design goes through first time.`,
      known: ['The critical path is the track: about 28 weeks on site, then 10 weeks of testing and training', 'The funding decision is in six weeks', 'Harrowby has had three launch events already'],
      unknown: ['Whether the panel says yes', 'What the Beck Bridge examination will find', 'How long the regulator will take over the crossing', 'Whether the main line can give us a weekend for the junction'],
      principle: { name: 'Forecast in ranges, not points', text: `Early estimates are uncertain by nature. Commit to a range and narrow it as you learn. A single date announced too early becomes the anchor everyone judges you against.` },
      discuss: `When has a date announced too early come back to bite a project you know?`,
      atWork: `At work: who's waiting on a date from you? What honest range could you give them, and what would narrow it?`,
      choices: [
        { t: `Give her a range, spring to summer next year, and narrow it at each stage.`, d: `Honest, but less exciting for a poster.`, grade: 'best', e: { town: 2, evidence: 4 }, ach: 'range',
          why: `A range tells the truth about what you know. Narrow it as you learn, and every update is good news.` },
        { t: `No date at all until the panel has decided. Then we'll know what's real.`, d: `Nothing to walk back.`, grade: 'ok', e: { town: -4 },
          why: `Honest, but silence gets filled with rumours. A range would have given her something true to say.` },
        { t: `This August bank holiday. A target focuses minds, and people love a bank holiday.`, d: `A great headline.`, grade: 'poor', e: { town: 6, time: -2 },
          why: `Your own plan doesn't finish the track until late autumn, so that date was never real. Now it's a promise. Every slip becomes a headline, and the first person to see the poster will be June.`,
          ripple: { title: 'The poster', text: `“OPENING AUGUST BANK HOLIDAY” is up in the bakery window, the pub and the bus shelter. Somebody has laminated it.`,
            later: `Chapter 2 preview: the crossing design needs a second round with the regulator. The laminated poster is still in the bakery window.` } }
      ] }
  },

  achievements: [
    { id: 'kettle', ic: '☕', name: 'Kettle’s On', hint: 'Every good project starts the same way.', desc: 'Made a round of tea. Nobody said thank you. Everybody noticed.' },
    { id: 'peep', ic: '📯', name: 'Peep Peep', hint: 'Marjorie has something to say. Quietly.', desc: 'Tried Marjorie’s horn with an empty air tank. She did her best.' },
    { id: 'pigeon', ic: '🕊️', name: 'Pigeon Whisperer', hint: 'Someone is living rent-free in the guard’s compartment.', desc: 'Showed Kevin the pigeon the door. Well, the window.' },
    { id: 'cat', ic: '🐈', name: 'Where’s Sleeper?', hint: 'The depot has a supervisor. She’s usually asleep.', desc: 'Found and fussed Sleeper, the depot cat.' },
    { id: 'eagle', ic: '🦅', name: 'Eagle Eye', hint: 'Judge the track the way Tom would.', desc: 'Judged every track defect like a track engineer.' },
    { id: 'order', ic: '🧩', name: 'Order, Order!', hint: 'Some jobs have to wait for other jobs.', desc: 'Put all nine jobs in the right order, first time.' },
    { id: 'biscuit', ic: '🍪', name: 'Biscuit Diplomacy', hint: 'Tell the room the truth. Accept the digestive.', desc: 'Answered every drop-in question honestly. Earned the digestive.' },
    { id: 'measure', ic: '📏', name: 'Measure Twice', hint: 'A big number is a question, not an answer.', desc: 'Had the ridership forecast independently checked.' },
    { id: 'range', ic: '📅', name: 'Home on the Range', hint: 'Dates are promises. Ranges are honest.', desc: 'Gave Helen a range instead of a date.' },
    { id: 'local', ic: '👋', name: 'Local Knowledge', hint: 'Harrowby has opinions. Go and hear them.', desc: 'Stopped and listened to Len, June, Dev and Jess.' },
    { id: 'anorak', ic: '🧥', name: 'Anorak', hint: 'Engineers leave notes lying about.', desc: 'Read every engineering note in the valley. Wear it with pride.' },
    { id: 'page', ic: '📓', name: 'First Page', hint: 'Someone keeps a log. It isn’t Gaz.', desc: 'Found a page from a very private log. There may be more.' },
    { id: 'green', ic: '🟢', name: 'Green Light', hint: 'Win the panel over completely.', desc: 'Funding approved with no conditions.' }
  ],

  // Career rank from Judgment Points (JP). JP reward the quality of decisions, never luck.
  ranks: [
    { jp: 0, name: 'Graduate PM' }, { jp: 200, name: 'Assistant PM' }, { jp: 500, name: 'Project Manager' },
    { jp: 800, name: 'Senior PM' }, { jp: 1600, name: 'Programme Director' }
  ],

  // Words you'll hear: plain one-line definitions for first-timers (for the Journal).
  glossary: [
    { term: 'Ballast', def: 'The bed of crushed stone the sleepers sit in. It holds the track in place and lets water drain away.' },
    { term: 'Bogie', def: 'The wheeled frame under each end of a train. The wheels, springs and brakes hang off it.' },
    { term: 'Calibration', def: 'How well your confidence matches how often you turn out to be right.' },
    { term: 'Cess', def: 'The flat strip beside the track. It is where you walk, and where the drains usually run.' },
    { term: 'Change control', def: 'Writing a change down, pricing its effect on time, cost and risk, and getting it agreed before you do it.' },
    { term: 'Contingency', def: 'Money held back for risks you know about but can’t price exactly yet.' },
    { term: 'Critical path', def: 'The longest chain of work that depends on other work. It sets the finish date: any slip on it moves the date.' },
    { term: 'Float', def: 'How far a piece of work can slip before it delays the finish date.' },
    { term: 'Gate review', def: 'A decision point where a panel checks the case and says go, or not yet.' },
    { term: 'Level crossing', def: 'Where a road or path crosses the railway on the level. One of the biggest sources of train accident risk.' },
    { term: 'Long-lead item', def: 'Something that takes months to make or deliver, so it has to be ordered early.' },
    { term: 'On or near the line', def: 'On the track, or within 3 metres of the nearest rail. Being there needs training, PPE and a safe system of work.' },
    { term: 'One train working', def: 'The simplest signalling there is: one train on the branch at a time, with a token called the staff to prove it.' },
    { term: 'Optimism bias', def: 'The habit of expecting costs to be lower, benefits higher and dates earlier than they turn out.' },
    { term: 'Possession', def: 'The line closed to normal trains and handed to the engineers for a set time, so work can happen safely.' },
    { term: 'Reference class forecasting', def: 'Checking your estimate against what similar real projects actually achieved.' },
    { term: 'Relay', def: 'Taking out the old track and laying new sleepers, rail and ballast.' },
    { term: 'Risk register', def: 'The list of what could go wrong: how likely, how bad, who owns it and what is being done about it.' },
    { term: 'Safe system of work', def: 'A planned, briefed way of doing a job, so everyone knows the dangers and how to stay clear of them.' },
    { term: 'Scour', def: 'Fast water washing away the ground round a bridge pier, usually where nobody can see it.' },
    { term: 'Sleeper', def: 'The beams under the rails that hold them the right distance apart. Old ones are timber; new ones are usually concrete.' },
    { term: 'Tamping', def: 'Packing the ballast firmly under the sleepers so the track sits at the right level and line.' },
    { term: 'Wheelset', def: 'A pair of wheels fixed to one axle. Safety-critical, so it needs crack testing and a certificate.' }
  ],

  // Pre/post self-check (same items both times; answers stay on the device).
  selfCheck: {
    stem: 'How confident are you that you can…',
    scale: ['Not at all', 'Slightly', 'Moderately', 'Very', 'Completely'],
    items: [
      { id: 'q1', lo: '1.4', t: '…work out which tasks have to wait for others, and which chain of work sets the finish date?' },
      { id: 'q2', lo: '1.5', t: '…tell when an estimate or forecast is too optimistic, and what to do about it?' },
      { id: 'q3', lo: '1.6', t: '…give a sponsor or the public a timescale that is honest about what you don’t know yet?' },
      { id: 'q4', lo: '1.7', t: '…judge how sure you really are about a decision?' },
      { id: 'q5', lo: '1.8', t: '…put together the evidence a funding or approval panel needs before it says yes?' }
    ]
  }
};
