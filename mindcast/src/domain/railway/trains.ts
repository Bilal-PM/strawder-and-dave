/**
 * UK rolling stock classes, drawn to scale from these numbers.
 * Dimensions are per vehicle (per car for units). Every class carries its sources.
 * "checked": length, height, speed, year and number built agree with the cited source.
 * "approx": at least one figure (usually height or a typical length) is not confirmed by a cited source.
 * The approx classes were re-checked against Wikipedia article wikitext on 11 Nov 2026. Class 777 and DLR B92
 * are now "checked". 17 remain approx, each with a comment saying why: five classes and the measurement train
 * have no height in any article (c68, c43, black5, c800, c700, nmt). The generic wagons and engineering machines
 * are illustrative types, and no article gives a class-specific length, height, speed or year for them.
 * Body and stripe colours are deliberately unbranded. The model objects drive the drawings: do not edit by hand.
 */
import type { TrainClass } from "../types";

export const trains: TrainClass[] = [
  {
    id: "c08",
    name: "Class 08",
    type: "Diesel shunter",
    group: "loco",
    intro: 1952,
    speed: "15 mph",
    power: "Diesel-electric",
    arrangement: "0-6-0",
    lengthM: 8.92,
    heightM: 3.88,
    built: 996,
    body: "#2F5D3A",
    stripe: "#F2B705",
    fact: "The most numerous British locomotive class: 996 were built to shunt wagons and coaches in yards.",
    spotting: "Small and low, with a tall cab at one end, a long bonnet in front of it and six wheels joined by coupling rods.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 08",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_08"
      }
    ],
    model: {
      kind: "hood"
    }
  },
  {
    id: "c37",
    name: "Class 37",
    type: "Diesel locomotive",
    group: "loco",
    intro: 1960,
    speed: "90 mph",
    power: "Diesel-electric",
    arrangement: "Co-Co",
    lengthM: 18.75,
    heightM: 3.89,
    built: 309,
    body: "#2B59C3",
    stripe: "#F2B705",
    fact: "Nicknamed 'Tractors' for the sound of their engines. 309 were built, and some still work today.",
    spotting: "A nose at each end, three axles on each bogie, and a growling engine you can hear long before it arrives.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 37",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_37"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "nose",
        "nose"
      ],
      axles: 3,
      roof: [
        [
          "exhaust",
          0.5
        ],
        [
          "fan",
          0.32
        ],
        [
          "fan",
          0.68
        ]
      ]
    }
  },
  {
    id: "c47",
    name: "Class 47",
    type: "Diesel locomotive",
    group: "loco",
    intro: 1962,
    speed: "95 mph",
    power: "Diesel-electric",
    arrangement: "Co-Co",
    lengthM: 19.38,
    heightM: 3.9,
    built: 512,
    body: "#1F2933",
    stripe: "#E8611A",
    fact: "512 were built, more than any other British main-line diesel. They pulled everything from freight to express trains.",
    spotting: "A long, smooth body with a cab at each end, no nose, and three axles on each bogie.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 47",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_47"
      },
      {
        label: "Wikipedia: British Rail Class 08",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_08"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "slope",
        "slope"
      ],
      axles: 3,
      roof: [
        [
          "fan",
          0.62
        ],
        [
          "exhaust",
          0.45
        ]
      ]
    }
  },
  {
    id: "c66",
    name: "Class 66",
    type: "Diesel locomotive",
    group: "loco",
    intro: 1998,
    speed: "75 mph",
    power: "Diesel-electric",
    arrangement: "Co-Co",
    lengthM: 21.39,
    heightM: 3.91,
    built: 480,
    body: "#B23A3A",
    stripe: "#F2B705",
    fact: "Built in Canada and now the backbone of British rail freight, hauling stone, containers and more.",
    spotting: "Boxy and flat-fronted, with a cab at each end and three axles on each bogie. One of the commonest locos on British freight trains.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 66",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_66"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "flat",
        "flat"
      ],
      axles: 3,
      roof: [
        [
          "fan",
          0.42
        ],
        [
          "fan",
          0.56
        ],
        [
          "exhaust",
          0.32
        ]
      ]
    }
  },
  {
    id: "c68",
    name: "Class 68",
    type: "Diesel locomotive",
    group: "loco",
    intro: 2014,
    speed: "100 mph",
    power: "Diesel-electric",
    arrangement: "Bo-Bo",
    lengthM: 20.5,
    heightM: 3.9,
    built: 34,
    body: "#5B3F8C",
    stripe: "#FFFFFF",
    fact: "A mixed-traffic locomotive, used on freight and on passenger trains. 34 were built in Spain.",
    spotting: "Angular, sloping cab fronts at both ends and only two axles on each bogie.",
    // Still approx: the Class 68 article leaves length and height blank. The Stadler Eurolight article's
    // 20.32 m / 4.26 m are for the continental-gauge loco, not the UK one. Speed, year and number built agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: British Rail Class 68",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_68"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "slope",
        "slope"
      ],
      axles: 2,
      roof: [
        [
          "fan",
          0.4
        ],
        [
          "fan",
          0.6
        ],
        [
          "exhaust",
          0.5
        ]
      ]
    }
  },
  {
    id: "c91",
    name: "Class 91",
    type: "Electric locomotive",
    group: "loco",
    intro: 1989,
    speed: "125 mph",
    power: "25 kV overhead",
    arrangement: "Bo-Bo",
    lengthM: 19.4,
    heightM: 3.76,
    built: 31,
    body: "#B23A3A",
    stripe: "#FFFFFF",
    fact: "Designed for 140 mph and used at 125 mph on the East Coast Main Line. One end is streamlined, the other blunt.",
    spotting: "An electric loco with a pantograph on the roof, one streamlined end and one flat end.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 91",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_91"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "aero",
        "flat"
      ],
      axles: 2,
      roof: [
        [
          "panto",
          0.62
        ],
        [
          "ac",
          0.4
        ]
      ]
    }
  },
  {
    id: "c43",
    name: "Class 43",
    type: "High-speed power car",
    group: "loco",
    intro: 1976,
    speed: "125 mph",
    power: "Diesel-electric",
    arrangement: "Bo-Bo",
    lengthM: 17.79,
    heightM: 3.88,
    built: 197,
    body: "#1F2933",
    stripe: "#F2B705",
    fact: "Power cars for the high-speed train. One set reached 148 mph in 1987, a world record for a diesel train.",
    spotting: "A wedge-shaped nose with a single cab, usually one at each end of a set of coaches.",
    // Still approx: height is not given in the Class 43 or InterCity 125 articles.
    // Length 17.79 m, 125 mph, 1976, 197 built and the 148 mph record (1 Nov 1987) all agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: British Rail Class 43 (HST)",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_43_(HST)"
      },
      {
        label: "Wikipedia: InterCity 125",
        url: "https://en.wikipedia.org/wiki/InterCity_125"
      }
    ],
    model: {
      kind: "loco",
      ends: [
        "aero",
        "flat"
      ],
      axles: 2,
      roof: [
        [
          "fan",
          0.7
        ],
        [
          "exhaust",
          0.55
        ]
      ]
    }
  },
  {
    id: "a4",
    name: "A4 class",
    type: "Streamlined steam locomotive",
    group: "steam",
    intro: 1935,
    speed: "126 mph record",
    power: "Coal-fired steam",
    arrangement: "4-6-2",
    lengthM: 21.65,
    heightM: 3.99,
    built: 35,
    body: "#2B59C3",
    stripe: "#E8C66A",
    fact: "Mallard, one of this class, reached 126 mph in 1938. It's still the world speed record for steam.",
    spotting: "A smooth, wedge-shaped streamlined casing over the front and boiler, with a large tender behind.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: LNER Class A4",
        url: "https://en.wikipedia.org/wiki/LNER_Class_A4"
      },
      {
        label: "Wikipedia: LNER Class A4 4468 Mallard",
        url: "https://en.wikipedia.org/wiki/LNER_Class_A4_4468_Mallard"
      }
    ],
    model: {
      kind: "steam",
      lead: 4,
      drive: 6,
      trail: 2,
      drD: 2.03,
      stream: true,
      tender: 8
    }
  },
  {
    id: "castle",
    name: "Castle class",
    type: "Steam locomotive",
    group: "steam",
    intro: 1923,
    speed: "Express passenger",
    power: "Coal-fired steam",
    arrangement: "4-6-0",
    lengthM: 19.86,
    heightM: 4.08,
    built: 171,
    body: "#2F5D3A",
    stripe: "#E8C66A",
    fact: "Express engines built from 1923 to 1950. 171 were built and eight survive, some still running on the main line.",
    spotting: "Four small leading wheels, six large driving wheels and a six-wheeled tender behind the cab.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: GWR 4073 Class",
        url: "https://en.wikipedia.org/wiki/GWR_4073_Class"
      }
    ],
    model: {
      kind: "steam",
      lead: 4,
      drive: 6,
      trail: 0,
      drD: 2.04,
      copper: true,
      tender: 6
    }
  },
  {
    id: "black5",
    name: "Black Five",
    type: "Steam locomotive",
    group: "steam",
    intro: 1934,
    speed: "Mixed traffic",
    power: "Coal-fired steam",
    arrangement: "4-6-0",
    lengthM: 19.4,
    heightM: 3.96,
    built: 842,
    body: "#1F2933",
    stripe: "#B23A3A",
    fact: "842 were built. A do-anything workhorse that pulled passenger and freight trains alike.",
    spotting: "Four small leading wheels, six medium-sized driving wheels, usually in plain black.",
    // Still approx: the article gives no height. Length 19.40 m (63 ft 7 3/4 in), 1934 and 842 built agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: LMS Stanier Class 5 4-6-0",
        url: "https://en.wikipedia.org/wiki/LMS_Stanier_Class_5_4-6-0"
      }
    ],
    model: {
      kind: "steam",
      lead: 4,
      drive: 6,
      trail: 0,
      drD: 1.83,
      tender: 6
    }
  },
  {
    id: "c390",
    name: "Class 390",
    type: "Tilting electric train",
    group: "pass",
    intro: 2002,
    speed: "125 mph",
    power: "25 kV overhead",
    arrangement: "9 or 11 cars",
    lengthM: 23.9,
    heightM: 3.56,
    cars: 11,
    built: 57,
    body: "#5F6670",
    stripe: "#E8611A",
    fact: "Tilts into curves so it can take bends faster on the West Coast Main Line.",
    spotting: "A long pointed nose and a body that narrows towards the roof, leaving room for it to lean on curves.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 390",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_390"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "aero"
      ],
      doors: "ends",
      tilt: true,
      roof: [
        [
          "panto",
          0.7
        ]
      ]
    }
  },
  {
    id: "c800",
    name: "Class 800",
    type: "Bi-mode intercity train",
    group: "pass",
    intro: 2017,
    speed: "125 mph",
    power: "25 kV overhead or diesel",
    arrangement: "5 or 9 cars",
    lengthM: 26,
    heightM: 3.8,
    cars: 9,
    built: 80,
    body: "#2F5D3A",
    stripe: "#E8C66A",
    fact: "Bi-mode: it can run from the overhead wires or from diesel engines under the floor.",
    spotting: "A long, smooth nose and long cars, with doors near each end of every car.",
    // Still approx: the article leaves height blank. Car length 26.000 m, 200 km/h (125 mph), 2017
    // and 80 built (36 + 13 + 10 + 21) agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: British Rail Class 800",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_800"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "aero"
      ],
      doors: "ends",
      under: true,
      roof: [
        [
          "panto",
          0.75
        ]
      ]
    }
  },
  {
    id: "c700",
    name: "Class 700",
    type: "Electric multiple unit",
    group: "pass",
    intro: 2016,
    speed: "100 mph",
    power: "25 kV overhead and 750 V third rail",
    arrangement: "8 or 12 cars",
    lengthM: 20.2,
    heightM: 3.8,
    cars: 12,
    built: 115,
    body: "#5B3F8C",
    stripe: "#FFFFFF",
    fact: "Works from both overhead wires and third rail, so it can run right through London from north to south.",
    spotting: "Two sets of sliding doors on each side of every car and long, open interiors with no doors between cars.",
    // Still approx: the article leaves height blank. Car length 20.2 m, 100 mph, 2016 and 115 built agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: British Rail Class 700",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_700"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "slope"
      ],
      doors: 2,
      roof: [
        [
          "panto",
          0.5
        ]
      ],
      shoes: true
    }
  },
  {
    id: "c345",
    name: "Class 345",
    type: "Electric multiple unit",
    group: "pass",
    intro: 2017,
    speed: "90 mph",
    power: "25 kV overhead",
    arrangement: "9 cars",
    lengthM: 22.5,
    heightM: 3.76,
    cars: 9,
    built: 70,
    body: "#5B3F8C",
    stripe: "#FFFFFF",
    fact: "Nine cars and about 205 metres long, with three wide doors on each side of every car.",
    spotting: "Very long, with three sets of wide doors on each side of every car.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 345",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_345"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "slope"
      ],
      doors: 3,
      roof: [
        [
          "panto",
          0.5
        ]
      ]
    }
  },
  {
    id: "c455",
    name: "Class 455",
    type: "Third-rail electric unit",
    group: "pass",
    intro: 1983,
    speed: "75 mph",
    power: "750 V third rail",
    arrangement: "4 cars",
    lengthM: 19.9,
    heightM: 3.77,
    cars: 4,
    built: 137,
    body: "#E8611A",
    stripe: "#1F2933",
    fact: "A London suburban workhorse for over 40 years, powered from the third rail. The last ones left service in March 2026.",
    spotting: "A square front and two sets of sliding doors on each side of every car. Now mostly seen in preservation.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 455",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_455"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "flat"
      ],
      doors: 2,
      shoes: true
    }
  },
  {
    id: "c777",
    name: "Class 777",
    type: "Third-rail electric unit",
    group: "pass",
    intro: 2023,
    speed: "75 mph",
    power: "750 V third rail, some with batteries",
    arrangement: "4 cars",
    lengthM: 16.2,
    heightM: 3.83,
    cars: 4,
    built: 53,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Built for Merseyrail. Seven of the 53 carry batteries so they can run beyond the third rail.",
    spotting: "Wide doors with a step that slides out to meet the platform, so you can step straight on.",
    // Checked 11 Nov 2026: height 3.828 m, 120 km/h (75 mph), 2023, 53 built, 7 with batteries.
    // lengthM is the article's 64.98 m unit length over 4 articulated cars.
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 777",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_777"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "slope"
      ],
      doors: 2,
      shoes: true
    }
  },
  {
    id: "c158",
    name: "Class 158",
    type: "Diesel multiple unit",
    group: "pass",
    intro: 1990,
    speed: "90 mph",
    power: "Diesel",
    arrangement: "2 or 3 cars",
    lengthM: 22.57,
    heightM: 3.73,
    cars: 2,
    built: 180,
    body: "#2B59C3",
    stripe: "#F2B705",
    fact: "The 'Express Sprinter', built for longer regional journeys, with doors at the ends of each car.",
    spotting: "Doors only at the ends of each car, with large windows along the middle.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 158",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_158"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "slope"
      ],
      doors: "ends",
      under: true,
      exhaust: true
    }
  },
  {
    id: "c150",
    name: "Class 150",
    type: "Diesel multiple unit",
    group: "pass",
    intro: 1984,
    speed: "75 mph",
    power: "Diesel",
    arrangement: "2 cars",
    lengthM: 19.93,
    heightM: 3.77,
    cars: 2,
    built: 137,
    body: "#2F5D3A",
    stripe: "#FFFFFF",
    fact: "A 1980s 'Sprinter', still common on regional lines, with doors a third of the way along each car.",
    spotting: "Two sets of doors on each side of every car, set about a third of the way in from each end.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: British Rail Class 150",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_150"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "flat"
      ],
      doors: 2,
      under: true,
      exhaust: true
    }
  },
  {
    id: "t73",
    name: "1973 Tube Stock",
    type: "Deep-level tube train",
    group: "metro",
    intro: 1975,
    speed: "45 mph",
    power: "630 V fourth rail",
    arrangement: "6 cars",
    lengthM: 17.5,
    heightM: 2.89,
    cars: 6,
    body: "#D7DBE0",
    stripe: "#B23A3A",
    fact: "Piccadilly line trains, with small rounded cars sized for round tunnels deep under London.",
    spotting: "Small cars with a rounded roof shaped to fit the deep tube tunnels.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: London Underground 1973 Stock",
        url: "https://en.wikipedia.org/wiki/London_Underground_1973_Stock"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "round"
      ],
      doors: 3,
      tube: true
    }
  },
  {
    id: "t09",
    name: "2009 Tube Stock",
    type: "Deep-level tube train",
    group: "metro",
    intro: 2009,
    speed: "Up to 50 mph",
    power: "630 V fourth rail",
    arrangement: "8 cars",
    lengthM: 16.6,
    heightM: 2.88,
    cars: 8,
    built: 47,
    body: "#D7DBE0",
    stripe: "#2B59C3",
    fact: "Victoria line trains. They drive automatically, with a train operator on board.",
    spotting: "A tube-sized train with a rounded roof and wide doors, found only on the Victoria line.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: London Underground 2009 Stock",
        url: "https://en.wikipedia.org/wiki/London_Underground_2009_Stock"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "round"
      ],
      doors: 3,
      tube: true
    }
  },
  {
    id: "dlr",
    name: "DLR B92",
    type: "Automated light rail",
    group: "metro",
    intro: 1993,
    speed: "50 mph",
    power: "750 V third rail",
    arrangement: "2 articulated sections",
    lengthM: 14,
    heightM: 3.51,
    cars: 2,
    built: 47,
    body: "#B23A3A",
    stripe: "#3A86FF",
    fact: "The Docklands Light Railway runs automatically, with a member of staff on board but no driver's cab.",
    spotting: "Short vehicles that bend in the middle, with no driver's cab at the front.",
    // Checked 11 Nov 2026: height 3.51 m, 80 km/h (50 mph), B92 from 1993, 47 built.
    // lengthM is the article's 28 m vehicle length over its 2 articulated sections.
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: Docklands Light Railway B90, B92, and B2K Stock",
        url: "https://en.wikipedia.org/wiki/Docklands_Light_Railway_B90,_B92,_and_B2K_Stock"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "slope"
      ],
      doors: 2,
      artic: true
    }
  },
  {
    id: "m5000",
    name: "M5000 tram",
    type: "Tram",
    group: "metro",
    intro: 2009,
    speed: "50 mph",
    power: "750 V overhead",
    arrangement: "2 sections",
    lengthM: 14.2,
    heightM: 3.67,
    cars: 2,
    built: 147,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Manchester's tram, running through city streets and along former railway lines.",
    spotting: "A two-section tram with a pantograph on the roof, often running as two trams coupled together.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: Bombardier M5000",
        url: "https://en.wikipedia.org/wiki/Bombardier_M5000"
      }
    ],
    model: {
      kind: "unit",
      ends: [
        "tram"
      ],
      doors: 2,
      tram: true,
      artic: true,
      roof: [
        [
          "panto",
          0.95
        ]
      ]
    }
  },
  {
    id: "urbos",
    name: "Edinburgh tram",
    type: "Tram",
    group: "metro",
    intro: 2014,
    speed: "43 mph",
    power: "750 V overhead",
    arrangement: "7 sections",
    lengthM: 42.86,
    heightM: 3.4,
    cars: 1,
    built: 27,
    body: "#D7DBE0",
    stripe: "#B23A3A",
    fact: "Seven sections and nearly 43 metres long, one of the longest trams in Britain.",
    spotting: "One very long, low-floor tram made of seven sections, with a pantograph on the roof.",
    confidence: "checked",
    sources: [
      {
        label: "Wikipedia: CAF Urbos 3 (Edinburgh)",
        url: "https://en.wikipedia.org/wiki/CAF_Urbos_3_(Edinburgh)"
      },
      {
        label: "Wikipedia: Edinburgh Trams",
        url: "https://en.wikipedia.org/wiki/Edinburgh_Trams"
      }
    ],
    model: {
      kind: "tram7"
    }
  },
  {
    id: "box",
    name: "Box wagon",
    type: "Aggregates wagon",
    group: "freight",
    intro: 2000,
    speed: "60 mph",
    power: "Hauled",
    arrangement: "2 bogies",
    lengthM: 19,
    heightM: 3.4,
    body: "#5F6670",
    stripe: "#F2B705",
    fact: "Open box wagons carry stone and aggregates from quarries to building sites and depots.",
    spotting: "An open-topped steel box on two bogies, usually in a long line behind a freight loco.",
    // Still approx: illustrative type. No Wikipedia article gives a length, height or speed for a UK bogie box wagon.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.13"
      },
      {
        label: "Wikipedia: Rail freight transport",
        url: "https://en.wikipedia.org/wiki/Rail_freight_transport"
      }
    ],
    model: {
      kind: "wagon",
      w: "box"
    }
  },
  {
    id: "tank",
    name: "Tank wagon",
    type: "Bogie tank wagon",
    group: "freight",
    intro: 1967,
    speed: "60 mph",
    power: "Hauled",
    arrangement: "2 bogies",
    lengthM: 15.6,
    heightM: 3.9,
    body: "#1F2933",
    stripe: "#B23A3A",
    fact: "Tank wagons carry fuel and other liquids. Orange hazard plates on the side tell staff what's inside.",
    spotting: "A long, round tank on two bogies, often with orange hazard plates on the side.",
    // Still approx: illustrative type. The Tank car article gives no UK bogie tank wagon dimensions, speed or year.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.13"
      },
      {
        label: "Wikipedia: Tank car",
        url: "https://en.wikipedia.org/wiki/Tank_car"
      }
    ],
    model: {
      kind: "wagon",
      w: "tank"
    }
  },
  {
    id: "cont",
    name: "Container wagon",
    type: "Intermodal flat wagon",
    group: "freight",
    intro: 2000,
    speed: "75 mph",
    power: "Hauled",
    arrangement: "2 bogies, 40 ft container",
    lengthM: 19.6,
    heightM: 3.9,
    body: "#3A86FF",
    stripe: "#F2B705",
    fact: "Carries shipping containers from ports to inland terminals. A 40-foot container is about 12.2 metres long.",
    spotting: "A low, flat frame on bogies carrying one or more shipping containers.",
    // Still approx: illustrative type. No article gives a UK container wagon's length, height or speed.
    // The 40 ft = 12.2 m container figure in the fact is confirmed.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.13"
      },
      {
        label: "Wikipedia: Containerization",
        url: "https://en.wikipedia.org/wiki/Containerization"
      }
    ],
    model: {
      kind: "wagon",
      w: "cont"
    }
  },
  {
    id: "hopper",
    name: "Ballast hoppers",
    type: "Ballast hopper wagons",
    group: "freight",
    intro: 1990,
    speed: "60 mph",
    power: "Hauled",
    arrangement: "2 bogies each",
    lengthM: 12,
    heightM: 3.6,
    body: "#5F6670",
    stripe: "#F2B705",
    fact: "Drop new ballast onto the track through doors underneath, exactly where it's needed.",
    spotting: "Wagons with sloping sides and doors underneath, usually in engineering trains at night or at weekends.",
    // Still approx: British Rail Departmental Wagons lists the bogie ballast hoppers (Seacow, Sealion, etc.)
    // but gives no dimensions, speed or dates.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Wikipedia: British Rail Departmental Wagons",
        url: "https://en.wikipedia.org/wiki/British_Rail_Departmental_Wagons"
      }
    ],
    model: {
      kind: "legacy",
      k: "hopper",
      show: 36
    }
  },
  {
    id: "tamper",
    name: "Plain-line tamper",
    type: "Track maintenance machine",
    group: "eng",
    intro: 2005,
    speed: "Works at walking pace",
    power: "Diesel-hydraulic",
    arrangement: "Self-propelled",
    lengthM: 30,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#B23A3A",
    fact: "Lifts, lines and packs the track as it moves along, vibrating steel tines into the ballast under each sleeper.",
    spotting: "A long yellow machine with workheads under the middle that plunge steel tines into the ballast beside each sleeper.",
    // Still approx: Tamping machine and Plasser & Theurer give no length, height or year for a UK plain-line tamper
    // (no article on the 09-3X).
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Network Rail, Introduction to the Permanent Way (NR/PWG/001, 2003)",
        where: "Curves, cant and transitions"
      },
      {
        label: "Wikipedia: Tamping machine",
        url: "https://en.wikipedia.org/wiki/Tamping_machine"
      }
    ],
    model: {
      kind: "legacy",
      k: "tamper"
    }
  },
  {
    id: "sctamper",
    name: "S&C tamper",
    type: "Switch and crossing tamper",
    group: "eng",
    intro: 2005,
    speed: "Works at walking pace",
    power: "Diesel-hydraulic",
    arrangement: "Self-propelled",
    lengthM: 32,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Built to tamp switches and crossings, with extra arms to lift the heavy rails while it packs.",
    spotting: "Like a plain-line tamper, but with extra lifting arms that reach out to the rails of a junction.",
    // Still approx: Tamping machine gives no length, height or year for a switch and crossing tamper.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Wikipedia: Tamping machine",
        url: "https://en.wikipedia.org/wiki/Tamping_machine"
      }
    ],
    model: {
      kind: "legacy",
      k: "tamper"
    }
  },
  {
    id: "stoneblower",
    name: "Stoneblower",
    type: "Track maintenance machine",
    group: "eng",
    intro: 2000,
    speed: "Works at walking pace",
    power: "Diesel",
    arrangement: "Self-propelled",
    lengthM: 33,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Blows measured amounts of small stones under the sleepers to fix dips, without disturbing the whole ballast bed.",
    spotting: "A yellow machine carrying hoppers of small stones, with tubes that push down beside the sleepers.",
    // Still approx: Stoneblower gives no dimensions. It says Harsco built them and they were in use
    // across the UK by 1999, so 2000 is too late for a first-use year, but the article gives no exact year.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Wikipedia: Stoneblower",
        url: "https://en.wikipedia.org/wiki/Stoneblower"
      }
    ],
    model: {
      kind: "legacy",
      k: "stoneblower"
    }
  },
  {
    id: "regulator",
    name: "Ballast regulator",
    type: "Track maintenance machine",
    group: "eng",
    intro: 2000,
    speed: "Works at walking pace",
    power: "Diesel",
    arrangement: "Self-propelled",
    lengthM: 15,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#B23A3A",
    fact: "Ploughs and brushes the ballast back into the right shape after track work.",
    spotting: "A short yellow machine with ploughs at the sides and a rotating brush underneath.",
    // Still approx: Ballast regulator gives no length, height or year for a UK machine.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Wikipedia: Ballast regulator",
        url: "https://en.wikipedia.org/wiki/Ballast_regulator"
      }
    ],
    model: {
      kind: "legacy",
      k: "regulator"
    }
  },
  {
    id: "mpv",
    name: "Multi-purpose vehicle",
    type: "Railhead treatment train",
    group: "eng",
    intro: 1999,
    speed: "60 mph",
    power: "Diesel",
    arrangement: "2 vehicles",
    lengthM: 20,
    heightM: 3.9,
    cars: 2,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "In autumn it blasts crushed leaves off the rails with high-pressure water, then lays a gritty gel to help wheels grip.",
    spotting: "Two yellow vehicles coupled cab-to-cab outwards, with equipment modules on the decks. Busiest in autumn.",
    // Still approx: British Rail MPV confirms 1999 but leaves length, height and speed blank. Windhoff CargoSprinter
    // gives 75 mph only for the 2000-order units with both cars powered.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: British Rail MPV",
        url: "https://en.wikipedia.org/wiki/British_Rail_MPV"
      },
      {
        label: "Wikipedia: Slippery rail",
        url: "https://en.wikipedia.org/wiki/Slippery_rail"
      },
      {
        label: "Wikipedia: Windhoff CargoSprinter",
        url: "https://en.wikipedia.org/wiki/Windhoff_CargoSprinter"
      }
    ],
    model: {
      kind: "mpv"
    }
  },
  {
    id: "nmt",
    name: "Measurement train",
    type: "Track recording train",
    group: "eng",
    intro: 2003,
    speed: "125 mph",
    power: "Diesel-electric",
    arrangement: "Power cars and coaches",
    lengthM: 17.79,
    heightM: 3.88,
    cars: 2,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "A yellow high-speed train that measures the shape of the track at up to 125 mph, so faults are found early.",
    spotting: "A bright yellow high-speed train with two power cars and coaches fitted with measuring equipment.",
    // Still approx: power-car height is in neither the Class 43 nor the New Measurement Train article.
    // Length 17.79 m, 125 mph and 2003 agree.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: New Measurement Train",
        url: "https://en.wikipedia.org/wiki/New_Measurement_Train"
      },
      {
        label: "Wikipedia: British Rail Class 43 (HST)",
        url: "https://en.wikipedia.org/wiki/British_Rail_Class_43_(HST)"
      }
    ],
    model: {
      kind: "nmt"
    }
  },
  {
    id: "crane",
    name: "Rail crane",
    type: "Heavy-lift crane",
    group: "eng",
    intro: 2004,
    speed: "Hauled to site",
    power: "Diesel",
    arrangement: "Self-propelled crane",
    lengthM: 20,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Lifts whole sections of switches and crossings into place during big renewals.",
    spotting: "A big yellow crane on rail wheels with a long jib that swings round over the track.",
    // Still approx: Crane (rail) and Kirow Ardelt give no UK rail crane length, height or year.
    confidence: "approx",
    sources: [
      {
        label: "Practical Railway Engineering (2nd ed., 2005)",
        where: "ch. 3, s. 3.14"
      },
      {
        label: "Wikipedia: Crane (rail)",
        url: "https://en.wikipedia.org/wiki/Crane_(rail)"
      }
    ],
    model: {
      kind: "crane"
    }
  },
  {
    id: "rrv",
    name: "Road-rail excavator",
    type: "Road-rail vehicle",
    group: "eng",
    intro: 1990,
    speed: "Road and rail",
    power: "Diesel",
    arrangement: "Tyres plus rail wheels",
    lengthM: 8,
    heightM: 3.9,
    body: "#F2B705",
    stripe: "#1F2933",
    fact: "Drives on the road to the site, then lowers small rail wheels to work on the track.",
    spotting: "A digger on road tyres with small steel rail wheels that fold down for working on the track.",
    // Still approx: Road-rail vehicle gives no excavator length, height or UK introduction year.
    confidence: "approx",
    sources: [
      {
        label: "Wikipedia: Road–rail vehicle",
        url: "https://en.wikipedia.org/wiki/Road%E2%80%93rail_vehicle"
      }
    ],
    model: {
      kind: "legacy",
      k: "rrv"
    }
  }
];
