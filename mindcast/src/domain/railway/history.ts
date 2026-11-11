import type { HistoryEvent, Source } from "../types";

/**
 * "On this day" cards from British railway history, at least one for every month.
 * Dates are the event day itself (opening day, record day). Links point to a lesson id or a season.
 */

const wp = (title: string): Source => ({
  label: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
});
const wd = (id: string, what: string): Source => ({ label: `Wikidata: ${what}`, url: `https://www.wikidata.org/wiki/${id}` });

const S1 = "Season 1: The Permanent Way";
const S3 = "Season 3: Power";
const S4 = "Season 4: Structures";
const S5 = "Season 5: Running the Railway";
const S6 = "Season 6: Delivering at Scale";

export const history: HistoryEvent[] = [
  // January
  {
    id: "h-1863-metropolitan",
    month: 1, day: 10, year: 1863,
    title: "The world's first underground railway",
    text: "The Metropolitan Railway opens in London between Paddington and Farringdon. Steam trains run through shallow tunnels, much of them built by digging a trench under the road and roofing it over.",
    art: "tunnel", link: S4,
    sources: [wp("Metropolitan Railway"), wd("Q935025", "Metropolitan Railway")],
  },
  {
    id: "h-1923-grouping",
    month: 1, day: 1, year: 1923,
    title: "The Big Four",
    text: "About 120 railway companies are grouped into four large ones under the Railways Act 1921. They are the LMS, the LNER, the Great Western and the Southern.",
    art: "paper", link: S5,
    sources: [wp("Railways Act 1921")],
  },
  {
    id: "h-1948-british-railways",
    month: 1, day: 1, year: 1948,
    title: "British Railways is formed",
    text: "The Big Four are nationalised and brought together as British Railways. One organisation now runs almost the whole national network.",
    art: "paper", link: S5,
    sources: [wp("British Railways")],
  },
  // February
  {
    id: "h-1804-penydarren",
    month: 2, day: 21, year: 1804,
    title: "The first locomotive-hauled railway journey",
    text: "Richard Trevithick's steam locomotive hauls iron and passengers along the Penydarren tramroad in south Wales. It is so heavy that it breaks the cast iron rails, an early lesson that track and train must be designed together.",
    art: "loco", link: S1,
    sources: [wp("Richard Trevithick")],
  },
  {
    id: "h-2014-dawlish",
    month: 2, day: 5, year: 2014,
    title: "Storms break the line at Dawlish",
    text: "Huge waves wash away part of the sea wall at Dawlish, leaving the rails hanging in mid-air. The main line to Devon and Cornwall stays closed for about two months while it is rebuilt.",
    art: "station", link: S4,
    sources: [wp("Dawlish railway station"), wp("Exeter–Plymouth line")],
  },
  // March
  {
    id: "h-1890-forth-bridge",
    month: 3, day: 4, year: 1890,
    title: "The Forth Bridge opens",
    text: "A giant steel cantilever bridge opens across the Firth of Forth in Scotland. It is now a UNESCO World Heritage Site.",
    art: "bridge", link: S4,
    sources: [wp("Forth Bridge"), wd("Q275", "Forth Bridge")],
  },
  {
    id: "h-1963-beeching",
    month: 3, day: 27, year: 1963,
    title: "The Beeching report",
    text: "A report called The Reshaping of British Railways is published. It proposes closing about 5,000 miles of line and 2,363 stations.",
    art: "paper", link: S6,
    sources: [wp("The Reshaping of British Railways")],
  },
  // April
  {
    id: "h-1901-mallaig",
    month: 4, day: 1, year: 1901,
    title: "The line to Mallaig opens",
    text: "The extension of the West Highland Line from Fort William to Mallaig opens. It crosses the Glenfinnan Viaduct, one of the first big structures built in mass concrete.",
    art: "viaduct", link: S4,
    sources: [wp("West Highland Line"), wp("Glenfinnan Viaduct")],
  },
  {
    id: "h-1994-railtrack",
    month: 4, day: 1, year: 1994,
    title: "Track and trains are split",
    text: "Railtrack takes over Britain's track, signals and stations from British Rail as part of privatisation. Running the trains and looking after the track become separate jobs for separate companies.",
    art: "paper", link: S5,
    sources: [wp("Railtrack")],
  },
  // May
  {
    id: "h-1859-royal-albert",
    month: 5, day: 2, year: 1859,
    title: "Brunel's bridge into Cornwall",
    text: "Prince Albert opens the Royal Albert Bridge across the River Tamar at Saltash. It was designed by Isambard Kingdom Brunel and still carries every train between Devon and Cornwall.",
    art: "bridge", link: S4,
    sources: [wp("Royal Albert Bridge"), wd("Q1570586", "Royal Albert Bridge")],
  },
  {
    id: "h-1876-settle-carlisle",
    month: 5, day: 1, year: 1876,
    title: "Passengers on the Settle to Carlisle line",
    text: "Passenger trains start running over the Settle to Carlisle line across the Pennines. Building it took viaducts like Ribblehead and long tunnels through the hills.",
    art: "viaduct", link: S4,
    sources: [wp("Settle–Carlisle line"), wp("Ribblehead Viaduct")],
  },
  {
    id: "h-1994-channel-tunnel",
    month: 5, day: 6, year: 1994,
    title: "The Channel Tunnel opens",
    text: "The Queen and President Mitterrand open the rail tunnel under the English Channel, a year later than planned. It links Britain and France by rail for the first time.",
    art: "tunnel", link: S4,
    sources: [wp("Channel Tunnel"), wd("Q10257", "Channel Tunnel")],
  },
  {
    id: "h-2022-elizabeth-line",
    month: 5, day: 24, year: 2022,
    title: "The Elizabeth line opens",
    text: "Passenger services start on a new railway in tunnels under central London, linking east and west. It was first meant to open in 2018, a reminder that big projects need time for testing.",
    art: "tunnel", link: S6,
    sources: [wp("Elizabeth line"), wd("Q111297173", "Elizabeth line")],
  },
  // June
  {
    id: "h-1838-gwr",
    month: 6, day: 4, year: 1838,
    title: "The Great Western opens",
    text: "The first section of Brunel's Great Western Railway opens from Paddington towards Maidenhead. It was built to a wide gauge of 7 feet, later converted to the standard 4 feet 8½ inches.",
    art: "station", link: "s1-12",
    sources: [wp("Great Western Main Line"), wp("London Paddington station")],
  },
  {
    id: "h-1841-box-tunnel",
    month: 6, day: 30, year: 1841,
    title: "Box Tunnel completes London to Bristol",
    text: "Box Tunnel opens and the Great Western Railway runs all the way from London to Bristol. At nearly two miles long it was the longest railway tunnel in the world when built.",
    art: "tunnel", link: S4,
    sources: [wp("Box Tunnel"), wd("Q848315", "Box Tunnel")],
  },
  {
    id: "h-1973-hst-record",
    month: 6, day: 12, year: 1973,
    title: "A diesel speed record",
    text: "The prototype high-speed train reaches 143 mph, a world record for diesel traction. Speeds like that need track kept to very tight standards of line and level.",
    art: "streamline", link: "s1-11",
    sources: [wp("InterCity 125")],
  },
  // July
  {
    id: "h-1938-mallard",
    month: 7, day: 3, year: 1938,
    title: "Mallard's record run",
    text: "The steam locomotive Mallard reaches 126 mph on the East Coast Main Line. It is still the world speed record for steam.",
    art: "streamline", link: "s1-11",
    sources: [wp("LNER Class A4 4468 Mallard"), wp("LNER Class A4")],
  },
  {
    id: "h-1841-brighton",
    month: 7, day: 12, year: 1841,
    title: "Across the Ouse Valley",
    text: "The London and Brighton Railway opens its first section south from London, crossing the Ouse Valley Viaduct. Its 37 brick arches still carry the main line to Brighton.",
    art: "viaduct", link: S4,
    sources: [wp("London and Brighton Railway"), wp("Ouse Valley Viaduct")],
  },
  {
    id: "h-2022-heat",
    month: 7, day: 19, year: 2022,
    title: "Britain's hottest day",
    text: "The air temperature in England passes 40°C for the first time on record. Rails in full sun get much hotter than the air, so many lines run slower or close to reduce the risk of buckles.",
    art: "signal", link: "s1-08",
    sources: [wp("2022 United Kingdom heat waves")],
  },
  // August
  {
    id: "h-1850-royal-border",
    month: 8, day: 29, year: 1850,
    title: "The Royal Border Bridge",
    text: "Queen Victoria opens Robert Stephenson's viaduct across the River Tweed at Berwick. Its 28 arches complete the railway link between London and Edinburgh.",
    art: "viaduct", link: S4,
    sources: [wp("Royal Border Bridge"), wd("Q2170969", "Royal Border Bridge")],
  },
  {
    id: "h-1968-last-steam",
    month: 8, day: 11, year: 1968,
    title: "The last steam passenger train",
    text: "British Rail runs the Fifteen Guinea Special, its last main-line steam passenger train, from Liverpool to Carlisle and back. Steam is then banned from the main line for several years.",
    art: "loco", link: S5,
    sources: [wp("Fifteen Guinea Special")],
  },
  // September
  {
    id: "h-1825-stockton-darlington",
    month: 9, day: 27, year: 1825,
    title: "Stockton and Darlington Railway opens",
    text: "The first public railway to use steam locomotives opens. Locomotion No. 1 pulls the opening train.",
    art: "loco", link: "s1-01",
    sources: [wp("Stockton and Darlington Railway")],
  },
  {
    id: "h-1830-liverpool-manchester",
    month: 9, day: 15, year: 1830,
    title: "Liverpool and Manchester Railway opens",
    text: "The world's first inter-city railway opens, with steam trains running between Liverpool and Manchester. Its route crossed Chat Moss, a deep peat bog that had to be drained before the line could be built.",
    art: "viaduct", link: "s1-10",
    sources: [wp("Liverpool and Manchester Railway"), wd("Q1398696", "Liverpool and Manchester Railway")],
  },
  {
    id: "h-2003-hs1",
    month: 9, day: 28, year: 2003,
    title: "Britain's first high-speed line",
    text: "The first section of the Channel Tunnel Rail Link, now High Speed 1, opens through Kent. Eurostar trains can now run at up to 186 mph in Britain.",
    art: "streamline", link: S6,
    sources: [wp("High Speed 1")],
  },
  // October
  {
    id: "h-1829-rainhill",
    month: 10, day: 6, year: 1829,
    title: "The Rainhill Trials",
    text: "Locomotives compete near Liverpool for a £500 prize, to show which design should work the new Liverpool and Manchester Railway. Stephenson's Rocket is the only one to complete the trials and wins.",
    art: "loco", link: S3,
    sources: [wp("Rainhill trials"), wd("Q2144114", "Rainhill trials")],
  },
  {
    id: "h-2000-hatfield",
    month: 10, day: 17, year: 2000,
    title: "The Hatfield derailment",
    text: "A rail weakened by fine fatigue cracks shatters under an express train at Hatfield, and four people die. Hundreds of speed restrictions follow while rails are checked and replaced across the country.",
    art: "paper", link: "s1-15",
    sources: [wp("Hatfield rail crash"), wd("Q2822729", "Hatfield rail crash")],
  },
  {
    id: "h-2002-network-rail",
    month: 10, day: 3, year: 2002,
    title: "Network Rail takes over",
    text: "Network Rail takes over Britain's track, signals and stations from Railtrack. It has run the national rail infrastructure ever since.",
    art: "paper", link: S5,
    sources: [wp("Network Rail"), wp("Railtrack")],
  },
  // November
  {
    id: "h-1934-flying-scotsman",
    month: 11, day: 30, year: 1934,
    title: "The first 100 mph",
    text: "Flying Scotsman becomes the first steam locomotive officially recorded at 100 mph in Britain. The run was a test to plan faster express services.",
    art: "streamline", link: "s1-11",
    sources: [wp("LNER Class A3 4472 Flying Scotsman")],
  },
  {
    id: "h-1994-eurostar",
    month: 11, day: 14, year: 1994,
    title: "Eurostar's first passenger trains",
    text: "Passenger services start through the Channel Tunnel between London, Paris and Brussels. The London trains leave from Waterloo at first.",
    art: "streamline", link: S5,
    sources: [wp("Eurostar")],
  },
  {
    id: "h-2007-st-pancras",
    month: 11, day: 14, year: 2007,
    title: "St Pancras International",
    text: "High Speed 1 is completed into a restored and extended St Pancras station. Eurostar trains move there from Waterloo.",
    art: "station", link: S6,
    sources: [wp("St Pancras railway station"), wp("High Speed 1")],
  },
  // December
  {
    id: "h-1879-tay-bridge",
    month: 12, day: 28, year: 1879,
    title: "The Tay Bridge disaster",
    text: "The first Tay Bridge collapses in a storm as a train crosses it, and everyone on board dies. The inquiry found faults in its design, building and upkeep, and engineers took far more care over wind loads afterwards.",
    art: "bridge", link: S4,
    sources: [wp("Tay Bridge disaster"), wd("Q1287158", "Tay Bridge disaster")],
  },
  {
    id: "h-1886-severn-tunnel",
    month: 12, day: 1, year: 1886,
    title: "Passengers through the Severn Tunnel",
    text: "Regular passenger trains start running through the Severn Tunnel between England and Wales. Water from a spring kept flooding the works, and pumps still run there today.",
    art: "tunnel", link: S4,
    sources: [wp("Severn Tunnel")],
  },
  {
    id: "h-1890-city-south-london",
    month: 12, day: 18, year: 1890,
    title: "The first electric deep-level tube",
    text: "The City and South London Railway opens to the public, with electric trains running in tunnels deep under London. It is the first deep-level tube line to be worked by electricity.",
    art: "tunnel", link: S3,
    sources: [wp("City and South London Railway")],
  },
  {
    id: "h-1990-tunnel-breakthrough",
    month: 12, day: 1, year: 1990,
    title: "The Channel Tunnel breakthrough",
    text: "Workers digging from England and France meet under the Channel in the service tunnel. Graham Fagg and Philippe Cozette are the first to shake hands through the gap.",
    art: "tunnel", link: S6,
    sources: [wp("Channel Tunnel")],
  },
];
