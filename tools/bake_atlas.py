import sys; sys.path.insert(0,'/tmp')
import importlib, charart, zlib, struct, random
importlib.reload(charart)
from charart import Spr,add_outline,h2,lighten,darken,hueshift_dark
OUT=(44,31,24)
def shade(s):
    o=Spr(s.w,s.h)
    for y in range(s.h):
        for x in range(s.w):
            c=s.p[y][x]
            if c is None: continue
            up=s.p[y-1][x] if y>0 else None; dn=s.p[y+1][x] if y+1<s.h else None
            lf=s.p[y][x-1] if x>0 else None; rt=s.p[y][x+1] if x+1<s.w else None
            if dn is None:o.p[y][x]=hueshift_dark(c,26)
            elif up is None:o.p[y][x]=lighten(c,16)
            elif lf is None or rt is None:o.p[y][x]=darken(c,10)
            else:o.p[y][x]=c
    return o
def finish(s): return add_outline(shade(s),OUT)

# ---------------- OBJECTS ----------------
def desk():
    s=Spr(32,22);wood=h2('#b07c44')
    s.rect(0,8,32,12,wood);s.rect(0,8,32,3,h2('#c9974f'))
    s.rect(11,1,10,7,h2('#454b54'));s.rect(12,2,8,5,h2('#2b3340'));s.rect(13,3,3,3,h2('#7fd0e0'))
    s.rect(15,8,2,2,h2('#454b54'))
    s.rect(9,15,12,3,h2('#d9cdb6'));s.rect(23,16,2,2,h2('#d9cdb6'))
    s.rect(26,11,3,3,h2('#e0e6ee'));s.rect(3,11,5,5,h2('#f4ecd8'));s.rect(3,11,5,1,h2('#c9bca0'))
    return finish(s)
def chair():
    s=Spr(14,16);seat=h2('#7a5cae')
    s.rect(2,1,10,4,h2('#6a4c9a'));s.rect(1,5,12,8,seat);s.rect(1,5,12,2,lighten(seat,18))
    s.rect(3,13,2,3,h2('#4a4a55'));s.rect(9,13,2,3,h2('#4a4a55'))
    return finish(s)
def plant():
    s=Spr(16,20);pot=h2('#bd6a3c')
    s.rect(4,13,8,7,pot);s.rect(4,13,8,2,lighten(pot,20))
    s.rect(5,4,6,10,h2('#4f9a4c'));s.rect(3,7,4,6,h2('#6cb85f'));s.rect(9,6,4,7,h2('#6cb85f'))
    s.rect(6,2,4,5,h2('#6cb85f'));s.rect(5,10,6,3,h2('#327a3a'))
    return finish(s)
def sofa():
    s=Spr(40,20);body=h2('#c4694e');cush=h2('#d77f63')
    s.rect(0,2,40,16,body);s.rect(2,6,36,10,cush);s.rect(2,6,36,2,lighten(cush,16))
    for cx in (2,15,28):s.rect(cx,6,1,10,darken(body,18))
    s.rect(0,2,4,16,darken(body,12));s.rect(36,2,4,16,darken(body,12))
    return finish(s)
def bookshelf():
    s=Spr(20,28);fr=h2('#7e5630')
    s.rect(0,0,20,28,fr);s.rect(2,1,16,2,lighten(fr,18))
    books=['#c0503e','#4f86d6','#5bb56a','#e8c24a','#a877d8','#d77f4a']
    for r in range(3):
        x=3
        while x<17:
            w=2+(x%3);col=h2(books[(x+r)%6]);s.rect(x,4+r*8,w,6,col);s.rect(x,4+r*8,w,1,lighten(col,30));x+=w+1
    return finish(s)
def table():
    s=Spr(48,24);wood=h2('#b07c44')
    s.rect(0,4,48,16,wood);s.rect(0,4,48,3,h2('#c9974f'))
    s.rect(4,18,3,4,darken(wood,20));s.rect(41,18,3,4,darken(wood,20))
    s.rect(8,8,8,7,h2('#f4ecd8'));s.rect(22,7,10,7,h2('#3a4250'));s.rect(23,8,8,5,h2('#7fd0e0'));s.rect(36,9,5,4,h2('#e0e6ee'))
    return finish(s)
def watercooler():
    s=Spr(12,22);body=h2('#dfe6ee')
    s.rect(2,8,8,14,body);s.rect(3,2,6,7,h2('#7fc8e6'));s.rect(3,2,6,2,h2('#aee0f2'));s.rect(2,8,8,2,h2('#b8c2cc'))
    return finish(s)
