#!/usr/bin/env python3
# Verification render of the office interior (34x20, roomier spread-out layout).
import json
from PIL import Image, ImageDraw
TS=16; W,H=34,20
atlas=Image.open('art/atlas.png').convert('RGBA'); man=json.load(open('art/manifest.json'))
def spr(n): x,y,w,h=man[n]; return atlas.crop((x,y,x+w,y+h))

# OMAP (mirror index.html)
g=[['.']*W for _ in range(H)]
for x in range(W): g[0][x]='#'; g[H-1][x]='#'
for y in range(H): g[y][0]='#'; g[y][W-1]='#'
for y in range(1,H-1): g[y][10]='#'; g[y][25]='#'
for x in range(1,10): g[8][x]='#'
for x in range(26,33): g[8][x]='#'
for y in range(1,8):
    for x in range(1,10): g[y][x]='M'
    for x in range(26,33): g[y][x]='O'
for y in range(9,H-1):
    for x in range(1,10): g[y][x]='B'
    for x in range(26,33): g[y][x]='D'
for d in [[3,10],[4,10],[12,10],[13,10],[3,25],[4,25],[12,25],[13,25]]: g[d[0]][d[1]]='+'
for x in range(21,25): g[14][x]='#'
for y in range(15,18): g[y][20]='#'
g[18][20]='+'
for y in range(15,19):
    for x in range(21,25): g[y][x]='B'
g[H-1][16]='X'
GROUND={'.':'floor','+':'floor','X':'floor','M':'carpetM','O':'carpetO','B':'tilefloor','D':'tilefloor','#':'wall'}

OBJ=[('desk',13,3),('desk',18,3),('desk',13,7),('desk',18,7),('desk',16,11),
 ('table',2,3),('chair',2,1),('chair',6,1),('chair',2,6),('chair',6,6),
 ('desk',28,3),('plant',31,5),('sofa',2,11),('watercooler',7,11),('plant',2,16),
 ('bookshelf',27,10),('bookshelf',30,10),('bookshelf',27,15),('bookshelf',30,15),
 ('desk',13,16),('plant',12,16),('plant',20,2),('lockers',22,15),('door',13,1),('door',16,18)]
img=Image.new('RGBA',(W*TS,H*TS),(20,20,28,255))
for y in range(H):
    for x in range(W): img.alpha_composite(spr(GROUND[g[y][x]]),(x*TS,y*TS))
def basey(o): a=man[o[0]];return o[2]*TS+a[3]
for name,tx,ty in sorted(OBJ,key=basey): img.alpha_composite(spr(name),(tx*TS,ty*TS))
d=ImageDraw.Draw(img)
for nx,ny in [(13,5),(18,5),(13,9),(18,9),(16,13)]: d.rectangle((nx*TS+5,ny*TS+2,nx*TS+11,ny*TS+14),fill=(230,90,120,255))
for zx,zy in [(13,1),(22,17),(16,18),(20,1),(27,3),(3,3),(3,12),(27,12),(13,15)]:
    d.ellipse((zx*TS+5,zy*TS+5,zx*TS+11,zy*TS+11),fill=(80,220,255,255))
d.ellipse((16*TS+4,17*TS+4,16*TS+12,17*TS+12),fill=(255,210,80,255))
img=img.resize((W*TS*2,H*TS*2),Image.NEAREST)
img.convert('RGB').save('/tmp/office_render.png'); print('wrote /tmp/office_render.png',img.size)
