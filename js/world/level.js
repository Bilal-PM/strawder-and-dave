/* LINESIDE — level data: the Kestrel Vale, tile by tile (generated from the level designer's validated map).
 * One char per 16px tile; see LEGEND. Coordinates are [column, row]; feet position in px = (x*16+8, y*16+14).
 * North is up; every building faces south (towards the camera).
 */
window.LS = window.LS || {};
LS.LEVEL = {
 "T": 16,
 "rows": [
  "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.ttttttttttttttttttttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.ttttttttttttttttttttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.ttttttttt&&&&&&&&&ttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.ttttttttt&&.....&&ttttttttf||||ftttt",
  "tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.tttttttt&&.....&&ttttttttf||||ftttt",
  "tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.tttttttt&&&&p&&&&ttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttthhhhhhhhhhhhhhhhhhttttttttttttttttttttt.wwwww.tttttttt&&&&p&&&&ttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttth,,,,,,,,,,,,,,,,httttttttttttttttttttt.wwwww.tttttttt&&&&p&&&&ttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttth,vv,MMMMMMM,,,,,httttttttttttttttttttt.wwwww.tttttttt&&&&p&&&&ttttttttf||||ftttt",
  "ttttttttttttttttttttttttttttttttttttttttttttttth,vv,MMMMMMM,,vv,httttttttttttttttttttt.wwwww.ttttttcccccccccccccttttttf||||ftttt",
  "ttt...t...t...t...t...t...t...t...t...t...t...th,vv,MMMMMMM,,,,,h.t...t...t...t...t....wwwww.......ccccccccccccc......f||||ftttt",
  "tt.t...t...t...t...t...t...t...t...t...t...t...h,vv,MMMMMMM,,,,,h..t...t...t...t...t...wwwww.......ccccccccccccc......f||||ftttt",
  "tt..t...t...t...t...t...t...t...t...t...t...t..h,vv,MMM*MMM,,,,,h...t...t...t...t...t..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt...t...t...t...t...t...t...t...t...t...t...t.h,,,,,,,m,,,,,,,,ht...t...t...t...t.....wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt..t.....t.....t.....t.....t.....t.....t.....thhhhhhhhghhhhhhhhh.....t.....t.....t...wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tthpppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppooooopppppppppppppllltttttttttttf||||ftttt",
  "tthpph.....t............................t............................t................wwwww.tttttttttt..llltttttttttttf||||ftttt",
  "tthpph............................t............................t......................wwwww.ttttttttttttlll..tttttttttf||||ftttt",
  "tthpphfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffqqqqqqqffffffffffffxxxffffffffffff||||ftttt",
  "tthpphf::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::bbbbbbb:::::::::::zxxxz:::::::::ff||||ftttt",
  "tthpphf:$============================================================================bbbbbbb===========zxxxz=========jj||||ftttt",
  "tthpphf:$============================================================================bbbbbbb===========zxxxz=========jj||||ftttt",
  "tthpphfff^^^^^^^^^^^^^^^^^^^^^^^^^:::::::::::::::::::::::::::::::::::://///::::::::::bbbbbbb:::::::::::zxxxz:::::::::ff||||ftttt",
  "tthpphffeeeeeeeeeeeeeeeeeeeeeeeeee!ff::::::::::::::::::::::::::::::::://///:f!!!fffffqqqqqqqffffffffffffxxxffffffffffff||||ftttt",
  "tthpphffeeeeeeeeeeeeeeeeeeeeeeeeeefff::::::::::::::::::::::::::::::::://///:f___ft..t.wwwww.ttttttttttttlll.t.t.t.t.t.f||||ftttt",
  "tthpph..fpppSSSSSSSSSSSSSSfffffffffff:::::NNNNNNNNNNNNNNNNNNN::::::::://///:f___f..t..wwwww.ttttttttttttlll...BBBBB..tf||||ftttt",
  "tthpph..fpppSSSSSSSSSSSSSS,,,,,,,,,hf:::::NNNNNNNNNNNNNNNNNNN::::::::://///:f___f.t..wwwww..ttttttttttttlll...BBBBB...f||||ftttt",
  "tthpph..ffgfSSSSSSSSSSSSSS,vvvvvvvvhf:::::NNNNNNNNNNNNNNNNNNN/////////::::::f___ft..twwwww..ttttttttttttlll...BBBBB...f||||ftttt",
  "tthpph..fpppSSSSSSSSSSSSSS,,,,,,,,,hf:::::NNNNNNNNNNNNNNNNNNN/////////::::::f___f..t.wwwww..ttttttttttttlll...BBBBB...f||||ftttt",
  "tthpph..fpppSSSSSSSSSSSSSS,vvvv,,,,hf:::::NNNNNNNNNNNNNNNNNNN:::::::::::::::f___f.t..wwwww..ttttttttttttlll...BB*BB..tf||||ftttt",
  "tthpph..fpppSSSSSS**SSSSSS,,,,,,,,,hf:::::NNNNNNNNN3NNNNNNNNN:::::::::::::::f___ft..twwwww..ttttttttttttlllpppppmpppp.f||||ftttt",
  "tthpppssssssssssssmmsssssssssssssshhfaaaaaaaaaaaaaamaaaaaaaaaaaaaaaaaaaaaaaaf___f..t.wwwww..ttttttttttttlll...........f||||ftttt",
  "tthpppsssssssssssssssssssssssssssshhfaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaf___f.t..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tth...sssssssssssssssssssssssssssshhfaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaf___ft..twwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tth...hhhhhhhhhhhssssss###########hhffffffffffffff!!!ffffffffffffffffffffffffrrrrrr..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-------------------------------------------------------rrrrrr..wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hhhhhhghhhhhhh.kkkkkkkkkkkkkkkkggggkkkkkkkkkkkkkkkkk...t....t.wwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hvvvvvpvvvvvvh.k_WWWWWWW_________OOOOOOOOOOOOOO_CCCk....t....twwwww..ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hvvvvvpvvvvvvh.k_WWWWWWW_________OOOOOOOOOOOOOO_CCCkt....t.....wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hvvvvvpvvvvvvh.k_WWW*WWW_________OOOOOOOOOOOOOO_CCCk.t....t....wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hpppppppppppph.k____m____________OOOOOO1OOOOOOO____k..t....t...wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hvvvvvpvvvvvvh.k_ccccccccccccc_________m___________k...t....t..wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt....hvccccccccc-rrrr-hvvvvvpvvvvvvh.k_ccccccccccccc_____________________k....t....t.wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt....hhhhhhhhhhh-rrrr-hvvvvvpvvvvvvh.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkt....t.....wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tthhhhhhhhhhhhhhh-rrrr-hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.EEEEEEEEEEEE..-rrrr-,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.EEEEEEEEEEEE..-rrrr-.HHHHHHHHHHHH..AAAAAAAAAhhhhh.PPPPPPPP..VVVVVV..VVVVVV..,,t,,,..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.EEEEEEEEEEEE..-rrrr-.HHHHHHHHHHHH..AAAAAAAAAhv,vh.PPPPPPPP..VVVVVV..VVVVVV..,,,t,,..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.EEEEEEEEEEEE..-rrrr-.HHHHHHHHHHHH..AAAAAAAAAh,,,h.PPPPPPPP..VVVVVV..VVVVVV..t,,,t,..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.EEEEE*EEEEEE..-rrrr-.HHHHHHHHHHHH..AAAAAAAAAh,,,h.PPPPPPPP..VVVVVV..VVVVVV..,t,,,t..wwwww.tttttttttttllltttttttttttf||||ftttt",
  "tt.yyyyymyyyyyy..-rrrr-.HHHHHHHHHHHH..AAAAAAAAAh,,,h.PPPPPPPP..VVVVVV..VVVVVV..,,t,,,.wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "tt.yyyyyyyyyyyy..-rrrr-.HHHHH2HHHHHH..AAAA*AAAAh,,,h.PPP*PPPP..VV*VVV..VV*VVV..,,,t,,.wwwww.ttttttttttttllltttttttttttf||||ftttt",
  "ttvhhhhhgghhhhhvv-rrrr-vvvvvvmvvvvvvvvvvvvmvvvvhhghhvvvvmvvvvvvvvmvvvvvvvmvvvvvvvvvvvqqqqqqqttttttttttttlll..tttttttttf||||ftttt",
  "tt-----------------------------------------------------------------------------------nnnnnnn------------lll...........f||||ftttt",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnnnnnnnrrrrrrrrrrrrrrrrrrrrrrrrrrr%%%%rrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnnnnnnnrrrrrrrrrrrrrrrrrrrrrrrrrrr%%%%rrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnnnnnnnrrrrrrrrrrrrrrrrrrrrrrrrrrr%%%%rrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrnnnnnnnrrrrrrrrrrrrrrrrrrrrrrrrrrr%%%%rrrrr",
  "tt-----------------ll----------------------------------------------------------------qqqqqqq..........................f||||ftttt",
  "tt,,t,,,,,t,,,,,t,,ll.........,,,,,,,,,,,,,,,,,,,###g##################hhhhhhhhhhhhhh.wwwww..pttttttttttttttttttttttttf||||ftttt",
  "tt,t,,,,,t,,,,,t,,,ll.........,t,,,,,,,,,,,,,,t,,#,,p,YYYYYYYYYYYYY,+,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..p.tttttttttttttttttttttttf||||ftttt",
  "ttt,,,,,t,,,,,t,,,,ll.........,,,,,,,,,,,,,t,,,,,#,,p+YYYYYYYYYYYYY,,+#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww.tp.tttttttttttttttttttttttf||||ftttt",
  "tt..hhhhhhhhhhhhhhhllhhhhhhhhh,,,,,,,,,,,,,,,,,,,#+,p,YYYYYYYYYYYYY,,,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..p.tttttttttttttttttttttttf||||ftttt",
  "tt..h...FFFFFFFF...ll..RRRRRRh,,,,,,,,#,,,,,,,,,,#,+p,YYYYYYYYYYYYY+,,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..pttttttttttttttttttttttttf||||ftttt",
  "tt..h...FFFFFFFF...ll..RRRRRRh,,,,,,,,,,,,,,,,,,,#,,p,YYYYYYYYYYYYY,+,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..p.tttttttttttttttttttttttf||||ftttt",
  "tt..h...FFFFFFFF...ll..RRRRRRh,,,,t,,,,,,,,,,,,,,#,,p+YYYYYYYYYYYYY,,+#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww.tp.tttttttttttttttttttttttf||||ftttt",
  "tt..h...FFFFFFFF...ll..RRRRRRh,,,,,,,,,,,,,,,,,,,#+,p,YYYY*YYYYYYYY,,,#h\"\"\"\"\"\"\"\"\"\"\"\"hwwwww...p.tttttttttttttttttttttttf||||ftttt",
  "tt..h...FFFFFFFF...ll..RRRRRRh,t,,,,,,,,,,,,,,t,,#,+ppppppmpp,,+,,,+,,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..pttttttttttttttttttttttttf||||ftttt",
  "tt..h...FFF*FFFF...ll..RR*RRRh,,,,,,,,,,,,,,,,,,,#,,+,,,+,,,p,,,+,,,+,#h\"\"\"\"\"\"\"\"\"\"\"\"h.wwwww..p.tttttttttttttttttttttttf||||ftttt",
  "tt..hyyyyyymyyyyyyyyyyyyymyyyhhhhhhhhhhhghhhhhhhh###########g##########hhhhhhhghhhhhhqqqqqqqtp.tttttttttttttttttttttttf||||ftttt",
  "tt..hyyyyyyyyyyyyyyyyyyyyyyppppppppppppppppppppppppppppppppppppppppppppppppppppppppppnnnnnnnpp.tttttttttttttttttttttttf||||ftttt",
  "tt..hyyyyyyyyyyyyyyyyyyyyyyyyhhhhhhhhhhhhhhhghhhhhhhhhhhhhhhhhhhhhhhhhghhhhhhhhhhhhhhqqqqqqq..ttttttttttttttttttttttttf||||ftttt",
  "tt..hyyyyyyyyyyyyyyyyyyyyyyyyh\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\".wwwww....tttttttttttttttttttttttf||||ftttt",
  "tt..hyyyyyyyyyyyyyyyyyyyyyyyyh\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\".wwwww.t..tttttttttttttttttttttttf||||ftttt",
  "tthhhhhhhhhhhhhghhhhhhhhhhhhhh\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\".wwwww..t.tttttttttttttttttttttttf||||ftttt",
  "tth\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"wwwww....ttttttttttttttttttttttttf||||ftttt",
  "tth\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"wwwww.....tttttttttttttttttttttttf||||ftttt",
  "tth\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"h\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"wwwww..t..tttttttttttttttttttttttf||||ftttt",
  "tthhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhwwwww...t.tttttttttttttttttttttttf||||ftttt",
  "tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.tttttttttttttttttttttttttttf||||ftttt",
  "tttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt.wwwww.tttttttttttttttttttttttttttf||||ftttt"
 ],
 "map": {
  "w": 128,
  "h": 84,
  "tile": 16
 },
 "spawn": {
  "room": "outside",
  "tile": [
   19,
   33
  ],
  "face": "up",
  "why": "Station forecourt, arrived on the 41 bus / taxi drop-off. Helen and Moira are in view; the office is signposted east."
 },
 "outside": [
  {
   "id": "helen",
   "kind": "npc",
   "tile": [
    16,
    23
   ],
   "face": "down",
   "note": "on the platform under the canopy (task 'date': Helen, station platform)"
  },
  {
   "id": "moira",
   "kind": "npc",
   "tile": [
    22,
    32
   ],
   "face": "down",
   "note": "forecourt, by the booking-hall doors"
  },
  {
   "id": "tom",
   "kind": "npc",
   "tile": [
    31,
    23
   ],
   "face": "right",
   "note": "platform end, beside the PPE access gate: the track walk starts here"
  },
  {
   "id": "len",
   "kind": "npc",
   "tile": [
    42,
    56
   ],
   "wander": [
    38,
    56,
    46,
    56
   ],
   "note": "outside the Kestrel Arms"
  },
  {
   "id": "june",
   "kind": "npc",
   "tile": [
    56,
    56
   ],
   "wander": [
    53,
    56,
    60,
    56
   ],
   "note": "outside Pritchard's bakery"
  },
  {
   "id": "dev",
   "kind": "npc",
   "tile": [
    38,
    61
   ],
   "wander": [
    34,
    61,
    42,
    61
   ],
   "note": "at the bus stop (he talks about the bus)"
  },
  {
   "id": "jess",
   "kind": "npc",
   "tile": [
    9,
    56
   ],
   "wander": [
    3,
    56,
    15,
    56
   ],
   "note": "at the school gate"
  },
  {
   "id": "d_sleepers",
   "kind": "defect",
   "order": 1,
   "tile": [
    41,
    21
   ],
   "stand": [
    41,
    22
   ],
   "ppe": true,
   "note": "station throat, 7 tiles past the platform ramp"
  },
  {
   "id": "d_drain",
   "kind": "defect",
   "order": 2,
   "tile": [
    83,
    22
   ],
   "stand": [
    82,
    22
   ],
   "ppe": true,
   "note": "cess drain / catchpit at the west abutment of Beck Bridge"
  },
  {
   "id": "d_bridge",
   "kind": "defect",
   "order": 3,
   "tile": [
    88,
    21
   ],
   "stand": [
    88,
    22
   ],
   "ppe": true,
   "note": "mid-span, over the middle pier"
  },
  {
   "id": "d_veg",
   "kind": "defect",
   "order": 4,
   "tile": [
    97,
    20
   ],
   "stand": [
    97,
    19
   ],
   "ppe": true,
   "note": "buddleia + sycamore + trolley in the wooded cutting"
  },
  {
   "id": "d_crossing",
   "kind": "defect",
   "order": 5,
   "tile": [
    105,
    21
   ],
   "stand": [
    105,
    22
   ],
   "ppe": false,
   "note": "Crag Lane level crossing (public road)"
  },
  {
   "id": "car",
   "kind": "prop",
   "tile": [
    106,
    20
   ],
   "size": [
    1,
    2
   ],
   "blocks": true,
   "note": "the parked car straddling the rails (lane stays passable at x104-105)"
  },
  {
   "id": "trap",
   "kind": "prop",
   "tile": [
    66,
    26
   ],
   "note": "trap points on the depot siding, short of the turnout"
  },
  {
   "id": "postbox",
   "kind": "prop",
   "tile": [
    107,
    17
   ],
   "blocks": true,
   "note": "why the car is parked there"
  },
  {
   "id": "n_ppe",
   "kind": "note",
   "tile": [
    33,
    24
   ],
   "note": "platform end, at the PPE access gate: readable before induction"
  },
  {
   "id": "n_bridge",
   "kind": "note",
   "tile": [
    84,
    16
   ],
   "note": "on the Fell Path by the stepping stones, looking downstream at Beck Bridge's arches"
  },
  {
   "id": "n_junction",
   "kind": "note",
   "tile": [
    115,
    30
   ],
   "note": "foot of the signal box steps"
  },
  {
   "id": "memo",
   "kind": "memo",
   "tile": [
    60,
    11
   ],
   "note": "Beck Cottage garden, under the washing line"
  },
  {
   "id": "cottage",
   "kind": "prop",
   "tile": [
    55,
    12
   ],
   "stand": [
    55,
    13
   ],
   "note": "Beck Cottage door (railway lamp by it)"
  },
  {
   "id": "washing_line",
   "kind": "prop",
   "tile": [
    60,
    10
   ],
   "blocks": false
  },
  {
   "id": "station",
   "kind": "prop",
   "tile": [
    18,
    30
   ],
   "stand": [
    18,
    31
   ],
   "note": "booking-hall doors; the 'temporarily closed 2009' notice is on them"
  },
  {
   "id": "buffer",
   "kind": "prop",
   "tile": [
    8,
    21
   ],
   "stand": [
    9,
    23
   ],
   "note": "the buffer stop with the red rose, seen from the platform end"
  },
  {
   "id": "depot",
   "kind": "prop",
   "tile": [
    46,
    30
   ],
   "stand": [
    46,
    35
   ],
   "note": "look at the depot from the yard road through the palisade (no PPE needed to look)"
  },
  {
   "id": "signalbox",
   "kind": "prop",
   "tile": [
    112,
    29
   ],
   "stand": [
    112,
    30
   ]
  },
  {
   "id": "crag",
   "kind": "prop",
   "tile": [
    105,
    3
   ],
   "note": "Kestrel Crag viewpoint"
  },
  {
   "id": "packhorse",
   "kind": "prop",
   "tile": [
    88,
    73
   ],
   "note": "packhorse bridge"
  },
  {
   "id": "noticeboard",
   "kind": "prop",
   "tile": [
    33,
    55
   ],
   "stand": [
    33,
    56
   ],
   "blocks": true
  },
  {
   "id": "busstop",
   "kind": "prop",
   "tile": [
    37,
    62
   ],
   "size": [
    3,
    1
   ],
   "blocks": true,
   "sign": "41 · Skelby – Harrowby – Kestrelford",
   "note": "shelter on the green edge, flag on the kerb"
  },
  {
   "id": "war_memorial",
   "kind": "prop",
   "tile": [
    38,
    66
   ],
   "stand": [
    38,
    67
   ],
   "blocks": true
  },
  {
   "id": "site_board",
   "kind": "prop",
   "tile": [
    53,
    39
   ],
   "stand": [
    53,
    38
   ],
   "sign": "KESTREL VALE LINE REOPENING · Project compound · All visitors report to the site office"
  }
 ],
 "benches": [
  [
   24,
   23
  ],
  [
   26,
   31
  ],
  [
   35,
   64
  ],
  [
   42,
   68
  ],
  [
   104,
   3
  ],
  [
   65,
   71
  ],
  [
   92,
   69
  ],
  [
   48,
   52
  ],
  [
   50,
   52
  ]
 ],
 "lamps": {
  "_note": "non-blocking (collision 1px base) so they never block a 1-tile pavement",
  "tiles": [
   [
    7,
    31
   ],
   [
    32,
    31
   ],
   [
    13,
    23
   ],
   [
    27,
    23
   ],
   [
    17,
    40
   ],
   [
    22,
    46
   ],
   [
    17,
    52
   ],
   [
    30,
    38
   ],
   [
    45,
    38
   ],
   [
    60,
    38
   ],
   [
    74,
    38
   ],
   [
    58,
    44
   ],
   [
    5,
    56
   ],
   [
    14,
    56
   ],
   [
    23,
    56
   ],
   [
    36,
    56
   ],
   [
    49,
    56
   ],
   [
    62,
    56
   ],
   [
    76,
    56
   ],
   [
    10,
    61
   ],
   [
    27,
    61
   ],
   [
    44,
    61
   ],
   [
    66,
    61
   ],
   [
    84,
    61
   ],
   [
    55,
    13
   ],
   [
    112,
    30
   ]
  ]
 },
 "fingerposts": [
  {
   "tile": [
    23,
    55
   ],
   "arms": [
    "N: Station · Project Office · Depot",
    "E: Kestrelford 4 · Crag Lane",
    "W: Skelby 6",
    "S: Home Farm · Footpath to Packhorse Bridge"
   ]
  },
  {
   "tile": [
    22,
    38
   ],
   "arms": [
    "E: Station Yard · Project Compound · Harrowby Depot",
    "N: Station"
   ]
  },
  {
   "tile": [
    5,
    33
   ],
   "arms": [
    "N: Public footpath · Fell Path · Beck Cottage · Kestrel Crag 1½"
   ]
  },
  {
   "tile": [
    56,
    16
   ],
   "arms": [
    "W: Station ¾",
    "E: Stepping stones · Crag Lane",
    "N: Beck Cottage (private)"
   ]
  },
  {
   "tile": [
    102,
    16
   ],
   "arms": [
    "W: Fell Path · Harrowby Station",
    "N: Kestrel Crag viewpoint",
    "S: Level crossing · Kestrelford Road"
   ]
  },
  {
   "tile": [
    107,
    55
   ],
   "arms": [
    "N: Crag Lane · Kestrel Crag · Kestrel Junction (footpath)",
    "W: Harrowby",
    "E: Kestrelford 3"
   ]
  },
  {
   "tile": [
    94,
    72
   ],
   "arms": [
    "W: Packhorse Bridge · Harrowby church",
    "N: Kestrelford Road"
   ]
  },
  {
   "tile": [
    26,
    73
   ],
   "arms": [
    "E: Public footpath · Packhorse Bridge",
    "N: High Street"
   ]
  }
 ],
 "gates": {
  "ppe": [
   [
    34,
    23
   ],
   [
    77,
    23
   ],
   [
    78,
    23
   ],
   [
    79,
    23
   ],
   [
    50,
    34
   ],
   [
    51,
    34
   ],
   [
    52,
    34
   ]
  ],
  "public": [
   [
    10,
    27
   ],
   [
    55,
    14
   ],
   [
    29,
    39
   ],
   [
    54,
    39
   ],
   [
    55,
    39
   ],
   [
    56,
    39
   ],
   [
    57,
    39
   ],
   [
    8,
    55
   ],
   [
    9,
    55
   ],
   [
    49,
    55
   ],
   [
    52,
    62
   ],
   [
    60,
    72
   ],
   [
    40,
    72
   ],
   [
    29,
    73
   ],
   [
    44,
    74
   ],
   [
    70,
    74
   ],
   [
    78,
    72
   ],
   [
    15,
    77
   ]
  ]
 },
 "doors": [
  {
   "id": "door_office",
   "tile": [
    62,
    43
   ],
   "mat": [
    62,
    44
   ],
   "to": {
    "room": "office",
    "tile": [
     9,
     10
    ],
    "face": "up"
   }
  },
  {
   "id": "door_hall",
   "tile": [
    29,
    54
   ],
   "mat": [
    29,
    55
   ],
   "to": {
    "room": "hall",
    "tile": [
     13,
     12
    ],
    "face": "up"
   }
  },
  {
   "id": "door_shed",
   "tile": [
    51,
    30
   ],
   "mat": [
    51,
    31
   ],
   "needs": "ppe",
   "to": {
    "room": "shed",
    "tile": [
     15,
     12
    ],
    "face": "up"
   }
  }
 ],
 "rooms": {
  "office": {
   "name": "the project office",
   "grid": [
    "####################",
    "#==ww===BBBBBB==ww=#",
    "#kk..............LL#",
    "#kk..............LL#",
    "#........TTTT......#",
    "#dd......TTTT......#",
    "#dd................#",
    "#..............ppp.#",
    "#.ss...............#",
    "#.ss...............#",
    "#........mm........#",
    "#########XX#########"
   ],
   "enter_at": [
    9,
    10
   ],
   "exit_to": {
    "room": "outside",
    "tile": [
     62,
     44
    ],
    "face": "down"
   },
   "entities": [
    {
     "id": "hannah",
     "kind": "npc",
     "tile": [
      16,
      4
     ],
     "face": "down"
    },
    {
     "id": "jo",
     "kind": "npc",
     "tile": [
      11,
      2
     ],
     "face": "down"
    },
    {
     "id": "steve",
     "kind": "npc",
     "tile": [
      3,
      5
     ],
     "face": "right"
    },
    {
     "id": "board",
     "kind": "prop",
     "tile": [
      10,
      1
     ],
     "stand": [
      10,
      2
     ]
    },
    {
     "id": "lockers",
     "kind": "prop",
     "tile": [
      17,
      2
     ],
     "stand": [
      16,
      2
     ]
    },
    {
     "id": "kettle",
     "kind": "prop",
     "tile": [
      1,
      2
     ],
     "stand": [
      3,
      2
     ]
    },
    {
     "id": "exit_office",
     "kind": "exit",
     "tile": [
      9,
      10
     ]
    }
   ]
  },
  "hall": {
   "name": "the village hall",
   "grid": [
    "############################",
    "#==ww=====BBBBBBBBBB====ww=#",
    "#uu......SSSSSSSSSS......nn#",
    "#uu........................#",
    "#........TTTTTTTTTT........#",
    "#..........................#",
    "#..cccccccccc..cccccccccc..#",
    "#..........................#",
    "#..cccccccccc..cccccccccc..#",
    "#..........................#",
    "#..........................#",
    "#pp......................pp#",
    "#............mm............#",
    "############XX##############"
   ],
   "enter_at": [
    13,
    12
   ],
   "exit_to": {
    "room": "outside",
    "tile": [
     29,
     55
    ],
    "face": "down"
   },
   "entities": [
    {
     "id": "priya",
     "kind": "npc",
     "tile": [
      11,
      3
     ],
     "face": "down"
    },
    {
     "id": "brian",
     "kind": "npc",
     "tile": [
      16,
      3
     ],
     "face": "down"
    },
    {
     "id": "sue",
     "kind": "npc",
     "tile": [
      10,
      3
     ],
     "face": "down",
     "panel": true
    },
    {
     "id": "helen_panel",
     "kind": "npc",
     "tile": [
      13,
      3
     ],
     "face": "down",
     "panel": true
    },
    {
     "id": "raj",
     "kind": "npc",
     "tile": [
      17,
      3
     ],
     "face": "down",
     "panel": true
    },
    {
     "id": "urn",
     "kind": "prop",
     "tile": [
      1,
      2
     ],
     "stand": [
      3,
      3
     ]
    },
    {
     "id": "table",
     "kind": "prop",
     "tile": [
      13,
      4
     ],
     "stand": [
      13,
      5
     ],
     "hidden_until": "panel"
    },
    {
     "id": "hall_noticeboard",
     "kind": "prop",
     "tile": [
      25,
      2
     ],
     "stand": [
      24,
      3
     ]
    },
    {
     "id": "exit_hall",
     "kind": "exit",
     "tile": [
      13,
      12
     ]
    }
   ],
   "audience_seats": [
    [
     4,
     6
    ],
    [
     6,
     6
    ],
    [
     17,
     6
    ],
    [
     19,
     6
    ],
    [
     9,
     8
    ],
    [
     21,
     8
    ]
   ]
  },
  "shed": {
   "name": "the depot",
   "grid": [
    "################################",
    "#==ww=====ww=====ww=====ww=====#",
    "#..............................#",
    "#..............................G",
    "#...MMMMMMMMMMMMMMMMMMMMMMMM...G",
    "#===MMMMMMMMMMMMMMMMMMMMMMMM===G",
    "#===MMMMMMMMMMMMMMMMMMMMMMMM===G",
    "#..............................G",
    "#..............................#",
    "#bb.......................WWW..#",
    "#bb.......................WWW..#",
    "#..............................#",
    "#..............mm..............#",
    "###############XX###############"
   ],
   "enter_at": [
    15,
    12
   ],
   "exit_to": {
    "room": "outside",
    "tile": [
     51,
     31
    ],
    "face": "down"
   },
   "entities": [
    {
     "id": "gaz",
     "kind": "npc",
     "tile": [
      25,
      8
     ],
     "face": "left"
    },
    {
     "id": "h_cab",
     "kind": "hotspot",
     "tile": [
      5,
      6
     ],
     "stand": [
      5,
      7
     ]
    },
    {
     "id": "h_bogies",
     "kind": "hotspot",
     "tile": [
      9,
      6
     ],
     "stand": [
      9,
      7
     ]
    },
    {
     "id": "h_brakes",
     "kind": "hotspot",
     "tile": [
      13,
      6
     ],
     "stand": [
      13,
      7
     ]
    },
    {
     "id": "h_engine",
     "kind": "hotspot",
     "tile": [
      18,
      6
     ],
     "stand": [
      18,
      7
     ]
    },
    {
     "id": "h_body",
     "kind": "hotspot",
     "tile": [
      24,
      6
     ],
     "stand": [
      24,
      7
     ]
    },
    {
     "id": "workbench",
     "kind": "prop",
     "tile": [
      27,
      9
     ],
     "stand": [
      27,
      11
     ]
    },
    {
     "id": "cushions",
     "kind": "prop",
     "tile": [
      1,
      9
     ],
     "stand": [
      3,
      9
     ]
    },
    {
     "id": "exit_shed",
     "kind": "exit",
     "tile": [
      15,
      12
     ]
    }
   ],
   "cat_spots": [
    [
     2,
     11
    ],
    [
     15,
     2
    ],
    [
     29,
     8
    ]
   ]
  }
 }
};
