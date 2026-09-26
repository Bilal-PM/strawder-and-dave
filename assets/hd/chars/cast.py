"""Who is who: pack looks -> HD sprite specs.

The looks come straight from the game pack (js/packs/kestrel-vale.js + kestrel-vale-world.js), read with node so the
sprites stay keyed to exactly what the engine passes to drawActor(look). Each hex colour is mapped to the nearest
suitable pix ramp; then a small per-character wardrobe (DRESS) adds what the pack's role text implies (Moira's hooded
coat and satchel, Gaz's overalls, Brian's tie and biscuit-monitor build) without changing the look itself.
"""
import json, os, subprocess
import fig  # registers the extra ramps
from pix import RAMPS, hexrgb

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'looks.json')

NODE = r"""
global.window = global; require('./js/packs/kestrel-vale.js'); global.LS = window.LS;
require('./js/packs/kestrel-vale-world.js');
const P = LS.PACKS['kestrel-vale'];
const cast = {}; for (const [k, v] of Object.entries(P.cast)) if (v.look) cast[k] = { name: v.name, role: v.role, look: v.look };
console.log(JSON.stringify({ cast, avatars: P.avatars }));
"""


def load_looks():
    """Read the looks from the pack with node; fall back to the cached copy if node is missing."""
    try:
        out = subprocess.run(['node', '-e', NODE], cwd=ROOT, capture_output=True, text=True, check=True, timeout=60).stdout
        data = json.loads(out)
        with open(CACHE, 'w') as fh: json.dump(data, fh, indent=1, sort_keys=True)
        return data
    except Exception:
        return json.load(open(CACHE))


SKINS = ['skin_fair', 'skin_light', 'skin_mid', 'skin_brown', 'skin_deep']
HAIRS = ['hair_grey', 'hair_silver', 'hair_blonde', 'hair_ginger', 'hair_brown', 'hair_dark']
CLOTH = ['olive', 'forest', 'navy', 'denim', 'teal', 'plum', 'wine', 'mustard', 'charcoal', 'tweed', 'cream', 'white',
         'hivis', 'leather', 'rust', 'paint_red', 'paint_blue']


def _d(a, b):
    a, b = hexrgb(a), hexrgb(b)
    # weighted RGB distance ("redmean"), good enough for picking ramps
    rm = (a[0] + b[0]) / 2
    return ((2 + rm / 256) * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + (2 + (255 - rm) / 256) * (a[2] - b[2]) ** 2) ** .5


def nearest(hexc, names, steps=(1, 2, 3)):
    return min(names, key=lambda n: min(_d(hexc, RAMPS[n][i]) for i in steps if i < len(RAMPS[n])))


def auto_spec(look):
    s = {
        'skin': nearest(look['skin'], SKINS, (0, 1, 2)),
        'hair': nearest(look.get('hair', '#555555'), HAIRS, (1, 2, 3)),
        'hairStyle': look.get('hairStyle', 'short'),
        'top': nearest(look.get('top', '#555555'), CLOTH, (2, 3)),
        'topStyle': {'jacket': 'jacket', 'suit': 'suit', 'hivis': 'hivis', 'cardigan': 'cardigan', 'tee': 'tee'}.get(look.get('topStyle'), 'jacket'),
        'legs': nearest(look['legs'], ['charcoal', 'navy', 'denim', 'tweed', 'olive'], (2, 3, 4)) if look.get('legs') else 'denim',
        'feet': 'shoes', 'feet_ramp': 'boot',
    }
    if s['topStyle'] == 'hivis': s['top'] = 'hivis'
    if look.get('glasses'): s['glasses'] = True
    if look.get('beard'): s['beard'] = True
    if look.get('hat'): s['hat'] = 'hat_white'
    if look.get('cap'): s['cap'] = nearest(look['cap'], CLOTH, (2, 3))
    if look.get('apron'): s['apron'] = True
    return s