def door():
    s=Spr(20,8);fr=h2('#8a5a2e')
    s.rect(0,0,20,8,fr);s.rect(2,1,16,6,h2('#3a2a1e'));s.rect(2,1,16,1,lighten(fr,20))
    return finish(s)
def cabin():
    s=Spr(52,40);body=h2('#d8d5c4');roof=h2('#5b6470')
    s.rect(0,4,52,34,body)
    for x in range(0,52,3):s.rect(x,4,1,34,darken(body,8))
    s.rect(0,0,52,6,roof);s.rect(0,0,52,2,lighten(roof,20))
    s.rect(22,22,8,16,h2('#7a5230'));s.rect(23,23,6,15,h2('#9a6f3f'));s.rect(27,30,1,2,h2('#2a2018'))
    for wx in (5,38):
        s.rect(wx,12,9,8,h2('#7fb4d0'));s.rect(wx,12,9,2,h2('#a8d8e8'));s.rect(wx+4,12,1,8,h2('#3a4654'))
    s.rect(20,38,12,2,h2('#9a9488'))
    return finish(s)
def excavator():
    s=Spr(46,40);yel=h2('#f0c020');dk=h2('#2e3138')
    s.rect(2,30,30,9,dk);s.rect(2,30,30,2,lighten(dk,16))
    for x in range(4,32,4):s.rect(x,33,2,4,h2('#15171b'))
    s.rect(8,14,22,17,yel);s.rect(8,14,22,2,lighten(yel,25))
    s.rect(11,17,9,8,h2('#8fc4dc'))
    s.rect(28,10,4,16,yel);s.rect(30,6,14,4,yel);s.rect(40,8,4,10,yel)
    s.rect(38,18,9,7,h2('#b0b4bc'));s.rect(38,23,9,2,h2('#7a7e86'))
    return finish(s)
def fence():
    s=Spr(16,26);fr=h2('#9aa0a8')
    s.rect(1,0,2,22,fr);s.rect(13,0,2,22,fr);s.rect(1,0,14,2,fr);s.rect(1,20,14,2,fr)
    for i in range(3,14,3):
        for j in range(2,20):
            if (i+j)%3==0:s.set(i,j,lighten(fr,10))
    s.rect(0,22,5,4,h2('#c2bca8'));s.rect(11,22,5,4,h2('#c2bca8'))
    return finish(s)
def cone():
    s=Spr(10,14);o=h2('#f06a20')
    s.rect(3,1,4,3,o);s.rect(2,4,6,4,o);s.rect(1,8,8,3,o);s.rect(2,7,6,2,h2('#f4f0e8'));s.rect(0,11,10,3,o)
    return finish(s)
def railstack():
    s=Spr(44,12);st=h2('#b0b4bc')
    for j in range(0,10,3):s.rect(2,j,40,2,st);s.rect(2,j,40,1,lighten(st,20))
    return finish(s)
def sleeperstack():
    s=Spr(26,18);w=h2('#7a5230')
    for j in range(0,16,4):s.rect(1,j,24,3,w);s.rect(1,j,24,1,lighten(w,18))
    return finish(s)
