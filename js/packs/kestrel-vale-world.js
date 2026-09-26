/* LINESIDE — "The Kestrel Vale Line": the explorable world layer for Chapter 1.
 * Where people stand, what the town says (it changes as support grows), what you can inspect,
 * engineering notes, Moira's hints and the page of a very private log.
 *
 * Map reference (world units, see js/world/world.js): Harrowby high street y≈1335 (x 40–1300) ·
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
          text: `On the real UK railway nobody goes “on or near the line” without a safety briefing and PPE. It doesn't matter if trains haven't run for years: old rail can shift, sleepers give way underfoot, and the Crag Lane crossing still gets cars. The hi-vis is the least interesting thing you'll wear and the most important.` },
        { id: 'n_bridge', x: 1716, y: 866, title: 'Bridges: look under, not just at',
          text: `On a working railway, bridges get a visual exam every year and a detailed hands-on one every six. Beck Bridge hasn't had either since 2009. The worrying part of an old bridge is often underwater: “scour” is fast water eating away the ground round a pier, where nobody can see it.` },
        { id: 'n_junction', x: 3150, y: 1046, title: 'The main line never stops',
          text: `Kestrel Junction joins our branch to the main line. The national infrastructure manager runs it, and it never stops for us. Any work near it needs their permission, their planning and a “possession” (a booked closure) arranged months ahead. You need them on side long before you need them on site.` }
      ],
      memo: { room: 'outside', x: 1624, y: 598 },
      memoText: `MARJORIE: LOG. First Sunday of the month, as ever. Turned both engines over by hand. Topped up the oil and wiped the cab windows. Told her the news: there's talk of reopening. She didn't say much. She never does. — M.K.`,
      catSpots: [[70, 334], [842, 250], [720, 392]],
      hallBanner: 'DROP-IN · KESTREL VALE LINE · THURSDAY 7PM',
      panelBanner: 'FUNDING PANEL · PLEASE USE THE GOOD CUPS'
    },

    blocked: {
      line_closed: `The old line is closed and unsafe: rotten sleepers and loose rail. Get your induction and PPE from Hannah at the project office first.`,
      track_live: `Live railway. Cross at the level crossing.`
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
      tom: [`Mind your footing on the sleepers, boss. The soft ones don't warn you.`, `The lads are asking if you'll be at the Kestrel Arms on Friday.`],
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
            `Heard you were straight with folk at the hall. Makes a change. I've still got my signalling cap, if you ever need it.`],
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
        : `Parish noticeboard. “Lost: one cat (ginger, answers to nothing).” “Yoga, Tuesdays.” And a poster for the railway drop-in, with “AGAIN?” written across it in biro.`,
      depot: `Harrowby Depot, built 1911. Brick, draughty, and home to exactly one train and one cat.`,
      signalbox: `Kestrel Junction signal box, still working for the main line. The signaller waves. You wave back. It's the most British thing that'll happen to you all week.`,
      cottage: `Beck Cottage, Moira's place. There's a railway lamp by the door, polished to within an inch of its life, and a pair of oily overalls on the washing line.`,
      packhorse: `The old packhorse bridge. It's carried people over the beck for three hundred years without once asking for funding.`,
      crag: `Kestrel Crag. From up here you can trace the whole line: station, depot, Beck Bridge, the crossing, the junction. Three miles that used to hold a valley together.`,
      buffer: `The buffer stop at the end of the line. Someone has left a single red rose on it. Every year, according to Len.`,
      lockers: `Your locker. The spare hard hat has “VISITOR” written on it in marker pen, and “NOT YOU, STEVE” underneath.`,
      board: `The project board: tasks, risks and a drawing of Marjorie that Jo swears she didn't do.`,
      urn: `The village hall tea urn. It has been on since 1987.`,
      workbench: `Gaz's workbench. A radio, a torque wrench, a mug that says WORLD'S OKAYEST FITTER, and a well-thumbed 1961 maintenance manual.`,
      cushions: `A pile of old seat cushions from Marjorie's saloon. They smell faintly of 1970s holidays.`
    }
  };
})();
