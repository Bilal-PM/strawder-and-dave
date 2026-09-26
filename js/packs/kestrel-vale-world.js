/* LINESIDE — "The Kestrel Vale Line": the explorable world layer.
 * Where people are each chapter, what the town says, what you can inspect,
 * Moira's hints and the eight pages of her 1986 notebook.
 * World x reference (units): school 30 · cottages 300–500 · bakery 520 · bus stop 662 · pub 730
 * · village hall 940 (door 1015) · noticeboard 1135 · church 1170 · hill 1320–1790 · station 1785–1960
 * · viaduct 1960–3660 (Pier 4 ≈ 2578) · site cabin 3760 (door 3874) · welfare 3950 · junction 4380+ · signal box 4690
 */
(function () {
  const P = LS.PACKS['kestrel-vale'];
  const town = {
    len:  { name: 'Len Haworth', role: 'Retired signalman · Kestrel Arms regular', look: { skin: '#e3b596', hair: '#d6d2cc', hairStyle: 'short', top: '#6b5a44', topStyle: 'jacket', cap: '#4f4a3e', legs: '#3b3a36', bg: '#dccfbc' }, at: 772, wander: [760, 790] },
    june: { name: 'June Pritchard', role: 'Baker', look: { skin: '#f0cfb4', hair: '#8a5a3a', hairStyle: 'bun', top: '#c7563f', topStyle: 'tee', apron: '#f3ecdf', legs: '#3b3f4a', bg: '#f1d6c8' }, at: 640, wander: [600, 700] },
    dev:  { name: 'Dev Mistry', role: '17 · wants to study in the city', look: { skin: '#a87450', hair: '#15100d', hairStyle: 'short', top: '#3d5a8a', topStyle: 'tee', legs: '#2a2f3a', bg: '#cfd8e8' }, at: 748, wander: [735, 760] },
    jess: { name: 'Jess Carter', role: 'Parent · school gate', look: { skin: '#e8c0a0', hair: '#c98d3a', hairStyle: 'ponytail', top: '#7c4d7a', topStyle: 'cardigan', legs: '#34384a', bg: '#e8d2e6' }, at: 240, wander: [200, 320] }
  };
  Object.entries(town).forEach(([id, t]) => { P.cast[id] = { name: t.name, role: t.role, look: t.look }; });
  const workerLooks = [
    { skin: '#e0b090', hair: '#3a2a20', hairStyle: 'short', top: '#f07a28', topStyle: 'hivis', hat: '#f4f1ea', legs: '#2f3542' },
    { skin: '#8a5a3b', hair: '#15100d', hairStyle: 'short', beard: true, top: '#e5d534', topStyle: 'hivis', hat: '#f4f1ea', legs: '#2f3542' },
    { skin: '#f0cdb2', hair: '#b4492a', hairStyle: 'ponytail', top: '#f07a28', topStyle: 'hivis', hat: '#2c7c77', legs: '#2f3542' },
    { skin: '#c28f6a', hair: '#231a16', hairStyle: 'short', top: '#e5d534', topStyle: 'hivis', hat: '#f4f1ea', legs: '#2f3542' }
  ];
  const crowd = [
    { skin: '#f0cdb2', hair: '#4a3222', hairStyle: 'short', top: '#3d6b54', topStyle: 'jacket' }, { skin: '#8a5a3b', hair: '#15100d', hairStyle: 'curly', top: '#d9a441', topStyle: 'tee' },
    { skin: '#e7bf9c', hair: '#c9c4c0', hairStyle: 'bun', top: '#7a2e3b', topStyle: 'cardigan' }, { skin: '#c28f6a', hair: '#231a16', hairStyle: 'short', top: '#34506e', topStyle: 'tee' },
    { skin: '#f3d2bb', hair: '#e2c27a', hairStyle: 'long', top: '#2f7f7a', topStyle: 'cardigan' }, { skin: '#b07852', hair: '#17110f', hairStyle: 'bob', top: '#c7563f', topStyle: 'jacket' }
  ];

  P.cast.crew = { name: 'Site crew', role: 'Contractor B · Kestrel Vale works', look: workerLooks[0] };
  P.cast.resident = { name: 'Harrowby resident', role: 'Opening day', look: crowd[4] };
  P.world = {
    town, workerLooks, crowd,
    // Per chapter: where the team stands, who holds which conversation/Call, where to spawn,
    // where this chapter's notebook page is, and what the hall banner says.
    chapters: [
      { spawn: { room: 'cabin', x: 520 },
        cast: [{ id: 'amara', room: 'cabin', x: 400 }, { id: 'tom', room: 'outside', x: 2480 }, { id: 'elaine', room: 'hall', x: 620 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { amara_budget: 'amara', tom_realnews: 'tom' }, calls: { name_date: 'elaine' },
        memo: { room: 'outside', x: 1840 }, hall: 'KESTREL VALE LINE · PRESS LAUNCH TOMORROW' },
      { spawn: { room: 'outside', x: 3840 },
        cast: [{ id: 'hana', room: 'outside', x: 2020 }, { id: 'tom', room: 'outside', x: PIER4() + 40 }, { id: 'amara', room: 'cabin', x: 420 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { hana_authority: 'hana' }, calls: { under_pier: 'tom' },
        memo: { room: 'outside', x: 4760 }, hall: 'HARROWBY HISTORY SOCIETY · TUESDAYS' },
      { spawn: { room: 'outside', x: 3840 },
        cast: [{ id: 'priya', room: 'outside', x: 1190 }, { id: 'elaine', room: 'hall', x: 640 }, { id: 'amara', room: 'cabin', x: 380 }, { id: 'tom', room: 'cabin', x: 470 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { priya_meeting: 'priya' }, calls: { scope_ramp: 'elaine', two_experts: 'amara' },
        memo: { room: 'outside', x: 905 }, hall: 'STEERING GROUP · STEP-FREE ACCESS?' },
      { spawn: { room: 'outside', x: 3840 },
        cast: [{ id: 'victor', room: 'cabin', x: 430 }, { id: 'tom', room: 'outside', x: 3300 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { victor_contingency: 'victor' }, calls: { cheapest_bid: 'victor' },
        memo: { room: 'outside', x: 1330 }, hall: 'HARVEST SUPPER · SATURDAY' },
      { spawn: { room: 'cabin', x: 540 },
        cast: [{ id: 'tom', room: 'outside', x: 3250 }, { id: 'amara', room: 'outside', x: 4760 }, { id: 'hana', room: 'outside', x: 2200 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { tom_weekends: 'tom' }, calls: { friday_4pm: 'amara' },
        memo: { room: 'outside', x: 3712 }, hall: 'CONSTRUCTION TRAFFIC · Q&A' },
      { spawn: { room: 'cabin', x: 540 },
        cast: [{ id: 'amara', room: 'cabin', x: 420 }, { id: 'hana', room: 'outside', x: 4900 }, { id: 'elaine', room: 'hall', x: 640 }, { id: 'moira', room: 'cabin', x: 190 }],
        talks: { amara_tired: 'amara' }, calls: { nobody_hurt: 'hana', green_amber_red: 'elaine' },
        memo: { room: 'outside', x: PIER4() - 30 }, hall: 'BOARD BRIEFING · PRIVATE' },
      { spawn: { room: 'outside', x: 2300 },
        cast: [{ id: 'priya', room: 'outside', x: 1810 }, { id: 'elaine', room: 'outside', x: 1905 }, { id: 'tom', room: 'outside', x: 2150 }, { id: 'moira', room: 'outside', x: 1990 }],
        talks: { priya_headline: 'priya' }, calls: { opening_day: 'elaine' }, crowd: true,
        memo: { room: 'outside', x: 1640 }, hall: 'OPENING CELEBRATION · ALL WELCOME' },
      { spawn: { room: 'outside', x: 3840 },
        cast: [{ id: 'victor', room: 'cabin', x: 430 }, { id: 'moira', room: 'hall', x: 560 }, { id: 'amara', room: 'hall', x: 420 }, { id: 'tom', room: 'hall', x: 480 }, { id: 'hana', room: 'hall', x: 640 }, { id: 'priya', room: 'hall', x: 700 }],
        talks: {}, calls: { the_claim: 'victor', lessons: 'moira' },
        memo: { room: 'outside', x: 700 }, hall: 'LESSONS LEARNED · THE WHOLE TEAM' }
    ],

    // Moira won't give answers. She tells you what to think about.
    hints: [
      `Everyone will want certainty from you this week. Ask yourself what you actually know yet — and what you'd be pretending to know.`,
      `When something under the ground is a question mark, the cheapest time to answer it is before anyone pours concrete.`,
      `Two sorts of pressure this month: people asking for more, and experts who disagree. Both go better with a written-down "how we'll decide".`,
      `A bid that's miles below everyone else's is telling you something. Find out what.`,
      `Plans are made of effort you've already spent. Decisions should be made of what happens next.`,
      `The dark months are when people cut corners and reports turn green. Watch for both.`,
      `"Done" is a word you agree with the people who'll run the thing for forty years. Not a word you announce.`,
      `Nearly there. Be fair with the money and honest with the room — especially about yourself.`
    ],

    // Idle lines for the team when they have nothing pending
    idle: {
      amara: [`I'm drawing. If I stop drawing, something's wrong.`, `Coffee's terrible, drawings are good. Balance.`, `Pier 4 keeps me up at night. In a professional way.`],
      tom: [`Mind your footing, boss. The deck's greasy when it's damp.`, `The lads are asking if you'll be at the Kestrel on Friday.`, `She's a beauty, this viaduct. Stubborn, mind.`],
      hana: [`Hard hat on the deck, please. Yes, even you.`, `I'd rather be annoying than right in an inquiry.`, `Lookouts are doubled on the junction side.`],
      victor: [`Every pound has a job. Most of them are overworked.`, `I've costed your tea breaks. Joking. Mostly.`],
      priya: [`Half the village has my mobile number now. It's fine. It's fine.`, `June at the bakery is our best comms channel. Don't tell anyone.`],
      elaine: [`The Authority is watching this one closely, {name}.`, `Don't make me regret choosing you. I'm joking. Partly.`],
      moira: []
    },

    // The town reacts to the project. `lines[chapter]` + reactive lines when metrics are poor.
    townLines: {
      len: [`Signalled on this line for thirty year. Last train out, April '87. I was on the platform. Don't let 'em promise what they can't do, lad.`,
            `They've got the radar out on Pier 4. Always was the awkward one, Pier 4. Kept us all guessing.`,
            `Meeting at the hall about lorries. Folk round here'll moan about a railway they've wanted for forty year. That's Harrowby.`,
            `Tenders, is it? In my day the cheapest gang did the worst job and the best gang did the job twice. Choose careful.`,
            `Saw the crane from the pub. Proper job. Tell 'em to mind the junction — main line doesn't wait for anyone.`,
            `Cold one. Frost on the rails makes men careless. Seen it happen.`,
            `I heard her. The first one. Across the viaduct at six in the morning. I'm not ashamed to say I sat down on the bench and wept.`,
            `Grandson takes the 07:12 to the city now. Every day. You don't know what that means round here.`],
      june: [`A railway? I'll believe it when I sell a croissant to a commuter. Shop's shut three days a week now.`,
             `You've got surveyors buying pasties. That's the best week I've had since Christmas.`,
             `I've reopened Thursdays! On the strength of your railway. Don't make a fool of me.`,
             `Your builders eat like horses. I've taken on a Saturday girl.`,
             `Muddy boots in my shop every morning. I'm not complaining. Well — I am, but happily.`,
             `Hot sausage rolls for the night crew. On the house. Somebody's got to look after them.`,
             `Queue out the door since six! I've run out of bunting AND butter.`,
             `Five days a week, open all hours. The railway did that. You did that.`],
      dev: [`Two buses a day to the city. Miss the 07:40 and that's college gone for the day.`,
            `If the train comes, I can do the engineering course in the city. If it doesn't… I don't know.`,
            `Everyone's arguing at the hall about ramps. My nan's in a wheelchair. Ramps matter, yeah?`,
            `Applied for college. Put "train" as how I'll get there. Bit of a gamble.`,
            `Is it true you might get an apprenticeship on the site? Asking for me.`,
            `Offer letter came. Starts in April. So, you know. No pressure.`,
            `First day of college tomorrow. On a TRAIN. From HARROWBY.`,
            `Second-year project's on the viaduct. I'm going to ask you loads of questions.`],
      jess: [`I grew up here. Half my class moved away. I'd like my kids to have a reason to stay.`,
             `The kids think the orange flags on the viaduct are for a party.`,
             `Please tell me the lorries won't use the school road at 3pm. Please.`,
             `The school's doing a project on the old line. Could someone come and talk?`,
             `Lorries went round by the bypass this week. Thank you. Genuinely.`,
             `Dark at four. Just glad to see the site lights on the hill — feels like something's happening.`,
             `The kids made signs. "HELLO TRAIN." It's the best thing I've ever seen.`,
             `We're staying. We were going to move. We're staying.`]
    },
    townReact: {
      safety: `Heard someone nearly got hit down at the junction. Is that true? People are talking.`,
      morale: `Your lot looked miserable in the Kestrel last night. Everything alright up there?`,
      schedule: `Paper says the railway's running late. Folk are starting to say "told you so".`,
      budget: `Council tax up and your project over budget, they say. Not a good look.`,
      quality: `My brother-in-law's on your site. Says corners are being cut. Just passing it on.`
    },

    workerLines: [`Morning, boss.`, `Mind the edge — it's a long way down.`, `Tea's in the welfare cabin if you want one.`, `Maureen's swinging well today.`, `Nearly got this bay done.`],
    crowdLines: [`We've waited forty years for this!`, `My dad worked on this line.`, `Look at it. Just look at it.`, `First train since 1987!`],

    inspect: {
      noticeboard: m => m.morale >= 65
        ? `Harrowby noticeboard. A council leaflet about the railway has "YES!!" written on it in felt tip. Someone has pinned a child's drawing of a train next to it.`
        : `Harrowby noticeboard. The railway leaflet has been half torn down. Someone has scrawled "believe it when we see it" across the corner.`,
      station: b => b >= 5 ? `Harrowby Station. Fresh paint, a working clock, and a new sign. Somebody has already left flowers in the tubs.`
        : b >= 3 ? `Harrowby Station. Scaffold on the canopy, the ticket office stripped back to brick. It smells of new timber and old soot.`
        : `Harrowby Station. Boarded windows and a sign that reads "HARR  BY" — the O fell off in 1994, Len says. The platform is a meadow.`,
      pier4: b => b >= 5 ? `You lean over the parapet. Pier 4 stands clean and pointed, sixty metres down to the beck. Hard to believe anyone ever worried about it.`
        : b >= 3 ? `Scaffolding cages Pier 4 from the beck to the deck. Rope-access engineers are working their way down it like climbers.`
        : b >= 1 ? `An orange X has been sprayed on Pier 4, far below. The survey tripod beside you is pointed straight at it.`
        : `You lean over the old parapet. Far below, Pier 4 is streaked dark with water. A hairline crack runs up it like a vein.`,
      crane: `Maureen the tower crane swings a bundle of steel over the deck. Somebody has painted her name on the counterweight in pink.`,
      signalbox: `Kestrel Junction signal box. The main line to the city rushes past every twenty minutes. This is where your branch will join it — no second chances here.`,
      urn: `The village hall tea urn. It's older than the railway closure and twice as reliable.`,
      desk: `Your desk. The inbox can wait. Your list for this week is pinned to the monitor.`
    },

    // Moira's notebook, 1986–87. One page per chapter, hidden somewhere in the world.
    memos: [
      `12 March 1986. Walked the viaduct with Mr Haldane. Hairline cracks in the parapet above Pier 4. He says they've been there since the war.`,
      `2 April 1986. Measured the Pier 4 crack again: 3mm wider. Wrote to the Area Engineer. Polite. Very polite.`,
      `May 1986. No reply. Haldane says don't make waves — the line is "under review" and bad news will close it.`,
      `September 1986. Budget cut again. The repair gang's halved. We patch what we can see and hope about the rest.`,
      `14 November 1986. Wet Friday. Worked through the night to get the relay done. Nobody wanted to be the one to stop it. I didn't either.`,
      `January 1987. A lengthman stepped out in front of the 06:40. The lookout caught him. Haldane said leave it out of the book. I did.`,
      `14 March 1987. Parapet section fell onto the down line at 04:10. Empty track, thank God. My memo was in the file all along.`,
      `April 1987. Last train. The whole of Harrowby on the platform. I didn't go. I couldn't face them.`
    ],
    memoFinale: `You found every page of my notebook. So you already knew. Thank you for not saying anything — and for doing everything differently.`
  };
  function PIER4() { return 1960 + 4 * (1700 / 11); }
})();
