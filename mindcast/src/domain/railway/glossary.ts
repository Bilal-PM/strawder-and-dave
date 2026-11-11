import type { GlossaryTerm, Source } from "../types";

/**
 * Plain-English railway terms: permanent way, signalling, power and operations.
 * Definitions are our own paraphrase, checked against the sources listed on each term.
 */

const pre = (where: string): Source => ({ label: "Practical Railway Engineering (2nd ed., 2005)", where });
const nrb = (where: string): Source => ({ label: "Network Rail, Introduction to the Permanent Way (NR/PWG/001, 2003)", where });
const wp = (title: string): Source => ({
  label: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
});

export const glossary: GlossaryTerm[] = [
  // ---------- The track and what it sits on ----------
  {
    term: "Permanent way",
    plain: "The track and everything that holds it up: rails, sleepers, fastenings and ballast. The name dates from early railway building, to tell the finished track apart from the temporary track used by the builders.",
    sources: [pre("ch. 3, s. 3.14 and ch. 5"), wp("Track (rail transport)")],
  },
  {
    term: "Rail",
    plain: "The steel bar the wheels run on. Modern rails are rolled from hardwearing steel and come in standard shapes and weights, measured in kilograms per metre.",
    sources: [pre("ch. 5, s. 5.11"), nrb("Rails: markings found on components")],
  },
  {
    term: "Flat-bottom rail",
    plain: "The modern rail shape, with a wide flat foot that stands up on its own. It is held down to the sleeper by clips.",
    sources: [pre("ch. 5, s. 5.1 and 5.10"), nrb("Identification of components (rails)")],
  },
  {
    term: "Bullhead rail",
    plain: "An older rail shape with a head at the top and a similar bulb at the bottom. It sits in cast iron chairs and is wedged upright with keys. Common in Britain until the mid-1900s and still found on some lines.",
    sources: [pre("ch. 5, s. 5.1"), nrb("Identification of components (rails)")],
  },
  {
    term: "Sleeper",
    plain: "The beam laid across the track under the rails. It spreads each wheel load into the ballast, holds the rails the right distance apart and at the right tilt, and keeps them electrically insulated from each other. Sleepers are made of concrete, timber or steel.",
    sources: [pre("ch. 5, s. 5.5 to 5.9"), nrb("Sleepers")],
  },
  {
    term: "Bearer",
    plain: "A longer sleeper, often of varying length, used under switches and crossings where the rails spread apart.",
    sources: [pre("ch. 5, s. 5.5")],
  },
  {
    term: "Ballast",
    plain: "The bed of crushed rock the sleepers sit in. It spreads the load, holds the sleepers in place and lets water drain away. Good ballast is hard, angular stone, graded to a set range of sizes, so the pieces lock together.",
    sources: [pre("ch. 5, s. 5.3 and 5.4"), wp("Track ballast")],
  },
  {
    term: "Ballast shoulder",
    plain: "The ballast heaped beyond the ends of the sleepers. It stops the track being pushed sideways, which matters most on welded rail in hot weather.",
    sources: [pre("ch. 5, s. 5.3"), nrb("Extremes of weather: hot weather")],
  },
  {
    term: "Crib",
    plain: "The ballast that fills the spaces between neighbouring sleepers. Keeping the cribs full up to the top of the sleepers helps the track resist moving along or sideways.",
    sources: [pre("ch. 5, s. 5.3"), wp("Track ballast")],
  },
  {
    term: "Formation",
    plain: "The prepared ground the ballast sits on, at the top of the embankment, cutting or natural ground. If the formation is weak or wet, the track above keeps sinking out of shape.",
    sources: [pre("ch. 6, s. 6.8"), nrb("Ballast, formation and drainage")],
  },
  {
    term: "Sand blanket",
    plain: "A layer of sand laid between the ballast and a clay formation. It lets water drain away and stops wet clay being pumped up into the ballast by passing trains.",
    sources: [pre("ch. 6, s. 6.9")],
  },
  {
    term: "Wet spot",
    plain: "A place where water and fine material have built up in the ballast, so the track there sinks under each train. Wet spots spoil the line and level quickly.",
    sources: [pre("ch. 5, s. 5.4")],
  },
  {
    term: "Cess",
    plain: "The strip of ground beside the track, beyond the ends of the sleepers. Drains run along it, and it is where cables and walkways are often found.",
    sources: [pre("ch. 6, s. 6.10"), nrb("Cross section of double track railway")],
  },
  {
    term: "Cess drain",
    plain: "A pipe or channel running alongside the track in the cess to carry away water from the ballast. It has catchpits at intervals so it can be inspected and cleared.",
    sources: [pre("ch. 6, s. 6.10"), nrb("Ballast, formation and drainage")],
  },
  {
    term: "Catchpit",
    plain: "A small chamber in a track drain where silt can settle and be removed, and where rods can be pushed through to clear the pipe.",
    sources: [pre("ch. 6, s. 6.10"), nrb("Ballast, formation and drainage")],
  },
  {
    term: "Four-foot",
    plain: "The space between the two rails of one track. The name comes from the gauge of 4 feet 8½ inches.",
    sources: [nrb("Track gauge"), wp("Glossary of rail transport terms")],
  },
  {
    term: "Six-foot",
    plain: "The space between two tracks that sit side by side.",
    sources: [pre("ch. 6, s. 6.11"), nrb("Ballast, formation and drainage")],
  },
  {
    term: "Ten-foot",
    plain: "A wider space between two pairs of tracks on a four-track railway. Some books call it the eight-foot.",
    sources: [pre("ch. 6, s. 6.11"), wp("Glossary of rail transport terms")],
  },
  {
    term: "Lineside",
    plain: "The land next to the railway, inside the boundary fence. Signals, cables, drains and walking routes are all lineside.",
    sources: [pre("ch. 6, s. 6.14"), wp("Glossary of rail transport terms")],
  },
  {
    term: "Up and down lines",
    plain: "Names for the direction of each track. Traditionally the up line leads towards London and the down line leads away from it.",
    sources: [nrb("Different combinations of line")],
  },
  {
    term: "Bi-directional line",
    plain: "A track signalled so trains can run on it in either direction.",
    sources: [nrb("Different combinations of line")],
  },

  // ---------- Holding the rail ----------
  {
    term: "Fastening",
    plain: "The parts that hold the rail to the sleeper: usually a spring clip, a pad under the rail and insulators. Together they keep the rail upright, in gauge and from creeping along.",
    sources: [pre("ch. 5, s. 5.10"), nrb("Fastenings and clips")],
  },
  {
    term: "Rail clip",
    plain: "A spring steel clip that presses down on the foot of a flat-bottom rail, holding it firmly to the sleeper or baseplate while still allowing a tiny amount of give.",
    sources: [pre("ch. 5, s. 5.10"), nrb("Fastenings and clips")],
  },
  {
    term: "Rail pad",
    plain: "A thin pad between the rail and the sleeper. It spreads the load evenly, softens impacts and vibration, and insulates the rail electrically.",
    sources: [nrb("Insulating rail pads")],
  },
  {
    term: "Baseplate",
    plain: "A steel or cast iron plate under a flat-bottom rail on a timber sleeper. It spreads the load so the rail does not cut into the wood.",
    sources: [nrb("Chairs and baseplates"), pre("ch. 5, s. 5.10")],
  },
  {
    term: "Chair",
    plain: "A cast iron seat that holds bullhead rail on a sleeper. A wooden or steel key is driven in beside the rail to hold it tight and upright.",
    sources: [nrb("Identification of components (chairs, baseplates)")],
  },

  // ---------- Joining rails and long welded rail ----------
  {
    term: "Fishplate",
    plain: "A steel bar bolted across the joint between two rails, one on each side, to hold the ends in line. Track joined this way is called jointed track.",
    sources: [nrb("Joining rails by fishplates"), wp("Fishplate")],
  },
  {
    term: "Jointed track",
    plain: "Track made of separate rail lengths joined with fishplates, with small gaps at the joints so the rails can expand and contract. The gaps cause the familiar clickety-clack.",
    sources: [nrb("Joining rails by fishplates"), pre("ch. 5, s. 5.13")],
  },
  {
    term: "Expansion gap",
    plain: "The small gap left between rail ends at a joint. It is set wider in cold weather and almost closed in hot weather, so the rail has room to expand.",
    sources: [nrb("Extremes of weather: expansion gap")],
  },
  {
    term: "Insulated rail joint",
    plain: "A rail joint with insulating layers between the rails and the fishplates. It holds the rails together physically but keeps them electrically separate, so signalling track circuits can tell one section from the next.",
    sources: [nrb("Insulated joints")],
  },
  {
    term: "CWR",
    plain: "Continuous welded rail. Rails are welded into very long lengths with no gaps. Because the rail cannot expand or contract freely, the temperature change turns into a force inside the steel instead.",
    sources: [pre("ch. 5, s. 5.14 to 5.17"), nrb("Extremes of weather: hot weather"), wp("Continuous welded rail")],
  },
  {
    term: "Stress-free temperature",
    plain: "The rail temperature at which a welded rail has no pushing or pulling force in it, also called the neutral temperature. Each railway sets it for its climate, roughly halfway between the hottest and coldest rail temperatures expected.",
    sources: [pre("ch. 5, s. 5.17")],
  },
  {
    term: "Stressing",
    plain: "Stretching welded rail with hydraulic tensors (or warming it) before clipping it down, so it is fixed at the length it would have at the stress-free temperature. It will then only push hard on very hot days.",
    sources: [pre("ch. 5, s. 5.17"), nrb("Extremes of weather: hot weather")],
  },
  {
    term: "Adjustment switch",
    plain: "A sliding joint at the end of a length of welded rail, often next to switches and crossings or jointed track. It lets the last stretch of welded rail expand and contract without pushing on what is next to it.",
    sources: [nrb("Track gauge, top and cross level and line")],
  },
  {
    term: "Thermite weld",
    plain: "A weld made on site. A mould is clamped round the gap between two rails, the ends are preheated, and a chemical reaction makes molten steel that pours into the mould. Once it cools, the extra metal is trimmed and ground smooth. Also called an alumino-thermic weld.",
    sources: [nrb("Joining rails by welding"), pre("ch. 5, s. 5.16")],
  },
  {
    term: "Flash butt weld",
    plain: "A weld made by passing a large electric current through two rail ends pressed together until they fuse. It is usually done in a depot to make long rails before they go to site.",
    sources: [pre("ch. 5, s. 5.15")],
  },
  {
    term: "Track buckle",
    plain: "A sudden sideways kink in the track on a hot day. Welded rail that cannot get longer pushes on the track, and if the ballast is short or disturbed the track moves sideways instead.",
    sources: [nrb("Extremes of weather: hot weather"), pre("ch. 5, s. 5.17")],
  },

  // ---------- Track shape ----------
  {
    term: "Gauge",
    plain: "The distance between the inside running edges of the two rails. In Britain it is 1,435 mm (4 feet 8½ inches).",
    sources: [nrb("Section 4: track gauge"), wp("Track gauge")],
  },
  {
    term: "Cant",
    plain: "Raising the outer rail on a curve above the inner rail, so the track leans into the bend. It helps trains round curves comfortably. Each railway sets it in small steps, up to a maximum.",
    sources: [nrb("Curves, cant and transitions"), wp("Cant (road and rail)")],
  },
  {
    term: "Transition",
    plain: "The length of track where a straight leads into a curve. The curve tightens and the cant builds up gradually here, so trains do not get a sudden jolt.",
    sources: [nrb("Curves, cant and transitions")],
  },
  {
    term: "Line and level",
    plain: "Line is how straight (or smoothly curved) the track is from side to side. Level, also called top, is how smooth it is up and down. Both are measured and corrected to keep the ride safe and smooth.",
    sources: [nrb("Track gauge, top and cross level and line"), pre("ch. 5, s. 5.27")],
  },
  {
    term: "Cross level",
    plain: "The height of one rail compared with the other at the same point along the track.",
    sources: [nrb("Track gauge, top and cross level and line")],
  },
  {
    term: "Twist",
    plain: "A change in cross level over a short length of track, so the track is warped like a twisted ruler. Too much twist can lift a wheel off the rail, so it is watched closely.",
    sources: [nrb("Track gauge, top and cross level and line"), wp("Track geometry")],
  },

  // ---------- Maintenance machines ----------
  {
    term: "Tamping",
    plain: "Lifting and lining the track to its correct position, then packing ballast firmly under each sleeper with vibrating steel tines so it stays there. Done by a tamping machine.",
    sources: [pre("ch. 3, s. 3.14 and ch. 5, s. 5.3"), wp("Tamping machine")],
  },
  {
    term: "Stoneblowing",
    plain: "Fixing dips in the track by lifting each sleeper slightly and blowing a measured amount of small stones into the gap beneath it, without disturbing the ballast bed that has already settled.",
    sources: [pre("ch. 3, s. 3.14"), wp("Stoneblower")],
  },
  {
    term: "Ballast regulator",
    plain: "A machine that ploughs and brushes ballast back into the right shape around the sleepers after other track work.",
    sources: [wp("Ballast regulator")],
  },

  // ---------- Switches and crossings ----------
  {
    term: "S&C",
    plain: "Switches and crossings: the track that lets trains move from one line to another or cross over another line. Also called points or pointwork.",
    sources: [nrb("Switches and crossings"), pre("ch. 5, s. 5.18")],
  },
  {
    term: "Turnout",
    plain: "A single set of points where one track divides into two. It is made of a pair of switches, a crossing, and closure rails between them.",
    sources: [pre("ch. 5, s. 5.20"), nrb("Hand of a turnout")],
  },
  {
    term: "Switch rail",
    plain: "The tapered rail in a set of points that moves sideways to send a train one way or the other. Also called a switch blade.",
    sources: [nrb("Switches and crossings"), wp("Railroad switch")],
  },
  {
    term: "Stock rail",
    plain: "The fixed outer rail in a set of points that a switch rail closes against.",
    sources: [pre("ch. 5, s. 5.20"), nrb("Common S&C layouts")],
  },
  {
    term: "Crossing",
    plain: "The V-shaped part of a turnout where one rail crosses another, so wheels can pass through. The tip of the V is called the nose.",
    sources: [pre("ch. 5, s. 5.19"), nrb("Switches and crossings")],
  },
  {
    term: "Check rail",
    plain: "An extra rail fixed just inside a running rail opposite a crossing. It guides the wheelset so the other wheel cannot strike the crossing nose or take the wrong path. Also fitted inside the inner rail on very sharp curves.",
    sources: [pre("ch. 5, s. 5.12 and 5.19"), nrb("Switches and crossings: check rail")],
  },
  {
    term: "Crossover",
    plain: "Two sets of points laid between neighbouring tracks so a train can move from one track to the other.",
    sources: [pre("ch. 5, s. 5.18")],
  },
  {
    term: "Diamond crossing",
    plain: "Where two tracks cross each other at an angle without joining. It is made of four crossings arranged in a diamond shape.",
    sources: [pre("ch. 5, s. 5.18 and 5.19")],
  },
  {
    term: "Point machine",
    plain: "The electric or air-powered machine that moves the switch rails, locks them in place and proves to the signalling that they are fully home.",
    sources: [pre("ch. 5, s. 5.21 and ch. 10, s. 10.4")],
  },

  // ---------- Signalling ----------
  {
    term: "Signal",
    plain: "A lineside indication that tells the driver whether it is safe to go on, when to slow down and when to stop.",
    sources: [nrb("Signals"), pre("ch. 10, s. 10.2")],
  },
  {
    term: "Aspect",
    plain: "What a signal is showing, such as red, single yellow, double yellow or green.",
    sources: [pre("ch. 10, s. 10.9 to 10.11")],
  },
  {
    term: "Four-aspect signalling",
    plain: "Colour light signals that can show red (stop), single yellow (be ready to stop at the next signal), double yellow (the next signal is at single yellow) or green (clear). The extra step gives fast trains more warning.",
    sources: [pre("ch. 10, s. 10.11"), nrb("Signals")],
  },
  {
    term: "Semaphore signal",
    plain: "An older signal with a moving arm. On a stop signal, a horizontal arm means stop. A distant signal, with a yellow arm and a black chevron, gives advance warning of the next stop signal.",
    sources: [nrb("Signals"), pre("ch. 10, s. 10.1 and 10.7"), wp("Railway semaphore signal")],
  },
  {
    term: "Distant signal",
    plain: "A signal that cannot show stop on its own. It warns the driver what the next signal ahead is showing, so they have room to brake.",
    sources: [pre("ch. 10, s. 10.7"), nrb("Signals")],
  },
  {
    term: "Block section",
    plain: "A stretch of line between two signals that only one train may be in at a time. Keeping trains in separate blocks is the basic safety principle of signalling.",
    sources: [pre("ch. 10, s. 10.2")],
  },
  {
    term: "Track circuit",
    plain: "A low electric current sent through the rails of a section. A train's wheels and axles short the current out, which tells the signalling the section is occupied. If anything fails, it shows occupied, which is the safe way to fail.",
    sources: [pre("ch. 10, s. 10.3")],
  },
  {
    term: "Axle counter",
    plain: "Sensors on the rail that count wheels into and out of a section. If the counts match, the section is clear. Used instead of track circuits in many places.",
    sources: [wp("Axle counter")],
  },
  {
    term: "Interlocking",
    plain: "The safety logic that stops a signal being cleared unless the points are set and locked for that route and no conflicting route is set.",
    sources: [pre("ch. 10, s. 10.5")],
  },
  {
    term: "Route indicator",
    plain: "A row of white lights above a signal, angled to show which way the train will go at a junction. Some show a number or letter instead.",
    sources: [pre("ch. 10, s. 10.11"), nrb("Signals")],
  },
  {
    term: "Headway",
    plain: "The shortest time between one train and the next that the signalling allows on a line. It sets how many trains an hour the line can carry.",
    sources: [pre("ch. 10, s. 10.2 and 10.6")],
  },
  {
    term: "AWS",
    plain: "Automatic Warning System. A magnet between the rails before a signal sounds a bell in the cab if the signal is clear, or a horn if it is not. The driver must acknowledge the horn or the brakes are applied.",
    sources: [wp("Automatic Warning System")],
  },
  {
    term: "TPWS",
    plain: "Train Protection and Warning System. Loops on the track apply the train's brakes if it passes a red signal, or approaches one or a speed limit too fast.",
    sources: [wp("Train Protection & Warning System"), pre("ch. 10, s. 10.14")],
  },
  {
    term: "SPAD",
    plain: "Signal passed at danger: when a train passes a red signal without permission. Every one is investigated.",
    sources: [pre("ch. 10, s. 10.14")],
  },

  // ---------- Power ----------
  {
    term: "OLE",
    plain: "Overhead line equipment: the wires, masts and fittings that carry power above the track. On Britain's main lines it carries 25,000 volts AC.",
    sources: [pre("ch. 9, s. 9.3 and 9.6"), wp("Overhead line")],
  },
  {
    term: "Contact wire",
    plain: "The lowest wire of the overhead line, made of hard copper, which the pantograph slides along. It is hung from a catenary wire above by thin droppers and zig-zags slightly so it wears the pantograph evenly.",
    sources: [pre("ch. 9, s. 9.6")],
  },
  {
    term: "Pantograph",
    plain: "The folding frame on a train's roof that presses up against the contact wire to collect power.",
    sources: [pre("ch. 9, s. 9.3 and 9.6"), wp("Pantograph (transport)")],
  },
  {
    term: "Third rail",
    plain: "An extra rail beside the running rails that carries power, usually 750 volts DC on Britain's main lines. Trains collect it with sliding shoes, and the current returns through the running rails.",
    sources: [pre("ch. 9, s. 9.3 and 9.9"), wp("Third rail")],
  },
  {
    term: "Fourth rail",
    plain: "The London Underground system: one power rail beside the track and a second, return rail in the middle of the track, so the current does not use the running rails.",
    sources: [pre("ch. 9, s. 9.9")],
  },
  {
    term: "Substation",
    plain: "A site beside the railway that takes power from the grid and converts it to the voltage the trains need. DC railways need them every few kilometres; 25 kV AC lines need feeder stations much further apart.",
    sources: [pre("ch. 9, s. 9.3")],
  },
  {
    term: "Neutral section",
    plain: "A short dead section in the overhead wire that separates areas fed from different supplies. Trains coast through it with power off.",
    sources: [wp("Overhead line")],
  },
  {
    term: "Bi-mode",
    plain: "A train that can run on electric power from the wires or on its own diesel engines where there are no wires.",
    sources: [wp("British Rail Class 800")],
  },

  // ---------- Running the railway ----------
  {
    term: "Possession",
    plain: "A booked period when a section of line is closed to normal trains so engineers can work on it safely. It must be handed back on time so the service can restart.",
    sources: [pre("ch. 5, s. 5.27 and ch. 3, s. 3.14")],
  },
  {
    term: "Engineering hours",
    plain: "The hours, usually at night, when no passenger trains are booked and maintenance can be done.",
    sources: [pre("ch. 5, s. 5.27")],
  },
  {
    term: "TSR",
    plain: "Temporary speed restriction. A lower speed limit put on a stretch of line for a planned period, for example after track work while the ballast settles. Drivers are told about it in advance.",
    sources: [pre("ch. 7, s. 7.5"), wp("Glossary of rail transport terms")],
  },
  {
    term: "ESR",
    plain: "Emergency speed restriction. A lower speed limit imposed at short notice when a fault is found, such as rough track or a hot-weather risk, before there is time to publish it in advance.",
    sources: [pre("ch. 6, s. 6.4"), wp("Glossary of rail transport terms")],
  },
  {
    term: "PSR",
    plain: "Permanent speed restriction. The normal speed limit for a stretch of line, set by curves, junctions and other fixed features.",
    sources: [pre("ch. 10, s. 10.11"), wp("Glossary of rail transport terms")],
  },
  {
    term: "Patrolling",
    plain: "Walking the line on a regular schedule to look for faults, such as broken clips, damaged rails or poor drainage, before they affect trains.",
    sources: [pre("ch. 5, s. 5.27")],
  },
  {
    term: "Limited clearance",
    plain: "A stretch where there is no safe space to stand clear of passing trains, such as some bridges and tunnels. It is marked by red and white chequered boards.",
    sources: [nrb("Bridges, cuttings, viaducts and embankments")],
  },
  {
    term: "Refuge",
    plain: "A recess built into a tunnel, bridge or viaduct wall where a person can stand safely while a train passes. Blue and white chequered boards warn where there are no refuges.",
    sources: [nrb("Bridges, cuttings, viaducts and embankments")],
  },
  {
    term: "Railhead treatment",
    plain: "Cleaning crushed leaves off the top of the rails in autumn, usually with high-pressure water jets from a special train, then often applying a sand-based gel to help wheels grip.",
    sources: [wp("Slippery rail"), wp("British Rail MPV")],
  },
  {
    term: "Adhesion",
    plain: "The grip between steel wheel and steel rail. It is low compared with a tyre on a road, and leaves, rain or frost on the rail can reduce it further, making braking and starting harder.",
    sources: [wp("Slippery rail")],
  },
  {
    term: "Rolling contact fatigue",
    plain: "Fine cracks that grow in the head of a rail under the repeated passing of wheels. If they are not found and removed by grinding or rail replacement, the rail can break.",
    sources: [wp("Hatfield rail crash"), wp("Rolling contact fatigue")],
  },
  {
    term: "Track recording",
    plain: "Measuring the track's shape and condition from a moving train fitted with sensors, so faults are found and fixed before they become dangerous.",
    sources: [pre("ch. 5, s. 5.27"), wp("New Measurement Train")],
  },
  {
    term: "Loading gauge",
    plain: "The largest outline a train may have so it fits safely past platforms, bridges and tunnels on a route. Britain's loading gauge is small compared with much of Europe.",
    sources: [wp("Loading gauge")],
  },
  {
    term: "Bogie",
    plain: "A frame carrying two or three axles under each end of a rail vehicle. It can swivel, so long vehicles can follow curves.",
    sources: [pre("ch. 3"), wp("Bogie")],
  },
  {
    term: "Multiple unit",
    plain: "A train with its own motors spread along the carriages and a driving cab at each end, so it needs no separate locomotive.",
    sources: [pre("ch. 3, s. 3.5"), wp("Multiple unit")],
  },
];