# Wardrobe per character: what the role implies. Keys override the auto mapping.
DRESS = {
    # Harrowby's last station master, the mentor: exactly the reference character.
    'moira': dict(top='olive', topStyle='coat', hood=True, inner='cream', scarf='wine', legwear='skirt', skirt='charcoal',
                  legs='charcoal', feet='boots', feet_ramp='leather', satchel=True, bag_ramp='leather', age='old',
                  brow='hair_grey', brow_i=3, hem=76, hair='hair_grey', skin='skin_light', top_bias=-0.08),
    'helen': dict(topStyle='suit', inner='white', legs='navy', feet='shoes', feet_ramp='paint_black', earrings=True,
                  lipstick=True, pocket_square='white', sh=11, button='navy', top='navy', top_bias=-0.16),
    'jo': dict(topStyle='jacket', inner='cream', legs='denim', feet='boots', feet_ramp='boot', earrings=True, rim='gold',
               sh=11, eye='eye'),
    'tom': dict(sleeve='navy', legs='charcoal', feet='boots', feet_ramp='boot', sh=13, brow_i=3, beard_ramp='hair_brown'),
    'hannah': dict(sleeve='navy', legs='charcoal', feet='boots', feet_ramp='boot', freckles=True, scrunchie='navy', sh=11,
                   hair='hair_ginger'),
    'steve': dict(topStyle='suit', inner='white', tie='wine', legs='navy', feet='shoes', feet_ramp='paint_black', belly=1,
                  sh=13, hair='hair_silver', brow='hair_silver', button='navy', top='navy', top_bias=-0.2),
    'priya': dict(topStyle='cardigan', inner='cream', legs='charcoal', legwear='skirt', skirt='plum', tights='charcoal',
                  feet='boots', feet_ramp='boot', earrings=True, sh=11),
    'gaz': dict(topStyle='overalls', top='charcoal', legs='navy', feet='boots', feet_ramp='boot', belly=1, sh=13,
                gloves=None, hair='hair_brown', beard_ramp='hair_brown', cap='navy', bushy_brows=True),
    'brian': dict(topStyle='jacket', top='tweed', inner='cream', tie='wine', legs='charcoal', feet='shoes', feet_ramp='leather',
                  belly=2, sh=13, age='old', button='leather', hair='hair_grey'),
    'sue': dict(topStyle='suit', top='plum', inner='cream', legwear='skirt', skirt='plum', tights='charcoal', legs='charcoal',
                feet='shoes', feet_ramp='paint_black', earrings=True, sh=11),
    'raj': dict(topStyle='jacket', top='forest', inner='white', legs='charcoal', feet='shoes', feet_ramp='leather', sh=12),
    'len': dict(topStyle='jacket', top='tweed', inner='cream', flatcap='tweed', cap=None, legs='charcoal', feet='shoes', feet_ramp='leather',
                age='old', sh=12, button='leather', hair='hair_grey'),
    'june': dict(topStyle='tee', top='wine', apron=True, legs='charcoal', feet='shoes', feet_ramp='paint_black', sh=12,
                 hair='hair_brown', hairpin=True),
    'dev': dict(topStyle='tee', top='denim', legs='charcoal', feet='trainers', accent='paint_red', sh=11),
    'jess': dict(topStyle='cardigan', top='plum', inner='white', legs='denim', feet='boots', feet_ramp='leather',
                 hair='hair_blonde', scrunchie='plum', sh=11),
}
AVATAR_DRESS = [
    dict(topStyle='jacket', top='navy', top_bias=-0.12, inner='white', legs='denim', feet='boots', feet_ramp='leather', hair='hair_brown'),
    dict(topStyle='cardigan', top='plum', inner='cream', legs='charcoal', feet='boots', feet_ramp='boot', earrings=True, sh=11),
    dict(topStyle='jacket', top='forest', inner='cream', legs='denim', feet='boots', feet_ramp='leather', hair='hair_blonde', sh=11),
    dict(topStyle='tee', top='rust', legs='denim', feet='trainers', accent='white', sh=12),
]

