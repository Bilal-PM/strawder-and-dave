/* LINESIDE — "The Kestrel Vale Line": the explorable world layer for Chapter 1.
 * Where people stand, what the town says (it changes as support grows), what you can inspect,
 * engineering notes, Moira's hints and the page of a very private log.
 *
 * Placement: the engine now takes every position from js/world/level.js. The coordinates below are legacy
 * and kept only for older builds. Map reference (world units, see js/world/world.js): Harrowby high street y≈1335 (x 40–1300) ·
 * station 1170–1374 · depot 1410–1670 · project office 1420–1615 (door 1568) · Beck Bridge 1725–1865 ·
 * old trackbed y 880–922 from x 1300 to the junction at 3250 · Crag Lane level crossing x 2585–2625 ·
 * Kestrel Junction signal box 3120 · Moira's cottage 1570,560 (north).
 */
(function () {
  const P = LS.PACKS['kestrel-vale'];
  const town = {
    len:  { name: 'Len Haworth', role: 'Retired signalman · Kestrel Arms regular', look: { skin: '#e3b596', hair: '#d6d2cc', hairStyle: 'short', top: '#6b5a44', topStyle: 'jacket', cap: '#4f4a3e', legs: '#3b3a36', bg: '#dccfbc' }, at: [775, 1326], wander: 30 },
    june: { name: 'June Pritchard', role: 'Baker · Pritchard’s', look: { skin: '#f0cfb4', hair: '#8a5a3a', hairStyle: 'bun', top: '#c7563f', topStyle: 'tee', apron: '#f3ecdf', legs: '#3b3f4a', bg: '#f1d6c8' }, at: [690, 1326], wander: 60 },
    dev:  { name: 'Dev Mistry', role: '17 · wants to study engineering', look: { skin: '#a87450', hair: '#15100d', hairStyle: 'short', top: '#3d5a8a', topStyle: 'tee', legs: '#2a2f3a', bg: '#cfd8e8' }, at: [1010, 1420], wander: 40 },
    jess: { name: 'Jess Carter', role: 'Parent · school gate', look: { skin: '#e8c0a0', hair: '#c98d3a', hairStyle: 'ponytail', top: '#7c4d7a', topStyle: 'cardigan', legs: '#34384a', bg: '#e8d2e6' }, at: [240, 1322], wander: 70 }
  };
  Object.entries(town).forEach(([id, t]) => { P.cast[id] = { name: t.name, role: t.role, look: t.look }; });

  P.world = {
    town,
    c1: {
      spawn: { room: 'outside', x: 1290, y: 1100 },
      // Where the team stand. Rooms use their own coordinates.
      cast: [
        { id: 'helen', room: 'outside', x: 1226, y: 1050, face: 'down' },
        { id: 'moira', room: 'outside', x: 1338, y: 1052, face: 'down' },
        { id: 'hannah', room: 'office', x: 440, y: 158, face: 'down' },
        { id: 'jo', room: 'office', x: 262, y: 150, face: 'down' },
        { id: 'steve', room: 'office', x: 120, y: 232, face: 'right' },
        { id: 'tom', room: 'outside', x: 1462, y: 902, face: 'down' },
        { id: 'gaz', room: 'shed', x: 540, y: 300, face: 'left' },
        { id: 'priya', room: 'hall', x: 318, y: 208, face: 'down' },
        { id: 'brian', room: 'hall', x: 448, y: 206, face: 'down' }
      ],
      // Who holds each task
      holders: { induction: 'hannah', walk: 'tom', health: 'gaz', plan: 'jo', forecast: 'steve', date: 'helen', dropin: 'priya' },
      panelCast: [{ id: 'sue', room: 'hall', x: 312, y: 186 }, { id: 'helen', room: 'hall', x: 380, y: 182 }, { id: 'raj', room: 'hall', x: 448, y: 186 }],
      notes: [
        { id: 'n_ppe', x: 1392, y: 962, title: 'A closed line is still a railway',
          text: `On a real railway, nobody goes “on or near the line” (on the track, or within 3 metres of the nearest rail) without track safety training, the right PPE, and a safe system of work that someone in charge has planned and briefed. A closed line is no exception: old rail can shift, sleepers give way underfoot, machines may be moving, and the Crag Lane crossing still gets cars. The orange hi-vis is the least interesting thing you'll wear, and the most important.` },
        { id: 'n_bridge', x: 1716, y: 866, title: 'Bridges: look under, not just at',
          text: `On a working railway, bridges get a visual exam every year and a detailed hands-on one every six. Beck Bridge hasn't had either since 2009. The worrying part of an old bridge is often underwater: “scour” is fast water eating away the ground round a pier, where nobody can see it.` },
        { id: 'n_junction', x: 3150, y: 1046, title: 'The main line never stops',
          text: `Kestrel Junction joins our branch to the main line. The national infrastructure manager runs it, and it never stops for us. Even standing near it needs track safety training and a safe system of work, because trains are running. Any work on it needs their permission, their planning and a “possession” (the line closed to normal trains and handed to the engineers for a set time), booked many months ahead. You need them on side long before you need them on site.` }
      ],
      memo: { room: 'outside', x: 1624, y: 598 },
      memoText: `MARJORIE · LOG · ENTRY 204. First Sunday, as ever. Turned both engines over by hand. Topped up the oil. Wiped the cab window. Told her the news: there's talk of reopening. She didn't say much. She never does. The new one turned up early and caught me with my flask. Early's a good sign. — M.K.`,
      catSpots: [[70, 334], [842, 250], [720, 392]],
      hallBanner: 'DROP-IN · KESTREL VALE LINE · THURSDAY 7PM',
      panelBanner: 'FUNDING PANEL · PLEASE USE THE GOOD CUPS'
    },

    blocked: {
      line_closed: `Within 3 metres of the rails is “on or near the line”. Induction and PPE from Hannah first, then out with Tom under his safe system of work.`,
      junction_live: `Beyond the stop board is the live main line. Being there needs track safety training, a safe system of work and the national infrastructure manager’s say-so. Not today.`,
      track_live: `Live railway. Cross at the level crossing.`
    },

    // What's said when you try a door you're not ready for: [who, text]
    doorRefused: {
      shed: ['gaz', `(through the door) Not without your kit, pal. There's an inspection pit in here, and Hannah does spot checks. She's in the project office.`]
    },

    // Moira won't give you answers. She tells you what to think about, based on what's next.
    hints: {
      induction: `Go and see Hannah in the project office first. Nobody walks my old railway without a briefing. Not even me, and I've walked it since 1979.`,
      walk: `Look at the track, then look at the train. They're more alike than you'd think: both have been standing still too long.`,
      health: `Gaz is in the depot. Let him talk. He knows that railcar better than he knows his own car.`,
      dropin: `The drop-in's at the hall. They'll ask the questions they've been saving since 2009. Answer the one they asked, not the one you wished they had.`,
      plan: `The trick with a plan isn't knowing what to do. It's knowing what has to wait.`,
      forecast: `When a number makes your case look wonderful, that's exactly the moment to check it.`,
      date: `Helen wants a date because dates feel like certainty. Give her something true instead. She'll thank you next year.`,
      panel: `Panels aren't looking for perfect. They're looking for someone who knows what they don't know.`,
      done: `Off you go. And don't slurp the good cups.`
    },

    // What each person says when you've nothing pending with them
    idle: {
      helen: [`The Authority is watching this one closely, {name}. So is my mum. She lives in Harrowby.`, `I've already written “historic day” in my speech. I just need the day.`],
      jo: [`Sticky notes are a planning methodology. Don't let anyone tell you otherwise.`, `If you see my coffee, tell it I miss it.`],
      tom: [`Stay in the cess, boss. Sleepers are slippery when they're sound, and worse when they're not.`, `The crew are asking if you'll be at the Kestrel Arms on Friday. It's quiz night. We need someone who knows things.`],
      hannah: [`Hard hat on the trackbed, please. Yes, even you.`, `I'd rather be annoying now than right at an inquiry later.`],
      steve: [`Every pound has a job. Most of them are overworked.`, `I've costed your tea breaks. I'm joking. Mostly.`],
      priya: [`Half the village has my mobile number now. It's fine. It's fine.`, `June at the bakery is our best comms channel. Don't tell anyone.`],
      gaz: [`She's a lovely old girl. Stubborn, mind. Takes after me.`, `The radio only gets one station in here. It's mostly eighties power ballads.`],
      brian: [`Chocolate digestives are a sign of respect in this parish.`, `I chaired the bypass consultation in 1998. I still have the bruises.`],
      moira: []
    },

    // The town's attitude changes with Town support: [below 50%, 50% and above]
    townLines: {
      len: [`Signalled this line thirty-one year. They closed it “temporarily” in 2009. I've been temporarily retired ever since.`,
            `Folk are talking about you. Mostly kindly. When Marjorie was the only train, we worked it with a staff: one train, one staff. Cheapest signalling there is. I've still got my cap.`],
      june: [`I bake sixty loaves on a Saturday and sell forty. The rest go to the ducks. The ducks are thriving. Harrowby isn't.`,
             `If the trains come back, I'm doing a Marjorie bun. Iced, with a little face. Don't tell anyone, it's a secret.`],
      dev: [`I want to do engineering at college in the city. That's two buses and an hour and a half each way. Or I could just… not.`,
            `Is it true you might need apprentices? Asking for a friend. The friend is me.`],
      jess: [`The school run's fine. It's everything else. The doctor's is in Kestrelford now. No car, no doctor.`,
             `The kids have started drawing trains again. My youngest drew Marjorie with wings. I didn't have the heart to say.`]
    },

    inspect: {
      station: `Harrowby station. The sign on the gate reads: “Station temporarily closed. We apologise for any inconvenience.” It's dated 2009. The inconvenience has been considerable.`,
      noticeboard: m => m.town >= 50
        ? `Parish noticeboard. “Lost: one cat (ginger, answers to nothing).” “Yoga, Tuesdays.” Someone has crossed out the “AGAIN?” on the railway poster and written “FINALLY?”. Progress.`
        : `Parish noticeboard. “Lost: one cat (ginger, answers to nothing).” “Yoga, Tuesdays.” And a poster for the railway drop-in, with “AGAIN?” written across it in blue pen.`,
      depot: `Harrowby Depot, built 1911. Brick, draughty, and home to exactly one train and one cat.`,
      signalbox: `Kestrel Junction signal box, still working the main line. It's safety-critical: visitors need an appointment and a reason, and you have neither. The signaller waves. You wave back. Most British thing all week.`,
      cottage: `Beck Cottage, Moira's place. There's a railway lamp by the door, polished to within an inch of its life, and a pair of oily overalls on the washing line.`,
      packhorse: `The old packhorse bridge. It's carried people over the beck for three hundred years without once asking for funding.`,
      crag: `Kestrel Crag. From up here you can trace the whole line: station, depot, Beck Bridge, the crossing, the junction. Three miles that used to hold a valley together.`,
      buffer: `The buffer stop at the end of the line. Someone has left a single red rose on it. Every year, according to Len.`,
      lockers: `Your locker. The spare hard hat has “VISITOR” written on it in marker pen, and “NOT YOU, STEVE” underneath.`,
      board: `The project board: tasks, risks and a drawing of Marjorie that Jo swears she didn't do.`,
      urn: `The village hall tea urn. It has been on since 1987.`,
      workbench: `Gaz's workbench. A radio, a torque wrench, a mug that says WORLD'S OKAYEST FITTER, and a well-thumbed 1961 maintenance manual.`,
      cushions: `A pile of old seat cushions from Marjorie's saloon. They smell faintly of 1970s holidays.`,
      busstop: `The 41: Skelby, Harrowby, Kestrelford. Twice a day, if it's feeling generous. Someone has written “ha” next to the timetable.`,
      war_memorial: `The war memorial. The names have been cleaned recently, and there's a wreath at its foot. Harrowby looks after what matters to it.`,
      site_board: `“Kestrel Vale Line reopening · Project compound · All visitors report to the site office · PPE beyond this point.” Someone has added “at last?” in pencil.`,
      postbox: `The Crag Lane postbox. It's why the car is parked across the rails. Last collection 9am, and the crossing gets forgotten at 8.58.`,
      hall_noticeboard: `The hall noticeboard: a whist drive, the minutes of the 1998 bypass consultation, and a sign-up sheet for the drop-in. Forty names. Some have brought a plus-one.`,
      car: `A hatchback parked across the rails while its driver posts a letter. Round here, people have forgotten this is a railway.`,
      washing_line: `A pair of oily overalls on Moira's washing line. Station masters don't usually get oily. Interesting.`,
      trap: `Trap points on the depot siding: a short set of points that steers a runaway wagon off the rails before it reaches the running line. Crude, clever and very railway.`
    }
  };
})();