def ballastpile():
    random.seed(3);s=Spr(28,14);g=h2('#9a948a')
    for j in range(14):
        wdt=int(28*(j/14));s.rect(14-wdt//2,14-j,wdt,1,g if j%2 else lighten(g,8))
    return finish(s)

OBJ={'desk':desk,'chair':chair,'plant':plant,'sofa':sofa,'bookshelf':bookshelf,'table':table,
     'watercooler':watercooler,'door':door,'cabin':cabin,'excavator':excavator,'fence':fence,
     'cone':cone,'railstack':railstack,'sleeperstack':sleeperstack,'ballastpile':ballastpile}

# ---------------- TILES (16x16) ----------------
def tile_floor():
    s=Spr(16,16);base=h2('#c79a5e')
    for y in range(16):
        for x in range(16):
            c=base
            if x in(0,6,11):c=h2('#a87f47')
            elif x in(3,9,14):c=h2('#bd8f52')
            if y==0:c=darken(c,8)
            s.set(x,y,c)
    return s
def tile_wall():
    s=Spr(16,16);cream=h2('#efe3c8')
    for y in range(16):
        for x in range(16):
            c=cream
            if x==0:c=h2('#e2d3b2')
            if y<2:c=darken(cream,10)
            s.set(x,y,c)
    return s
def tile_wallbase():
    s=Spr(16,16);cream=h2('#efe3c8');wood=h2('#9a6f3f')
    for y in range(16):
        for x in range(16):
            if y>=10: c= lighten(wood,16) if y==10 else (darken(wood,14) if y>=14 else wood)
            else: c= cream if x else h2('#e2d3b2')
            s.set(x,y,c)
    return s
def tile_grass():
    random.seed(11);s=Spr(16,16);base=h2('#6fae4e')
    for y in range(16):
        for x in range(16):
            c=base;r=(x*7+y*13)%17
            if r==0:c=h2('#62a043')
            elif r==1:c=h2('#7eba5a')
            s.set(x,y,c)
    for k in range(2):
        s.set(random.randint(0,15),random.randint(0,15),h2('#f4d03a'))
    return s
def tile_gravel():
    s=Spr(16,16);g=h2('#b3a68c')
    for y in range(16):
        for x in range(16):
            c=g;r=(x*3+y*7)%11
            if r==0:c=darken(g,12)
            elif r==1:c=lighten(g,12)
            s.set(x,y,c)
    return s
def tile_track():
    s=Spr(16,16);ball=h2('#8f897e')
    for y in range(16):
        for x in range(16):
            c=ball;r=(x*3+y*5)%7
            if r==0:c=darken(ball,12)
            elif r==1:c=lighten(ball,10)
            s.set(x,y,c)
    w=h2('#5e4126')
    for x in range(0,16,8):
        for xx in range(x,min(x+5,16)):
            for y in range(1,15):s.set(xx,y, w if y>2 else lighten(w,16))
    steel=h2('#c2c6ce')
    for ry in (4,11):
        for x in range(16):
            s.set(x,ry,lighten(steel,22));s.set(x,ry+1,steel);s.set(x,ry+2,darken(steel,26))
    return s
def tile_platform():
    s=Spr(16,16);con=h2('#c4bca8')
    for y in range(16):
        for x in range(16):
            c=con
            if x==0:c=darken(con,10)
            s.set(x,y,c)
    return s
def tile_platedge():  # platform front edge (tactile)
    s=tile_platform()
    for x in range(16):
        s.set(x,15,h2('#2a2620'));s.set(x,14,h2('#e8c838'));s.set(x,13,h2('#f0f0e8'))
    return s
def tile_carpetM():
    s=Spr(16,16);base=h2('#4f6f96')
    for y in range(16):
        for x in range(16):
            s.set(x,y, base if (x//2+y//2)%2 else lighten(base,6))
    return s
def tile_carpetO():
    s=Spr(16,16);base=h2('#6a7a6a')
    for y in range(16):
        for x in range(16):
            s.set(x,y, base if (x//2+y//2)%2 else lighten(base,7))
    return s
def tile_tilefloor():
    s=Spr(16,16);base=h2('#d8d2c2')
    for y in range(16):
        for x in range(16):
            if x%8==0 or y%8==0: s.set(x,y,darken(base,14))
            else: s.set(x,y, base if (x//8+y//8)%2 else lighten(base,8))
    return s
TILE={'floor':tile_floor,'wall':tile_wall,'wallbase':tile_wallbase,'grass':tile_grass,
      'gravel':tile_gravel,'track':tile_track,'platform':tile_platform,'platedge':tile_platedge,'carpetM':tile_carpetM,'carpetO':tile_carpetO,'tilefloor':tile_tilefloor}

# ---------------- PACK ATLAS ----------------
items=[]
for n,f in TILE.items(): items.append((n,f()))
for n,f in OBJ.items(): items.append((n,f()))
# simple shelf packer
AW=256; x=0;y=0;rowh=0;placed=[]
for n,spr in items:
    if x+spr.w>AW: x=0;y+=rowh+1;rowh=0
    placed.append((n,spr,x,y)); x+=spr.w+1; rowh=max(rowh,spr.h)
AH=y+rowh+1
# render atlas RGBA
buf=[[(0,0,0,0)]*AW for _ in range(AH)]
man={}
for n,spr,px,py in placed:
    man[n]=[px,py,spr.w,spr.h]
    for j in range(spr.h):
        for i in range(spr.w):
            c=spr.p[j][i]
            if c is not None: buf[py+j][px+i]=(c[0],c[1],c[2],255)
# save PNG RGBA
rows=bytearray()
for Y in range(AH):
    rows.append(0)
    for X in range(AW):
        r,g,b,a=buf[Y][X];rows+=bytes((r,g,b,a))
comp=zlib.compress(bytes(rows),9)
def chk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
open('art/atlas.png','wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',AW,AH,8,6,0,0,0))+chk(b'IDAT',comp)+chk(b'IEND',b''))
import json
open('art/manifest.json','w').write(json.dumps(man))
print('atlas',AW,'x',AH,'items',len(items))
print('manifest:',json.dumps(man))
