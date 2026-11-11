import type { Lesson, Source } from "../types";

/**
 * Season 1: "The Permanent Way". Twenty stops, from why rails need gaps to diagnosing a buckle.
 *
 * Facts are checked against the sources cited on each fact, paraphrased, never copied.
 * Every `lens` is a Mindcast built with docs/MINDCAST_METHOD.md and passes its integrity check.
 */

const BOOK = "Practical Railway Engineering (2nd ed., 2005), C. F. Bonnett";
const NRGUIDE = "Network Rail, Introduction to the Permanent Way (NR/PWG/001, issue 2, 2003)";

const pre = (chapter: string, where: string): Source => ({ label: `${BOOK}, ${chapter}`, where });
const nr = (where: string): Source => ({ label: NRGUIDE, where });
const wiki = (title: string, slug: string): Source => ({
  label: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${slug}`,
});

const TRACK = "ch. 5 Track";
const EARTH = "ch. 6 Earthworks, Drainage and Fencing";

const AUTHOR = "Groundwork editorial";

export const lessons: Lesson[] = [
  // 1
  {
    id: "s1-01",
    season: 1,
    stop: 1,
    title: "Why rails need gaps",
    hook: "Why do older railway lines go clickety-clack?",
    explorer:
      "Steel gets a tiny bit longer when it warms up and a tiny bit shorter when it cools down. On older railways, each rail has a small gap at its end so it has room to do this. The clickety-clack you hear is the wheels rolling over those gaps.",
    starter: [
      "Steel expands as it warms and contracts as it cools. For a short piece the change is tiny, but rails are long, and a rail in full sun can get much hotter than the air around it. A small change multiplied over many metres of steel becomes movement you can see.",
      "On jointed track, rails are laid in fixed lengths and joined with steel plates called fishplates, bolted through the ends of both rails. For many years the standard British rail was 60 feet long, about 18 metres. Between the rail ends sits a small expansion gap.",
      "The gap is set to suit the temperature. Network Rail's permanent way guide gives a target that steps down as it gets warmer: about 10 mm on a cold day, closing to nothing in very hot weather. A closed gap in summer is correct. The rail has used the room it was given.",
      "The gaps also tell inspectors a story. Wide gaps on a hot day suggest the fishplates have seized, so the rail cannot slide into its gap. The expansion then has nowhere to go along the rail and may push the track sideways, which is how a buckle starts. Closed gaps on a cold day suggest the rails have crept along and need resetting before summer.",
      "Gaps have a cost. Every joint is a small step for the wheel, which wears the rail ends, loosens bolts and makes the ride noisy. That is why main lines now weld rails into long continuous lengths, which is the next stop.",
    ],
    leader:
      "The gap is a designed allowance for a force nobody can stop: temperature. Engineers do not try to prevent expansion. They decide where it goes, then check that the allowance still works. On a large programme, name the pressures that are certain to arrive, give each a planned place to go, and inspect that the place is still free.",
    keyFacts: [
      {
        text: "Steel rails expand as they warm and contract as they cool. Jointed track leaves a small gap at each rail end to allow for this.",
        sources: [nr("Section 3, Rails and joints: expansion gaps"), pre(TRACK, "5.13 Desirability of removing rail joints")],
      },
      {
        text: "The set gap depends on temperature, from about 10 mm in cold weather down to closed in very hot weather.",
        sources: [nr("Extremes of weather: expansion gap table")],
      },
      {
        text: "Wide gaps on a hot day can mean seized fishplates: the rail cannot expand along its length and may move sideways.",
        sources: [nr("Section 3, Rails and joints: expansion gaps")],
      },
      {
        text: "British bullhead rail was standardised in 60 foot lengths, about 18 m, by the early 1900s.",
        sources: [pre(TRACK, "5.1 The origin and development of railway track")],
      },
    ],
    diagram: "rail-expansion",
    quiz: [
      {
        q: "On a very hot day, what should the gap at a well-maintained rail joint look like?",
        options: ["Wide open", "Closed or nearly closed", "Exactly the same as in winter", "Filled with ballast"],
        answer: 1,
        why: "In heat the rail expands into its gap, so a closed or nearly closed gap is correct. A wide gap on a hot day is the warning sign.",
      },
      {
        q: "Wide gaps on a hot day can point to which fault?",
        options: ["Seized fishplates stopping the rail sliding", "Too much cant", "Brand new sleepers", "A faulty signal"],
        answer: 0,
        why: "If the fishplates have seized, the rail cannot slide into its gap. The expansion has to go somewhere, and sideways movement can lead to a buckle.",
      },
      {
        q: "Why did main lines move away from jointed track?",
        options: [
          "Gaps make trains faster",
          "Steel stopped expanding",
          "Fishplates were hard to paint",
          "Joints wear rails and wheels, work loose and make the ride rough",
        ],
        answer: 3,
        why: "Every joint is a small step for the wheel. It wears the rail ends and the wheels and needs constant attention, which is why long welded rail replaced it on main lines.",
      },
    ],
    lens: {
      id: "s1-01-lens",
      title: "Give pressure a planned place to go",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "On jointed track the gap at each rail joint is set by temperature: wide in winter, closed tight on a hot day. Network Rail's guide steps the target gap down from about 10 mm in cold weather to none above 38°C.",
      mechanism:
        "Steel expands as it warms and contracts as it cools. The gap gives the expansion somewhere to go. If the fishplates seize and the rail cannot slide into its gap, the expansion becomes compressive force in the rail, and where ballast at the sleeper ends is weak the rail moves sideways instead.",
      mapping: [
        {
          railway: "The gap gives the rail's expansion a planned place to go, so the force never builds.",
          target: "A regular, safe slot for bad news gives pressure in a team a planned place to go, so it never builds.",
        },
        {
          railway: "A seized joint stops the rail sliding, so the force builds until it moves the track sideways.",
          target: "When people are blocked from raising problems, pressure builds until it comes out sideways, somewhere unplanned.",
        },
        {
          railway: "Ballast at the sleeper ends resists sideways movement when the force does build.",
          target: "Steady working relationships resist a stressed team pulling apart when the pressure does build.",
        },
      ],
      limits:
        "Steel expands by a fixed, predictable amount for each degree, but people do not. Pressure in a team can also fade, change shape or be released by one honest conversation, which has no equivalent in a rail. Use the gap as a reason to make room, not as a way to measure people.",
      principle: "Give pressure a planned place to go, or it will find an unplanned one.",
      action:
        "Add one standing five-minute \"what's stuck?\" slot to your team meeting this week, and leave it on the agenda even when nobody uses it.",
      railwayTopic: "s1-01",
      sources: [nr("Extremes of weather: expansion gap table"), nr("Hot weather")],
    },
    action:
      "Add one standing five-minute \"what's stuck?\" slot to your team meeting this week, and keep it even when nobody uses it.",
    terms: ["expansion gap", "fishplate", "jointed track", "buckle", "rail creep"],
  },

  // 2
  {
    id: "s1-02",
    season: 1,
    stop: 2,
    title: "Steel on the move",
    hook: "If steel expands in the heat, how can a railway weld its rails into one long piece?",
    explorer:
      "Busy main lines today have almost no gaps. The rails are welded into very long pieces and clipped down firmly, so they cannot stretch or shrink. Instead the steel holds the push and pull inside itself, a bit like a stretched elastic band holding its pull.",
    starter: [
      "Continuous welded rail, or CWR, is rail welded into lengths that can run for kilometres without a joint. There are no gaps for the steel to expand into. So where does the expansion go?",
      "The answer is that the rail is held so firmly that it cannot change length. Clips grip it to the sleepers, and the sleepers are held in place by ballast. When the temperature rises, the steel still tries to expand. Because it cannot, that urge becomes a squeezing force inside the rail. When it gets cold, the opposite happens and the rail is pulled tight.",
      "These forces are large. In Practical Railway Engineering, Clifford Bonnett works out that a fully restrained main line rail warmed by 45°C carries a squeezing force of more than 70 tonnes. In hot weather that is enough to push the track sideways into a buckle. In very cold weather, high pulling force can crack a rail right through, which is why rail breaks are more common in winter.",
      "The middle of a long welded rail does not move, but its ends can. Where welded rail meets jointed track or fixed layouts such as points, Network Rail fits adjustment switches: overlapping, angled rail ends that let roughly the last 100 metres of welded rail slide as it expands and contracts. They need regular lubrication, or they seize.",
      "So CWR does not beat physics. It swaps a little movement at thousands of joints for a large, controlled force held inside the steel. That swap only works if the rail is fixed down at the right temperature, which is the subject of stop 7.",
    ],
    leader:
      "CWR removed thousands of small, visible movements and replaced them with one large, invisible force. That is a good trade only while the restraint is strong and the ends are managed. When you take slack out of a system to make it smoother, you have not removed the pressure. You have moved it inside, so watch the restraint and the interfaces.",
    keyFacts: [
      {
        text: "In CWR the rail is restrained so it cannot change length. Temperature change becomes compressive force in heat and tensile force in cold.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "By Bonnett's calculation, a restrained main line rail warmed by 45°C carries a force of more than 70 tonnes.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "High tension in very cold weather can cause brittle fracture of rails.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "Adjustment switches let about the last 100 m of CWR move where it meets jointed track or fixed points, and must be lubricated regularly.",
        sources: [nr("Section 4, Track geometry: line, adjustment switches")],
      },
    ],
    diagram: "rail-expansion",
    quiz: [
      {
        q: "In continuous welded rail on a hot day, the rail is mostly:",
        options: [
          "Longer than when it was laid",
          "Squeezed by a compressive force, because it cannot expand",
          "Loose in its clips",
          "Free of any force",
        ],
        answer: 1,
        why: "The rail is held at a fixed length, so the expansion it would have had becomes a squeezing force inside the steel.",
      },
      {
        q: "Why are rail breaks more likely in very cold weather?",
        options: [
          "Ice makes steel softer",
          "Trains run faster in winter",
          "The restrained rail is pulled into high tension and can fracture",
          "Ballast freezes and lifts the rail",
        ],
        answer: 2,
        why: "Cold makes the rail try to contract. Held at a fixed length, it is pulled into tension, and very high tension can crack the steel.",
      },
      {
        q: "What does an adjustment switch do?",
        options: [
          "Moves trains from one track to another",
          "Turns signals on and off",
          "Measures rail temperature",
          "Lets the end of a long welded rail slide as it expands and contracts",
        ],
        answer: 3,
        why: "Adjustment switches sit where welded rail meets jointed track or fixed layouts, and let the last stretch of rail move without pushing on its neighbours.",
      },
    ],
    lens: {
      id: "s1-02-lens",
      title: "Design the sliding joint between fixed and flexible",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Where continuous welded rail meets jointed track or fixed points and crossings, Network Rail fits an adjustment switch. It lets roughly the last 100 metres of welded rail slide as it expands and contracts, and it must be lubricated regularly or it seizes.",
      mechanism:
        "In the middle of a long welded rail, clips and ballast stop any change in length, so temperature change is held as force inside the steel. At the ends, that movement has to be released somewhere, because the fixed layout next door cannot take it. The adjustment switch gives the movement a controlled path. If it seizes, the movement passes into the neighbouring track, which can push it out of line.",
      mapping: [
        {
          railway: "The adjustment switch lets the end of a long rail move, so its force does not pass into the fixed layout next to it.",
          target: "A planned change window between a fixed-baseline programme and a fast-moving team lets their changes land without forcing the baseline out of shape.",
        },
        {
          railway: "A seized switch stops the sliding, so movement builds and pushes the neighbouring track out of line.",
          target: "A change window nobody runs stops changes landing cleanly, so they build up and push into the fixed plan as surprises.",
        },
        {
          railway: "The middle of the rail is held firm, because only the ends are allowed to move.",
          target: "Most of the programme can hold firm, because the few places where movement is allowed are named and kept free.",
        },
      ],
      limits:
        "A rail's movement is predictable from temperature, so engineers can size the sliding joint in advance. Change between teams is not, and unlike steel, people can also route round a seized interface rather than push through it. Size the window from experience, not from a formula, and review it.",
      principle: "Where something rigid meets something that moves, design the joint where movement is allowed, then keep it working.",
      action:
        "Name the one interface in your work where a fixed plan meets a fast-changing team, and book a 30-minute review of how changes cross it before Friday.",
      railwayTopic: "s1-02",
      sources: [nr("Section 4, Track geometry: line, adjustment switches"), pre(TRACK, "5.17 Stressing or locking-up of CWR")],
    },
    action:
      "Name the one place in your work where a fixed plan meets a fast-changing team, and book a 30-minute review of it before Friday.",
    terms: ["continuous welded rail", "compression", "tension", "adjustment switch", "rail creep"],
  },

  // 3
  {
    id: "s1-03",
    season: 1,
    stop: 3,
    title: "Sleepers",
    hook: "What is actually holding the two rails the right distance apart?",
    explorer:
      "Under the rails lie lots of heavy beams called sleepers. They spread the weight of the train into the stones below, a bit like snowshoes spread your weight on snow. They also keep the two rails exactly the right distance apart.",
    starter: [
      "Sleepers are the beams that lie across the track under the rails. Bonnett gives them a short list of jobs: spread each wheel's load into the ballast, hold the rails at the right gauge and angle, pass sideways and lengthways forces into the ballast, keep the two rails electrically separate, and give the fastenings something to grip.",
      "The electrical job matters more than it sounds. On many lines a small current runs through the rails to detect trains, so the sleepers and fastenings must keep the two rails insulated from each other.",
      "Britain has used three main materials. Timber came first: treated softwood lasts roughly 15 to 25 years on the surface, while dense hardwoods such as jarrah have lasted more than 50 years in dry tube tunnels. Prestressed concrete is now standard on main lines. A standard British concrete sleeper is about 2.5 metres long and weighs about 285 kg, far too heavy to lift by hand, so machines lay and replace them. Steel sleepers are light and easy to handle but harder to pack with ballast, and are rare in Britain.",
      "The rails do not stand straight up. They lean slightly inwards, at 1 in 20, set by the baseplate or the rail seat on the sleeper. With the rail at that angle, the wheel meets it close to the middle of the rail head, which reduces twisting and wear at the corner.",
      "Each wheel load is shared by several sleepers at once. If one sleeper rots, cracks or loses the ballast packed under it, its neighbours carry more of every passing wheel. They wear faster and start to fail too, so a run of poor sleepers is far more worrying than one.",
    ],
    leader:
      "No single sleeper carries a train. The load is shared, so the system tolerates one weak sleeper and punishes a cluster. Large programmes behave the same way. Look for clusters of strain, not just the single worst case, because strain moves to the neighbours.",
    keyFacts: [
      {
        text: "Sleepers spread wheel loads to the ballast, hold the rails to gauge and inclination, transmit sideways and lengthways forces, insulate the rails electrically and carry the fastenings.",
        sources: [pre(TRACK, "5.5 Sleeper functions"), nr("Section 3, Sleepers")],
      },
      {
        text: "A standard British prestressed concrete sleeper is about 2515 mm long and weighs about 285 kg.",
        sources: [pre(TRACK, "5.7 Prestressed concrete sleepers (monobloc)")],
      },
      {
        text: "Treated softwood sleepers last about 15 to 25 years on the surface. Jarrah hardwood sleepers have lasted over 50 years in London's tube tunnels.",
        sources: [pre(TRACK, "5.6 Timber sleepers")],
      },
      {
        text: "Rails are set leaning inwards at 1 in 20.",
        sources: [pre(TRACK, "5.11 Rails"), nr("Section 3, Chairs and baseplates")],
      },
    ],
    diagram: "sleeper-spacing",
    quiz: [
      {
        q: "Which of these is NOT a job of a sleeper?",
        options: ["Spread wheel loads into the ballast", "Hold the rails to gauge", "Insulate the rails electrically", "Supply power to the train"],
        answer: 3,
        why: "Sleepers carry, hold, transmit and insulate. Power comes from overhead wires or a conductor rail, not from the sleepers.",
      },
      {
        q: "Why are concrete sleepers usually laid and replaced by machine?",
        options: ["They are fragile", "At about 285 kg each they are too heavy to handle by hand", "They must be laid at night", "They need heating first"],
        answer: 1,
        why: "Timber sleepers could be manhandled. Concrete ones are much heavier, so laying and replacing them needs mechanical help.",
      },
      {
        q: "If one sleeper loses its support, what tends to happen to its neighbours?",
        options: ["Nothing", "They rise up", "They carry more of each wheel load and wear faster", "They become electrically live"],
        answer: 2,
        why: "Wheel loads are shared between nearby sleepers. Remove one support and the others take its share, so weakness spreads.",
      },
    ],
    lens: {
      id: "s1-03-lens",
      title: "Strain moves to the neighbours",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "A wheel load is shared between several sleepers at once. When one sleeper decays, cracks or loses its packing, the sleepers either side carry more of every passing wheel. Network Rail's guide shows decayed timber sleepers that can no longer support the rail or hold gauge.",
      mechanism:
        "The rail acts like a stiff beam resting on springs. A load spreads along it to the sleepers within reach. Remove one support and the beam bends more between the remaining ones, so the neighbours take bigger loads, settle and wear faster. One weak spot grows into a run of weak sleepers.",
      mapping: [
        {
          railway: "Each wheel load spreads across several sleepers, so one weak sleeper is carried by its neighbours.",
          target: "Work is shared across a team, so one overloaded or absent person is quietly carried by the colleagues nearest to them.",
        },
        {
          railway: "The neighbours take bigger loads, wear faster and start to fail, so one weak spot becomes a cluster.",
          target: "Those colleagues absorb the extra load, tire faster and start to slip too, so one gap becomes a cluster of strain.",
        },
        {
          railway: "An inspector who finds one bad sleeper checks the ones either side before the repair is planned.",
          target: "A manager who spots one struggling person checks on the people covering for them before deciding what to change.",
        },
      ],
      limits:
        "Sleepers cannot ask for help, refuse extra load or recover with rest, but people can do all three. Unlike a sleeper, a colleague who covers for someone may also gain skills from it. Borrow the pattern of where to look, not a claim that strain always spreads the same way.",
      principle: "When one part of a shared load weakens, look next at whoever is quietly carrying it.",
      action:
        "Write down who covered for whom in your team over the last two weeks, and have one short conversation this week with the person who covered most.",
      railwayTopic: "s1-03",
      sources: [nr("Section 4, Gauge problems"), pre(TRACK, "5.5 Sleeper functions")],
    },
    action: "Write down who covered for whom in your team over the last two weeks, and talk to the person who covered most this week.",
    terms: ["sleeper", "prestressed concrete", "gauge", "rail seat", "inclination", "packing"],
  },

  // 4
  {
    id: "s1-04",
    season: 1,
    stop: 4,
    title: "Ballast",
    hook: "Why is railway track laid on sharp, broken stones instead of smooth pebbles?",
    explorer:
      "The stones under the track are sharp and broken on purpose. Their rough edges lock together like a jigsaw, so the track stays put when heavy trains rumble over. Round pebbles would roll about like marbles.",
    starter: [
      "Ballast is the bed of crushed stone the sleepers sit in. It carries the load down to the ground, holds the sleepers in place and lets rainwater drain away quickly. Early railways used whatever was cheap nearby, including ash, chalk and clay, and learned the hard way that it did not last.",
      "Good ballast is crushed hard rock, with stones mostly between about 28 and 50 mm. Size matters in both directions. Stones that are too big leave only two or three stones between the sleeper and the ground, which cannot spread the load. Too many small stones clog the spaces between them, so water can no longer drain.",
      "Shape matters too. Angular stones lock together, and that interlock is what stops the sleepers sliding along or sideways. Over years, traffic and maintenance wear the corners off and crush some stones. Rounded stones lose their grip, and the crushed dust, called fines, holds water. Granite wears well; some softer stones break down quickly when wet.",
      "There must be enough of it. Bonnett gives a minimum depth under the sleeper of 150 mm on even a lightly used line and up to about 280 mm on heavy main lines. For welded rail, ballast is filled up between the sleepers and heaped into a shoulder beyond the sleeper ends, because that shoulder resists the rail pushing sideways on a hot day.",
      "Network Rail's guide names a shortage of ballast as one of the main causes of track buckles. It also warns that people crossing the track in the same place wear the shoulder away, and in summer that spot becomes a likely buckle site.",
    ],
    leader:
      "Ballast holds the track through thousands of small contacts, not one big anchor, and those contacts wear away quietly. Stability in delivery also comes from many small working connections, and it erodes where people keep taking the same shortcut. Inspect the shoulders before the hot weather, not after.",
    keyFacts: [
      {
        text: "Good track ballast is crushed rock, angular, with particles mostly between about 28 mm and 50 mm.",
        sources: [pre(TRACK, "5.4 Materials for track ballast")],
      },
      {
        text: "Minimum ballast depth under sleepers is about 150 mm on lightly loaded lines and up to about 280 mm on heavily loaded main lines.",
        sources: [pre(TRACK, "5.3 Track ballast")],
      },
      {
        text: "For welded rail, ballast should fill up to the top of the sleepers and form a good shoulder at the sleeper ends.",
        sources: [pre(TRACK, "5.3 Track ballast")],
      },
      {
        text: "Shortage of ballast is one of the main causes of track buckles, and trespass across the line erodes ballast shoulders.",
        sources: [nr("Extremes of weather: hot weather")],
      },
    ],
    diagram: "ballast-lock",
    quiz: [
      {
        q: "Why is railway ballast made of angular stones?",
        options: ["They are cheaper", "Their edges interlock and resist the track moving", "They look neater", "They are lighter"],
        answer: 1,
        why: "Angular stones lock together. Rounded ones roll past each other, so the track would be free to shift.",
      },
      {
        q: "What is the problem with too many small stones and dust, called fines?",
        options: ["They clog the gaps so water cannot drain", "They make the track too stiff", "They are too heavy", "Nothing"],
        answer: 0,
        why: "Fines fill the spaces between stones. Water then sits in the ballast, which softens the bed and lets the track settle.",
      },
      {
        q: "What does the ballast shoulder beyond the sleeper ends mainly do?",
        options: ["Hides cables", "Holds up the signals", "Keeps the rails warm", "Resists the track moving sideways"],
        answer: 3,
        why: "The shoulder is the main restraint against sideways movement, which matters most for welded rail on hot days.",
      },
    ],
    lens: {
      id: "s1-04-lens",
      title: "Size the pieces so they carry and drain",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Track ballast is graded, with stones mostly between about 28 and 50 mm. Bonnett notes that oversized stones leave only two or three stones under a sleeper, while too many small stones clog the ballast so water stops draining.",
      mechanism:
        "Load passes from sleeper to ground through stone-to-stone contacts. With oversized stones there are too few contacts, so each carries a large share and the load is not spread. With too many fines the voids fill, water cannot drain, and wet fines soften the bed so the track settles. Grading keeps both enough contacts and enough open space.",
      mapping: [
        {
          railway: "Oversized stones leave only a few contacts, so each one carries a large share of the load.",
          target: "Oversized work packages pass through only a few hands, so each person carries a large share of the risk.",
        },
        {
          railway: "Too many fines fill the voids, so water cannot drain and the bed softens.",
          target: "Work cut into too many tiny tickets fills the week with handovers, so problems cannot flow out and delivery slows.",
        },
        {
          railway: "Graded stone keeps both enough contacts and open space, so it carries load and drains.",
          target: "Work sized in the middle range keeps both shared ownership and room to move, so it spreads risk and lets issues surface.",
        },
      ],
      limits:
        "Ballast grading is set by sieve tests with fixed limits, but there is no sieve for work. The right size of a task depends on the people and the uncertainty, and unlike stone, tasks can be split or merged later. Use the two failure modes as prompts, not as a standard.",
      principle: "Break work into pieces big enough to share the load and small enough to let problems drain out.",
      action:
        "Pick your three largest open tasks, split each into parts one person could finish in two or three days, then check your list for tiny tickets you could merge.",
      railwayTopic: "s1-04",
      sources: [pre(TRACK, "5.4 Materials for track ballast")],
    },
    action: "Pick your three largest open tasks and split each into parts one person could finish in two or three days.",
    terms: ["ballast", "interlock", "fines", "ballast shoulder", "buckle", "trespass"],
  },

  // 5
  {
    id: "s1-05",
    season: 1,
    stop: 5,
    title: "Fastenings",
    hook: "How do you hold a rail down hard enough to stop it moving, but gently enough that it does not shake loose?",
    explorer:
      "Rails are held down by strong steel clips. The clips are springy, so they keep squeezing the rail even when trains shake it thousands of times a day. A pad underneath works like a cushion.",
    starter: [
      "The fastening connects the rail to the sleeper. It must stop the rail tipping over, stop it moving sideways and stop it creeping along the sleepers, while taking the shock of every passing wheel.",
      "Older British track used bullhead rail sitting in cast iron chairs, held by wooden or steel keys hammered in between chair and rail. When flat bottom rail came into use from the late 1940s, engineers found that rigid fixings worked loose under vibration. The answer was resilience: a fastening with some spring in it.",
      "Bonnett groups modern fastenings into three types: elastic spikes driven into timber, spring clips held down by a nut and bolt, and spring clips driven into a shoulder cast into the sleeper or part of a baseplate. In Britain the last type, such as the Pandrol clip, is the usual choice. Driving the clip in bends it, and its spring presses down on the foot of the rail. That clamping force is called toe load.",
      "Toe load is what grips the rail and resists creep and buckling, so keeping it up matters. Under the rail sits a rail pad. Network Rail lists its jobs: spread the load evenly over the rail seat, cushion vibration and impact, help spread braking and traction forces along the rail, and insulate the rail electrically. Insulators at the rail foot also keep the clip from carrying current.",
      "Small parts matter. Network Rail's guide shows ferrules in timber sleepers that should stand about 6 mm proud of the casting. Driven too far, or missing, and the screw no longer grips. A fastening system is only as good as its worst part on that sleeper.",
    ],
    leader:
      "Rigid fixings looked strong and loosened under repeated small shocks. Springy fixings flex with each shock and return, so they keep their grip. Controls on a large programme face the same vibration. Rules with no give get worked around; rules with a stated tolerance hold.",
    keyFacts: [
      {
        text: "Early rigid fastenings for flat bottom rail worked loose under vibration, so resilient fastenings were developed. Maintaining the clip's clamping force, the toe load, is crucial.",
        sources: [pre(TRACK, "5.10 Rail fastenings, baseplates and pads")],
      },
      {
        text: "Modern flat bottom rail fastenings fall into three types: elastic spikes, bolted spring clips and spring clips driven into a shoulder. The Pandrol clip is the usual British choice.",
        sources: [pre(TRACK, "5.10 Rail fastenings, baseplates and pads"), nr("Section 3, Fastenings and clips")],
      },
      {
        text: "Rail pads cushion vertical loads and vibration, help spread traction and braking forces, and insulate the rail electrically.",
        sources: [nr("Section 3, Insulating rail pads")],
      },
      {
        text: "Ferrules in timber sleepers should protrude about 6 mm above the chair or baseplate so the screw keeps its grip.",
        sources: [nr("Section 3, Ferrules")],
      },
    ],
    diagram: "fastening",
    quiz: [
      {
        q: "Why did early rigid fastenings for flat bottom rail cause trouble?",
        options: ["They were too springy", "They worked loose under vibration", "They were too expensive", "They rusted at once"],
        answer: 1,
        why: "Every wheel shakes the rail. A rigid fixing cannot follow that movement, so it wears loose over time.",
      },
      {
        q: "What is toe load?",
        options: [
          "The clamping force a clip presses onto the foot of the rail",
          "The weight of a train's front wheel",
          "A wagon load of ballast",
          "A speed limit",
        ],
        answer: 0,
        why: "The spring clip presses down on the rail foot. That force grips the rail and resists creep and buckling.",
      },
      {
        q: "Which is a job of the rail pad?",
        options: ["Lighting the track", "Draining water", "Cushioning vibration and insulating the rail electrically", "Holding up signals"],
        answer: 2,
        why: "The pad spreads load, damps vibration, helps spread longitudinal forces and keeps the rail electrically separate from the sleeper.",
      },
    ],
    lens: {
      id: "s1-05-lens",
      title: "Hold firmly by allowing a little give",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "When flat bottom rail came into British use from the late 1940s, rigid fixings were found to work loose under vibration. Resilient fastenings, such as spring clips driven into a shoulder, keep a clamping force called toe load on the rail foot through millions of wheel passes.",
      mechanism:
        "Every wheel makes the rail flex and bounce slightly. A rigid fixing cannot follow that movement, so each shock wears a little clearance into it until it is loose and the rail can creep along the sleepers. A spring clip deflects with each shock and returns, so the clamping force stays roughly constant. Resilience is what keeps the grip.",
      mapping: [
        {
          railway: "A rigid fixing cannot follow each small shock, so wear builds clearance until it is loose.",
          target: "A rule with no tolerance cannot follow each small exception, so workarounds build up until nobody follows it.",
        },
        {
          railway: "A spring clip deflects with each shock and returns, so the clamping force stays constant.",
          target: "A rule with a stated tolerance bends for the reasonable case and returns, so the standard keeps its hold.",
        },
        {
          railway: "Lost toe load lets the rail creep along the sleepers, which later shows as misalignment.",
          target: "A standard that has lost its hold lets practice drift a little each week, which later shows as a quality problem.",
        },
      ],
      limits:
        "A clip's spring is set by steel and acts the same for every passing wheel, but people decide case by case and can stretch a tolerance until it means nothing. Unlike the clip, a flexible rule needs someone to check that it still returns to the standard.",
      principle: "A control that can flex a little and return keeps its hold longer than one that cannot flex at all.",
      action:
        "Choose one team rule that people keep working around, rewrite it as a standard plus a stated tolerance, and share the new wording at your next meeting.",
      railwayTopic: "s1-05",
      sources: [pre(TRACK, "5.10 Rail fastenings, baseplates and pads")],
    },
    action: "Choose one rule your team keeps working around and rewrite it as a standard plus a stated tolerance before your next meeting.",
    terms: ["fastening", "toe load", "rail pad", "baseplate", "chair", "ferrule", "insulator", "flat bottom rail", "bullhead rail"],
  },

  // 6
  {
    id: "s1-06",
    season: 1,
    stop: 6,
    title: "Welding",
    hook: "How do you join two rails so well that the joint disappears?",
    explorer:
      "Rails are joined by welding. In a factory, a big machine heats two rail ends with electricity and squeezes them together until they become one. Out on the railway, workers pour glowing liquid steel into a mould around the gap, and it sets into a solid joint.",
    starter: [
      "To make continuous welded rail, rails have to be joined so well that the joint is as strong as the rail. Two methods do most of the work in Britain.",
      "Flash butt welding happens in a depot. The two rail ends are clamped close together and a very large electric current passes across the gap. The ends heat until they are almost molten, then they are forced together. Molten metal squeezes out and is sheared off, and the weld is straightened and ground. No metal is added; the rail ends fuse. Each weld shortens the rail by about 20 mm. Bonnett notes that British main line rail is welded this way into lengths of up to about 240 metres.",
      "Those long rails go to site and are joined by aluminothermic welding, often called thermit welding. The rail ends are fixed and aligned with a gap of roughly 22 to 26 mm. A mould is clamped around the gap and preheated. A charge of metal oxide and aluminium powder is lit in a crucible above it. The reaction produces molten steel, which runs down into the mould. Once it has cooled, the excess is trimmed off and the joint is ground to the rail's shape.",
      "Both methods work, but they are not equal. Flash butt welds are made under controlled workshop conditions and are more consistent. Site welds are made outdoors, in all weathers, often in a short possession. Bonnett notes that published figures on broken rails at welds show flash butt welds performing better.",
      "So the industry does as much welding as it can in the depot and as little as it must on site, and site welding follows a strict procedure by trained welders.",
    ],
    leader:
      "The railway makes its critical joins where conditions are controlled and keeps field joins few and procedural. For any large change, move integration into a controlled setting early, and treat every live join as a weaker point that needs a recipe and a check.",
    keyFacts: [
      {
        text: "Flash butt welding joins rails by electrical resistance heating and forging, with no added metal. Each weld shortens the rail by about 20 mm.",
        sources: [pre(TRACK, "5.15 Shop welding to produce long rails")],
      },
      {
        text: "On site, long rails are joined by aluminothermic welding, with a gap of about 22 to 26 mm between rail ends.",
        sources: [pre(TRACK, "5.16 Site welding to produce CWR")],
      },
      {
        text: "An aluminothermic weld runs in stages: preheat, ignite and pour, cool, then grind to profile.",
        sources: [nr("Section 3, Joining rails by welding")],
      },
      {
        text: "Broken-rail statistics show flash butt welds performing better than site welds.",
        sources: [pre(TRACK, "5.16 Site welding to produce CWR")],
      },
    ],
    diagram: "thermite-weld",
    quiz: [
      {
        q: "In flash butt welding, where does the heat come from?",
        options: ["Burning gas", "A large electric current across the rail ends", "Molten steel poured from a crucible", "Friction from passing trains"],
        answer: 1,
        why: "The current meets resistance at the joint and heats the rail ends until they can be forged together.",
      },
      {
        q: "In an aluminothermic weld, what produces the molten steel?",
        options: ["An electric arc", "A furnace on a lorry", "Sunlight", "A reaction between metal oxide and aluminium powder"],
        answer: 3,
        why: "The powder charge reacts and gets hot enough to produce molten steel, which is poured into the mould around the gap.",
      },
      {
        q: "Why does the railway prefer to do most welding in the depot?",
        options: ["Controlled conditions give more consistent welds", "Site welding is not allowed", "Depots are closer to stations", "Depot welds need no grinding"],
        answer: 0,
        why: "Machine-controlled current, force and timing make depot welds very consistent. Site welds face weather and time pressure.",
      },
    ],
    lens: {
      id: "s1-06-lens",
      title: "Make the critical joins where you control the conditions",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "British main line rails are flash butt welded in the depot into long lengths, up to about 240 metres, then joined on site with aluminothermic welds. Bonnett notes that published broken-rail figures show the depot welds performing better.",
      mechanism:
        "A depot weld is made by machine, under cover, with controlled current, force and timing, so each weld is much like the last. A site weld depends on weather, preheating, the gap, the fit of the mould and the time left in a possession. More variables mean more spread in quality, so the industry keeps site welds to the minimum and controls them by procedure.",
      mapping: [
        {
          railway: "Depot welding controls current, force and timing, so the welds come out consistent.",
          target: "Integrating systems early in a test setting controls data, timing and access, so the joins come out consistent.",
        },
        {
          railway: "Site welds depend on weather and possession time, which spreads their quality.",
          target: "Live cutovers depend on the night, the people available and the time window, which spreads their quality.",
        },
        {
          railway: "The industry keeps site welds few and makes each one follow a fixed procedure.",
          target: "A good programme keeps live joins few and makes each one follow a rehearsed checklist.",
        },
      ],
      limits:
        "A weld either holds or it does not, and its quality can be tested once it has set. Integration between teams also depends on trust and shared understanding, which no checklist proves. Unlike a rail, a system can often be rolled back if a join fails.",
      principle: "Do the risky joins where you control the conditions, and keep the ones you cannot control few and rehearsed.",
      action:
        "List every live cutover or handover planned in the next three months, and pick one to rehearse in a test setting before the end of this week.",
      railwayTopic: "s1-06",
      sources: [pre(TRACK, "5.15 Shop welding to produce long rails"), pre(TRACK, "5.16 Site welding to produce CWR")],
    },
    action: "List every live cutover or handover planned in the next three months and choose one to rehearse this week.",
    terms: ["flash butt weld", "aluminothermic weld", "thermit", "crucible", "continuous welded rail", "possession"],
  },

  // 7
  {
    id: "s1-07",
    season: 1,
    stop: 7,
    title: "Stressing",
    hook: "Why do engineers stretch a rail before they clip it down?",
    explorer:
      "Before clipping long rails down, workers often stretch them a little with a hydraulic machine. They make the rail the length it would be on a warm day. Then on very hot or very cold days, the rail is never pushed or pulled too much.",
    starter: [
      "Continuous welded rail cannot change length once it is clipped down, so the temperature at which it is clipped matters. At that temperature the rail carries no force at all. Engineers call it the stress-free temperature. Hotter than that, the rail is squeezed. Colder, it is pulled.",
      "The aim is to put the stress-free temperature roughly halfway between the hottest and coldest rail temperatures the track will see, so neither extreme is too severe. Bonnett gives the generally accepted British figure as about 27°C. That is a rail temperature, not an air temperature, and rails in the sun get much hotter than the air.",
      "Track is often laid on days colder than that. A rail clipped down on a cold day would be stress-free at that cold temperature, and every warm day after would squeeze it. So the rail is first made the length it would be at about 27°C. It can be warmed, but the usual way now is to stretch it with a hydraulic tensor, then clip it down while it is held.",
      "Network Rail's guide describes stressing as building a controlled pulling force into the rail on cooler days, so that the rail expands and contracts only within the range it was designed for.",
      "The stress-free temperature can drift. If a broken rail is cut out and a new piece welded in without restressing, or the rail creeps, its true stress-free temperature can end up lower than designed. That rail reaches dangerous squeezing forces on ordinary hot days. Stressing records are kept for exactly this reason.",
    ],
    leader:
      "Engineers set the rail's neutral point for the conditions it will face, not the conditions on the day it was fitted. Plans set in a quiet week carry a hidden stress into every busy week after. Set the baseline for the middle of the range you expect, and reset it after every repair.",
    keyFacts: [
      {
        text: "CWR is fixed at the length it would have at a temperature about halfway between the hottest and coldest likely rail temperatures. In the UK this is generally taken as about 27°C.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "The rail is brought to that length by warming it or, more usually now, by stretching it with a tensor.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "Stressing introduces a tensile force into the rail so that it expands and contracts only within its design range.",
        sources: [nr("Extremes of weather: hot weather")],
      },
    ],
    diagram: "stressing",
    quiz: [
      {
        q: "What is the stress-free temperature of a rail?",
        options: [
          "The hottest temperature it can survive",
          "The temperature at which the clipped-down rail carries no force",
          "The air temperature on the day it was laid",
          "The temperature at which steel melts",
        ],
        answer: 1,
        why: "At the stress-free temperature the rail is neither squeezed nor pulled. Above it, it is in compression; below it, in tension.",
      },
      {
        q: "Why stretch a rail before clipping it down on a cold day?",
        options: [
          "To make it the length it would be at about 27°C, so summer forces stay within limits",
          "To make it thinner",
          "To test the clips",
          "To remove rust",
        ],
        answer: 0,
        why: "Stretching gives the rail its design length. Clipped down unstretched on a cold day, it would be over-squeezed every summer.",
      },
      {
        q: "A repair leaves a rail with a lower stress-free temperature than designed. What follows?",
        options: [
          "It is safer in summer",
          "It never needs inspecting",
          "It reaches high squeezing forces at lower temperatures, raising buckle risk",
          "It turns into jointed track",
        ],
        answer: 2,
        why: "A lower neutral point means the rail starts building compression sooner as it warms, so ordinary hot days become risky.",
      },
    ],
    lens: {
      id: "s1-07-lens",
      title: "Set the neutral point for the range you will face",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Continuous welded rail is clipped down at the length it would have at a rail temperature of about 27°C, roughly halfway between the hottest and coldest rail temperatures expected in Britain. On cooler days the rail is first stretched with a hydraulic tensor.",
      mechanism:
        "Once clipped, the rail carries no force at its stress-free temperature. Above it, the rail is in compression; below it, in tension. Setting the neutral point in the middle of the expected range keeps both the summer squeeze and the winter pull within safe limits. Clip it down cold without stretching and the neutral point is low, so ordinary hot days later push the force to dangerous levels.",
      mapping: [
        {
          railway: "The neutral point is set at the middle of the expected range, so both extremes stay within limits.",
          target: "Team capacity is planned for the middle of the expected year, so both the peak and the lull stay manageable.",
        },
        {
          railway: "Clipping down on a cold day without stretching sets a low neutral point, so every hot day later adds dangerous force.",
          target: "Setting commitments in a quiet month bakes in a low baseline, so every busy month later adds pressure nobody planned for.",
        },
        {
          railway: "After a repair the rail is restressed, because a cut and new weld can move the neutral point.",
          target: "After a big change in people or scope the plan is rebaselined, because the change can move what normal means.",
        },
      ],
      limits:
        "A rail's range of temperatures is known from decades of weather records, but a team's busy and quiet periods are less predictable. Unlike steel, people also adapt, so a plan set at the midpoint still needs checking against how the team actually copes.",
      principle: "Set your baseline for the middle of the conditions you expect, not the conditions on the day you set it.",
      action:
        "Look at the next twelve months, mark the two busiest months on your calendar, and check this week whether your current plan still works in them.",
      railwayTopic: "s1-07",
      sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR"), nr("Extremes of weather: hot weather")],
    },
    action: "Mark the two busiest months of the next year on your calendar and check this week whether your plan still works in them.",
    terms: ["stress-free temperature", "stressing", "tensor", "compression", "tension", "continuous welded rail"],
  },

  // 8
  {
    id: "s1-08",
    season: 1,
    stop: 8,
    title: "Buckles",
    hook: "Heat alone rarely bends a railway. So what does?",
    explorer:
      "On very hot days, a long rail can push so hard that the track bends sideways. That is called a buckle. It usually happens where something was already a bit weak, like missing stones at the side of the track.",
    starter: [
      "A track buckle is a sudden sideways kink in the track, usually on a hot day. In welded rail, the cause is the squeezing force that builds as the rail heats above its stress-free temperature. Like a long ruler pushed from both ends, the rail tends to bow out where it is least held.",
      "Network Rail's guide makes an important point: a buckle is not usually caused by heat alone. There is almost always at least one other defect too. Typical ones are a shortage of ballast at the sleeper ends, track that is already slightly out of line, or ballast disturbed by recent work.",
      "The ballast shoulder is the main thing stopping the track moving sideways. Network Rail warns that people crossing the track in the same place wear that shoulder away, and in hot weather that spot becomes a prime buckle site. A small existing kink is a trigger point too, because the force is already pushing at an angle there.",
      "Freshly tamped or cleaned track is weaker sideways until trains have bedded the ballast back down, so speed restrictions are often placed on it until it consolidates.",
      "On jointed track the warning sign is different: expansion gaps that stay wide on a hot day, suggesting seized fishplates. Once track has actually buckled, trains must stop until the rail has cooled enough for emergency repairs.",
    ],
    leader:
      "A buckle needs a load and a weakness in the same place. The load, heat, is visible and gets the blame. The weakness, missing ballast, is quieter, earlier and fixable. Before your next busy period, look for the quiet weaknesses, because the pressure will find them.",
    keyFacts: [
      {
        text: "Buckling is not solely due to high temperature; at least one other track defect is usually present.",
        sources: [nr("Extremes of weather: hot weather")],
      },
      {
        text: "Shortage of ballast is one of the main causes of buckles. Trespass that wears away ballast shoulders creates likely buckle sites.",
        sources: [nr("Extremes of weather: hot weather")],
      },
      {
        text: "Track misalignment provides a trigger point for buckles.",
        sources: [nr("Section 4, Track geometry: line")],
      },
      {
        text: "Tamping and ballast cleaning reduce the track's resistance to sideways movement until traffic consolidates it, so speed restrictions may apply.",
        sources: [wiki("Tamping machine", "Tamping_machine")],
      },
      {
        text: "Once track has buckled, traffic must stop until the temperature drops enough for emergency work.",
        sources: [nr("Extremes of weather: hot weather")],
      },
    ],
    diagram: "buckle",
    quiz: [
      {
        q: "According to Network Rail's guide, a buckle usually needs high temperature plus what?",
        options: ["A passing freight train", "At least one other track defect", "A thunderstorm", "A new signal"],
        answer: 1,
        why: "Heat provides the force, but the track usually fails where something else is already weak, such as missing ballast or a small misalignment.",
      },
      {
        q: "Why is a path worn across the track a concern in summer?",
        options: [
          "Walkers wear away the ballast shoulder that resists sideways movement",
          "Footprints make the rails hotter",
          "It changes the gauge",
          "It confuses drivers",
        ],
        answer: 0,
        why: "With less shoulder, there is less to stop the rail moving sideways when the compressive force builds.",
      },
      {
        q: "What must happen once track has buckled?",
        options: ["Trains carry on at full speed", "The rail is painted white", "Nothing until autumn", "Trains stop until the rail has cooled enough for repairs"],
        answer: 3,
        why: "Buckled track cannot safely carry trains. Repairs wait until the rail has cooled and the force has dropped.",
      },
    ],
    lens: {
      id: "s1-08-lens",
      title: "Pressure finds the weak spot you already had",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Network Rail's permanent way guide says track rarely buckles from high temperature alone. At least one other defect is usually present, and a shortage of ballast at the sleeper ends is one of the main causes.",
      mechanism:
        "Heat above the stress-free temperature builds compressive force in welded rail. The ballast shoulder and sleepers resist sideways movement. Where that resistance is low, or the track is already slightly out of line, the force overcomes it and the rail jumps sideways. The heat is the load; the missing ballast decides where, and whether, it fails.",
      mapping: [
        {
          railway: "Heat builds force along the whole rail, but the track only moves where ballast resistance is low.",
          target: "Deadline pressure builds across a whole team, but things only break where support was already thin.",
        },
        {
          railway: "A small existing kink lets the force push at an angle, so failure starts there first.",
          target: "A small unresolved disagreement lets pressure push people apart, so a crisis starts there first.",
        },
        {
          railway: "Topping up ballast before summer removes the weakness, so the same heat causes no buckle.",
          target: "Fixing thin support before the busy period removes the weakness, so the same pressure causes no failure.",
        },
      ],
      limits:
        "Heat is outside anyone's control, but much workload pressure is chosen by leaders and can be reduced. Unlike a rail, a team can also tell you where it is weak if you ask. So treat pressure as something you can adjust, not just weather.",
      principle: "Pressure exposes weaknesses that were already there, so find and fix them before the pressure arrives.",
      action: "At your next team meeting before a busy period, ask for the three places where support is thinnest, and fix one of them by Friday.",
      railwayTopic: "s1-08",
      sources: [nr("Extremes of weather: hot weather"), nr("Section 4, Track geometry: line")],
    },
    action: "Ask your team for the three places where support is thinnest before your next busy period, and fix one by Friday.",
    terms: ["buckle", "compression", "ballast shoulder", "misalignment", "tamping", "speed restriction", "trespass"],
  },

  // 9
  {
    id: "s1-09",
    season: 1,
    stop: 9,
    title: "Drainage",
    hook: "What is the slowest, most patient enemy of a railway track?",
    explorer:
      "Rain is the track's slow enemy. If water stays under the track, the ground goes soft and the track sinks. So railways have pipes and pits beside the track to carry the water away.",
    starter: [
      "Water is the slow enemy of track. Ballast drains freely, but the ground beneath it may not. If water collects at the bottom of the ballast on a clay base, the clay softens, the ballast punches into it, and the track settles unevenly.",
      "So the ground under the track is shaped to shed water. Bonnett recommends that its top surface slopes down to the sides at no flatter than 1 in 25, so water runs towards the cess, the strip beside the track, where drains collect it. Tests suggest about 80 percent of rain reaches the side drains straight through the ballast, nearly all of it within an hour.",
      "Cess drains are pipes laid alongside the track in free-draining material. At intervals of no more than 30 metres there is a catchpit: a chamber with a removable lid and a sump at least 450 mm below the lowest pipe, where silt settles and from which the pipes can be rodded clear.",
      "Drains only work if they are kept clear. Catchpits fill with silt, pipes break and outfalls into streams block. Bonnett notes that drainage is often given low priority because other work looks more urgent, and that long neglect can lead to slips of whole cuttings and embankments. The best time to inspect drains is during or soon after heavy rain, when problems show.",
      "A drain can look fine and still do nothing. If the ballast above it has clogged with fines, the water never reaches the pipe. Then the cure is to clean or replace the ballast, not the drain.",
    ],
    leader:
      "Drainage is the work nobody sees until it fails, and it fails slowly, then suddenly. Protect a small, regular budget for invisible maintenance, and check that it works under load, not on a dry day.",
    keyFacts: [
      {
        text: "The sub-grade surface should slope no flatter than 1 in 25 down to the cess drains. About 80 percent of rain reaches side drains through the ballast, almost all within an hour.",
        sources: [pre(EARTH, "6.10 Side or cess drains")],
      },
      {
        text: "Catchpits should be no more than 30 m apart, with sumps at least 450 mm below the lowest drain.",
        sources: [pre(EARTH, "6.10 Side or cess drains")],
      },
      {
        text: "Drains should be inspected during or soon after heavy rain. Long neglect can lead to major slips of cuttings and embankments.",
        sources: [pre(EARTH, "6.12 Drain cleaning")],
      },
      {
        text: "A drain may look in good condition but take no water if the ballast above it has clogged.",
        sources: [pre(EARTH, "6.13 Ineffective drains")],
      },
      {
        text: "Neglected drainage leads to ballast attrition and poor track.",
        sources: [nr("Ballast, formation and drainage")],
      },
    ],
    diagram: "drainage",
    quiz: [
      {
        q: "What happens when water sits on a clay base under the track?",
        options: ["The clay softens and the track settles", "The track rises", "The rails expand", "Nothing"],
        answer: 0,
        why: "Clay lets water through very slowly. Water that sits on it softens it, and the track above begins to sink unevenly.",
      },
      {
        q: "When is the best time to inspect railway drains?",
        options: ["On a dry summer day", "During or soon after heavy rain", "Only at midnight", "Once every ten years"],
        answer: 1,
        why: "Drains only show their faults when water is flowing. In heavy rain, blockages and ponding are easy to see.",
      },
      {
        q: "A drain looks clean but is not taking water. What is a likely cause?",
        options: ["The rails are too cold", "The signal is red", "The ballast above it has clogged, so water cannot reach it", "The pipe is too big"],
        answer: 2,
        why: "If the ballast has filled with fines, water is trapped above the drain. The fix is the ballast, not the pipe.",
      },
    ],
    lens: {
      id: "s1-09-lens",
      title: "Test the system while it is raining",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Bonnett advises inspecting railway drains soon after heavy rain, or during a downpour, because that is when faults show. He also notes that a drain can look in good condition yet take no water, because the ballast above it has clogged.",
      mechanism:
        "On a dry day a blocked or bypassed drain looks the same as a working one. Its job only exists when water arrives. Under heavy rain, ponding, overflowing catchpits and slow outfalls appear at once. Inspecting appearance finds broken lids; inspecting under load finds the faults that soften the ground and move the track.",
      mapping: [
        {
          railway: "On a dry day a blocked drain looks the same as a working one, because no water tests it.",
          target: "In a quiet week an escalation route nobody uses looks fine, because no real problem tests it.",
        },
        {
          railway: "Heavy rain exposes ponding and slow outfalls at once, so inspectors go out when it rains.",
          target: "A real incident exposes slow approvals and missing contacts at once, so a good manager watches the process during one.",
        },
        {
          railway: "A clean drain under clogged ballast takes no water, because the fault is upstream of the pipe.",
          target: "A clear procedure behind a team afraid to speak up receives no problems, because the fault is upstream of the procedure.",
        },
      ],
      limits:
        "Rain arrives on its own and cannot be scheduled, but you can rehearse an incident on purpose. Unlike water, people also change how they act when they know they are being tested, so a drill shows the best case, not the normal one.",
      principle: "Judge a safety process by how it behaves under real load, not by how it looks on a quiet day.",
      action:
        "Pick one escalation route your team relies on, run a 15-minute dry run of it this week, and note how long a problem takes to reach the person who can act.",
      railwayTopic: "s1-09",
      sources: [pre(EARTH, "6.12 Drain cleaning"), pre(EARTH, "6.13 Ineffective drains")],
    },
    action: "Run a 15-minute dry run of one escalation route this week and time how long a problem takes to reach someone who can act.",
    terms: ["drainage", "cess", "catchpit", "sub-grade", "fines", "rodding", "slip"],
  },

  // 10
  {
    id: "s1-10",
    season: 1,
    stop: 10,
    title: "The formation",
    hook: "What is under the stones under the track?",
    explorer:
      "Under the stones is the ground itself, levelled and shaped by the railway builders. If that ground is soft or wet, everything above it sinks. That is why engineers care so much about what is underneath, even though nobody sees it.",
    starter: [
      "Below the ballast is the ground the whole railway rests on. Bonnett calls the natural soil, or the soil of an embankment, once the topsoil is stripped off, the sub-grade. The ballast and any layers laid on it make up the trackbed. The prepared top of the sub-grade, where the trackbed starts, is called the formation.",
      "The trackbed's job is to spread the load from each sleeper so that the pressure reaching the sub-grade is low enough for the ground to bear. Grounds differ. Sands and gravels drain well. Clays let water through very slowly, so water that reaches them sits there and softens them. Peat shrinks and settles. Hard rock is rarely a problem.",
      "Where the sub-grade is clay, engineers may lay a sand blanket: a draining layer at least 100 mm thick, with a geotextile fabric above it to stop ballast stones pushing down into the sand, and often a plastic sheet below it to keep water off the clay.",
      "Earthworks are part of the story. Railway builders traditionally chose the route and level to balance cut and fill, using soil from cuttings to build nearby embankments. Bonnett points out that this saved money at the start but sometimes meant unsuitable material and long-term maintenance problems. Some old clay earthworks can fail after many decades of good service.",
      "Formation problems show up at the top, as track that keeps settling out of level. Tamping lifts it back, but if the cause is a soft, wet formation, it settles again.",
    ],
    leader:
      "The formation is decided once, early, and paid for over a century. Savings made in the foundations of a programme, such as governance, data and the right people, come back as maintenance for years. Spend time on what everything else will rest on.",
    keyFacts: [
      {
        text: "The sub-grade is the natural or embankment soil the trackbed is built on. The trackbed comprises the ballast and any sub-ballast layers.",
        sources: [pre(TRACK, "5.2 Basic components of track")],
      },
      {
        text: "Cohesive soils such as clay have very low permeability, so water must be kept off them or they soften and the track settles.",
        sources: [pre(EARTH, "6.8 Drainage of the trackbed")],
      },
      {
        text: "A sand blanket over clay should be at least 100 mm thick, with a geotextile separator above it.",
        sources: [pre(EARTH, "6.9 Sand blankets")],
      },
      {
        text: "Balancing cut and fill saved first cost but could build in long-term maintenance problems. Over-consolidated clays can fail after many decades.",
        sources: [pre(EARTH, "6.1 Stability of earthworks"), pre(EARTH, "6.3 Long term considerations")],
      },
    ],
    diagram: "formation",
    quiz: [
      {
        q: "What is the sub-grade?",
        options: ["The top layer of ballast", "The natural or embankment soil the trackbed is built on", "A type of rail", "A signalling system"],
        answer: 1,
        why: "The sub-grade is the ground itself, with topsoil removed. Everything else is built on top of it.",
      },
      {
        q: "Why is clay a difficult ground under track?",
        options: ["It lets water through very slowly, so trapped water softens it", "It is too hard to dig", "It conducts electricity", "It is magnetic"],
        answer: 0,
        why: "Water cannot drain through clay quickly, so it ponds on top and softens it, and the track settles.",
      },
      {
        q: "What does the geotextile layer above a sand blanket do?",
        options: ["Heats the track", "Holds the rails to gauge", "Stops trains", "Stops ballast stones pushing down into the sand"],
        answer: 3,
        why: "The fabric separates the layers, so the ballast stays clean and the sand keeps draining.",
      },
    ],
    lens: {
      id: "s1-10-lens",
      title: "What you save on foundations you pay back as maintenance",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Railway builders traditionally chose route and level to balance cut and fill, using soil from cuttings to build nearby embankments. Bonnett notes this saved first cost but could mean unsuitable material, unstable slopes and long-term maintenance problems. Some old clay earthworks fail after many decades.",
      mechanism:
        "The cheapest material to hand decided what an embankment was made of. Weak or wet fill then carries the track for a century. Each year it settles a little and softens when wet, and the track above needs re-levelling. In the worst case the slope slips. The saving was made once; the cost recurs every year and grows as the material deteriorates.",
      mapping: [
        {
          railway: "Using whatever spoil was nearby cut first cost, but built weakness into the embankment.",
          target: "Staffing a programme with whoever was free cut start-up cost, but built weakness into its governance.",
        },
        {
          railway: "Weak fill settles every year, so the track above needs repeated re-levelling.",
          target: "Weak foundations cause repeated confusion over decisions, so the team above needs repeated rework.",
        },
        {
          railway: "Old clay earthworks can weaken and slip after decades of apparently good service.",
          target: "A weak foundation can hold for years and then fail suddenly when conditions change, long after its cause is forgotten.",
        },
      ],
      limits:
        "An embankment cannot be rebuilt cheaply once trains run on it, but a programme's governance can often be fixed mid-flight at modest cost. Unlike soil, people learn, so an early weakness can also be trained out once it is named.",
      principle: "Spend care on the parts everything else rests on, because savings there return as years of maintenance.",
      action:
        "Write down the three foundations your current work rests on, such as decision rights or data, and score each from one to five with your team this week.",
      railwayTopic: "s1-10",
      sources: [pre(EARTH, "6.1 Stability of earthworks"), pre(EARTH, "6.3 Long term considerations")],
    },
    action: "Write down the three foundations your work rests on and score each from one to five with your team this week.",
    terms: ["formation", "sub-grade", "trackbed", "sand blanket", "geotextile", "cut and fill", "embankment", "cutting"],
  },  // 11
  {
    id: "s1-11",
    season: 1,
    stop: 11,
    title: "Track geometry",
    hook: "How do engineers know if a track is straight, level and the right width?",
    explorer:
      "Engineers check four things: are the rails the right distance apart, is each rail smooth along its length, are the two rails level with each other, and is the track straight or curving smoothly? A special measuring train checks this at speed, a bit like a doctor's check-up for the track.",
    starter: [
      "Track geometry is the exact shape of the track. Network Rail's guide groups it into four measures. Gauge is the distance between the two rails. Top is how smooth each rail is along its length, up and down. Cross level is the height of one rail compared with the other. Line is the side-to-side alignment, straight or curving smoothly.",
      "Twist, called warp in North America, is built from cross level: it is how much cross level changes over a short length of track. It matters because a vehicle's frame is fairly stiff. On a sharp twist, one wheel can be unloaded, and an unloaded wheel is easier to lift over the rail. So twist has its own limits even where the overall level is fine.",
      "Geometry goes wrong for many reasons. Network Rail lists vehicles pushing outwards on curves and through points, badly aligned welds, seized fishplates, loose fastenings, a poor ballast profile and weakened sideways strength. Each one shows up as a fault in top, level or line.",
      "Bonnett says both visual inspection and machine measurement are needed. People walking the track see things a machine misses, and measurement sets a standard and shows whether it is being kept. In Britain, the New Measurement Train, a converted high speed train nicknamed the Flying Banana, records track condition on most main lines on a four-weekly cycle.",
      "The trend matters as much as the reading. A fault that gets a little worse on every run tells you its cause is still active underneath.",
    ],
    leader:
      "The railway measures shape, not just failures, and compares each run with the last. Pick the few measures that describe the shape of your delivery, and watch how fast they change, not only whether they are inside the limit today.",
    keyFacts: [
      {
        text: "Track geometry is described by gauge, top, cross level and line.",
        sources: [nr("Section 4, Track gauge, top and cross level and line")],
      },
      {
        text: "Misalignment can come from vehicle forces on curves and in S&C, misaligned welds, seized fishplates, bad fastenings, poor ballast profile and reduced lateral strength.",
        sources: [nr("Section 4, Track geometry: line")],
      },
      {
        text: "Twist (warp) is the difference in cross level between two points a set distance apart; it is limited to prevent wheel climb.",
        sources: [wiki("Track geometry", "Track_geometry")],
      },
      {
        text: "Both visual inspection and mechanical measurement of track geometry are needed to set and check a quality standard.",
        sources: [pre(TRACK, "5.27 Day-to-day maintenance of track")],
      },
      {
        text: "The New Measurement Train assesses the condition of most British main lines on a four-weekly cycle.",
        sources: [wiki("New Measurement Train", "New_Measurement_Train")],
      },
    ],
    diagram: "geometry",
    quiz: [
      {
        q: "What does cross level measure?",
        options: ["The distance between the rails", "The height of one rail compared with the other", "The length of a rail", "The speed of trains"],
        answer: 1,
        why: "Cross level compares the heights of the two rails at the same point. On a curve, the designed difference is the cant.",
      },
      {
        q: "What does line describe?",
        options: ["The side-to-side alignment of the track", "The colour of signals", "The queue at a station", "The rail temperature"],
        answer: 0,
        why: "Line is horizontal alignment: straight where it should be straight, and smoothly curved where it should curve.",
      },
      {
        q: "Why do engineers compare geometry readings over time?",
        options: [
          "Because the readings are always wrong",
          "To decide train colours",
          "To see whether a fault is getting worse, which shows its cause is still active",
          "They do not",
        ],
        answer: 2,
        why: "A single reading tells you where the track is. A trend tells you whether something underneath is still moving it.",
      },
    ],
    lens: {
      id: "s1-11-lens",
      title: "The change between neighbours matters more than the level",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Track geometry limits cross level, the height of one rail against the other, and separately limits twist: how much cross level changes over a short length. A curve can carry a large, steady cant safely, while a sharp change in cross level over a few metres is a defect.",
      mechanism:
        "A rail vehicle has a fairly stiff frame resting on wheels at each corner. Steady cant tilts the whole frame evenly, so every wheel stays loaded. Twist tilts one end differently from the other, the frame cannot follow, and one wheel is unloaded. An unloaded wheel is easier to lift over the rail, so twist has tight limits even when the overall level is fine.",
      mapping: [
        {
          railway: "Steady cant tilts the whole vehicle evenly, so every wheel stays loaded.",
          target: "A steady high priority tilts the whole team's week evenly, so everyone keeps their footing and support.",
        },
        {
          railway: "A sharp change over a short length unloads one wheel, so the vehicle loses its grip there.",
          target: "A sharp change in priorities between two consecutive weeks leaves one person without support, so the team loses its grip on that work.",
        },
        {
          railway: "Engineers limit twist separately from level, because a vehicle copes with tilt better than with a fast change in tilt.",
          target: "Leaders can limit how much priorities change week to week, because a team copes with a heavy load better than with a fast change in load.",
        },
      ],
      limits:
        "A vehicle frame has a fixed stiffness, but teams differ widely in how much week-to-week change they can absorb. Unlike a wheel, a person who loses support can say so, so ask rather than assume where the limit is.",
      principle: "Watch how fast things change from one period to the next, not just how high they are.",
      action:
        "Compare your team's top three priorities this week with last week's list, and if more than one has changed, explain the change in writing to the people affected by Friday.",
      railwayTopic: "s1-11",
      sources: [wiki("Track geometry", "Track_geometry"), nr("Section 4, Track gauge, top and cross level and line")],
    },
    action: "Compare this week's top three priorities with last week's, and explain any change in writing to the people affected by Friday.",
    terms: ["track geometry", "gauge", "top", "cross level", "line", "twist", "track recording"],
  },

  // 12
  {
    id: "s1-12",
    season: 1,
    stop: 12,
    title: "Gauge",
    hook: "Why are Britain's rails 1435 mm apart, and what happens if they drift?",
    explorer:
      "On most British railways the two rails are 1435 millimetres apart, a little less than one and a half metres. Every train's wheels are built to fit that distance. If the rails drift too far apart, a wheel can drop between them, so engineers check the gap very carefully.",
    starter: [
      "Gauge is the distance between the running edges of the two rails, the inner faces that the wheel flanges run against. On British main lines the nominal gauge is 1435 mm, or 4 feet 8½ inches. This standard gauge is also used across most of Europe and North America.",
      "The number has a small story. From the 1960s, British engineers tightened the gauge on new track to 1432 mm, on the theory that it would give a more comfortable ride. Network Rail's guide records that in 1996 it was decided there was no benefit, and the standard went back to 1435 mm. Older track laid to the tighter figure still exists.",
      "Sleepers and fastenings hold gauge, so when they fail, gauge drifts. Network Rail's guide shows the classic culprits: timber sleepers rotten inside, screw holes worn so large that the chair leans outwards, and sleepers so cracked that spikes cannot grip. Track that is wide to gauge is dangerous because a wheel can drop between the rails.",
      "On curves, wheel flanges rub against the outer rail. That is normal on tighter curves, but it wears the side of the rail head and slowly widens the gauge. Bonnett stresses checking side wear on curves, and on curves tighter than about 200 metres radius a check rail is fitted inside the inner rail to share the sideways load.",
      "Gauge is a small number on a big system. A few millimetres out over a length of track is a defect, which is why it is checked by hand gauges and recording trains.",
    ],
    leader:
      "One shared dimension lets every train run on every compatible line. The 1432 mm experiment shows that a mature standard can be changed, tested and changed back when the benefit does not appear. Give every change to a shared standard a review date and a clear test for its benefit.",
    keyFacts: [
      {
        text: "Gauge is measured between the running edges of the two rails. Nominal British gauge is 1435 mm (4 ft 8½ in).",
        sources: [nr("Section 4, Track gauge")],
      },
      {
        text: "British engineers reduced the nominal gauge to 1432 mm in the 1960s; it was reversed to 1435 mm in 1996 because no benefit was found.",
        sources: [nr("Section 4, Track gauge")],
      },
      {
        text: "Decayed sleepers, enlarged screw holes and cracked sleepers can all let track go wide to gauge, which can contribute to derailment.",
        sources: [nr("Section 4, Gauge problems")],
      },
      {
        text: "Flange contact wears the outer rail on curves, so side wear must be checked. Curves tighter than about 200 m radius should have a check rail.",
        sources: [pre(TRACK, "5.12 Rail wear")],
      },
    ],
    diagram: "gauge",
    quiz: [
      {
        q: "What is the nominal gauge of British main line track?",
        options: ["1000 mm", "1435 mm", "1520 mm", "1676 mm"],
        answer: 1,
        why: "Standard gauge is 1435 mm, measured between the running edges of the rails.",
      },
      {
        q: "What happened to the 1432 mm gauge tried from the 1960s?",
        options: [
          "It was reversed in 1996 because no benefit was found",
          "It became the world standard",
          "It was only used for trams",
          "It was never used",
        ],
        answer: 0,
        why: "The tighter gauge was meant to improve the ride. When no benefit was found, Britain returned to 1435 mm.",
      },
      {
        q: "Why does gauge tend to widen on curves?",
        options: ["Curves are hotter", "Ballast is deeper", "Flange contact wears the side of the outer rail head", "Signals pull the rails apart"],
        answer: 2,
        why: "On curves, wheel flanges press against the outer rail. Over time this side wear moves the running edge outwards.",
      },
    ],
    lens: {
      id: "s1-12-lens",
      title: "Give every change to a standard a test it must pass",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "From the 1960s, British engineers tightened the gauge on new track from 1435 mm to 1432 mm, expecting a more comfortable ride. Network Rail's guide records that in 1996 it was decided there was no benefit, and the standard returned to 1435 mm.",
      mechanism:
        "The change rested on a reasonable theory: a slightly tighter gauge should steady the ride. But gauge has to work with every wheel profile, sleeper, fastening and maintenance tolerance on the network. Running two nominal gauges added variation to all of them. Once experience showed no ride benefit, the extra variation was a cost with no return, so the decision was reversed.",
      mapping: [
        {
          railway: "Engineers tightened the gauge because they expected a smoother ride to follow.",
          target: "A leadership team changes a shared standard because it expects a specific benefit to follow.",
        },
        {
          railway: "Running two gauges added variation across the network, so the change carried a cost before any benefit was proved.",
          target: "Running old and new standards side by side adds variation, so the change carries a cost before any benefit is proved.",
        },
        {
          railway: "When no ride benefit appeared, the decision was reversed rather than defended.",
          target: "When the expected benefit does not appear, a disciplined team reverses the change rather than defending it.",
        },
      ],
      limits:
        "The gauge decision took about three decades to reverse, partly because track lasts that long, but most process changes can be tested in weeks. Unlike steel, people may also have adapted to the new standard, so reversing it has its own cost.",
      principle: "Change a shared standard only with a stated benefit and a date to check it, and reverse it if the benefit is missing.",
      action:
        "Pick one process change made in the last year, write down the benefit it promised, and put a 30-minute review in the calendar to check it.",
      railwayTopic: "s1-12",
      sources: [nr("Section 4, Track gauge")],
    },
    action: "Pick one process change from the last year, write down the benefit it promised, and book 30 minutes to check it.",
    terms: ["gauge", "running edge", "standard gauge", "side wear", "check rail", "sleeper"],
  },

  // 13
  {
    id: "s1-13",
    season: 1,
    stop: 13,
    title: "Cant on curves",
    hook: "Why is one rail higher than the other on a curve?",
    explorer:
      "On a bend, the outside rail is raised a little higher than the inside one. This tilts the train inwards, like a cyclist leaning on a bend, so it goes round smoothly and safely.",
    starter: [
      "On a curve, a train tends to carry on in a straight line, so it pushes outwards against the outer rail. To balance that, engineers raise the outer rail. The height difference between the two rails is called cant.",
      "Cant tilts the train so that part of its weight helps pull it towards the centre of the curve. At one speed, the balancing speed, the tilt exactly matches the outward push, and passengers feel no sideways force at all.",
      "But a line carries trains at many speeds. A fast passenger train going quicker than the balancing speed is still pushed outwards; the shortfall is called cant deficiency. A slow, heavy freight train going slower leans inwards and presses on the inner rail, called cant excess. Either way, flanges touch the rails and wear them. Engineers set cant as a compromise for the traffic actually using the line.",
      "Network Rail's guide lists what decides the cant: train speeds and types, curve radius, transition length, the type of track, and clearances at platforms and points. Cant is applied in 5 mm steps. The highest standard cant on Network Rail is 150 mm; more needs special approval.",
      "Cant cannot appear all at once. Between straight track and a curve there is a transition, where the cant rises gradually over many sleepers. Marks on the sleepers show where each step changes, and tamping machines smooth the track between them. The faster the line, the longer the transition needs to be.",
    ],
    leader:
      "Cant is set for a mix of speeds, so nearly every train feels some force, one way or the other. Policies for mixed groups behave the same way. Set them for the mix you actually have, and watch where the wear shows.",
    keyFacts: [
      {
        text: "Cant depends on speed, type of trains, curve radius, transition length, track construction and clearances at platforms and S&C. It is applied in 5 mm increments.",
        sources: [nr("Curves, cant and transitions")],
      },
      {
        text: "The highest standard cant allowed on Network Rail is 150 mm (6 in); more needs special approval.",
        sources: [nr("Curves, cant and transitions")],
      },
      {
        text: "Slower trains tend to bear on the inner rail of a curve and faster trains on the outer rail; either contact causes wear.",
        sources: [wiki("Cant (road and rail)", "Cant_(road_and_rail)")],
      },
      {
        text: "Cant is introduced gradually through a transition; the higher the speed, the longer the transition.",
        sources: [nr("Curves, cant and transitions"), wiki("Cant (road and rail)", "Cant_(road_and_rail)")],
      },
    ],
    diagram: "cant",
    quiz: [
      {
        q: "What is cant?",
        options: ["The height difference between the two rails on a curve", "A type of fastening", "A signal", "The weight of a train"],
        answer: 0,
        why: "Raising the outer rail tilts the train so part of its weight helps it round the curve.",
      },
      {
        q: "A slow, heavy freight train on a curve canted for fast trains tends to:",
        options: ["Press harder on the outer rail", "Press harder on the inner rail", "Float above the rails", "Speed up"],
        answer: 1,
        why: "Below the balancing speed, the tilt is more than the curve needs, so the train leans in and loads the inner rail.",
      },
      {
        q: "What is the highest standard cant on Network Rail without special approval?",
        options: ["50 mm", "100 mm", "150 mm", "300 mm"],
        answer: 2,
        why: "Network Rail's guide gives 150 mm as the highest standard cant. Anything more needs special approval.",
      },
    ],
    lens: {
      id: "s1-13-lens",
      title: "One setting for mixed users pushes most of them a little",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "On a curve the outer rail is raised to balance the outward push on trains at one speed. Faster trains are still pushed outwards and slower trains press on the inner rail, so Network Rail sets cant, in 5 mm steps up to a standard maximum of 150 mm, to suit the mix of traffic.",
      mechanism:
        "Cant tilts the vehicle so that gravity supplies part of the inward force it needs to turn. At the balancing speed the two match exactly. Above it, the shortfall pushes wheels against the outer rail; below it, the surplus tilt loads the inner rail. One fixed height cannot suit every speed, so engineers choose a compromise and watch which rail wears faster.",
      mapping: [
        {
          railway: "Cant matches one speed exactly, so trains at that speed feel no sideways force.",
          target: "A single policy matches one group's way of working exactly, so that group feels no friction from it.",
        },
        {
          railway: "Faster trains are pushed outwards and slower ones press inwards, so both cause wear.",
          target: "Faster-moving teams feel held back and slower ones feel pushed, so both build frustration.",
        },
        {
          railway: "Engineers watch which rail wears faster to see whether the compromise favours the wrong traffic.",
          target: "Leaders watch which group complains or leaves more often to see whether the policy favours the wrong group.",
        },
      ],
      limits:
        "Cant can be measured to the millimetre and the traffic mix is known from the timetable. Unlike trains on one curve, people can be given different settings through exceptions or separate routes, so a single compromise is not the only option.",
      principle: "A single setting for a mixed group suits one part of it, so set it for the real mix and watch where the strain shows.",
      action:
        "Name one policy that applies to everyone in your area, list which group it suits best and which least, and ask two people from the least-suited group about it this week.",
      railwayTopic: "s1-13",
      sources: [nr("Curves, cant and transitions"), wiki("Cant (road and rail)", "Cant_(road_and_rail)")],
    },
    action: "Name one policy that applies to everyone in your area and ask two people it suits least what it costs them this week.",
    terms: ["cant", "curve", "balancing speed", "cant deficiency", "cant excess", "transition", "flange"],
  },

  // 14
  {
    id: "s1-14",
    season: 1,
    stop: 14,
    title: "Switches and crossings",
    hook: "How does a train choose which way to go when it has no steering wheel?",
    explorer:
      "Trains cannot steer, so the track moves instead. At a junction, two tapered rails slide across to guide the wheels left or right. They are locked tight before a train is allowed over them.",
    starter: [
      "Switches and crossings, often shortened to S&C, let trains move from one track to another. A simple turnout has two main parts. At the switch end, two movable switch rails, machined to a thin tip, lie between fixed stock rails. Whichever switch rail is closed against its stock rail guides the wheel flanges onto that route.",
      "Further along, where a rail of the new route crosses a rail of the old one, there is a crossing. Its pointed middle is the crossing nose, and there is an unavoidable gap in the rail there for flanges to pass through. A check rail on the opposite side holds the wheelset in line, so the wheel crossing the gap cannot strike the nose or take the wrong path.",
      "Bonnett calls movement over points the most dangerous part of running a railway. Facing points, where trains approach the switch tips and are divided between routes, must be locked in position, and each switch rail is detected to prove it is fully home. Point machines move the switches, lock them and detect them. The lock is held from the moment a train is within braking distance of the points until it has passed.",
      "Interlocking ties it together. A signal cannot be cleared for a route until every set of points on it is set, locked and detected, and no conflicting route is set. Bonnett names track circuits, point locking and detection, and interlocking as the three parts that make signalling fail-safe.",
      "S&C wears faster than plain track. Switch and stock rails are machined as a fitting pair, so they should be changed as a pair. Cast manganese steel crossings resist wear well but are heavy and awkward to replace in a short possession.",
    ],
    leader:
      "A route is not set when someone decides it. It is set when the moving parts are proven home and locked, and then nobody may change it under a train. Decisions that other people will run on need the same treatment: confirm them, lock them once people commit, and design out conflicting choices.",
    keyFacts: [
      {
        text: "A turnout is a pair of switches and a crossing connected by closure rails. The fixed rails are stock rails; the movable ones are switch rails.",
        sources: [pre(TRACK, "5.20 Points or turnouts"), nr("Switches and crossings")],
      },
      {
        text: "Check rails opposite crossings control the wheelset so the wheel crossing the gap cannot strike the nose or take the wrong path.",
        sources: [pre(TRACK, "5.19 Crossing design and manufacture"), nr("Switches and crossings: check rail")],
      },
      {
        text: "Facing points are locked and detected. The lock is applied from when a train comes within braking distance of the points.",
        sources: [pre("ch. 10 Signalling and Train Control", "10.4 Point operation, locking and detection")],
      },
      {
        text: "Track circuits, point locking and detection, and interlocking together make signalling fail-safe.",
        sources: [pre("ch. 10 Signalling and Train Control", "10.5 Interlocking")],
      },
    ],
    diagram: "switch",
    quiz: [
      {
        q: "What does a check rail do at a crossing?",
        options: [
          "Holds the wheelset in line so the wheel crossing the gap cannot strike the nose",
          "Checks tickets",
          "Measures temperature",
          "Powers the points",
        ],
        answer: 0,
        why: "At the crossing gap the wheel briefly loses its own guidance. The check rail steers the wheelset from the other side.",
      },
      {
        q: "Before a signal can clear a train over facing points, the points must be:",
        options: ["Recently painted", "Set, locked and detected in the right position", "Recently tamped", "Wet"],
        answer: 1,
        why: "Interlocking will not clear the signal until the points are proven in the right position and locked.",
      },
      {
        q: "Why should worn switch and stock rails be changed together?",
        options: ["It is cheaper to buy two", "They are the same length", "The rule book says so for no reason", "They are machined and fitted as a matched pair"],
        answer: 3,
        why: "The switch tip is machined to fit its stock rail closely. A new rail against a worn partner may not fit snugly.",
      },
    ],
    lens: {
      id: "s1-14-lens",
      title: "Guide people across the gap from the other side",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "At a crossing there is a gap in the rail at the crossing nose for wheel flanges to pass through. A check rail on the opposite running rail holds the wheelset in line, so the wheel crossing the gap cannot strike the nose or take the wrong path.",
      mechanism:
        "When a wheel reaches the gap, for a short distance it has no rail edge of its own to guide it. Because both wheels are fixed to one axle, guidance can come from the other wheel instead: the check rail bears on the back of the opposite wheel and steers the whole wheelset. If the check rail is set wrongly, the gap becomes the point where wheels leave the rails.",
      mapping: [
        {
          railway: "For a short distance the wheel crossing the gap has nothing of its own to guide it.",
          target: "During a handover, the person moving into a new role has no routine of their own to guide them.",
        },
        {
          railway: "Because both wheels share an axle, the check rail steers the whole wheelset from the other side.",
          target: "Because the team shares the work, a steady colleague can steer the newcomer from beside them until they settle.",
        },
        {
          railway: "A check rail set in the wrong place fails to steer the wheelset, so the gap becomes the point where wheels leave the rails.",
          target: "A guide who is absent or unclear fails to steer the newcomer, so the handover becomes the moment where work is dropped.",
        },
      ],
      limits:
        "A wheelset crosses the gap in a fraction of a second, but people take weeks to settle into a role. Unlike steel, the newcomer also brings knowledge the team lacks, so guidance should run both ways.",
      principle: "When someone crosses a gap with no support of their own, give them guidance from someone already steady.",
      action:
        "For the next handover in your team, name one steady colleague as guide for the first two weeks, and put three short check-ins in the calendar today.",
      railwayTopic: "s1-14",
      sources: [pre(TRACK, "5.19 Crossing design and manufacture"), nr("Switches and crossings: check rail")],
    },
    action: "For your next handover, name one steady colleague as guide for two weeks and book three short check-ins today.",
    terms: ["switches and crossings", "turnout", "switch rail", "stock rail", "crossing nose", "check rail", "facing points", "interlocking"],
  },

  // 15
  {
    id: "s1-15",
    season: 1,
    stop: 15,
    title: "Inspection",
    hook: "How do you find a fault before it finds a train?",
    explorer:
      "Railway inspectors walk along the track looking for anything wrong, like a loose clip or a cracked sleeper. Special trains measure the track as they go. Finding small problems early stops big ones later.",
    starter: [
      "Inspection is how the railway finds faults while they are still small. It works in layers.",
      "The first layer is people on foot. Patrollers walk the track at set intervals, looking for broken or missing fastenings, cracked sleepers, wet spots, damaged fencing and anything that has changed since last time. Bonnett adds that anyone walking the railway should report defects they notice, including on bridges and other structures.",
      "The second layer is measurement. Recording trains measure track geometry at speed, and rails are tested with ultrasound to find cracks inside the steel that cannot be seen from outside. Bonnett's point is that you need both: inspection of condition, and measurement to set a standard and check it is being kept.",
      "The third layer is less frequent, deeper examination. For bridges, Bonnett describes a light visual examination every year and a detailed one at least every four years, with special extra inspections whenever something worrying is found.",
      "Good inspectors read signs, not just failures. A wide rail gap on a hot day, a patch of ballast pumping up wet slurry, or a shiny band on the side of a rail are early clues. Records matter too, so each inspection can be compared with the last.",
    ],
    leader:
      "The railway inspects in layers: frequent light checks, regular measurement, periodic deep examinations, and more frequent checks wherever something is found. Ask whether your programme has all four, and whether everyone who sees the work feels able to report what they see.",
    keyFacts: [
      {
        text: "Track needs both visual inspection of condition and mechanical measurement of geometry.",
        sources: [pre(TRACK, "5.27 Day-to-day maintenance of track")],
      },
      {
        text: "Structures under dynamic loading are typically inspected in detail at least every four years, with superficial inspections annually and special inspections when concerns arise.",
        sources: [pre("ch. 7 Bridges and Structures", "7.7 Examination of structures")],
      },
      {
        text: "Permanent way patrol staff and others walking the railway should report any defect or change they notice on structures.",
        sources: [pre("ch. 7 Bridges and Structures", "7.7 Examination of structures")],
      },
      {
        text: "Railways need reliable performance indicators and periodic independent audit to detect deterioration in maintenance standards.",
        sources: [pre("ch. 4 Depots and Workshops", "4.9 Performance indicators and audit")],
      },
    ],
    diagram: "inspection",
    quiz: [
      {
        q: "Why does the railway use both people on foot and measuring trains?",
        options: [
          "People spot things machines miss, and measurement sets and checks a standard",
          "Machines are always wrong",
          "People are cheaper than trains",
          "It is only a tradition",
        ],
        answer: 0,
        why: "Each layer catches different faults. Walking finds what has changed; measuring shows whether the shape is within standard.",
      },
      {
        q: "How often does Bonnett say most railways examine bridges in detail?",
        options: ["Every week", "At least every four years, with lighter yearly checks", "Only after an accident", "Every fifty years"],
        answer: 1,
        why: "A detailed examination at least every four years is backed by a light check each year and extra inspections when needed.",
      },
      {
        q: "Which of these is an early clue an inspector might spot?",
        options: ["A clean train", "A green signal", "A wide rail gap on a hot day", "A busy platform"],
        answer: 2,
        why: "A wide gap in hot weather suggests a seized joint, which can lead to a buckle. It is a sign before a failure.",
      },
    ],
    lens: {
      id: "s1-15-lens",
      title: "Look in layers, and look harder where you find something",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Bonnett describes bridge examination in layers: a light visual check every year, a detailed examination at least every four years, special extra inspections when something is found, and permanent way staff reporting anything they notice in between.",
      mechanism:
        "Different faults grow at different speeds. Frequent light checks catch sudden damage such as vehicle strikes. Periodic detailed examinations catch slow deterioration that only shows close up. When either finds a concern, inspection frequency rises for that structure until the cause is understood. Reports from track patrollers and others passing by cover the gaps between scheduled visits.",
      mapping: [
        {
          railway: "Frequent light checks catch sudden damage, because it appears between visits and is easy to see.",
          target: "A short weekly look at the plan catches sudden problems, because they appear between reviews and are easy to see.",
        },
        {
          railway: "Periodic detailed examinations catch slow deterioration that only shows when you look closely.",
          target: "A quarterly deep review catches slow drift in cost or quality that only shows when someone looks closely.",
        },
        {
          railway: "A worrying finding raises inspection frequency for that structure until it is understood.",
          target: "A worrying finding should raise review frequency for that piece of work until it is understood, then relax again.",
        },
      ],
      limits:
        "A bridge does not hide its cracks, but people and reports can, sometimes without meaning to. Unlike a structure, a team also behaves differently when it knows a review is coming, so mix scheduled reviews with informal visits.",
      principle: "Check often and lightly, check rarely and deeply, and look more often wherever you find a problem.",
      action:
        "Write down your current review rhythm for one piece of work, add whichever layer is missing, weekly light or quarterly deep, and book its first slot in the calendar this week.",
      railwayTopic: "s1-15",
      sources: [pre("ch. 7 Bridges and Structures", "7.7 Examination of structures")],
    },
    action: "Add the missing review layer, weekly light or quarterly deep, to one piece of work and book its first slot this week.",
    terms: ["inspection", "patrol", "track recording", "ultrasonic testing", "examination", "defect"],
  },

  // 16
  {
    id: "s1-16",
    season: 1,
    stop: 16,
    title: "Tamping",
    hook: "How do you lift a railway back into shape without taking it apart?",
    explorer:
      "Over time, heavy trains push the track down unevenly, making it bumpy. A big machine called a tamper lifts the track back into place and squeezes stones tightly underneath with vibrating metal fingers. Then the ride is smooth again.",
    starter: [
      "Under traffic, track slowly settles, and not evenly. Some sleepers sink more than others, and the rails lose their smooth top and line. Tamping puts them back.",
      "A tamping machine works sleeper by sleeper. It grips the rails and lifts and shifts the track to the right height and alignment. Then it pushes vibrating steel tines down into the ballast on both sides of the sleeper and squeezes them together, packing stone tightly underneath. When the machine lets go, the track sits at its corrected level.",
      "Tampers also set cant on curves and through transitions, smoothing the track between the marked steps. On some sites a stoneblower is used instead: it lifts the sleeper slightly and blows small stones into the gap beneath, rather than disturbing the whole bed.",
      "Tamping has side effects. It loosens the ballast, so freshly tamped track resists sideways movement less until trains have bedded it down again. Speed restrictions are often applied for a while, and a machine called a dynamic track stabiliser can speed up the settling by vibrating the track. Each tamp also wears and breaks some stones.",
      "So tamping treats the shape, not always the cause. If the ballast is fouled or the formation is wet, the track will settle again, and the gap between tamps gets shorter. That is a sign to fix what lies underneath.",
    ],
    leader:
      "Tamping is a fast, effective fix with a cost: each pass uses up a little of the ballast and leaves the track weaker for a while. Quick fixes in programmes behave the same way. Use them, protect the work while it settles, and treat shrinking intervals between fixes as a signal to dig deeper.",
    keyFacts: [
      {
        text: "A tamping machine lifts and lines the track, then packs ballast under each sleeper with vibrating tines.",
        sources: [wiki("Tamping machine", "Tamping_machine")],
      },
      {
        text: "Tamping and ballast cleaning reduce the track's resistance to sideways movement until traffic consolidates it; a speed restriction may be needed meanwhile.",
        sources: [wiki("Tamping machine", "Tamping_machine")],
      },
      {
        text: "Keeping ballast up to sleeper level with a good shoulder needs regular inspection and periodic tamping.",
        sources: [pre(TRACK, "5.3 Track ballast")],
      },
      {
        text: "Tampers and stoneblowers smooth the track between the marked cant steps in a transition.",
        sources: [nr("Curves, cant and transitions")],
      },
      {
        text: "Ballast degrades through the action of traffic and of maintenance operations.",
        sources: [pre(TRACK, "5.4 Materials for track ballast")],
      },
    ],
    diagram: "tamping",
    quiz: [
      {
        q: "What does a tamping machine do at each sleeper?",
        options: [
          "Lifts the track to the right level and packs ballast under the sleeper",
          "Replaces the rail",
          "Paints the sleeper",
          "Measures the gauge only",
        ],
        answer: 0,
        why: "The machine corrects the track's position, then packs ballast under the sleeper to hold it there.",
      },
      {
        q: "Why might there be a speed restriction just after tamping?",
        options: [
          "The tamper leaves paint on the rails",
          "The ballast is loosened, so the track resists sideways movement less until it beds down",
          "Drivers need a rest",
          "The rails are wet",
        ],
        answer: 1,
        why: "Tamping breaks up the interlock traffic had built. Until trains consolidate the ballast again, the track is weaker sideways.",
      },
      {
        q: "If the same stretch needs tamping more and more often, what does it suggest?",
        options: ["Trains are lighter", "The tamper is broken", "Nothing at all", "An underlying cause such as fouled ballast or poor drainage"],
        answer: 3,
        why: "Tamping restores shape. If the track keeps settling sooner, something underneath, often water or fouled ballast, is still at work.",
      },
    ],
    lens: {
      id: "s1-16-lens",
      title: "Protect a fix while it beds in",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Tamping restores track level by lifting it and packing ballast under the sleepers. It also loosens the ballast, so freshly tamped track resists sideways movement less until trains have consolidated it. A speed restriction is often applied for that period.",
      mechanism:
        "Packing rearranges the stones, which breaks the interlock that traffic had built up over months. The track is now the right shape but held more weakly. Each passing train vibrates the stones back into a tighter arrangement, and resistance recovers. Until it does, the track is more likely to move under high forces, such as hot weather in welded rail.",
      mapping: [
        {
          railway: "Tamping restores the shape but breaks the interlock that traffic had built up.",
          target: "A reorganisation restores a sensible structure but breaks the working habits people had built up.",
        },
        {
          railway: "Each passing train vibrates the stones tighter, so resistance recovers over time.",
          target: "Each week of steady work rebuilds habits between people, so resilience recovers over time.",
        },
        {
          railway: "A speed restriction holds loads down until the bed has consolidated.",
          target: "Keeping demands lower for a few weeks holds pressure down until the new structure has settled.",
        },
      ],
      limits:
        "Ballast settles by physics, roughly in step with the traffic passing over it, but how fast people settle depends on trust and clarity. Unlike a tamper, a leader can also speed recovery by explaining the change well.",
      principle: "Right after a fix, the system is often weaker than it looks, so reduce the load until it settles.",
      action:
        "For your next change to team structure or process, agree a three-week settling period at your next meeting and remove one non-urgent deadline from it.",
      railwayTopic: "s1-16",
      sources: [wiki("Tamping machine", "Tamping_machine"), pre(TRACK, "5.3 Track ballast")],
    },
    action: "Agree a three-week settling period for your next change and remove one non-urgent deadline from it today.",
    terms: ["tamping", "tamper", "stoneblower", "ballast", "consolidation", "speed restriction", "dynamic track stabiliser"],
  },

  // 17
  {
    id: "s1-17",
    season: 1,
    stop: 17,
    title: "Possessions",
    hook: "How do you fix a railway that hardly ever sleeps?",
    explorer:
      "To work safely on the track, engineers close it to trains for a few hours, often at night or at weekends. This is called a possession. When the work is finished, the track is checked and handed back so trains can run again.",
    starter: [
      "A possession is a period when a section of line is closed to normal trains so engineers can work on it safely. Inside the possession, only engineering trains and machines move, under the control of the person in charge.",
      "Some work needs one. Bonnett lists ballast tamping, drain rodding, rubbish clearing, changing block joints, fence repairs close to the track, and replacing damaged sleepers, chairs or rails among jobs that obstruct traffic or put staff in danger. On busy surface lines these happen at night or at weekends. On London's tube lines, where clearances are tight and trains frequent, track work happens at night, and the track must be made safe for traffic every morning.",
      "Possessions are planned well in advance and cost a lot in disruption, so how they are used matters. Bonnett gives the example of weekend work, which can be done in several short possessions or one longer one, and says operators and engineers should weigh both. He also notes that when one team books a long possession, other teams can use the same closure for their own work, cutting the total disruption.",
      "Every possession ends with a handback. The work must be finished and checked, and the track confirmed safe, before trains return, often with a temporary speed restriction if the track has been disturbed. An overrunning possession delays the first trains and everyone who planned around them, so work is planned backwards from the handback time.",
      "Some places have no room to stand clear of trains at all, such as narrow bridges and some tunnels. There, work can only be done once the line is blocked to traffic.",
    ],
    leader:
      "A possession is scarce, expensive access with a hard end. The best ones share the closure across teams and are planned from the handback backwards. Treat every shutdown, freeze or cutover window the same way.",
    keyFacts: [
      {
        text: "Major maintenance that obstructs traffic or endangers staff, such as tamping, drain rodding and replacing sleepers or rails, is done in non-traffic hours or in a possession.",
        sources: [pre(TRACK, "5.27 Day-to-day maintenance of track")],
      },
      {
        text: "In tube tunnels, night possessions are short and the track must be made safe each morning.",
        sources: [pre(TRACK, "5.26 Track installation and renewal")],
      },
      {
        text: "Weekend works can be done in several shorter possessions or one longer one, and long possessions booked by one discipline can be shared by others.",
        sources: [pre("ch. 1 Introduction", "1.4 The operator; 1.5 Overall planning")],
      },
      {
        text: "In areas of limited clearance near bridges and viaducts, work is usually only allowed once rail traffic has been stopped by blocking the line.",
        sources: [nr("Bridges, cuttings, viaducts and embankments")],
      },
    ],
    diagram: "possession",
    quiz: [
      {
        q: "What is a possession?",
        options: [
          "A period when a section of line is closed to normal trains so work can be done safely",
          "A train ticket",
          "A type of signal",
          "A ballast wagon",
        ],
        answer: 0,
        why: "A possession gives engineers safe access by keeping normal trains out of the section for a planned time.",
      },
      {
        q: "Why might several engineering teams share one possession?",
        options: ["It is required every time", "It cuts the total disruption to passengers and freight", "Machines work better in groups", "To save fuel only"],
        answer: 1,
        why: "Most of the disruption comes from the closure itself. Sharing it means passengers and freight pay that cost once.",
      },
      {
        q: "Why is possession work planned backwards from the handback time?",
        options: ["Clocks run backwards at night", "To use more staff", "So the track is finished, checked and safe before trains are due", "It is not"],
        answer: 2,
        why: "The first trains are timetabled. Planning back from handback leaves time to finish, test and make safe.",
      },
    ],
    lens: {
      id: "s1-17-lens",
      title: "Share the scarce window",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Track work that blocks trains is done in a possession, a planned closure of the line. Bonnett notes that when one discipline books a long possession, others can carry out their own work in the same closure, reducing cost and disruption overall.",
      mechanism:
        "Much of the cost of a possession comes from the closure itself: trains diverted or cancelled, staff and machines brought to site, and a safe handback. That cost is similar whether one team works or five. If teams book separate closures, the network pays the disruption every time. If they plan together, it is paid once, but only if they coordinate access, order of work and handback.",
      mapping: [
        {
          railway: "Much of the cost of a possession comes from the closure itself, not from the work done inside it.",
          target: "Much of the cost of a system outage comes from the downtime itself, not from the changes made during it.",
        },
        {
          railway: "Separate possessions for each discipline repeat that cost, so disruption multiplies.",
          target: "Separate outages for each team repeat that downtime, so disruption to users multiplies.",
        },
        {
          railway: "Shared possessions cut total disruption, but only if teams agree access, sequence and handback.",
          target: "Shared outages cut total downtime, but only if teams agree the order of work, dependencies and a single return time.",
        },
      ],
      limits:
        "Sharing a possession adds risk: if one team overruns, everyone's handback is late. Unlike track teams, many office and software teams can work without any closure at all, so first ask whether the window is needed.",
      principle: "When access is scarce and costly, plan the work of every team that needs it into the same window.",
      action:
        "Before booking your next shutdown or change window, message two other teams who rely on the same system and ask what they would add, by Wednesday.",
      railwayTopic: "s1-17",
      sources: [pre("ch. 1 Introduction", "1.5 Overall planning"), pre(TRACK, "5.27 Day-to-day maintenance of track")],
    },
    action: "Before your next shutdown or change window, message two teams who use the same system and ask what they would add, by Wednesday.",
    terms: ["possession", "handback", "speed restriction", "engineering train", "limited clearance", "blocking the line"],
  },

  // 18
  {
    id: "s1-18",
    season: 1,
    stop: 18,
    title: "Renewals",
    hook: "When do you stop repairing track and replace it?",
    explorer:
      "Track wears out, a bit like shoes. For a while you can mend it, but one day it is better to put in new rails, sleepers and stones. Big machines can now lay new track much faster than people could by hand.",
    starter: [
      "Every part of the track has a working life. Treated softwood sleepers last roughly 15 to 25 years on the surface. Rails wear on top and, on curves, on the side. Ballast is ground down and fouled. At some point, keeping a worn length going costs more, and risks more, than replacing it. That is a renewal.",
      "Renewal used to be done piece by piece with large gangs of skilled workers. Bonnett describes how purpose-built machines now lay panels of sleepered track or individual sleepers, followed by long welded rails. In small tube tunnels, much of the work is still done by hand with power tools, because large machines cannot fit.",
      "Renewals are planned years ahead and done in possessions. Some combine several jobs, such as cleaning or replacing ballast, new sleepers and new rails, so the track is reset completely at once. Others renew one part where the rest still has life left.",
      "Deciding when to renew is a balance. Writing about rolling stock, Bonnett says it is hard to get the balance right between over-maintaining and under-maintaining, and that procedures and frequencies should be adjusted when experience shows they are wrong. The same is true of track. Signs it is time include defects returning soon after repair, rising maintenance effort and more speed restrictions.",
      "Standard parts help. Bonnett notes that railways try to keep the number of rail types small, because every type needs its own clips, pads and fishplates, and spare stock for each type ties up money in stores.",
    ],
    leader:
      "Maintenance keeps an asset going; renewal resets its life. The skill is noticing when repair effort is rising faster than the value it protects. Track the effort spent keeping each old process alive, and plan its replacement before that effort crowds out everything else.",
    keyFacts: [
      {
        text: "Mechanised track renewal lays panels of sleepered track or individual sleepers, followed by long welded rails. Small tube tunnels still rely largely on manual methods.",
        sources: [pre(TRACK, "5.26 Track installation and renewal")],
      },
      {
        text: "Treated softwood sleepers usually need renewal after 15 to 25 years because of splitting or rot.",
        sources: [pre(TRACK, "5.6 Timber sleepers")],
      },
      {
        text: "Maintenance regimes must balance over- and under-maintenance and adjust frequencies in light of experience.",
        sources: [pre("ch. 4 Depots and Workshops", "4.3 Establishing a maintenance regime")],
      },
      {
        text: "Railways try to keep rail types to a minimum to limit the spare components held in stock.",
        sources: [pre(TRACK, "5.11 Rails")],
      },
    ],
    diagram: "renewal",
    quiz: [
      {
        q: "Roughly how long do treated softwood sleepers last on the surface?",
        options: ["1 to 2 years", "15 to 25 years", "100 years", "For ever"],
        answer: 1,
        why: "Bonnett gives 15 to 25 years, depending on location and traffic. Splitting and rot are the usual reasons for renewal.",
      },
      {
        q: "Why is much tube tunnel track still renewed by hand?",
        options: ["Hand work is faster", "Machines are banned underground", "Large machines cannot fit in small tunnels", "Tube track never wears"],
        answer: 2,
        why: "Space in small bore tunnels rules out large track machines, so work is done piece by piece with power tools.",
      },
      {
        q: "Which is a sign a length of track may need renewing rather than repairing?",
        options: ["A new timetable", "Fewer trains", "Sunny weather", "Defects returning soon after each repair"],
        answer: 3,
        why: "When repairs hold for shorter and shorter times, the ageing underneath is winning, and renewal starts to cost less.",
      },
    ],
    lens: {
      id: "s1-18-lens",
      title: "Notice when repair effort outgrows the value",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Track components wear out on known timescales: Bonnett gives treated softwood sleepers about 15 to 25 years on the surface. As a length of track ages, defects return sooner after each repair, until replacing it costs less than keeping it going.",
      mechanism:
        "Early in its life, a length of track needs occasional, cheap attention. As sleepers decay, ballast fouls and rails wear, faults start to interact: a soft sleeper lets the rail flex, which loosens fastenings, which lets the geometry drift. Each repair fixes one fault but not the ageing underneath, so repair frequency and cost rise until renewal resets the whole length at once.",
      mapping: [
        {
          railway: "Early in its life, occasional cheap repairs keep the track in good order.",
          target: "When a process is new, occasional small fixes keep it working well.",
        },
        {
          railway: "As parts age, faults interact, so each repair holds for a shorter time.",
          target: "As a process ages, workarounds interact, so each fix holds for a shorter time.",
        },
        {
          railway: "Rising repair frequency signals that renewal will cost less than more maintenance.",
          target: "Rising fix frequency signals that redesigning the process will cost less than patching it again.",
        },
      ],
      limits:
        "Track renewal is expensive and needs years of planning, but many processes can be redesigned in weeks. Unlike sleepers, processes also carry people's habits and sense of ownership, so replacing one needs more explanation than a renewal programme.",
      principle: "When fixes hold for shorter and shorter times, plan a replacement instead of another fix.",
      action:
        "List the three processes your team patches most often, note roughly how many hours each took last month, and raise the biggest at your next planning meeting.",
      railwayTopic: "s1-18",
      sources: [pre(TRACK, "5.6 Timber sleepers"), pre("ch. 4 Depots and Workshops", "4.3 Establishing a maintenance regime")],
    },
    action: "List the three processes your team patches most often with last month's hours, and raise the biggest at your next planning meeting.",
    terms: ["renewal", "maintenance", "sleeper", "ballast cleaning", "possession", "continuous welded rail"],
  },

  // 19
  {
    id: "s1-19",
    season: 1,
    stop: 19,
    title: "Safety on the track",
    hook: "Where do you stand when a train comes?",
    explorer:
      "Railway workers always know where they will go before a train comes: a safe spot well away from the rails. Some places, like narrow bridges, have no safe spot, so trains must be stopped before anyone works there. Workers wear bright orange clothes and hard hats so they can be seen.",
    starter: [
      "The track is a dangerous place to work. Trains are heavy and fast, can be surprisingly quiet as they approach, and cannot stop quickly or swerve. Electrified lines add another hazard: overhead wires at 25,000 volts on many main lines, or conductor rails beside the running rails on others.",
      "So the first habit of track safety is to know your position of safety: a place far enough from the line to stand clear when a train passes. Where staff can stand clear, some inspection and minor work can happen while trains run, under proper warning arrangements. Bonnett notes that on surface lines much daily inspection is done in traffic hours for this reason, while on underground lines staff usually cannot be on the track while trains run.",
      "Some places have no position of safety. Network Rail marks them with boards. Red and white chequered boards mean limited clearance: there is no place of safety there. Blue and white chequered boards mean there are no refuges, the recesses built into the walls of bridges and tunnels for staff to step into. In such places, work only happens once the line is blocked to trains.",
      "Protective equipment matters, but it is the last line of defence, not the first. Network Rail's guide makes hard hats mandatory when working on or near the line and reminds staff to protect their skin in hot weather. High-visibility orange clothing helps drivers and colleagues see you.",
      "Above all, safety on the track depends on planning before anyone steps on: what the work is, how trains will be stopped or warned of, where everyone will stand, and who is in charge.",
    ],
    leader:
      "On the track, you decide where you will stand before the train is coming, and some places are marked as having nowhere to stand at all. Plan your retreat before you start any risky work, and do not work where there is no retreat unless something has removed the danger first.",
    keyFacts: [
      {
        text: "Red and white chequered boards mark limited clearance with no place of safety. Blue and white chequered boards mark places with no refuges.",
        sources: [nr("Bridges, cuttings, viaducts and embankments: warning boards")],
      },
      {
        text: "Hard hats must be worn at all times when working on or near the line.",
        sources: [nr("Extremes of weather: hot weather precautions")],
      },
      {
        text: "On surface lines, where staff can safely stand aside, much daily inspection can be done in traffic hours. On underground lines with tight clearances, it is usually done at night.",
        sources: [pre(TRACK, "5.27 Day-to-day maintenance of track")],
      },
      {
        text: "AC overhead line equipment on British main lines normally operates at 25 kV.",
        sources: [pre("ch. 9 Electrification", "9.6 AC overhead equipment")],
      },
    ],
    diagram: "safety",
    quiz: [
      {
        q: "What does a red and white chequered board by the line mean?",
        options: ["Limited clearance: there is no place of safety here", "A station is near", "Trains may speed up", "Dig here"],
        answer: 0,
        why: "These boards warn that there is not enough space beside the line to stand clear of a passing train.",
      },
      {
        q: "What is a refuge?",
        options: ["A type of sleeper", "A recess in a bridge or tunnel wall where staff can stand clear of trains", "A railway café", "A signal box"],
        answer: 1,
        why: "Refuges give a place of safety where there is no room at the side of the line. Blue and white boards warn where there are none.",
      },
      {
        q: "At what voltage do most British main line overhead wires operate?",
        options: ["230 volts", "750 volts", "25,000 volts", "1 million volts"],
        answer: 2,
        why: "British main line overhead electrification normally runs at 25 kV, which is why the wires must always be treated as live.",
      },
    ],
    lens: {
      id: "s1-19-lens",
      title: "Know where you will stand before the danger arrives",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "Track workers identify a position of safety before work starts. Network Rail marks places with no such position: red and white chequered boards for limited clearance and blue and white boards where there are no refuges. There, work only happens once trains have been stopped.",
      mechanism:
        "A train at speed cannot stop quickly or swerve, and the time between seeing it and its arrival is short. There is no time to work out where to go after the warning, so the decision is made in advance, when there is time to think. Where no safe place exists, a warning is not enough, so the danger itself is removed by blocking the line.",
      mapping: [
        {
          railway: "The safe position is chosen before work starts, because there is no time to decide once a train appears.",
          target: "The fallback for a risky change is agreed before it starts, because there is no time to design one once it fails.",
        },
        {
          railway: "Boards mark the places with no safe position, so everyone knows where a warning alone is not enough.",
          target: "A plan should mark the steps with no way back, so everyone knows where monitoring alone is not enough.",
        },
        {
          railway: "Where there is no refuge, trains are stopped first, so the danger is removed rather than dodged.",
          target: "Where a step has no way back, the risky input is frozen first, so the danger is removed rather than dodged.",
        },
      ],
      limits:
        "A train is a physical hazard that can kill in seconds, and no project risk compares with that. Unlike a train, many project failures also arrive slowly enough to react. Borrow the habit of deciding the retreat early, not the sense of mortal danger.",
      principle: "Decide your retreat before the danger arrives, and where there is no retreat, remove the danger first.",
      action:
        "For your riskiest task this month, write a two-line fallback plan, mark any step with no way back, and share it with one colleague before you begin.",
      railwayTopic: "s1-19",
      sources: [nr("Bridges, cuttings, viaducts and embankments: warning boards"), pre(TRACK, "5.27 Day-to-day maintenance of track")],
    },
    action: "For your riskiest task this month, write a two-line fallback plan and share it with one colleague before you begin.",
    terms: ["position of safety", "refuge", "limited clearance", "blocking the line", "overhead line equipment", "conductor rail", "PPE"],
  },

  // 20
  {
    id: "s1-20",
    season: 1,
    stop: 20,
    title: "Season boss: diagnose the buckle",
    hook: "It is 4 pm on the hottest day of the year. A driver reports a lurch on a curve. What happened, and why there?",
    explorer:
      "A driver feels a big wobble on a hot afternoon. The rail has pushed sideways in the heat. Can you find the clues? Missing stones, the hot sun and a quick repair from last winter all add up.",
    starter: [
      "The scenario. A hot July afternoon, with the air in the low thirties Celsius and the rails in full sun much hotter. At 16:05 a driver reports a rough ride and a sideways lurch on a gentle curve of continuous welded rail. The signaller stops trains on that line and calls out the on-call track team.",
      "What the team finds. The track has kinked sideways over about 20 metres. Beside the kink, a well-worn footpath crosses the line, and the ballast shoulder there is thin and scattered. Records show that in February a broken rail at this spot was cut out and a new piece welded in during a short night possession, but there is no stressing record for the repair. The section was also tamped ten days ago.",
      "Work through the causes using the season. The load: welded rail is held at a fixed length, so heat above its stress-free temperature, about 27°C by design, becomes a squeezing force (stops 2 and 7). The weaknesses: a thin ballast shoulder worn by the footpath (stops 4 and 8), ballast loosened by recent tamping (stop 16), and a winter repair that may have left the rail with a lower stress-free temperature than designed, so it was carrying more force than intended on this hot day (stop 7).",
      "The response. First make it safe: trains stay stopped until the rail has cooled enough for emergency work, as Network Rail's guide requires. Record the evidence: rail temperatures, the shape of the kink, the ballast profile and the repair records. Then fix the shape and every cause: realign the track, restore the ballast shoulder, check and if needed restress the rail to bring its stress-free temperature back to design, and deal with the footpath through fencing and a conversation with the local community.",
      "Finally, check the system. Why was the stressing record missing, and were other winter repairs handled the same way? Buckles rarely have one cause. Heat is the load. Ballast, workmanship and records decide where it fails.",
    ],
    leader:
      "Good diagnosis separates the load, the weaknesses, and the gap in the system that let them meet. Make safe first, keep the evidence, fix every contributing cause, then ask what process let a known risk go unrecorded. The last question is the one that prevents the next incident.",
    keyFacts: [
      {
        text: "Buckling is not solely due to high temperature; at least one other defect is usually present, and shortage of ballast is one of the main causes.",
        sources: [nr("Extremes of weather: hot weather")],
      },
      {
        text: "Trespass that erodes ballast shoulders creates likely buckle sites in hot weather.",
        sources: [nr("Extremes of weather: hot weather")],
      },
      {
        text: "Once track has buckled, traffic must stop until the temperature has dropped enough for emergency work.",
        sources: [nr("Extremes of weather: hot weather")],
      },
      {
        text: "CWR is designed to be stress-free at about 27°C in the UK.",
        sources: [pre(TRACK, "5.17 Stressing or locking-up of CWR")],
      },
      {
        text: "Recently tamped track has reduced resistance to sideways movement until traffic consolidates it.",
        sources: [wiki("Tamping machine", "Tamping_machine")],
      },
    ],
    diagram: "case",
    quiz: [
      {
        q: "What should happen first when a buckle is reported?",
        options: [
          "Stop trains on the affected line and make it safe",
          "Tamp it at once while trains keep running",
          "Wait for a cooler week before doing anything",
          "Paint the rail white",
        ],
        answer: 0,
        why: "Buckled track cannot carry trains safely. Stopping traffic comes before any diagnosis or repair.",
      },
      {
        q: "Why does the missing stressing record from the winter repair matter?",
        options: [
          "Records make rails stronger",
          "The rail may have a lower stress-free temperature than designed, so it carries more force in the heat",
          "It shows who to blame",
          "It does not matter",
        ],
        answer: 1,
        why: "A repair welded in on a cold night without restressing can lower the rail's neutral point, so it reaches high compression on ordinary hot days.",
      },
      {
        q: "Which set lists the contributing causes in this scenario?",
        options: [
          "Heat only",
          "A signal fault and a late driver",
          "Heat, a thin ballast shoulder, recent tamping and a possibly unstressed repair",
          "Wet leaves on the rails",
        ],
        answer: 2,
        why: "Heat supplied the force. The thin shoulder, loosened ballast and a possibly low stress-free temperature decided that the track failed here.",
      },
    ],
    lens: {
      id: "s1-20-lens",
      title: "Make safe, keep the evidence, then fix every cause",
      author: AUTHOR,
      audience: ["starter", "leader"],
      observe:
        "When track buckles, Network Rail's guide requires traffic to stop until the rail has cooled enough for emergency work. Because a buckle usually needs heat plus at least one other defect, investigation then looks at ballast, recent work and stressing records.",
      mechanism:
        "The first priority is to remove the danger, because buckled track cannot carry trains safely. The second is to record the evidence, such as rail temperature, ballast profile and repair records, before the repair changes it. Only then can each contributing cause be fixed: the shape, the restraint and the stressing. Fixing the shape alone leaves the causes in place for the next hot day.",
      mapping: [
        {
          railway: "Trains are stopped first, because buckled track cannot safely carry any load.",
          target: "After a serious incident the risky activity stops first, because the broken process cannot safely carry more work.",
        },
        {
          railway: "Rail temperatures, ballast and records are captured before repair, because the repair destroys the evidence.",
          target: "Logs, messages and decisions are captured before the fix, because fixing it quickly destroys the evidence.",
        },
        {
          railway: "Realigning the track alone leaves the weak ballast and wrong stress in place, so it buckles again.",
          target: "Fixing the visible symptom alone leaves the weak controls and missing checks in place, so the incident repeats.",
        },
      ],
      limits:
        "A buckle has a physical cause chain that can be measured, but organisational incidents involve judgement and pressure that leave fewer traces. Unlike steel, people may also hide evidence if they fear blame, so make reporting safe.",
      principle: "After a failure, make it safe, capture the evidence, then fix every cause rather than only the visible one.",
      action:
        "Take your team's last incident, write a list of every contributing cause you can find, and check by Friday which ones were actually fixed.",
      railwayTopic: "s1-20",
      sources: [nr("Extremes of weather: hot weather"), pre(TRACK, "5.17 Stressing or locking-up of CWR")],
    },
    action: "Take your team's last incident, list every contributing cause, and check by Friday which ones were actually fixed.",
    terms: ["buckle", "stress-free temperature", "ballast shoulder", "tamping", "stressing", "possession", "trespass"],
  },
];
