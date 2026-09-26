/* LINESIDE — Scenario pack: "The Kestrel Vale Line"
 * Sector: rail · community line reopening · Level: new → experienced project people
 *
 * The story: the Harrowby branch closed "temporarily" in 2009. The track is worn out, and
 * Marjorie — a 1961 diesel railcar — has sat in the depot ever since. You lead the reopening:
 * renew the track, restore the train, test it all, and open the line so the valley can thrive again.
 *
 * A pack is pure data. The engine (js/game.js) plays it; js/packs/kestrel-vale-world.js places it
 * in the open world. Chapter 1 ("Make the Case") is playable; the rest are planned (see `chapters`).
 *
 * Metric keys: time (schedule float, weeks) · money (contingency, £k) · safety · evidence · team · town (support %)
 * Grades: best / ok / poor. Judgment Points (JP) reward decisions, never luck.
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
              look: { skin: '#f3d2bb', hair: '#b4492a', hairStyle: 'ponytail', top: '#e5d534', topStyle: 'hivis', bg: '#e9e2b3' } },
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
  chapters: [
    { title: 'Make the Case', phase: 'Feasibility & funding', when: 'March · Weeks 1–6', playable: true,
      teaser: 'Walk the worn-out line, give Marjorie a health check, win over Harrowby and face the Funding Panel.' },
    { title: 'Strip Down', phase: 'Mobilisation', when: 'May · Weeks 7–14',
      teaser: 'Marjorie comes apart in the depot, an ecologist counts nests, and Tom books the first closure of the line.' },
    { title: 'The Relay', phase: 'Track renewal', when: 'Summer · Weeks 15–28',
      teaser: 'Drainage, three miles of new sleepers and rail, and a tamping machine the crew call Tina.' },
    { title: 'Crossing Lines', phase: 'Level crossing & junction', when: 'Autumn · Weeks 29–36',
      teaser: 'The Crag Lane crossing, the regulator, and joining a main line that never stops for anyone.' },
    { title: 'First Movement', phase: 'Testing & commissioning', when: 'Winter · Weeks 37–46',
      teaser: 'Static tests, the first test run, driver training, and the day the horn finally works properly.' },
    { title: 'The Big Day', phase: 'Grand opening', when: 'Spring · Week 50',
      teaser: 'Bunting, a brass band, a ribbon, and four hundred people who said it would never happen.' }
  ],

  /* ============================ CHAPTER 1 · MAKE THE CASE ============================ */
  c1: {
    intro: [
      ['narrator', `Harrowby, in the Kestrel Vale. The branch line closed “temporarily” in 2009. The sign on the station gate still says so.`],
      ['narrator', `Since then the bank has gone, the Saturday market has gone, and anyone under twenty-five catches the 41 bus. It comes twice a day, if it's feeling generous.`],
      ['helen', `{name}! Helen Walsh, Vale Transport Authority. Welcome to the most optimistic job in the county. There's £4.8 million on the table from the Reconnecting Communities Fund to reopen the line to Kestrel Junction.`],
      ['helen', `In six weeks a Funding Panel decides whether we get it. Your job is to make the case. A real one, with facts in. I've been to three launch events for this railway. I'd like the next one to have a train at it.`],
      ['moira', `Moira Kell. I was Harrowby's last station master. Helen thinks I'm here to show you round. I'm actually here because I'm nosy.`],
      ['moira', `Free advice: look at things before you promise things. The track, the train, the town. Go and see them with your own eyes.`]
    ],

    // The chapter's objectives. `needs` is the engineering and project logic: some things have to wait for others.
    tasks: [
      { id: 'induction', label: 'Get your site induction', where: 'Hannah · project office' },
      { id: 'walk', label: 'Walk the line with Tom', where: 'the old trackbed · judge 5 defects', needs: ['induction'] },
      { id: 'health', label: 'Give Marjorie a health check', where: 'Gaz · Harrowby depot', needs: ['induction'] },
      { id: 'dropin', label: 'Run the drop-in at the village hall', where: 'Priya & Cllr Brian' },
      { id: 'plan', label: 'Build the works plan', where: 'Jo · project office', needs: ['walk', 'health'] },
      { id: 'forecast', label: 'The Call: The Ridership Forecast', where: 'Steve · project office', needs: ['plan'] },
      { id: 'date', label: 'The Call: Name the Date', where: 'Helen · station platform', needs: ['forecast'] },
      { id: 'panel', label: 'Face the Funding Panel', where: 'the village hall', needs: ['walk', 'health', 'plan', 'forecast', 'date', 'dropin'] }
    ],

    talks: {
      hannah_induction: { who: 'hannah',
        text: `Hannah Clarke, safety. Before you go anywhere near that track or the depot: induction. It takes twelve minutes, there's a quiz, and yes, everybody does it. Including directors. Especially directors.`,
        choices: [
          { t: `What are the three things most likely to hurt me out there?`, grade: 'best', e: { safety: 8, evidence: 3 }, trust: 1,
            reply: `Ooh, good question. One: rotten sleepers. They look solid until they aren't. Two: the Beck Bridge parapet is loose, so don't lean on it. Three: the Crag Lane crossing, where drivers have forgotten it's a railway. Here's your hi-vis and hard hat. Your locker's the one with NEW on it.` },
          { t: `Full induction, and I'll do the quiz properly.`, grade: 'ok', e: { safety: 5 }, trust: 1,
            reply: `A volunteer! Right: the line's closed, but that doesn't make it safe. Walk in the cess, that's the flat bit beside the track, and don't touch anything with a lever on it. Here's your kit.` },
          { t: `Can we do the short version? I'm keen to get out there.`, grade: 'poor', e: { safety: -4 }, trust: -1,
            reply: `Short version: the line can still hurt you. The long version is the same with pictures. Here's your kit, but I'm writing down that you asked.` }
        ] },
      tom_walk: { who: 'tom',
        text: `Tom Brennan. I've looked after track for twenty-two years and this is the saddest three miles I've ever seen. Shall we walk it? Log anything that worries you, and I'll tell you if you're worrying about the right things.`,
        choices: [
          { t: `You know this line. What should I be looking for?`, grade: 'best', e: { evidence: 3, team: 3 }, trust: 1,
            reply: `Water, wood, weeds, stone and people. Five things. Water's the killer, because track's only as good as its drainage. Go on, find 'em. I'll be right behind you.` },
          { t: `Let's walk the whole line, end to end.`, grade: 'ok', e: { evidence: 3 }, trust: 1,
            reply: `Proper job. Stay in the cess and shout if something looks wrong. There are five things I'd want in the report. Find 'em.` },
          { t: `Can't we just use the drone survey from 2019?`, grade: 'poor', e: { evidence: -2 }, trust: -1,
            reply: `We could. It shows some lovely treetops. It doesn't show the sleepers under them, mind. Let's walk it anyway.` }
        ] },
      gaz_tour: { who: 'gaz',
        text: `Gaz Whitfield, depot fitter. And this is Marjorie. Built 1961, last passenger run 2009, and she's been stood in here ever since like she's waiting for a bus. Are you here to see her or to write her off?`,
        choices: [
          { t: `To see her. Show me everything, the good and the bad.`, grade: 'best', e: { evidence: 4, team: 4 }, trust: 1,
            reply: `Good answer. Have a look round her: bogies, brakes, engines, cab and body. Tell me what you reckon and I'll tell you what it'll take.` },
          { t: `What does she need, in one sentence?`, grade: 'ok', e: { evidence: 2 }, trust: 0,
            reply: `One sentence? Everything, in the right order. Have a look round her and you'll see what I mean.` },
          { t: `Honestly, wouldn't a new train be cheaper?`, grade: 'ok', e: { evidence: 2, team: -3 }, trust: -1,
            reply: `Fair question, but no. There's a two-year waiting list and it's three times the price, and it wouldn't have her personality. Have a look before you decide.` }
        ] }
    },

    // Track walk: judge each defect. The world draws each one on the trackbed at x.
    defects: [
      { id: 'sleepers', x: 1528, title: 'Rotten sleepers', icon: '🪵',
        see: `You press your boot on a sleeper and it goes “squelch”, which sleepers should never do. They're 1970s timber, soft as cake. The rail on top is 1950s bullhead, a museum piece.`,
        options: [
          { t: `Renew the track, sleepers and rail, before any train runs.`, grade: 'best', e: { evidence: 5 }, why: `Right. It's not a repair, it's a relay. Life-expired is life-expired.` },
          { t: `Swap out the worst sleepers and keep the old rail.`, grade: 'ok', e: { evidence: 2 }, why: `Spot re-sleepering buys you a year on a working line. On a reopening you'd be back in two, and that rail's older than my dad.` },
          { t: `It's cosmetic. Trains ran on it in 2009.`, grade: 'poor', e: {}, why: `Trains ran on it in 2009 because it was 2009. Wood doesn't stand still.` }
        ] },
      { id: 'drain', x: 1690, title: 'Blocked drain', icon: '💧',
        see: `The drain beside the Beck Bridge is choked with silt and leaves. There's a puddle in the ballast with a duck in it. Where water stands, the stones underneath turn to mud. Tom calls it “wet beds”.`,
        options: [
          { t: `Clear and renew the drainage before the new track goes down.`, grade: 'best', e: { evidence: 5 }, why: `That's it. Water is the enemy of track. Drainage first, always, or the new track goes the same way as the old.` },
          { t: `Sort the drainage once the new track is in.`, grade: 'ok', e: { evidence: 1 }, why: `Then you're digging up brand-new track to fix what's under it. Sequence matters.` },
          { t: `It's only a puddle. Log the duck.`, grade: 'poor', e: {}, why: `The duck agrees with you. The duck is not a track engineer.` }
        ] },
      { id: 'bridge', x: 1795, title: 'Beck Bridge', icon: '🌉',
        see: `The little three-arch bridge over the beck. The parapet has loose stones, there's a sapling growing out of the mortar, and the water is doing something suspicious round the middle pier.`,
        options: [
          { t: `Get a bridge engineer to do a full structural examination.`, grade: 'best', e: { evidence: 5, safety: 2 }, why: `Yes. I can tell you it looks poorly. Only an examiner can tell you why, and how poorly.` },
          { t: `Repoint the stonework and pull out the sapling.`, grade: 'ok', e: { evidence: 2 }, why: `Nice and tidy. But the thing that matters is scour at the pier, and you can't see scour from up here.` },
          { t: `It's stood since 1874. It'll stand a bit longer.`, grade: 'poor', e: { safety: -2 }, why: `That's what every old bridge says, right up until it doesn't.` }
        ] },
      { id: 'veg', x: 2380, title: 'Vegetation', icon: '🌿',
        see: `A buddleia the size of a bus shelter, a young sycamore coming up through the ballast, and a shopping trolley. Nobody knows how the trolley got here. Nobody ever does.`,
        options: [
          { t: `Clear it, after an ecologist checks for nesting birds.`, grade: 'best', e: { evidence: 5 }, why: `Spot on. Nesting season runs from March to August. Flail a bush with a nest in it and you've broken the law and upset a blackbird.` },
          { t: `Get a crew in and clear the lot next week.`, grade: 'ok', e: { evidence: 1, time: 1 }, why: `Keen. But it's March and the birds are nesting. You'd need an ecologist to check first, or you'd have to wait.` },
          { t: `Leave it. The roots hold the embankment together.`, grade: 'poor', e: {}, why: `They hold it together the way a cat holds a sofa together. Roots in the ballast stop it draining.` }
        ] },
      { id: 'crossing', x: 2605, title: 'Crag Lane level crossing', icon: '🚧',
        see: `The crossing lights are dead, the gates have rusted open, and there's a car parked across the rails while its driver posts a letter. Round here, people have forgotten this is a railway.`,
        options: [
          { t: `Make it a top risk: new crossing design, and involve the council and the regulator early.`, grade: 'best', e: { evidence: 5, safety: 4 }, why: `That's the one. Level crossings are the biggest safety risk on the railway. Get the regulator on side early, or this will be your critical path.` },
          { t: `Fix the lights and paint the gates.`, grade: 'ok', e: { evidence: 1 }, why: `It's a start, but it's not about looking tidy. It needs a proper risk assessment, and probably a new design.` },
          { t: `Leave it for later. No trains, no problem.`, grade: 'poor', e: { safety: -3 }, why: `No trains yet. But people's habits take longer to change than steel does. Start now.` }
        ] }
    ],
    walkDone: `That's the walk done, and you've got a proper defects list. Look at it: water, wood, weeds, stone and people. Take it to Jo, she'll want it for the plan.`,

    // Marjorie's health check: hotspots along the railcar in the depot.
    hotspots: [
      { id: 'cab', x: 150, label: 'Cab & electrics', title: 'Cab & electrics',
        text: `The batteries are flat as a pancake, and the wiring has 1960s cloth insulation that crumbles if you look at it too hard. She needs a full rewire and new batteries. Go on, try the horn. I dare you.`,
        extra: { q: `Try the horn?`, options: [`Go on, then`, `Better not`], pick: 0, after: `…peep.`, gaz: `That's the flat battery. When she's right, they'll hear her in the next county.`, ach: 'peep', sfx: 'peep' } },
      { id: 'bogies', x: 262, label: 'Bogies & wheels', title: 'Bogies & wheelsets',
        text: `She's sat in one spot for seventeen years, so she's got flat spots on her wheels. Like me after Christmas. The wheel tyres are near their scrap limit too, so the bogies come out and the wheelsets go away to be re-profiled or replaced.` },
      { id: 'brakes', x: 360, label: 'Brakes', title: 'Brakes',
        text: `The vacuum brake cylinders are seized solid and the brake blocks are glazed. And the brake rigging hangs off the bogies, so there's no point touching the brakes until the bogies are done. Remember that one.` },
      { id: 'engine', x: 480, label: 'Engines & gearbox', title: 'Engines & gearbox',
        text: `Two diesels under the floor, and here's the odd bit. The oil's fresh, and number two turns over by hand. Someone's been looking after her. Don't ask me who.`, aside: `Gaz glances, very briefly, towards the station.` },
      { id: 'body', x: 640, label: 'Body & doors', title: 'Body & doors',
        text: `There's rust in the door pillars, and one door won't shut unless you give it a hip-bump. Also, shh, there's a pigeon living in the guard's van. He's called Kevin. I don't know who named him.`,
        extra: { q: `What do you do about Kevin?`, options: [`Open the window and let him find his own way out`, `Wave your arms and shout “shoo!”`], pick: 0,
          after: `Kevin considers the open window, shrugs in a pigeon sort of way, and strolls out into the spring.`, gaz: `Well I never. Pigeon whisperer.`, ach: 'pigeon', sfx: 'coo',
          wrong: `Kevin does three laps of the depot, knocks over Gaz's tea and leaves by the skylight. Pigeon one, project manager nil.` } }
    ],
    healthDone: `So: strip her down, then bogies and wheels, then brakes, then engines and electrics, then static tests in here. Then, and only then, test runs out on the line. Which means the line's got to be fit to run on. Jo's got a planning board and a worrying number of sticky notes.`,

    // The works plan. Each lane must go in dependency order; then two questions on the critical path.
    plan: {
      intro: `Jo Adeyemi, engineering. I've got sticky notes, a whiteboard and a mild caffeine problem. There are two workstreams: Marjorie and the track. Put each one in the order the work has to happen. Tap a card to place it.`,
      notReady: `Come back when you've walked the track and seen the train. I don't plan from rumours.`,
      lanes: [
        { id: 'train', label: 'Marjorie', color: 'ember', cards: [
          { id: 't1', t: 'Strip down & inspect', w: 2, why: `You can't fix what you haven't opened up.` },
          { id: 't2', t: 'Bogies & wheelsets', w: 5, why: `Bogies come out first, because everything underneath hangs off them.` },
          { id: 't3', t: 'Brake overhaul', w: 3, why: `The brake rigging lives on the bogies, so brakes follow the bogies.` },
          { id: 't4', t: 'Engines & electrics', w: 4, why: `Engines and the rewire go in once she's back on her wheels and safe to move.` },
          { id: 't5', t: 'Static tests in the depot', w: 2, why: `Test everything standing still before she moves an inch.` }
        ] },
        { id: 'track', label: 'The track', color: 'teal', cards: [
          { id: 'k1', t: 'Ecology check & clear vegetation', w: 3, why: `Clear the ground first, and check for nests before you do.` },
          { id: 'k2', t: 'Renew the drainage', w: 4, why: `Water first. New track on bad drainage is money down the beck.` },
          { id: 'k3', t: 'Relay the track: sleepers, rail & ballast', w: 9, why: `Only then the new track, on a dry, clear base.` },
          { id: 'k4', t: 'Renew & test the level crossing', w: 4, why: `The crossing ties into the new track, so it goes in last and gets tested.` }
        ] }
      ],
      questions: [
        { q: `Marjorie is ready in week 16. The track is ready in week 20. When can test runs on the line start?`,
          options: [
            { t: `Week 20, when both are finished.`, grade: 'best', why: `Test runs need a working train and a working railway. The later of the two sets the date.` },
            { t: `Week 18, on the half of the line that's finished.`, grade: 'ok', why: `Possible in theory, but testing on a half-built railway means extra closures, protection and risk. Most projects wait for the whole route.` },
            { t: `Week 16. She's ready, so let's go.`, grade: 'poor', why: `On what, the old track? The squelchy bits are still there until week 20.` }
          ] },
        { q: `So which workstream is on the critical path, the chain of work that sets the opening date?`,
          options: [
            { t: `The track. It's 20 weeks against Marjorie's 16.`, grade: 'best', why: `Exactly. Marjorie has four weeks of float. Don't tell Gaz, he'll take up golf.` },
            { t: `It depends which one slips.`, grade: 'ok', why: `True, a slip can move the critical path. But right now it's the track, and that's where to point your attention.` },
            { t: `Marjorie. She's the star.`, grade: 'poor', why: `She's the star, but the track is the long pole. Watch the longest chain, not the most famous one.` }
          ] }
      ],
      done: `That's a plan. Steve's been waiting to put numbers on it. He's by the kettle, pretending not to be.`
    },

    // Drop-in at the village hall: answers move Town support. Over-promises feel good now and echo later.
    dropin: {
      intro: [
        ['priya', `Priya Nair, community. Welcome to the drop-in! About forty people came, which in Harrowby counts as a festival. They've heard promises before, so tell them the truth, even when it's “I don't know yet”.`],
        ['brian', `Councillor Brian Pike, parish council. I've done the biscuits. Custard creams for the public, Hobnobs for the speaker. Earn your Hobnob.`]
      ],
      questions: [
        { who: 'june', text: `Will it actually open this time? We've had three launch events and a commemorative mug.`,
          choices: [
            { t: `I can't promise yet. In six weeks we'll know if we're funded, and I'll come back and tell you either way.`, grade: 'best', e: { town: 7 }, reply: `…Well. That's the first straight answer we've had. I'll hold you to the coming back.` },
            { t: `That's really a question for the Authority.`, grade: 'ok', e: { town: -3 }, reply: `That's what the last one said. And the one before.` },
            { t: `Yes. Trains by next summer, guaranteed.`, grade: 'poor', e: { town: 8 }, reply: `Guaranteed! Did everyone hear that? I'm writing it on the mug.`,
              ripple: { title: `The mug`, text: `June has had your “guaranteed” printed on a new mug. It sells well. Every slip in the plan now gets compared to it.` } }
          ] },
        { who: 'len', text: `The Crag Lane crossing. Kids cut across it on their bikes. What happens when trains run again?`,
          choices: [
            { t: `It's one of our top risks. We'll design a proper crossing, and we'll talk to the school before a single train runs.`, grade: 'best', e: { town: 5, safety: 4 }, reply: `Good. That's how we did it in my day. Tell the kids the rules and tell them why.` },
            { t: `We'll put some signs up.`, grade: 'ok', e: { town: 1 }, reply: `Signs. Right. Kids love reading signs.` },
            { t: `The trains will be slow. It'll be fine.`, grade: 'poor', e: { town: -3, safety: -4 }, reply: `Slow's still heavier than a bike, love.` }
          ] },
        { who: 'jess', text: `Will there be lorries going past the school while you build it?`,
          choices: [
            { t: `Probably some, yes. We'll agree routes and times with the school and stay away from drop-off and pick-up.`, grade: 'best', e: { town: 5 }, reply: `Okay. Honest. I can work with honest.` },
            { t: `We'll keep it to a minimum.`, grade: 'ok', e: { town: 1 }, reply: `“A minimum.” I've heard that one before.` },
            { t: `No lorries at all, I promise.`, grade: 'poor', e: { town: 4 }, reply: `Really? Brilliant!`,
              ripple: { title: `The first lorry`, text: `Ballast arrives by lorry, as ballast does. Jess photographs it outside the school gate and tags the Authority.` } }
          ] }
      ],
      outroAll: `Well! That's the least shouty drop-in we've had since the bypass. Have a Hobnob. Have two.`,
      outroSome: `Not bad at all. A few eyebrows went up, mind. Have a custard cream.`
    },

    // The Funding Panel: a gate review. Your evidence from the whole chapter decides the outcome.
    panel: {
      intro: [
        ['narrator', `Thursday. The Funding Panel meets in Harrowby Village Hall, because the Authority's meeting room has a leak. Somebody has got out the good cups.`],
        ['helen', `Right. Sue does the money and Raj does the difficult questions. Let's see the case, {name}.`]
      ],
      questions: [
        { who: 'sue', text: `Your contingency. How did you decide how much you need?`,
          choices: [
            { t: `From the risks we found. The bridge and the crossing are the big unknowns, so that's where it's held.`, grade: 'best', reply: `Risk-based. Lovely. I can test that.` },
            { t: `It's ten per cent, which is standard.`, grade: 'ok', reply: `Standard for whom? Still, it's something.` },
            { t: `We shouldn't need much. The plan's solid.`, grade: 'poor', reply: `Every plan's solid until it meets the ground, love.` }
          ] },
        { who: 'raj', text: `What's the biggest risk to your opening date?`,
          choices: [
            { t: `The track, and the level crossing in particular. It's on the critical path and needs the regulator's approval.`, grade: 'best', reply: `Good. You know where your date lives.` },
            { t: `Marjorie's engines. They're sixty-five years old.`, grade: 'ok', reply: `A real risk, but she has float. It isn't the one that moves your date.` },
            { t: `Honestly? We've got it all under control.`, grade: 'poor', reply: `That's the answer that worries me most.` }
          ] }
      ],
      outcomes: {
        approved: { stamp: 'APPROVED', title: 'Approved, with no conditions', text: `The panel approves the full £4.8 million. Sue even releases an extra £100k of risk allowance, “because your risks are real and you've found them”.`, e: { money: 100, team: 6, town: 6 }, jp: 100 },
        conditions: { stamp: 'APPROVED WITH CONDITIONS', title: 'Approved, with conditions', text: `The panel approves the money, with conditions: a review of the weakest parts of the case before the first spend, and a report back in Chapter 2.`, e: { team: 2, town: 2 }, jp: 50 },
        deferred: { stamp: 'DEFERRED', title: 'Deferred: “not yet”', text: `The panel defers the decision for three months and asks for better evidence. That's not a no, but the clock doesn't stop.`, e: { time: -4, team: -4 }, jp: 0 }
      }
    },

    end: {
      approved: `You looked before you promised. Most people do it the other way round and call it “being decisive”.`,
      conditions: `Conditions aren't a telling-off. They're the panel telling you exactly where to look next. Listen to them.`,
      deferred: `Deferred isn't dead. It means “not yet, and here's why”. That's useful, if you listen.`,
      secret: `…Yes, all right. It was me who kept Marjorie ticking over. First Sunday of every month for seventeen years. Somebody had to keep her company.`
    }
  },

  // THE CALLS: graded dilemmas with a confidence rating, a mentor's take and a named principle.
  calls: {
    forecast: { title: 'The Ridership Forecast', from: 'steve', task: 'forecast',
      text: `Steve's business case needs a passenger number. The consultant's model says 180,000 journeys a year, which would make the case sail through. “It's a lovely big number,” says Steve. “I'd like it to be true. I'd also like to be taller.”`,
      known: ['Harrowby has 4,200 residents', 'Similar reopened branch lines carry 60,000–140,000 journeys a year', 'The consultant was hired by the people who want the line'],
      unknown: ['How many people would really leave the car at home', 'Whether the panel will check the model'],
      principle: { name: 'Beware optimism bias', text: `Forecasts are nearly always too rosy: costs too low, benefits too high, dates too early. Test your numbers against similar real projects (reference class forecasting), and show a range.` },
      discuss: `Why do project forecasts tend to be optimistic, and who benefits from a big number?`,
      choices: [
        { t: `Get the model independently checked and submit a range: low, central and high.`, d: `Costs a week and about £20k.`, grade: 'best', e: { evidence: 10, time: -1, money: -20 }, ach: 'measure',
          why: `It costs a week and £20k, and it makes every other number believable. Panels trust ranges they can test more than headlines they can't.` },
        { t: `Halve it to 90,000 to be on the safe side.`, d: `Quick and cautious.`, grade: 'ok', e: { evidence: 2 },
          why: `Cautious, but it's a guess wearing a hard hat. Being pessimistic without evidence is still just guessing.` },
        { t: `Submit 180,000. It's the consultant's number, not ours.`, d: `The case looks strongest this way.`, grade: 'poor', e: { evidence: -6 },
          why: `Big numbers win funding, and then they get found out. Optimism bias is so common that HM Treasury publishes guidance telling you to adjust for it.` }
      ] },
    date: { title: 'Name the Date', from: 'helen', task: 'date',
      text: `Helen wants a headline for the bid and the Harrowby Gazette. “Just give me a date I can put on a poster. Everyone loves a poster.” Your plan has about 20 weeks of track work, if the funding lands, the weather behaves and the level crossing design goes through first time.`,
      known: ['The critical path is the track: about 20 weeks', 'The funding decision is in six weeks', 'Harrowby has had three launch events already'],
      unknown: ['Whether the panel says yes', 'What the Beck Bridge examination will find', 'How long the regulator will take over the crossing'],
      principle: { name: 'Forecast in ranges, not points', text: `Early estimates are uncertain by nature. Commit to a range and narrow it as you learn. A single date announced too early becomes the anchor everyone judges you against.` },
      discuss: `When has a date announced too early come back to bite a project you know?`,
      choices: [
        { t: `Give her a range, “spring to summer next year”, and narrow it at each stage.`, d: `Honest, but less exciting for a poster.`, grade: 'best', e: { town: 2, evidence: 4 }, ach: 'range',
          why: `A range tells the truth about what you know. Narrow it as you learn, and every update is good news.` },
        { t: `No date at all until after the panel.`, d: `Nothing to walk back.`, grade: 'ok', e: { town: -4 },
          why: `Honest, but silence gets filled with rumours. A range would have given her something true to say.` },
        { t: `The August bank holiday. People love a bank holiday.`, d: `A great headline.`, grade: 'poor', e: { town: 6, time: -2 },
          why: `The date is now a promise. Every slip becomes a headline, and the first person to see the poster will be June.`,
          ripple: { title: 'The poster', text: `“OPENING AUGUST BANK HOLIDAY” is up in the bakery window, the pub and the bus shelter. Somebody has laminated it.` } }
      ] }
  },

  achievements: [
    { id: 'kettle', ic: '☕', name: 'Kettle’s On', hint: 'Every good project starts the same way.', desc: 'Made a brew in the project office.' },
    { id: 'peep', ic: '📯', name: 'Peep Peep', hint: 'Marjorie has something to say. Quietly.', desc: 'Tried Marjorie’s horn on a flat battery.' },
    { id: 'pigeon', ic: '🕊️', name: 'Pigeon Whisperer', hint: 'Someone is squatting in the guard’s van.', desc: 'Evicted Kevin the pigeon with kindness.' },
    { id: 'cat', ic: '🐈', name: 'Where’s Sleeper?', hint: 'The depot has a supervisor. She’s usually asleep.', desc: 'Found and fussed Sleeper, the depot cat.' },
    { id: 'eagle', ic: '🦅', name: 'Eagle Eye', hint: 'Judge the track the way Tom would.', desc: 'Judged every track defect like a track engineer.' },
    { id: 'order', ic: '🧩', name: 'Order, Order!', hint: 'Some jobs have to wait for other jobs.', desc: 'Built a perfect works plan at the first go.' },
    { id: 'biscuit', ic: '🍪', name: 'Biscuit Diplomacy', hint: 'Tell the room the truth. Accept the Hobnob.', desc: 'Answered every drop-in question honestly.' },
    { id: 'measure', ic: '📏', name: 'Measure Twice', hint: 'A big number is a question, not an answer.', desc: 'Had the ridership forecast independently checked.' },
    { id: 'range', ic: '📅', name: 'Range Rover', hint: 'Dates are promises. Ranges are honest.', desc: 'Gave Helen a range instead of a date.' },
    { id: 'local', ic: '👋', name: 'Local', hint: 'Harrowby has opinions. Go and hear them.', desc: 'Chatted with Len, June, Dev and Jess.' },
    { id: 'anorak', ic: '🧥', name: 'Anorak', hint: 'Engineers leave notes lying about.', desc: 'Read every engineering note in the valley.' },
    { id: 'page', ic: '📓', name: 'First Page', hint: 'Someone keeps a log. It isn’t Gaz.', desc: 'Found a page of a very private log.' },
    { id: 'green', ic: '🟢', name: 'Green Light', hint: 'Win the panel over completely.', desc: 'Funding approved with no conditions.' }
  ],

  // Career rank from Judgment Points (JP). JP reward the quality of decisions, never luck.
  ranks: [
    { jp: 0, name: 'Graduate PM' }, { jp: 200, name: 'Assistant PM' }, { jp: 500, name: 'Project Manager' },
    { jp: 800, name: 'Senior PM' }, { jp: 1600, name: 'Programme Director' }
  ]
};
