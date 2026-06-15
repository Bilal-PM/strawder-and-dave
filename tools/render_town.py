#!/usr/bin/env python3
# Verification render of the outdoor TOWN hub map (Phase 4).
# Composites ground tiles + objects from the baked atlas exactly as the game would.
import json
from PIL import Image

TS=16
W,H=34,22
atlas=Image.open('art/atlas.png').convert('RGBA')
man=json.load(open('art/manifest.json'))

def spr(name):
    x,y,w,h=man[name]
    return atlas.crop((x,y,x+w,y+h))

# ground: grass default; rows 13=P,14=L,15=R,16=P
GROUND={'g':'grass','P':'pavement','R':'road','L':'roadline'}
grid=[['g']*W for _ in range(H)]
for x in range(W):
    grid[13][x]='P'; grid[14][x]='L'; grid[15][x]='R'; grid[16][x]='P'

OBJECTS=[
  ('ext_studio',2,9),('ext_office',9,8),('ext_supplier',16,9),
  ('ext_site',29,10),('fence',27,12),('cone',31,15),('cone',31,13),
  ('pond',3,18),
  ('tree',1,1),('tree2',3,0),('tree',5,1),('tree2',7,0),('tree',9,1),
  ('tree2',11,0),('tree',13,1),('tree2',15,0),('tree',17,1),('tree2',19,1),
  ('tree',21,0),('tree2',23,1),('tree',25,0),('tree2',21,5),('tree',24,6),
  ('tree2',8,19),('tree',14,19),('tree2',21,19),
]

img=Image.new('RGBA',(W*TS,H*TS),(40,60,40,255))
# ground
for y in range(H):
    for x in range(W):
        t=GROUND[grid[y][x]]
        img.alpha_composite(spr(t),(x*TS,y*TS))
# objects, y-sorted by base row so taller ones overlap correctly
def basey(o):
    a=man[o[0]]; return o[2]*TS+a[3]
for o in sorted(OBJECTS,key=basey):
    name,tx,ty=o
    img.alpha_composite(spr(name),(tx*TS,ty*TS))

# zone markers (entrances row 12 / welfare row 16) — small cyan dots
ZONES=[('to_studio',3,12),('to_office',10,12),('to_supplier',17,12),('to_site',32,14),('spawn',9,13)]
from PIL import ImageDraw
d=ImageDraw.Draw(img)
for zid,zx,zy in ZONES:
    cx,cy=zx*TS+8,zy*TS+8
    col=(80,220,255,255) if zid!='spawn' else (255,210,80,255)
    d.ellipse((cx-3,cy-3,cx+3,cy+3),fill=col)

img=img.resize((W*TS*2,H*TS*2),Image.NEAREST)
img.convert('RGB').save('/tmp/town_render.png')
print('wrote /tmp/town_render.png',img.size)
