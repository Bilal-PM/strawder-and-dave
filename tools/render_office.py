#!/usr/bin/env python3
# Verification render of the office interior — checks the new Boardroom door + Changing Room placement.
import json
from PIL import Image, ImageDraw
TS=16; W,H=30,18
atlas=Image.open('art/atlas.png').convert('RGBA'); man=json.load(open('art/manifest.json'))
def spr(n): x,y,w,h=man[n]; return atlas.crop((x,y,x+w,y+h))

# OMAP (mirror index.html)
g=[['.']*W for _ in range(H)]
for x in range(W): g[0][x]='#'; g[H-1][x]='#'
for y in range(H): g[y][0]='#'; g[y][W-1]='#'
for y in range(1,H-1): g[y][10]='#'; g[y][21]='#'
for x in range(1,10): g[8][x]='#'
for x in range(22,29): g[8][x]='#'
for y in range(1,8):
    for x in range(1,10): g[y][x]='M'
    for x in range(22,29): g[y][x]='O'
for y in range(9,H-1):
    for x in range(1,10): g[y][x]='B'
    for x in range(22,29): g[y][x]='D'
for d in [[3,10],[4,10],[11,10],[12,10],[3,21],[4,21],[11,21],[12,21]]: g[d[0]][d[1]]='+'
for x in range(17,21): g[12][x]='#'
for y in range(13,16): g[y][16]='#'
g[16][16]='+'
for y in range(13,17):
    for x in range(17,21): g[y][x]='B'
g[H-1][15]='X'
GROUND={'.':'floor','+':'floor','X':'floor','M':'carpetM','O':'carpetO','B':'tilefloor','D':'tilefloor','#':'wall'}

OBJ=[
 ('desk',12,2),('desk',16,2),('desk',12,6),('desk',16,6),('desk',13,10),
 ('table',2,3),('chair',2,1),('chair',6,1),('chair',2,6),('chair',6,6),
 ('desk',24,3),('plant',27,5),
 ('sofa',2,10),('watercooler',7,10),('plant',2,14),
 ('bookshelf',24,9),('bookshelf',26,9),('bookshelf',24,13),('bookshelf',26,13),
 ('desk',12,14),('plant',11,14),('plant',19,2),
 ('lockers',18,13),('door',12,1),('door',14,16),
]
img=Image.new('RGBA',(W*TS,H*TS),(20,20,28,255))
for y in range(H):
    for x in range(W): img.alpha_composite(spr(GROUND[g[y][x]]),(x*TS,y*TS))
def basey(o): a=man[o[0]]; return o[2]*TS+a[3]
for name,tx,ty in sorted(OBJ,key=basey): img.alpha_composite(spr(name),(tx*TS,ty*TS))
# zone dots
ZONES=[('to_boardroom',12,1),('locker_room',18,15),('return_town',14,16),('noticeboard',18,1),('reception',12,14)]
d=ImageDraw.Draw(img)
for zid,zx,zy in ZONES:
    d.ellipse((zx*TS+5,zy*TS+5,zx*TS+11,zy*TS+11),fill=(80,220,255,255))
img=img.resize((W*TS*2,H*TS*2),Image.NEAREST)
img.convert('RGB').save('/tmp/office_render.png'); print('wrote /tmp/office_render.png',img.size)
