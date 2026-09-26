/* LINESIDE — Scenario pack: "The Kestrel Vale Line"
 * Sector: rail infrastructure · Level: new → experienced project leads
 *
 * A pack is pure data. The engine (js/game.js) plays any pack with this shape,
 * which is how new sectors (healthcare, construction, public sector…) get added.
 *
 * Metric keys: schedule (Time) · budget (Money) · safety · quality · morale (People)
 * Chapter indices are 0-based; a ripple's `at` is the chapter whose start it lands on
 * (at = chapters.length means "epilogue", just before the report).
 */
window.LS = window.LS || {};
LS.PACKS = LS.PACKS || {};
LS.PACKS['kestrel-vale'] = {
  id: 'kestrel-vale',
  title: 'The Kestrel Vale Line',
  sector: 'Rail infrastructure',
  blurb: 'Reopen a closed Victorian railway through a valley that has waited 39 years for a train.',
  budgetLabel: '£10M',

  cast: {
    moira:  { name: 'Moira Kell',    role: 'Chief Engineer (retired) · your mentor',
              look: { skin: '#e9c3a4', hair: '#c9c4c0', hairStyle: 'bun', top: '#3f5a4c', topStyle: 'jacket', glasses: true, bg: '#d9c9b0' } },
    elaine: { name: 'Elaine Marsh',  role: 'Director, Vale Transport Authority · Sponsor',
              look: { skin: '#f0cfb4', hair: '#e2c27a', hairStyle: 'bob', top: '#7a2e3b', topStyle: 'suit', bg: '#e6cfc4' } },
    amara:  { name: 'Amara Osei',    role: 'Design Lead',
              look: { skin: '#7a4a2e', hair: '#1c1412', hairStyle: 'curly', top: '#d9a441', topStyle: 'tee', bg: '#efd9a8' } },
    tom:    { name: 'Tom Brennan',   role: 'Site Manager',
              look: { skin: '#e8b996', hair: '#6b4428', hairStyle: 'short', beard: true, top: '#f07a28', topStyle: 'hivis', hat: '#f4f1ea', bg: '#f1cfae' } },
    hana:   { name: 'Hana Kowalski', role: 'Safety Lead',
              look: { skin: '#f3d2bb', hair: '#b4492a', hairStyle: 'ponytail', top: '#e5d534', topStyle: 'hivis', bg: '#e9e2b3' } },
    victor: { name: 'Victor Hale',   role: 'Commercial Manager',
              look: { skin: '#c89272', hair: '#9d9894', hairStyle: 'short', top: '#27354f', topStyle: 'suit', bg: '#c9ced6' } },
    priya:  { name: 'Priya Nair',    role: 'Community & Communications',
              look: { skin: '#b07852', hair: '#17110f', hairStyle: 'long', top: '#2f7f7a', topStyle: 'cardigan', bg: '#bfe0d8' } },
    narrator: { name: '', role: '' }
  },
  mentor: 'moira',
  team: ['amara', 'tom', 'hana', 'victor', 'priya'],

  avatars: [
    { skin: '#f0cdb2', hair: '#4a3222', hairStyle: 'short', top: '#34506e', topStyle: 'jacket', bg: '#cfd8e0' },
    { skin: '#8a5a3b', hair: '#15100d', hairStyle: 'curly', top: '#7c4d7a', topStyle: 'cardigan', bg: '#e0cfe0' },
    { skin: '#e7bf9c', hair: '#c98d3a', hairStyle: 'long', top: '#3d6b54', topStyle: 'jacket', bg: '#d2e2d4' },
    { skin: '#c28f6a', hair: '#231a16', hairStyle: 'short', beard: true, top: '#8a3b2e', topStyle: 'tee', glasses: true, bg: '#ecd3c4' }
  ],

  chapters: [
    { title: 'The Closed Line', phase: 'Feasibility', week: 1, month: 'March',
      scene: { time: 'dawn', season: 'spring', weather: 'clear', build: 0 },
      intro: [
        ['narrator', `Kestrel Vale. The line closed in 1987. Since then Harrowby has lost its bank, its secondary school and most of its young people. The viaduct still stands over the valley — just.`],
        ['elaine', `{name}, welcome. The Authority has found £10 million to reopen the line. Forty weeks. Harrowby has been promised trains before. This time they need to actually arrive.`],
        ['moira', `I'm Moira. I was a junior engineer on this line the year they shut it. Elaine asked me to keep an eye on you. I'll mostly keep my mouth shut. Mostly.`]
      ],
      talks: ['amara_budget', 'tom_realnews'],
      calls: ['name_date'],
      moira: `Last time, someone promised a date too. I'll tell you about it one day.` },

    { title: 'Ground Truth', phase: 'Early Design', week: 6, month: 'May',
      scene: { time: 'day', season: 'spring', weather: 'clear', build: 1 },
      intro: [
        ['tom', `Survey lads have been over the viaduct. Pier 4 is sitting on something, and the radar can't tell us what.`],
        ['amara', `There were coal workings under this valley in the 1800s. The records are… optimistic.`]
      ],
      talks: ['hana_authority'],
      calls: ['under_pier'],
      moira: `In '86 we found cracks near Pier 4. I wrote a very polite memo. I'm told it was read.` },

    { title: 'Everyone Wants Something', phase: 'Detailed Design', week: 12, month: 'July',
      scene: { time: 'day', season: 'summer', weather: 'clear', build: 1 },
      intro: [
        ['priya', `Priya Nair, community and comms. Good news: Harrowby is excited. Bad news: everyone now has an opinion about their railway.`]
      ],
      talks: ['priya_meeting'],
      calls: ['scope_ramp', 'two_experts'],
      moira: `The man who ran this line in '87 decided everything on instinct. He was a good man. Instinct isn't criteria.` },

    { title: 'Paper and Promises', phase: 'Procurement', week: 18, month: 'September',
      scene: { time: 'dusk', season: 'autumn', weather: 'clear', build: 2 },
      intro: [
        ['victor', `Victor Hale, commercial. The tenders are back. I'd like you to sit down.`]
      ],
      talks: ['victor_contingency'],
      calls: ['cheapest_bid'],
      moira: `We were cheap in '87 as well. The cheapest option of all was closing it.` },

    { title: 'Breaking Ground', phase: 'Construction', week: 24, month: 'November',
      scene: { time: 'overcast', season: 'autumn', weather: 'rain', build: 3 },
      intro: [
        ['tom', `We're on site. It's raining sideways and the crane's got a name already — the lads call her Maureen.`]
      ],
      talks: ['tom_weekends'],
      calls: ['friday_4pm'],
      moira: `On a wet Friday in '86 we worked straight through. Nobody wanted to be the one who stopped it.` },

    { title: 'The Long Winter', phase: 'Construction', week: 30, month: 'January',
      scene: { time: 'night', season: 'winter', weather: 'snow', build: 4 },
      intro: [
        ['hana', `Snow on the viaduct and ice on the walkways. I've doubled the lookouts on the main line.`]
      ],
      talks: ['amara_tired'],
      calls: ['nobody_hurt', 'green_amber_red'],
      moira: `The near miss in '86 was never written down. The accident in '87 was.` },

    { title: 'First Train', phase: 'Commissioning', week: 38, month: 'April',
      scene: { time: 'dawn', season: 'spring', weather: 'clear', build: 5, train: true },
      intro: [
        ['narrator', `The first test train crosses the viaduct at 5:52am. Half of Harrowby is on the hillside in dressing gowns.`],
        ['priya', `I've been doing this job for twenty years and I have genuinely never seen a whole town cry at a train.`]
      ],
      talks: ['priya_headline'],
      calls: ['opening_day'],
      moira: `In 1987 I watched the last train leave this valley. I'd quite like to watch the first one arrive.` },

    { title: 'After the Ribbon', phase: 'Close-out', week: 40, month: 'June',
      scene: { time: 'dusk', season: 'summer', weather: 'clear', build: 5, train: true },
      intro: [
        ['victor', `The contractor has sent us a present. It's a claim. It's large.`]
      ],
      talks: [],
      calls: ['the_claim', 'lessons'],
      moira: null }
  ],

  // Small, human decisions. Effects are hidden until chosen.
  talks: {
    amara_budget: { who: 'amara',
      text: `Amara Osei, design. One question before I draw a single line: do I design to the budget we've got, or the railway Harrowby actually needs?`,
      choices: [
        { t: `Design to the budget. We can't spend money we don't have.`, e: { budget: 2, quality: -1 }, trust: 0,
          reply: `Understood. Tight and honest. I'll tell you when the budget starts designing the railway instead of me.` },
        { t: `Show me both — and what the gap would cost.`, e: { quality: 2, schedule: -1 }, trust: 1,
          reply: `Now that's a question I like. You'll have options by Friday.` },
        { t: `The railway it needs. We'll find the money.`, e: { quality: 2, budget: -3 }, trust: 0,
          reply: `Brave. I hope Victor agrees with you.` }
      ] },
    tom_realnews: { who: 'tom',
      text: `Tom Brennan, site. I walked the line yesterday. Half the drainage is gone and there's a family of badgers under the old platform. Good news first, or the real news?`,
      choices: [
        { t: `The real news. Always.`, e: { quality: 1, safety: 1 }, trust: 1,
          reply: `Good. The viaduct worries me more than anything on the drawings. We need eyes on it before anyone promises anything.` },
        { t: `Keep it positive for now — the team needs momentum.`, e: { morale: 2, quality: -1 }, trust: -1,
          reply: `Right. Momentum. I'll save the badgers for later, then.` },
        { t: `Write it all down. I'll read it tonight.`, e: { quality: 1 }, trust: 0,
          reply: `It'll be on your desk. It's not a short read.` }
      ] },
    hana_authority: { who: 'hana',
      text: `Hana Kowalski, safety. I'm going to be annoying about one thing: nobody goes on that viaduct until it's been properly assessed. Including you.`,
      choices: [
        { t: `Agreed. You have the authority to stop any work, any time.`, e: { safety: 3 }, trust: 1,
          reply: `Thank you. You'd be amazed how rarely anyone says that out loud.` },
        { t: `Let's be pragmatic — the surveyors need access this week.`, e: { schedule: 1, safety: -2 }, trust: -1,
          reply: `Pragmatic is how people end up in accident reports. I'll write the access rules; you'll sign them.` },
        { t: `What would "properly" cost us, in time and money?`, e: { safety: 2, schedule: -1 }, trust: 1,
          reply: `Two weeks and a rope-access team. I'll get you a price by tomorrow.` }
      ] },
    priya_meeting: { who: 'priya',
      text: `The parish council wants a public meeting. They're furious about construction lorries on the school road — and they haven't seen a single lorry yet.`,
      choices: [
        { t: `Hold the meeting. Listen first, present second.`, e: { morale: 2, schedule: -1 }, trust: 1,
          reply: `I'll book the village hall. Bring biscuits. Good ones.` },
        { t: `Send a newsletter with the traffic plan.`, e: { schedule: 1 }, trust: 0,
          reply: `Efficient. Some people will read it.` },
        { t: `Not yet — we don't have answers to give them.`, e: { morale: -2 }, trust: -1,
          reply: `They'll fill the silence themselves. They always do.` }
      ] },
    victor_contingency: { who: 'victor',
      text: `Before we pick a contractor: how much contingency do you want me to hold back? The Authority would love to "reinvest" it.`,
      choices: [
        { t: `Hold 15%. It's a 150-year-old viaduct.`, e: { budget: -1, quality: 1 }, trust: 1,
          reply: `Music to my ears. I'll defend it like a family heirloom.` },
        { t: `5%. Show the Authority we run lean.`, e: { budget: 3 }, trust: -1,
          reply: `Lean is lovely right up until the first surprise. Noted.` },
        { t: `Price the risks on the register, and hold exactly that.`, e: { budget: 1, quality: 2 }, trust: 1,
          reply: `Now you sound like someone I'd lend money to.` }
      ] },
    tom_weekends: { who: 'tom',
      text: `We're behind. The crew want to work weekends — the money's good for them and the time's good for us.`,
      choices: [
        { t: `Yes — with a hard cap and rotating crews.`, e: { schedule: 2, morale: 1 }, trust: 1,
          reply: `Rotation. They'll grumble, then they'll thank you.` },
        { t: `Every weekend until we're back on plan.`, e: { schedule: 4, morale: -4, safety: -2 }, trust: -1,
          reply: `Your call. Tired people make mistakes, though. Just saying it out loud.` },
        { t: `No weekends. We re-plan instead.`, e: { schedule: -2, morale: 2 }, trust: 0,
          reply: `Fair enough. I'll need you to back me when the Authority asks why.` }
      ] },
    amara_tired: { who: 'amara',
      text: `Can I be honest? I'm exhausted, my team's exhausted, and I'm thinking about leaving when this is done.`,
      choices: [
        { t: `Thank you for telling me. What would make it better?`, e: { morale: 3 }, trust: 1,
          reply: `…Honestly? Someone asking. And my Fridays back.` },
        { t: `We're nearly there. Push through with me.`, e: { schedule: 1, morale: -2 }, trust: -1,
          reply: `Nearly there. Right.` },
        { t: `Let's get you help — a contractor to clear the drawings backlog.`, e: { budget: -2, morale: 2, quality: 1 }, trust: 1,
          reply: `That would change my life. Well — my January.` }
      ] },
    priya_headline: { who: 'priya',
      text: `The press want a quote from you for the opening. What's the headline?`,
      choices: [
        { t: `"Built by Harrowby's patience."`, e: { morale: 3 }, trust: 1,
          reply: `Oh, they'll print that. I might cry again.` },
        { t: `"On time and on budget" — if it's actually true.`, e: { quality: 1 }, trust: 0,
          reply: `Let's check it's true before we say it. That's a first for a press release.` },
        { t: `Let Elaine take the quote.`, e: { morale: -1 }, trust: 0,
          reply: `Modest. Elaine will be delighted.` }
      ] }
  },

  // THE CALLS — graded dilemmas with confidence, mentor review and ripples.
  calls: {
    name_date: { title: 'Name the Date', from: 'elaine',
      text: `Elaine wants to announce the opening date at tomorrow's town hall. Design hasn't started. "Just give me a date I can put on the posters."`,
      known: ['Similar reopenings took 34–44 weeks', 'Elaine hates uncertainty'],
      unknown: ['What is under the viaduct', 'How many design changes are coming'],
      principle: { name: 'Forecast in ranges, not points', text: `Early estimates are uncertain by nature. Commit to a range and narrow it as you learn. A single date announced too early becomes the anchor everyone judges you against.` },
      discuss: `When has a single early estimate become a trap in your own work? What made it hard to give a range?`,
      choices: [
        { t: `Give a firm date — confidence sells`, d: `Pick the target and back it publicly.`, grade: 'poor', e: { morale: 2, schedule: 1 },
          why: `You've anchored a whole town to a number you can't know yet. When it slips — and early dates usually do — it's your slip, in public.`,
          ripple: { at: 6, p: 0.85,
            hit: { title: 'The Date on the Posters', text: `The date you announced is on every lamppost in Harrowby. Testing is two weeks late — a normal wobble, but now it's a headline.`, e: { morale: -5, schedule: -4 } },
            miss: { title: 'Right on the Day', text: `Testing landed exactly on the date you announced.`, lesson: `Lucky. Most reopenings drift. Judge the decision, not the dice.` } } },
        { t: `Give a range: a target date and a cautious "P80" date`, d: `Explain what would move it, and when it will firm up.`, grade: 'best', e: { quality: 2, morale: 1, schedule: -1 },
          why: `Honest and useful. Elaine gets something to plan around, and you've taught her to expect the estimate to narrow as you learn.`,
          ripple: { at: 6, hit: { title: 'Inside the Envelope', text: `Testing is two weeks behind — and comfortably inside the range you gave in March. Elaine shrugs: "You told us this could happen."`, e: { morale: 3, schedule: 2 } } } },
        { t: `Refuse — no date until design is done`, d: `Don't commit to anything this early.`, grade: 'ok', e: { schedule: -2, morale: -2 },
          why: `Safe for you, but a project with no date has no urgency and a nervous sponsor. You can commit to a range without committing to a point.` }
      ] },

    under_pier: { title: 'Something Under Pier 4', from: 'tom',
      text: `Ground radar shows voids beneath Pier 4 of the viaduct — possibly old coal workings. The 19th-century mining records are "incomplete". Pier strengthening starts in November.`,
      known: ['Probe drilling: 3 weeks, £60k', 'Pier works are booked for November'],
      unknown: ['Whether the voids are real', 'Whether they are stable'],
      principle: { name: `Buy information while it's cheap`, text: `Uncertainty costs least to resolve early. A survey has a small, known price. A surprise in construction has a large, unknown one.` },
      discuss: `What's the equivalent of "probe drilling" in your field — the cheap test you skip because you're in a hurry?`,
      choices: [
        { t: `Probe-drill now and grout anything we find`, d: `Pay for certainty before the design is fixed.`, grade: 'best', e: { budget: -2, schedule: -2, quality: 2, safety: 2 },
          why: `£60k to turn an unknown into a known while changes are still cheap on paper. Best money you'll spend on this job.`,
          ripple: { at: 4, hit: { title: 'Solid Ground', text: `The probes found two old voids under Pier 4. They were grouted in August. November's pier works went in without a wobble.`, e: { schedule: 4, safety: 3 } } } },
        { t: `Design deeper foundations regardless`, d: `Assume the worst and build around it.`, grade: 'ok', e: { budget: -4, schedule: -1, quality: 1 },
          why: `Safe, but you've bought the expensive fix without knowing whether you needed it. Sometimes the cheapest option is simply to find out.`,
          ripple: { at: 4, hit: { title: 'The Expensive Detour', text: `The deeper foundations needed longer piles and a bigger rig. It worked — and the later drilling showed the voids were tiny.`, e: { budget: -3 } } } },
        { t: `Crack on — the piling crew will spot anything`, d: `Keep the design programme moving.`, grade: 'poor', e: { schedule: 2 },
          why: `Hoping a problem is small isn't a plan. Old mine workings are a known hazard in this valley — you'd been told.`,
          ripple: { at: 4, p: 0.7,
            hit: { title: 'Pier 4 Moves', text: `Pier 4 settled 18mm during the works. Emergency propping, a three-week stop, and an engineer's report nobody enjoys reading.`, e: { safety: -10, schedule: -6, budget: -4 } },
            miss: { title: 'Nothing Moved', text: `The piling went in cleanly. The voids, it turned out, were shallow and stable.`, lesson: `You got away with it. A 30% chance of luck is not a strategy.` } } }
      ] },

    scope_ramp: { title: `"While You're At It…"`, from: 'elaine',
      text: `At the steering group, Elaine asks for a step-free footbridge at Harrowby station. "It's only a small addition — can you just absorb it?" The room goes quiet and looks at you.`,
      known: ['Step-free access is genuinely a good idea', 'There is no extra budget'],
      unknown: ['Real cost — Amara guesses 6–10 weeks of work', 'Whether planning consent is needed'],
      principle: { name: 'Never absorb scope — price it', text: `Every change has a cost, even the good ones. Welcome the idea, assess its impact, and let the budget holder decide. Scope creep happens one "small" yes at a time.` },
      discuss: `Think of a "small" request you absorbed. What did it really cost, and who paid?`,
      choices: [
        { t: `Say yes — it's right for passengers`, d: `Keep the sponsor onside and find a way.`, grade: 'poor', e: { morale: 2, schedule: -2, budget: -2 },
          why: `Good cause, bad process. Unpriced scope is how projects quietly go bust — and saying yes in the room means you now own the overrun.`,
          ripple: { at: 5, hit: { title: 'The "Small" Footbridge', text: `The footbridge you absorbed needed new foundations, a drainage diversion and planning consent. It has eaten your contingency.`, e: { budget: -6, schedule: -4 } } } },
        { t: `Say no — it's out of scope`, d: `Protect the baseline you were given.`, grade: 'ok', e: { schedule: 1, morale: -3 },
          why: `You protected the plan, but embarrassed your sponsor in her own meeting. You can hold the line without slamming the door.`,
          ripple: { at: 6, hit: { title: 'A Long Memory', text: `Elaine hasn't forgotten July. The approvals you need for opening are sitting unsigned in her inbox.`, e: { schedule: -3, morale: -2 } } } },
        { t: `"Great idea — I'll bring you the cost and time impact"`, d: `Raise a formal change request for her to decide.`, grade: 'best', e: { quality: 2, schedule: -1 },
          why: `Textbook. You welcomed the idea, priced it, and handed the decision back to the person who owns the money. That's change control.`,
          ripple: { at: 5, hit: { title: 'A Change With Its Own Budget', text: `Your change request was approved — with £400k and three weeks attached. The footbridge is going up without touching your contingency.`, e: { budget: 3, morale: 2 } } } }
      ] },

    two_experts: { title: 'Two Experts, One Viaduct', from: 'amara',
      text: `Amara wants to replace the viaduct deck with a new steel one: fast to install, but it needs a giant crane and a long closure. Tom wants to repair the original masonry arches: flexible and loved locally, but slow and weather-dependent. Both are adamant. Both are good.`,
      known: ['Either approach can work', 'Closures must be booked 12 weeks ahead'],
      unknown: ['What the winter will do', 'Crane availability'],
      principle: { name: 'Decide on criteria, not personalities', text: `When experts disagree, agree how you'll judge before you judge. Shared criteria turn a fight about who is right into a decision about what is best.` },
      discuss: `How do you usually break a tie between two credible experts? What criteria would you write down first?`,
      choices: [
        { t: `Back Amara — she's the design authority`, d: `Design leads the design.`, grade: 'ok', e: { quality: 2, morale: -2 },
          why: `Defensible, but decided by job title rather than evidence. Tom now feels overruled on something he has to build.` },
        { t: `Back Tom — he has to build it`, d: `The builder knows buildability.`, grade: 'ok', e: { schedule: -1, morale: -1, quality: -1 },
          why: `Also defensible — and also decided by who, not what. Amara will remember it at the next design review.` },
        { t: `Have both score the options against agreed criteria`, d: `Safety, closures, cost, heritage, risk — on one page. Then decide.`, grade: 'best', e: { morale: 3, quality: 2, schedule: -1 },
          why: `You made it about the problem, not the people. Whatever the answer, both of them understand why — and they'll back it.`,
          ripple: { at: 4, hit: { title: 'The Team That Fixes Itself', text: `Since the options workshop, Amara and Tom settle design–site clashes between themselves. Three issues solved this month without you.`, e: { morale: 4, quality: 2 } } } },
        { t: `Let them sort it out between themselves`, d: `They're professionals.`, grade: 'poor', e: { schedule: -2 },
          why: `A standoff between two experts is exactly when a leader is needed. Avoiding the call doesn't avoid the conflict — it just delays the decision.`,
          ripple: { at: 3, hit: { title: 'Still Arguing', text: `The deck argument never got settled. Two weeks lost, and Amara and Tom now communicate by email only.`, e: { morale: -5, schedule: -3, quality: -2 } } } }
      ] },

    cheapest_bid: { title: 'The Cheapest Bid', from: 'victor',
      text: `Tenders are in. Contractor A is 18% cheaper than anyone else — and has had two safety prosecutions in three years. Contractor B is mid-priced, with a clean record and glowing references.`,
      known: ['18% is a £1.1M saving', 'The budget is under pressure'],
      unknown: ['Why A is so cheap', 'Whether A has changed its ways'],
      principle: { name: 'Price is what you pay; value is what you get', text: `An abnormally low bid is a warning, not a gift. Past behaviour is the best predictor of future behaviour — weigh track record alongside price.` },
      discuss: `When has the cheapest option cost you more in the end? What signals did you ignore?`,
      choices: [
        { t: `Award to A — that saving is too big to ignore`, d: `Take the money and manage them hard.`, grade: 'poor', e: { budget: 5 },
          why: `When a bid is far below everyone else's, ask what they left out. Low bids are often clawed back later through claims — and cut corners.`,
          ripple: { at: 5, p: 0.8,
            hit: { title: 'The Real Price', text: `Contractor A's "unforeseen works" claims have eaten the whole saving, and an enforcement notice stopped work for three days.`, e: { budget: -7, safety: -5, quality: -4 } },
            miss: { title: 'They Delivered', text: `Contractor A performed — this time. The saving held.`, lesson: `You bet a million pounds of risk against the evidence and won. Don't let a good outcome teach you a bad habit.` } } },
        { t: `Award to B on a quality-and-price score`, d: `Pay more for a proven track record.`, grade: 'best', e: { budget: -2, safety: 3, quality: 2 },
          why: `You bought value, not price. A clean record and strong references are the best predictor you have of how a contractor will behave.`,
          ripple: { at: 5, hit: { title: 'Quietly Excellent', text: `Contractor B finished the arch repairs early and flagged two design issues before they became problems.`, e: { quality: 4, schedule: 2 } } } },
        { t: `Award to A, with a full-time supervisor on them`, d: `Take the saving, watch them closely.`, grade: 'ok', e: { budget: 3, safety: -1 },
          why: `A compromise that treats the symptom. Supervision helps, but you're paying to watch a risk you chose to take.`,
          ripple: { at: 5, hit: { title: 'Paying to Watch', text: `The supervisor caught a lot — but cost a lot, and Contractor A has still lodged two claims.`, e: { budget: -3, quality: -1 } } } }
      ] },

    friday_4pm: { title: 'Friday, 4pm', from: 'amara',
      text: `Your 54-hour closure of Kestrel Junction — where the branch meets the main line — starts tonight. 300 people are booked. Then Amara calls: the signalling checks aren't finished. She puts the chance of an overrun at "1 in 5, maybe worse". An overrun cancels Monday's commuter trains into the city.`,
      known: ['Rebooking a closure takes three months', 'Overruns carry heavy fines'],
      unknown: ['Whether the unchecked items matter', `How good Amara's estimate is`],
      principle: { name: 'Ignore sunk costs; shape the risk', text: `Past effort is spent whichever way you go — decide on what's at stake from here. And most decisions aren't go/no-go: look for the option that keeps the upside and caps the downside.` },
      discuss: `Name a decision you pushed through because of the effort already spent. What would a "reduced scope" option have looked like?`,
      choices: [
        { t: `Go as planned — we've prepared for months`, d: `Trust the team to make it work.`, grade: 'poor', e: { schedule: 2 },
          why: `Months of planning is a sunk cost — it's spent whether you go or not. The only question is what's at stake from here, and that's a big bet with Monday's commuters.`,
          ripple: { at: 5, p: 0.45,
            hit: { title: 'Monday Morning', text: `The closure overran by five hours. 30,000 commuters stranded. You are the lead story on the regional news.`, e: { schedule: -6, morale: -4, budget: -5 } },
            miss: { title: 'Forty Minutes to Spare', text: `The junction was handed back with forty minutes in hand. Phew.`, lesson: `"It worked" isn't the same as "it was a good call". You rolled the dice with 30,000 commuters.` } } },
        { t: `Go — but drop the unchecked signalling work and prepare a tested fallback`, d: `Deliver what's certain; defer the rest.`, grade: 'best', e: { schedule: -1, quality: 2, safety: 2 },
          why: `You didn't treat it as all-or-nothing. You shaped the risk: bank the safe work, defer the uncertain bit, keep a way back.`,
          ripple: { at: 5, p: 0.3,
            hit: { title: 'Good Call, Bad Dice', text: `Even with the reduced scope, an engineering train broke down on its way in. You handed back 20 minutes late — the fallback plan kept it that small.`, e: { schedule: -1 }, lesson: `A good decision can still have a bad outcome. Don't let one unlucky result teach you the wrong lesson.` },
            miss: { title: 'Banked', text: `The reduced closure finished on time. The deferred signalling work slotted into a night shift a fortnight later.`, e: { schedule: 2 } } } },
        { t: `Cancel and rebook`, d: `Don't start what you might not finish.`, grade: 'ok', e: { schedule: -5, safety: 2 },
          why: `Safe, but expensive: three months lost for a risk you could have shaped. Cancelling is a real option — just not the only one.` }
      ] },

    nobody_hurt: { title: 'Nobody Got Hurt', from: 'hana',
      text: `A track worker stepped onto the open main line at the junction without protection. A lookout's shout saved him — the train passed four seconds later. His supervisor asks you to keep it off the books: "No harm done. Reporting it just slows everyone down."`,
      known: [`You're two weeks behind`, 'The crew are tired from night shifts'],
      unknown: ['Why he stepped out', `Whether it's happened before`],
      principle: { name: 'Near misses are free lessons', text: `Safety isn't one metric among five — it's a precondition. Serious accidents are almost always preceded by near misses that someone chose not to report.` },
      discuss: `What makes people in your organisation not report near misses? What would change that?`,
      choices: [
        { t: `Stop the job, report it, and find the root cause`, d: `Whatever it costs the programme.`, grade: 'best', e: { schedule: -3, safety: 6, morale: 1 },
          why: `Right call, no hesitation. The investigation found fatigue from back-to-back night shifts. That's fixable — now.`,
          ripple: { at: 6, hit: { title: 'People Speak Up', text: `Since you stopped the job, near-miss reports have tripled. Two more hazards were fixed before anyone was hurt.`, e: { safety: 4, morale: 3 } } } },
        { t: `Toolbox talk tomorrow, then carry on`, d: `Remind everyone of the rules.`, grade: 'ok', e: { safety: 2 },
          why: `Better than nothing, but a reminder assumes the worker was the problem. Without asking why it happened, the cause is still out there.` },
        { t: `Keep it quiet — no harm done`, d: `Protect the programme, and the supervisor.`, grade: 'poor', e: { schedule: 1, morale: -1 },
          why: `This is the one you never trade. Burying near misses teaches everyone that reporting gets punished — so the next one goes unreported too.`,
          ripple: { at: 6, p: 0.6,
            hit: { title: `The Next One Wasn't a Miss`, text: `A worker was seriously injured on the same stretch of line. The investigation found the January near miss was never reported. The regulator is on site.`, e: { safety: -15, morale: -8, schedule: -5 } },
            miss: { title: 'Silence', text: `Nothing else happened. But the crew learned that near misses get buried — and the fatigue behind it is still there.`, e: { safety: -3 }, lesson: `No harm this time isn't the same as no risk.` } } }
      ] },

    green_amber_red: { title: 'Green, Amber or Red?', from: 'elaine',
      text: `Testing is three weeks behind. The board report is due tomorrow, and Elaine has made it clear she "doesn't like surprises — or red". Your team thinks they can claw back two of the three weeks.`,
      known: ['Three weeks behind today', 'The board meets monthly'],
      unknown: ['Whether the recovery plan works', 'How the board will react'],
      principle: { name: 'Bad news early is good news', text: `Report reality, not hope. Early bad news gives others time to help. Late bad news destroys trust — and arrives with interest.` },
      discuss: `Have you ever seen a "watermelon" report — green outside, red inside? What pressure created it?`,
      choices: [
        { t: `Amber: the real dates, plus a recovery plan`, d: `Say what's true and what you're doing about it.`, grade: 'best', e: { quality: 2 },
          why: `Honest, specific, and it comes with a plan. Boards can help with problems they know about. They can't help with the ones they don't.`,
          ripple: { at: 6, hit: { title: 'Trust Pays', text: `Because the board saw the slip early, they approved weekend testing shifts. Two of the three weeks are back.`, e: { schedule: 4, morale: 2 } } } },
        { t: `Green — we'll recover it anyway`, d: `No point alarming anyone yet.`, grade: 'poor', e: { morale: 1 },
          why: `A "watermelon" report — green outside, red inside. Bad news doesn't improve with age.`,
          ripple: { at: 6, p: 0.8,
            hit: { title: 'Watermelon', text: `The "green" report didn't survive commissioning. The slip is now obvious, and Elaine double-checks everything you tell her.`, e: { schedule: -5, morale: -5 } },
            miss: { title: 'Clawed Back', text: `The team recovered the time. Nobody ever found out.`, lesson: `Getting away with it reinforces the wrong habit. Next time you might not recover it.` } } },
        { t: `Red, and ask for a three-week extension`, d: `Flag it and hand it upward.`, grade: 'ok', e: { schedule: -2, morale: -1 },
          why: `Honest, but it hands the problem up with no plan attached. Leaders bring options, not just bad news.` }
      ] },

    opening_day: { title: 'Opening Day?', from: 'elaine',
      text: `The ribbon-cutting is booked for Saturday. Northvale Trains, the operator, won't accept the railway: twelve minor defects are still open and the as-built drawings are incomplete. Elaine tells you to "get them to sign".`,
      known: ['No defect is safety-critical', 'The opening is public and political'],
      unknown: ['How long the drawings will take', `The operator's appetite for risk`],
      principle: { name: 'Done means safe, agreed and documented', text: `Handover is a relationship, not a deadline. Agree what "complete" means with the people who'll live with the asset for the next forty years.` },
      discuss: `What does "done" really mean in your work — and who gets to decide?`,
      choices: [
        { t: `Open on time with a signed, dated defects list`, d: `Agree handover conditions with the operator.`, grade: 'best', e: { schedule: 2, quality: 2, morale: 2 },
          why: `Done doesn't mean perfect — it means safe, agreed and documented. The operator gets certainty, Elaine gets her date.`,
          ripple: { at: 7, hit: { title: 'A Clean Handover', text: `All twelve agreed defects were closed on schedule. Northvale have asked for you by name on their next project.`, e: { quality: 3, morale: 3 } } } },
        { t: `Delay the opening until every defect is closed`, d: `Hand over a perfect railway.`, grade: 'ok', e: { schedule: -6, quality: 3 },
          why: `Principled, but you've paid for a public delay over defects nobody thinks are dangerous. Perfection has a cost too.` },
        { t: `Lean on the operator until they sign`, d: `Use Elaine's weight.`, grade: 'poor', e: { schedule: 3, quality: -3, morale: -2 },
          why: `You got your ribbon — and an operator who won't trust anything you hand them. They run this railway for forty years; you leave in eight weeks.`,
          ripple: { at: 7, hit: { title: 'Handed Over, Not Taken Over', text: `Northvale are logging every defect as a formal dispute. Your team is stuck on site answering queries.`, e: { quality: -5, morale: -3, budget: -3 } } } }
      ] },

    the_claim: { title: 'The £1.2M Claim', from: 'victor',
      text: `The main contractor has submitted a £1.2M claim for delays. Your records show some of it is fair — design information was late — but a lot of it looks inflated.`,
      known: ['Some of the delays were your fault', 'Disputes can drag on for years'],
      unknown: [`Which items they'd drop`, 'How good their records are'],
      principle: { name: 'Be fair, be firm, keep records', text: `Own what's yours and challenge what isn't. Good records made at the time win arguments before they start.` },
      discuss: `How do you separate what you genuinely owe from what's being tried on?`,
      choices: [
        { t: `Reject it all — make them prove every line`, d: `Protect the budget.`, grade: 'poor', e: { budget: 2, morale: -2 },
          why: `Fighting the valid parts costs more in fees and goodwill than it saves. You'll probably pay them anyway — plus lawyers.`,
          ripple: { at: 8, hit: { title: 'Adjudication', text: `The claim went to adjudication. You lost on the valid items and paid costs on top.`, e: { budget: -5, morale: -2 } } } },
        { t: `Pay it and close out`, d: `Move on quickly.`, grade: 'poor', e: { budget: -6, morale: 1 },
          why: `Fast, but you paid for the inflated parts too — and taught this contractor that padding claims works.` },
        { t: `Test each item against the records; pay what's valid`, d: `Challenge the rest with evidence.`, grade: 'best', e: { budget: -2, quality: 2 },
          why: `Fair and firm. Your records do the arguing for you. Own your share of the delay — and nothing more.`,
          ripple: { at: 8, hit: { title: 'Settled', text: `The contractor accepted £520k against their £1.2M claim. The relationship is intact.`, e: { budget: 3, morale: 2 } } } }
      ] },

    lessons: { title: 'Lessons Learned', from: 'moira',
      text: `The project is closing. The whole team gathers in the old station waiting room for the lessons-learned session. Everyone is tired — and some of the mistakes were yours.`,
      known: ['The next project starts in two weeks', 'Most lessons logs are never read again'],
      unknown: ['What the team really thinks'],
      principle: { name: 'Safety to speak makes learning possible', text: `People only share what they feel safe to share. Leaders set that tone by owning their own mistakes first.` },
      discuss: `When did a leader's honesty about their own mistake change how you behaved?`,
      choices: [
        { t: `Go first: name your own mistakes, then open the floor`, d: `Lead by example.`, grade: 'best', e: { quality: 4, morale: 4 },
          why: `When the leader owns their mistakes first, everyone else feels safe to be honest. That's how lessons actually get learned.` },
        { t: `Keep it upbeat — celebrate the wins`, d: `The team has earned it.`, grade: 'ok', e: { morale: 3 },
          why: `Celebration matters, but a review with no hard truths just repeats the same mistakes on the next job.` },
        { t: `Send a template for everyone to fill in`, d: `Efficient, and documented.`, grade: 'poor', e: { morale: -1 },
          why: `A form captures what people are willing to write down. The useful lessons are the ones they'd only say out loud.` }
      ] }
  },

  // Mentor's closing words, chosen by Judgment score.
  finale: {
    reveal: `I promised I'd tell you. In 1986 I found the cracks near Pier 4 and wrote a polite memo, and when nobody answered, I let it go. In 1987 a section of parapet fell onto the line. Nobody died. They closed the railway the next month. I've spent thirty-nine years wishing I'd been rude.`,
    high: `You asked the questions I didn't. You bought information, you told the truth early, and you stopped the job when it mattered. Harrowby has its railway because of that. Keep asking them.`,
    mid: `You got more right than wrong, and — more importantly — you now know which ones you got wrong. That's the whole job. Keep asking the awkward questions.`,
    low: `Some of your calls went the way mine did in '86. The difference is you've seen the ripples early, and you still have thirty years to be rude about the right things. Use them.`
  }
};
