import type { Mindcast, Source } from "../types";

/**
 * Twelve standalone seed Mindcasts, built with docs/MINDCAST_METHOD.md.
 * Author is always "Groundwork editorial". Each one passes the integrity check.
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
const SIG = "ch. 10 Signalling and Train Control";

const AUTHOR = "Groundwork editorial";

export const casts: Mindcast[] = [
  {
    id: "cast-braking-distance",
    title: "Decide one braking distance ahead",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "On a main line with three-aspect colour light signals, Bonnett notes that at maximum line speed the signals must be about three quarters of a mile apart to give an adequate braking distance. Four-aspect signalling gives faster trains an earlier warning so they can start braking sooner.",
    mechanism:
      "A train's stopping distance depends on its speed and on the grip between steel wheel and steel rail, which is low compared with a tyre on a road. At a steady braking rate, stopping distance rises with the square of speed: double the speed and the train needs about four times the distance. So the warning must reach the driver at least one full braking distance before the danger, and signals are spaced to make sure it does.",
    mapping: [
      {
        railway: "Stopping distance rises with the square of speed, so faster trains need their warning much earlier.",
        target: "The bigger and faster a programme moves, the earlier a change of direction must be decided, because commitments take longer to unwind.",
      },
      {
        railway: "A signal shows caution a full braking distance before a red, so the driver can stop in time.",
        target: "A good decision process gives teams a caution well before the hard deadline, so they can stop work in time.",
      },
      {
        railway: "Four aspects let fast trains start braking earlier, which keeps them closer together safely.",
        target: "Earlier, graded warnings let busy teams slow down sooner, which keeps more work moving safely at once.",
      },
    ],
    limits:
      "Braking physics is fixed and measurable, but how long a programme takes to change course depends on contracts, people and politics. Unlike a train, a project can sometimes turn rather than stop. Estimate your own braking distance from past changes, not from a formula.",
    principle: "The faster you are moving, the earlier you must decide, so set warnings at least one stopping distance ahead.",
    action:
      "For your next major decision, write down the date by which work must stop if the answer is no, and put a reminder in your calendar one week before it today.",
    railwayTopic: "signalling",
    sources: [pre(SIG, "10.11 Four aspect colour light signalling"), pre(SIG, "10.7 Home and distant signals")],
  },
  {
    id: "cast-cwr-slack",
    title: "Removing slack stores the pressure inside",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Jointed track lets each rail expand into a small gap at every joint. Continuous welded rail removes the joints, giving a smoother, quieter ride and less wear, but Bonnett calculates that a restrained main line rail warmed by 45°C carries more than 70 tonnes of compressive force.",
    mechanism:
      "The gaps in jointed track absorbed movement locally, at the cost of wear and maintenance at every joint. Welding removes that slack, so the rail cannot change length. The temperature change does not disappear: it becomes force inside the steel. Welded rail is safe only because that force is managed, with the rail stressed at the right temperature, strong fastenings and a full ballast shoulder.",
    mapping: [
      {
        railway: "Gaps at each joint absorb movement locally, but every joint adds wear and work.",
        target: "Slack in a schedule absorbs small delays locally, but every slack day adds cost and looks wasteful.",
      },
      {
        railway: "Welding removes the gaps, so temperature change becomes force held inside the rail.",
        target: "Removing slack makes the plan smoother, so every small delay becomes pressure held inside the team.",
      },
      {
        railway: "Welded rail stays safe only while stressing, fastenings and ballast keep the stored force restrained.",
        target: "A lean plan stays safe only while clear priorities, steady staffing and early escalation keep that pressure contained.",
      },
    ],
    limits:
      "The force in a rail can be calculated from its temperature, but pressure in a team cannot be measured directly. Unlike steel, people also tire under steady load, so a lean plan needs recovery time that a rail does not.",
    principle: "Taking slack out of a system makes it smoother but stores the pressure inside, so strengthen whatever holds it.",
    action:
      "Before cutting contingency from your next plan, list the three things that will hold the extra pressure and check each one with its owner this week.",
    railwayTopic: "s1-02",
    sources: [pre(TRACK, "5.13 Desirability of removing rail joints"), pre(TRACK, "5.17 Stressing or locking-up of CWR")],
  },
  {
    id: "cast-possession-handback",
    title: "Plan backwards from the handback",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Engineering work that blocks trains is done in a possession with a fixed handback time. On London's tube lines, Bonnett notes, night possessions are short and the track has to be made safe for traffic every morning, whatever state the work is in.",
    mechanism:
      "The handback time is fixed because the first trains, and everyone travelling on them, depend on it. Work, testing and confirming the line is safe must all fit inside the window. So engineers plan from the handback backwards: the latest time to stop work, the time needed to test, and a fallback to restore the track to a safe state if the work cannot be finished.",
    mapping: [
      {
        railway: "The handback time is fixed because the first trains depend on it.",
        target: "A go-live or cutover time should be fixed because users and other teams depend on it.",
      },
      {
        railway: "Engineers set a latest stop time that leaves room to test and confirm the line before handback.",
        target: "Leaders set a latest stop time that leaves room to test and confirm the system before go-live.",
      },
      {
        railway: "If the work cannot finish, the track is restored to a safe state rather than handed back late.",
        target: "If the work cannot finish, the change is rolled back to a safe state rather than released late.",
      },
    ],
    limits:
      "A late handback has immediate, visible costs, so the discipline is easy to justify. Many office deadlines slip quietly, which makes the same discipline harder to hold. Unlike track, some changes cannot be fully rolled back, so check that first.",
    principle: "When the end time is fixed, plan backwards from it and decide in advance when you will stop and restore.",
    action:
      "For your next release or cutover, write three times on one page, latest stop, testing complete and rollback decision, and agree them with the team before the day.",
    railwayTopic: "s1-17",
    sources: [pre(TRACK, "5.26 Track installation and renewal"), pre(TRACK, "5.27 Day-to-day maintenance of track")],
  },
  {
    id: "cast-block-wip",
    title: "One train per block keeps everything moving",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Modern signalling rests on the block principle: no more than one train is allowed on one line in a block section at a time. Bonnett notes that the minimum time between trains, the headway, depends on signal spacing and braking, and at stations on dwell time.",
    mechanism:
      "A train may only enter a block once the train ahead has cleared it, which track circuits prove. That keeps a safe space between trains. It also caps how many trains a line can carry: once every block is in use, sending more trains does not raise throughput, it only makes trains queue at red signals. Capacity is raised by shortening blocks or speeding up the slowest part, often the station stop.",
    mapping: [
      {
        railway: "Only one train may occupy a block, so a train waits until the block ahead is clear.",
        target: "A team limits how many items are in progress, so new work waits until something is finished.",
      },
      {
        railway: "Once every block is occupied, extra trains only queue at red signals and throughput does not rise.",
        target: "Once every person is busy, extra work only queues in the backlog and delivery does not speed up.",
      },
      {
        railway: "Capacity rises by shortening blocks or speeding the slowest stop, not by adding trains.",
        target: "Delivery rises by making items smaller or speeding the slowest step, not by starting more work.",
      },
    ],
    limits:
      "Trains physically cannot share a block, but people can and do work on several things at once, at a hidden cost in switching between them. Unlike signalling, a limit on work in progress is a choice that has to be defended each week.",
    principle: "When every part of a system is busy, starting more work only lengthens the queue, so finish before you start.",
    action:
      "Count the items your team has in progress today, agree a limit one lower than that number at your next stand-up, and hold it for two weeks.",
    railwayTopic: "signalling",
    sources: [pre(SIG, "10.2 Modern signalling principles"), pre(SIG, "10.3 Track circuits"), pre(SIG, "10.6 Minimum headways")],
  },
  {
    id: "cast-drainage-root-cause",
    title: "Fix the water, not the dip",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Where trackbed drainage fails over a clay sub-grade, Bonnett explains, water ponds, the clay softens and the track settles. The visible symptom is track that keeps dropping out of level, even after it has been lifted and packed.",
    mechanism:
      "Ballast should pass rainwater quickly to the cess drains so it never sits on the clay. When drains or ballast clog, water collects at the bottom of the ballast and softens the clay beneath. Tamping restores the level, but because the water is still there, the track settles again, and sooner each time. Bonnett notes that a drain can even look clean while taking no water, because the ballast above has clogged.",
    mapping: [
      {
        railway: "Blocked drainage lets water soften the ground, which makes the track above settle.",
        target: "An unclear decision process lets confusion build underneath, which makes delivery above keep slipping.",
      },
      {
        railway: "Tamping restores the level, but the water remains, so the dip returns sooner each time.",
        target: "Overtime restores the schedule, but the confusion remains, so the slip returns sooner each time.",
      },
      {
        railway: "Clearing drains and replacing fouled ballast removes the cause, so the track holds its level.",
        target: "Making clear who decides what removes the cause, so the schedule holds without heroics.",
      },
    ],
    limits:
      "Water can be traced with a trial hole and drain rods, but organisational causes are harder to see and people may disagree about them. Unlike drainage, the cause may also be several things at once, so test more than one explanation.",
    principle: "When the same fault keeps coming back after each fix, look underneath for what the fix leaves in place.",
    action:
      "Pick one problem your team has fixed at least three times this year, ask why five times at your next team meeting, and write down the deepest answer.",
    railwayTopic: "s1-09",
    sources: [pre(EARTH, "6.8 Drainage of the trackbed"), pre(EARTH, "6.13 Ineffective drains")],
  },
  {
    id: "cast-tamping-debt",
    title: "Watch the interval between fixes",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Tamping lifts track back to level and packs ballast under the sleepers. Bonnett notes that ballast degrades under both traffic and maintenance, as edges round off and stones break, and that fines clog the ballast and spoil its drainage.",
    mechanism:
      "Each tamp restores the geometry but also wears and breaks some stones, adding fines. Fines hold water and reduce interlock, so the track settles faster, which brings the next tamp forward. The fix uses up a little of what makes the fix last. Without ballast cleaning or renewal, the cycle tightens until tamping can no longer hold the geometry for long.",
    mapping: [
      {
        railway: "Each tamp restores the shape but breaks some stones, which weakens the ballast bed a little.",
        target: "Each quick patch restores the service but adds a little complexity, which weakens the system a little.",
      },
      {
        railway: "Weaker ballast settles faster, so the next tamp comes sooner.",
        target: "A weaker system fails sooner, so the next patch comes sooner.",
      },
      {
        railway: "Only cleaning or renewing the ballast resets the cycle, so engineers plan it once intervals shrink.",
        target: "Only a proper redesign resets the cycle, so leaders plan it once the gap between patches shrinks.",
      },
    ],
    limits:
      "Ballast wear is physical and rises with traffic and tamping, but complexity in a system or process can also be reduced in small steps during normal work. Unlike stone, knowledge can be added back, so not every patch is debt.",
    principle: "If each fix makes the next one necessary sooner, the time between fixes is your real measure of health.",
    action:
      "Write down the dates of the last five fixes to your most-patched system or process, and if the gaps are shrinking, raise a redesign at your next planning meeting.",
    railwayTopic: "s1-16",
    sources: [pre(TRACK, "5.3 Track ballast"), pre(TRACK, "5.4 Materials for track ballast"), wiki("Tamping machine", "Tamping_machine")],
  },
  {
    id: "cast-cant-transition",
    title: "Introduce change through a transition",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Track cannot go straight from level to full cant at the start of a curve. Network Rail's guide describes a transition in which cant rises gradually in 5 mm steps over many sleepers, with marks showing where each step changes. The faster the line, the longer the transition.",
    mechanism:
      "A vehicle entering a curve needs the curve and the tilt to build up together. If cant changed suddenly, one end of the vehicle would tilt before the other, twisting the frame and unloading a wheel, and passengers would feel a jolt. A transition limits the rate of change so the vehicle, and the people in it, adjust smoothly. At higher speed the same change arrives faster, so it is spread over a longer length.",
    mapping: [
      {
        railway: "Cant must rise gradually, because a sudden change twists the vehicle and unloads a wheel.",
        target: "A new way of working must arrive gradually, because a sudden change pulls a team in two directions and leaves someone unsupported.",
      },
      {
        railway: "Each 5 mm step is marked, so the tamper builds the change precisely between known points.",
        target: "Each stage of the change is named with a date, so people can build it step by step between known points.",
      },
      {
        railway: "Higher speed needs a longer transition, because the same change otherwise arrives too fast.",
        target: "A busier team needs a longer transition, because the same change otherwise lands when it has no capacity to absorb it.",
      },
    ],
    limits:
      "The rate of change for track is set by tested limits for vehicles, but there is no tested limit for people. Unlike a curve, some changes, such as an urgent safety fix, should not be phased at all. Use transitions for adoption, not for urgent risk.",
    principle: "Control how fast a change arrives as carefully as how big it is.",
    action: "For a change you are planning, split it into three dated stages and share the stages with your team at the next meeting.",
    railwayTopic: "s1-13",
    sources: [nr("Curves, cant and transitions"), wiki("Cant (road and rail)", "Cant_(road_and_rail)"), wiki("Track geometry", "Track_geometry")],
  },
  {
    id: "cast-leaf-fall",
    title: "Small layers set hard under routine",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "In autumn, leaves on the railhead are crushed by passing wheels into a hard, slippery layer. It builds up pass by pass and is tough enough not to wear away under normal traffic. Treatment trains jet it off with water and apply a sand-based gel, and drivers brake earlier.",
    mechanism:
      "One leaf matters little. The problem is that traffic itself presses each new deposit into the layer already there, so the coating gets harder the more trains run. Low adhesion lengthens braking and lets wheels slide, which can damage the wheels. Because the season is predictable, the railway prepares: treatment trains, adjusted timetables and earlier braking.",
    mapping: [
      {
        railway: "Each passing wheel presses new leaves into the existing layer, so traffic makes the coating harder.",
        target: "Each busy week presses small unresolved questions into accepted habit, so routine makes the confusion harder to shift.",
      },
      {
        railway: "The hardened layer reduces grip, so trains need longer to stop and to start.",
        target: "Accumulated confusion reduces grip on decisions, so teams take longer to stop or to start anything.",
      },
      {
        railway: "Because leaf fall is seasonal, the railway schedules cleaning and earlier braking before it arrives.",
        target: "Because busy seasons are predictable, a team can schedule a clear-out of open questions before they arrive.",
      },
    ],
    limits:
      "Leaf fall comes every autumn at roughly the same time, but organisational build-up has no fixed season. Unlike a railhead, a team can also stop the deposits at source by answering questions as they arise.",
    principle: "Small unresolved things harden under routine, so clear them on a schedule before they set.",
    action:
      "Book 30 minutes before the end of this month to list every open question older than two weeks, then close or assign each one in that slot.",
    railwayTopic: "adhesion",
    sources: [wiki("Slippery rail", "Slippery_rail"), pre("ch. 4 Depots and Workshops", "4.8 Basic requirements for depots")],
  },
  {
    id: "cast-ohle-tension",
    title: "Keep the standard constant and let the length move",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Overhead contact wire on faster lines is usually auto-tensioned: weights hung from pulleys keep the tension nearly constant whatever the temperature, typically about 9 to 20 kN per wire. Fixed-termination wire, used at low speeds or in tunnels, sags in hot weather and goes taut in cold.",
    mechanism:
      "Copper wire expands as it warms and contracts as it cools. With fixed ends, that change shows up as sag or tightness, so the wire's height and stiffness vary with the weather. With balance weights, the wire is free to change length; the weights rise and fall instead, and tension stays constant. Tension also makes waves along the wire travel faster than the train, so the pantograph does not build up damaging standing waves.",
    mapping: [
      {
        railway: "Fixed-termination wire holds its length fixed, so heat shows up as sag and cold as tightness.",
        target: "A plan with fixed scope and fixed dates holds both, so a busy period shows up as falling quality.",
      },
      {
        railway: "Balance weights let the length change, which keeps the tension, and so the contact, constant.",
        target: "Letting scope flex within agreed limits keeps the quality standard, and so the customer experience, constant.",
      },
      {
        railway: "Tension makes waves travel ahead of the pantograph, so disturbances do not build up under it.",
        target: "Clear standards make bad news travel ahead of the work, so problems do not build up under the people doing it.",
      },
    ],
    limits:
      "Weights respond to temperature automatically, but scope only flexes when someone decides and agrees it. Unlike wire, people notice when quality is protected at the expense of scope and may resist, so agree the limits in advance.",
    principle: "Decide which thing must stay constant, then let something else move to absorb the change.",
    action:
      "For your current project, write down which one of scope, date or quality is fixed, share it with your sponsor in an email this week, and agree limits on the other two.",
    railwayTopic: "electrification",
    sources: [wiki("Overhead line", "Overhead_line"), pre("ch. 9 Electrification", "9.6 AC overhead equipment")],
  },
  {
    id: "cast-inspection-signs",
    title: "Read the signs before the failure",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Network Rail's permanent way guide tells staff walking the track to look at rail joints. When the rails are hot, a wide expansion gap may mean seized fishplates, so the rail cannot expand forward and may move sideways into a buckle. In cold weather, closed gaps suggest rail creep that must be corrected before summer.",
    mechanism:
      "A buckle is the failure; a seized joint is the condition that makes it likely. The gap shows whether the rail is still free to move, and its width compared with the temperature tells you whether that freedom still exists. Read in the right season, it gives months of warning, enough time to free the joint or adjust the rails before the heat arrives.",
    mapping: [
      {
        railway: "A gap that is wide on a hot day shows the rail has lost its freedom to move.",
        target: "Meetings where nobody disagrees during a hard week reveal that the team has lost its freedom to speak.",
      },
      {
        railway: "Reading gaps against temperature gives months of warning before the buckle season.",
        target: "Reading team signs against workload gives weeks of warning before deadlines peak.",
      },
      {
        railway: "Inspectors act on the sign, freeing the joint, rather than waiting for the buckle.",
        target: "Leaders act on the sign, opening the conversation, rather than waiting for someone to resign.",
      },
    ],
    limits:
      "A rail gap means one thing and can be measured with a ruler, but silence in a meeting can have many causes. Unlike a joint, a team may show the sign only when the leader is absent, so ask others what they see.",
    principle: "Measure the conditions that make a failure likely, in the season when you can still act on them.",
    action:
      "Choose one early-warning sign for your team, such as overdue reviews, add it to your weekly checklist, and check it every Monday for the next four weeks.",
    railwayTopic: "s1-15",
    sources: [nr("Section 3, Rails and joints: expansion gaps"), nr("Extremes of weather: hot weather")],
  },
  {
    id: "cast-points-decisions",
    title: "Lock the decision before people commit to it",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Facing points must be locked and detected in position before a signal lets a train over them. Bonnett notes that the lock is applied from the moment a train comes within braking distance of the points and held until it has passed, so the route cannot be changed under it.",
    mechanism:
      "Once a train is within braking distance, it can no longer stop before the points. Moving them then could send the front and back of the train down different routes. So the interlocking makes the route decision before that moment, proves it with detection, and then forbids changes until the train is clear. It also refuses any signal that would set a conflicting route.",
    mapping: [
      {
        railway: "The route must be set and proven before the train comes within braking distance.",
        target: "A key choice must be made and confirmed before the team reaches the point where work cannot easily stop.",
      },
      {
        railway: "Once a train is committed, the lock stops anyone changing the route under it.",
        target: "Once people have committed effort, a freeze stops anyone changing the choice under them without a formal step.",
      },
      {
        railway: "Interlocking refuses a signal that would set a conflicting route.",
        target: "A good decision log rejects a new choice that would conflict with one already locked.",
      },
    ],
    limits:
      "Points either are or are not locked, and detection proves it, but people can believe a decision is settled when it is not. Unlike a route, a business decision may need to change for good reasons, so the freeze needs a clear, deliberate way to reopen it.",
    principle: "Make and confirm a decision before people commit to it, then protect it until the committed work is through.",
    action:
      "List the three decisions your team is currently relying on, note when each was confirmed and by whom, and share the list at your next meeting.",
    railwayTopic: "s1-14",
    sources: [pre(SIG, "10.4 Point operation, locking and detection"), pre(SIG, "10.5 Interlocking")],
  },
  {
    id: "cast-rail-grinding",
    title: "Remove the damaged surface before the cracks grow",
    author: AUTHOR,
    audience: ["starter", "leader"],
    observe:
      "Where wheel meets rail, the contact patch is tiny, about 100 square millimetres under the heaviest wheels, and Bonnett notes the pressure there can exceed the yield point of the steel. Rail grinding removes a thin surface layer to take out defects such as head checks, squats and corrugation.",
    mechanism:
      "Repeated contact at stresses above yield makes the surface steel flow and tire. Fine fatigue cracks start at the surface of the railhead. Ground away early, while shallow, they disappear with only a thin layer of rail. Left alone, some grow down into the rail, where they mean replacing it or risk a break. Preventive grinding removes a little metal often instead of a lot of rail later.",
    mapping: [
      {
        railway: "Repeated contact above yield tires the surface, so fine cracks start where the load lands.",
        target: "Repeated high-pressure weeks tire the people who absorb them, so small frictions start where the pressure lands.",
      },
      {
        railway: "Grinding a thin layer early removes shallow cracks before they grow into the rail.",
        target: "A regular short retrospective removes small frictions before they grow into conflict or resignations.",
      },
      {
        railway: "Left alone, cracks grow deeper, so the rail must be replaced instead of ground.",
        target: "Left alone, frictions deepen and spread, so the team needs rebuilding instead of a small adjustment.",
      },
    ],
    limits:
      "Steel fatigue follows known physics, and grinding removes metal that never returns. People recover with rest and support, which steel cannot. Unlike a rail, a team can also tell you where the cracks are if it feels safe to.",
    principle: "Remove small damage early and often, while it is shallow, rather than waiting until it needs a rebuild.",
    action:
      "Put a 20-minute retrospective in the calendar for the end of this week and ask one question: what small friction should we remove now?",
    railwayTopic: "rail-wear",
    sources: [pre(TRACK, "5.12 Rail wear"), wiki("High-speed grinding", "High-speed_grinding")],
  },
];