# Six generic townsfolk (no pack look): varied age, skin, build.
TOWNSFOLK = {
    'town_pensioner': dict(skin='skin_fair', hair='hair_silver', hairStyle='short', flatcap='tweed', topStyle='jacket',
                           top='charcoal', inner='cream', tie='forest', legs='tweed', feet='shoes', feet_ramp='leather',
                           age='old', glasses=True, stick=True, sh=11, button='charcoal', brow='hair_silver'),
    'town_shopper': dict(skin='skin_deep', hair='hair_dark', hairStyle='bob', topStyle='coat', top='wine', hem=72,
                         inner='cream', legs='denim', feet='boots', feet_ramp='boot', carry='tote', tote='cream', earrings=True,
                         sh=11, flare=2.2),
    'town_teen': dict(skin='skin_mid', hair='hair_brown', hairStyle='curly', topStyle='hoodie', top='mustard', legs='denim',
                      feet='trainers', accent='navy', sh=11),
    'town_farmer': dict(skin='skin_light', hair='hair_ginger', hairStyle='short', beard=True, topStyle='wax', top='wax',
                        legs='charcoal', feet='wellies', welly='welly', sh=13, belly=1, bushy_brows=True, flatcap='tweed'),
    'town_postie': dict(skin='skin_deep', hair='hair_dark', hairStyle='short', topStyle='polo', top='paint_blue', legwear='shorts',
                        legs='navy', socks='white', feet='shoes', feet_ramp='paint_black', satchel=True, bag_ramp='charcoal',
                        bag_big=True, sh=12),
    'town_walker': dict(skin='skin_fair', hair='hair_blonde', hairStyle='bob', topStyle='anorak', top='teal', legs='charcoal',
                        feet='wellies', welly='welly', leash=True, sh=11),
}


# Profile silhouettes (people.Person.NOSES / CHINS) and stride, by age and build: nobody shares a face.
PROF = {
    'moira': dict(prof=dict(nose='soft', chin='receding'), stride=0.72),
    'helen': dict(prof=dict(nose='straight', chin='normal')),
    'jo': dict(prof=dict(nose='button', chin='round')),
    'tom': dict(prof=dict(nose='straight', chin='strong', brow=True)),
    'hannah': dict(prof=dict(nose='button', chin='round')),
    'steve': dict(prof=dict(nose='big', chin='strong', brow=True), stride=0.9),
    'priya': dict(prof=dict(nose='pointed', chin='normal')),
    'gaz': dict(prof=dict(nose='round', chin='strong', brow=True)),
    'brian': dict(prof=dict(nose='round', chin='double'), stride=0.8),
    'sue': dict(prof=dict(nose='straight', chin='receding')),
    'raj': dict(prof=dict(nose='big', chin='normal', brow=True)),
    'len': dict(prof=dict(nose='big', chin='receding', brow=True), stride=0.78),
    'june': dict(prof=dict(nose='button', chin='round')),
    'dev': dict(prof=dict(nose='button', chin='round')),
    'jess': dict(prof=dict(nose='pointed', chin='round')),
    'avatar0': dict(prof=dict(nose='straight', chin='normal')),
    'avatar1': dict(prof=dict(nose='button', chin='round')),
    'avatar2': dict(prof=dict(nose='pointed', chin='normal')),
    'avatar3': dict(prof=dict(nose='soft', chin='round')),
    'town_pensioner': dict(prof=dict(nose='big', chin='receding', brow=True), stride=0.7),
    'town_shopper': dict(prof=dict(nose='soft', chin='normal')),
    'town_teen': dict(prof=dict(nose='button', chin='round'), stride=1.05),
    'town_farmer': dict(prof=dict(nose='round', chin='strong', brow=True)),
    'town_postie': dict(prof=dict(nose='straight', chin='strong'), stride=1.05),
    'town_walker': dict(prof=dict(nose='pointed', chin='receding')),
}


def all_specs():
    out = []
    for cid, sp, lk in _all_specs():
        sp = dict(sp); sp.update(PROF.get(cid, {})); out.append((cid, sp, lk))
    return out


def _all_specs():
    """[(id, spec, look or None)] for every cast member, avatar and townsperson, in a stable order."""
    data = load_looks()
    out = []
    for cid, c in data['cast'].items():
        sp = auto_spec(c['look']); sp.update(DRESS.get(cid, {}))
        out.append((cid, {k: v for k, v in sp.items() if v is not None}, c['look']))
    for i, lk in enumerate(data['avatars']):
        sp = auto_spec(lk); sp.update(AVATAR_DRESS[i] if i < len(AVATAR_DRESS) else {})
        out.append(('avatar%d' % i, sp, lk))
    for tid, sp in TOWNSFOLK.items():
        out.append((tid, dict(sp), None))
    return out


def ppe(spec):
    """The same person after the site induction: hi-vis vest, white hard hat, safety boots."""
    s = dict(spec)
    if s['topStyle'] != 'hivis': s['vest'] = True
    s['hat'] = 'hat_white'
    s.pop('cap', None); s.pop('flatcap', None)
    s['feet'] = 'boots'; s['feet_ramp'] = 'safety'
    s.pop('stick', None); s.pop('leash', None)
    if s.get('carry') == 'tote': s.pop('carry')
    return s
