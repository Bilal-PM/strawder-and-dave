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
    s=Spr(48,44);yel=h2('#f0b81e');dk=h2('#2b2e33');steel=h2('#9aa0a8')
    # tracks
    s.rect(2,34,34,9,dk);s.rect(2,34,34,2,lighten(dk,14))
    s.rect(3,41,32,2,h2('#16181c'))
    for x in range(5,34,4):s.rect(x,36,2,5,h2('#15171b'))
    s.rect(4,35,3,7,lighten(dk,10));s.rect(31,35,3,7,lighten(dk,10))
    # slew base
    s.rect(8,30,24,4,h2('#3a3e44'))
    # rear counterweight + cab body
    s.rect(6,16,12,15,yel);s.rect(6,16,12,2,lighten(yel,22));s.rect(6,28,12,3,darken(yel,18))
    s.rect(17,12,15,19,yel);s.rect(17,12,15,2,lighten(yel,22))
    s.rect(19,15,11,9,h2('#8fc4dc'));s.rect(19,15,11,2,h2('#b6dcec'));s.rect(19,15,2,9,h2('#6fa8c4'))
    s.rect(17,24,15,1,darken(yel,18))
    s.rect(9,12,2,4,h2('#4a4e54'))  # exhaust
    # boom (up-right)
    s.rect(30,16,4,8,yel);s.rect(33,12,5,5,yel)
    s.rect(37,9,7,4,yel);s.rect(37,9,7,1,lighten(yel,22))
    # dipper arm down
    s.rect(41,12,3,12,yel);s.rect(41,12,3,1,lighten(yel,18))
    # hydraulic ram
    s.rect(33,14,7,2,h2('#c2c6ce'))
    # bucket
    s.rect(38,24,8,6,steel);s.rect(38,24,8,2,lighten(steel,18));s.rect(38,28,8,2,darken(steel,24))
    for tx in range(39,46,2):s.set(tx,30,h2('#6a6e76'))
    return finish(s)
def lockers():  # PPE station: grey locker bank, one open with hi-vis + hard hat
    s=Spr(36,30);body=h2('#8a9aa6');dk=h2('#5f6e78')
    s.rect(0,2,36,28,body)
    for x in (0,12,24,35):s.rect(x,2,1,28,dk)
    s.rect(0,2,36,2,lighten(body,18))
    for lx in (0,12):  # two closed lockers
        s.rect(lx+2,5,8,22,lighten(body,8))
        s.rect(lx+9,14,1,3,h2('#2a2e33'))
        for vy in (6,9,11):s.rect(lx+3,vy,3,1,h2('#3a4047'))
    ox=24  # open locker showing PPE
    s.rect(ox+1,5,10,22,h2('#3a4047'))
    vest=h2('#f06a20')
    s.rect(ox+2,12,8,12,vest);s.rect(ox+2,12,8,2,lighten(vest,20))
    s.rect(ox+4,13,1,11,h2('#f4f0e8'));s.rect(ox+7,13,1,11,h2('#f4f0e8'))
    s.rect(ox+2,18,8,1,h2('#cfd6dc'))
    s.rect(ox+3,6,6,4,h2('#f0f0e8'));s.rect(ox+3,6,6,1,h2('#ffffff'));s.rect(ox+2,9,8,1,h2('#d8d8cc'))
    return finish(s)
def tamper():  # yellow rail tamper machine
    s=Spr(44,26);yel=h2('#f0b81e');dk=h2('#2b2e33');steel=h2('#9aa0a8')
    s.rect(2,6,40,12,yel);s.rect(2,6,40,2,lighten(yel,22));s.rect(2,15,40,3,darken(yel,18))
    s.rect(30,2,12,8,yel);s.rect(30,2,12,2,lighten(yel,22))
    s.rect(32,4,8,5,h2('#8fc4dc'));s.rect(32,4,8,1,h2('#b6dcec'))
    for x in range(4,28,6):s.rect(x,10,3,4,h2('#1c1e22'))  # hazard stripes
    for wx in (6,18,34):
        s.rect(wx,18,6,4,dk);s.set(wx+1,21,h2('#16181c'));s.set(wx+4,21,h2('#16181c'))
    for tx in (12,26):  # tamping tines
        s.rect(tx,18,2,6,steel);s.rect(tx+3,18,2,6,steel);s.rect(tx,23,5,1,h2('#6a6e76'))
    return finish(s)
def dumper():  # road-rail dumper / tipper
    s=Spr(32,24);yel=h2('#f0b81e');dk=h2('#2b2e33');skip=h2('#b06a30')
    s.rect(2,14,28,4,dk)
    s.rect(22,6,8,9,yel);s.rect(22,6,8,2,lighten(yel,22))
    s.rect(23,8,6,5,h2('#8fc4dc'));s.rect(23,8,6,1,h2('#b6dcec'))
    s.rect(2,5,18,10,skip);s.rect(2,5,18,2,lighten(skip,18));s.rect(2,12,18,3,darken(skip,16))
    s.rect(4,3,14,3,h2('#8f897e'));s.rect(6,2,4,2,h2('#a39c90'))  # spoil load
    for wx in (5,14,24):
        s.rect(wx,17,5,5,dk);s.rect(wx+1,18,3,3,h2('#4a4e54'));s.set(wx+2,19,h2('#16181c'))
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

# ---- Supplier's office (warehouse) props ----
def palletrack():
    s=Spr(30,38);steel=h2('#6f7b88')
    s.rect(1,2,3,36,steel);s.rect(26,2,3,36,steel)               # uprights
    for sy in (2,13,24,35):s.rect(1,sy,28,2,lighten(steel,14))   # shelf beams
    bcols=['#c79a5e','#b07c44','#caa86a','#9a6f3f']
    for r,sy in enumerate((4,15,26)):
        x=5
        while x<24:
            w=5+((x+r)%3);col=h2(bcols[(x+r)%4])
            s.rect(x,sy,w,8,col);s.rect(x,sy,w,1,lighten(col,18));s.rect(x+w//2,sy,1,8,darken(col,14))
            x+=w+1
    return finish(s)
def cratestack():
    s=Spr(22,22);w=h2('#a87f47')
    for (cx,cy,sz) in [(1,9,12),(10,10,11),(5,0,12)]:
        s.rect(cx,cy,sz,12,w);s.rect(cx,cy,sz,1,lighten(w,18))
        s.rect(cx,cy+4,sz,1,darken(w,14));s.rect(cx,cy+8,sz,1,darken(w,14));s.rect(cx+sz//2,cy,1,12,darken(w,14))
    return finish(s)
def forklift():
    s=Spr(26,26);yel=h2('#f0b81e');dk=h2('#2b2e33')
    s.rect(20,2,2,18,h2('#9aa0a8'));s.rect(23,2,2,18,h2('#9aa0a8'))  # mast
    s.rect(19,18,7,2,h2('#c2c6ce'));s.rect(19,20,9,1,h2('#c2c6ce'))  # forks
    s.rect(4,10,16,10,yel);s.rect(4,10,16,2,lighten(yel,20))         # body
    s.rect(6,4,9,7,h2('#3a4250'));s.rect(7,5,7,5,h2('#8fc4dc'))      # cab
    s.rect(5,19,5,5,dk);s.rect(14,19,5,5,dk)                         # wheels
    return finish(s)
# ---- Boardroom props ----
def conftable():
    s=Spr(60,26);wood=h2('#7a4f2e')
    s.rect(0,5,60,16,wood);s.rect(0,5,60,3,lighten(wood,16));s.rect(0,18,60,3,darken(wood,16))
    s.rect(4,21,3,4,darken(wood,22));s.rect(53,21,3,4,darken(wood,22))
    s.rect(8,9,9,7,h2('#3a4250'));s.rect(9,10,7,5,h2('#7fd0e0'))     # laptop
    s.rect(22,11,8,4,h2('#f4ecd8'))                                  # papers
    s.rect(34,9,5,9,h2('#cfe0ec'));s.rect(34,9,5,2,h2('#e8f2fa'))    # water jug
    s.rect(44,12,4,4,h2('#e0e6ee'));s.rect(50,12,4,4,h2('#e0e6ee'))  # mugs
    return finish(s)
def projscreen():
    s=Spr(30,20);fr=h2('#3a3f47')
    s.rect(0,0,30,2,fr)                                              # roller
    s.rect(2,2,26,16,h2('#f4f1e6'));s.rect(2,2,26,1,h2('#ffffff'))
    s.rect(4,4,1,12,h2('#c8c2b2'))                                   # axis
    for i,c in enumerate(['#4aca8a','#f7c948','#e05577','#5b8ef5']):
        hh=4+(i*3)%9;s.rect(7+i*5,16-hh,3,hh,h2(c))
    return finish(s)
def wallchart():
    s=Spr(18,16);fr=h2('#5a3a1e')
    s.rect(0,0,18,16,fr);s.rect(2,2,14,12,h2('#f4f1e6'))
    for i,c in enumerate(['#4aca8a','#f7c948','#e05577']):s.rect(3,3+i*4,11,2,h2(c))
    return finish(s)
# ---- Design studio props ----
def draftboard():
    s=Spr(24,22);wood=h2('#9a6f3f');pap=h2('#e8e2d0')
    s.rect(3,18,3,4,darken(wood,18));s.rect(18,18,3,4,darken(wood,18))
    s.rect(2,4,20,12,pap);s.rect(2,4,20,2,lighten(pap,8));s.rect(2,4,20,1,h2('#3a4250'))
    for ly in (8,11,14):s.rect(5,ly,14,1,h2('#5b8ef5'))
    s.rect(13,6,1,10,h2('#5b8ef5'))
    return finish(s)
def plotter():
    s=Spr(26,20);body=h2('#5b6470')
    s.rect(1,4,24,12,body);s.rect(1,4,24,2,lighten(body,16))
    s.rect(3,7,20,3,h2('#2b3138'))                                   # paper slot
    s.rect(4,2,18,3,h2('#e8e2d0'));s.rect(4,2,18,1,h2('#5b8ef5'))    # emerging print
    s.rect(3,16,3,4,h2('#2b2e33'));s.rect(20,16,3,4,h2('#2b2e33'))
    s.set(22,6,h2('#4aca8a'))
    return finish(s)
def pinboard():
    s=Spr(28,16);fr=h2('#7a5230')
    s.rect(0,0,28,16,fr);s.rect(2,2,24,12,h2('#b9a886'))
    for (px,py,c) in [(4,3,'#cfe0ec'),(12,4,'#f4f1e6'),(19,3,'#cfe0ec')]:
        s.rect(px,py,7,8,h2(c));s.rect(px,py,7,1,h2('#ffffff'))
        s.rect(px+1,py+3,5,1,h2('#5b8ef5'));s.rect(px+1,py+5,5,1,h2('#5b8ef5'));s.set(px+3,py,h2('#e05577'))
    return finish(s)
def modeltable():
    s=Spr(30,18);wood=h2('#b07c44')
    s.rect(0,8,30,7,wood);s.rect(0,8,30,2,lighten(wood,16))
    s.rect(3,15,3,3,darken(wood,18));s.rect(24,15,3,3,darken(wood,18))
    s.rect(4,3,22,5,h2('#7eba5a'))
    s.rect(6,2,3,4,h2('#cfd6dc'));s.rect(12,1,3,5,h2('#e0e6ee'));s.rect(18,2,3,4,h2('#cfd6dc'))
    s.rect(4,6,22,1,h2('#6f7b88'))
    return finish(s)
# ---- Outdoor / town-hub: trees, car, building exteriors ----
def tree():
    s=Spr(18,26);trunk=h2('#7a5230');leaf=h2('#4f9a4c')
    s.rect(7,18,4,8,trunk);s.rect(7,18,2,8,lighten(trunk,12))
    s.rect(3,4,12,14,leaf);s.rect(1,8,16,8,leaf);s.rect(5,1,8,8,h2('#62b052'))
    s.rect(4,5,5,4,lighten(leaf,16));s.rect(9,12,5,4,darken(leaf,12))
    return finish(s)
def tree2():
    s=Spr(22,30);trunk=h2('#6e4a2c');leaf=h2('#3f8a44')
    s.rect(9,20,5,10,trunk);s.rect(9,20,2,10,lighten(trunk,12))
    s.rect(2,6,18,16,leaf);s.rect(4,2,14,10,h2('#54a04e'));s.rect(0,12,22,8,leaf)
    s.rect(5,7,6,5,lighten(leaf,16));s.rect(12,14,6,5,darken(leaf,12))
    return finish(s)
def car():
    s=Spr(48,26);body=h2('#c0503e');glass=h2('#a8d8e8');dk=h2('#2b2e33')
    s.rect(2,10,44,9,body);s.rect(2,10,44,2,lighten(body,18))     # lower body
    s.rect(10,4,26,8,body);s.rect(10,4,26,2,lighten(body,18))     # cabin
    s.rect(12,5,10,6,glass);s.rect(24,5,10,6,glass)               # windows
    s.rect(2,14,44,2,darken(body,20))                             # trim
    s.rect(44,11,3,4,h2('#f7e0a0'));s.rect(1,12,2,3,h2('#e05577')) # head/tail lights
    s.rect(7,17,8,8,dk);s.rect(33,17,8,8,dk)
    s.rect(9,19,4,4,h2('#6a6e76'));s.rect(35,19,4,4,h2('#6a6e76'))
    return finish(s)
def ext_office():
    s=Spr(56,52);body=h2('#9aa6b4');glass=h2('#7fb4d0');roof=h2('#5b6470')
    s.rect(0,8,56,42,body);s.rect(0,8,56,3,lighten(body,16))
    s.rect(0,4,56,6,roof);s.rect(0,4,56,2,lighten(roof,18))       # parapet
    for wy in (14,26,38):
        for wx in range(4,52,9):
            s.rect(wx,wy,6,7,glass);s.rect(wx,wy,6,2,lighten(glass,18));s.rect(wx+3,wy,1,7,darken(glass,18))
    s.rect(23,40,10,10,h2('#3a4250'));s.rect(24,41,8,9,glass);s.rect(28,41,1,9,h2('#2a3038'))
    s.rect(20,49,16,2,h2('#7a7e86'))
    return finish(s)
def ext_supplier():
    s=Spr(60,48);body=h2('#cfc2a4');roof=h2('#8a6f4a');steel=h2('#9aa0a8')
    s.rect(0,12,60,34,body)
    for x in range(0,60,3):s.rect(x,12,1,34,darken(body,8))       # corrugation
    s.rect(0,6,60,8,roof);s.rect(0,6,60,2,lighten(roof,16))
    s.rect(20,22,22,24,steel)                                     # roller shutter
    for ry in range(22,46,3):s.rect(20,ry,22,1,darken(steel,16))
    s.rect(20,22,22,2,lighten(steel,18))
    s.rect(6,18,8,7,h2('#7fb4d0'));s.rect(48,18,8,7,h2('#7fb4d0'))
    s.rect(22,14,18,4,h2('#f06a20'))                              # signage band
    return finish(s)
def ext_board():
    s=Spr(56,52);body=h2('#d8d2c2');glass=h2('#86c0dc');roof=h2('#6a5238')
    s.rect(0,12,56,38,body);s.rect(0,12,56,3,lighten(body,14))
    s.rect(0,6,56,8,roof);s.rect(0,6,56,2,lighten(roof,16))
    s.rect(8,18,40,26,glass)
    for gx in range(8,48,8):s.rect(gx,18,1,26,darken(glass,18))
    for gy in range(18,44,8):s.rect(8,gy,40,1,darken(glass,18))
    s.rect(8,18,40,2,lighten(glass,18))
    for cx in (4,50):s.rect(cx,14,2,36,lighten(body,10))          # columns
    s.rect(24,40,8,10,h2('#3a4250'))
    return finish(s)
def ext_studio():
    s=Spr(52,44);brick=h2('#b06a4a');roof=h2('#7a4a30');glass=h2('#a8d8e8')
    s.rect(0,10,52,32,brick)
    for by in range(12,42,4):
        off=2 if (by//4)%2 else 0
        for bx in range(off,52,8):s.rect(bx,by,7,3,lighten(brick,6))
    s.rect(0,5,52,7,roof);s.rect(0,5,52,2,lighten(roof,16))
    s.rect(6,16,28,18,glass);s.rect(6,16,28,2,lighten(glass,16))
    for gx in range(6,34,6):s.rect(gx,16,1,18,darken(glass,20))
    s.rect(40,28,8,14,h2('#5a3a1e'));s.rect(41,29,6,13,h2('#8a5a2e'))
    return finish(s)
def pond():            # a little ornamental pond (rounded water + stone rim + ripples + a lily)
    s=Spr(40,26);water=h2('#3f86c4');stone=h2('#9a948a');deep=h2('#2f6ea8')
    rows=[6,10,12,12,12,10,6]  # half-widths per band → oval
    for i,hw in enumerate(rows):
        y=3+i*3; w=hw*2; x=20-hw
        s.rect(x-2,y,w+4,3,stone)          # stone rim
    for i,hw in enumerate(rows):
        y=4+i*3; w=hw*2-2; x=20-hw+1
        s.rect(x,y,w,3,water)
    s.rect(8,11,24,6,deep)                 # deeper centre
    s.rect(10,9,12,1,lighten(water,22));s.rect(22,14,8,1,lighten(water,18)) # ripples/glints
    s.rect(24,9,5,4,h2('#5bb56a'));s.set(26,10,h2('#e86a8a'))               # lily pad + flower
    return finish(s)
def ext_site():
    s=Spr(56,46);hoard=h2('#3a6ea0');steel=h2('#9aa0a8');yel=h2('#f0b81e')
    s.rect(0,10,56,34,hoard);s.rect(0,10,56,3,lighten(hoard,14))
    for x in range(0,56,8):s.rect(x,10,1,34,darken(hoard,14))
    s.rect(0,8,3,38,steel);s.rect(53,8,3,38,steel)
    s.rect(22,18,14,26,h2('#2a3038'))                            # gate opening
    s.rect(20,22,18,3,yel)
    for bx in range(21,38,5):s.rect(bx,22,2,3,h2('#1c1e22'))     # boom barrier stripes
    s.rect(4,16,12,9,yel);s.rect(5,17,10,7,h2('#1c1e22'));s.rect(7,18,6,5,yel) # safety sign
    return finish(s)

OBJ={'desk':desk,'chair':chair,'plant':plant,'sofa':sofa,'bookshelf':bookshelf,'table':table,
     'watercooler':watercooler,'door':door,'cabin':cabin,'excavator':excavator,'fence':fence,
     'cone':cone,'railstack':railstack,'sleeperstack':sleeperstack,'ballastpile':ballastpile,
     'lockers':lockers,'tamper':tamper,'dumper':dumper,
     'palletrack':palletrack,'cratestack':cratestack,'forklift':forklift,
     'conftable':conftable,'projscreen':projscreen,'wallchart':wallchart,
     'draftboard':draftboard,'plotter':plotter,'pinboard':pinboard,'modeltable':modeltable,
     'tree':tree,'tree2':tree2,'car':car,'pond':pond,
     'ext_office':ext_office,'ext_supplier':ext_supplier,'ext_board':ext_board,'ext_studio':ext_studio,'ext_site':ext_site}

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
def tile_concrete():   # warehouse concrete with expansion joints
    s=Spr(16,16);base=h2('#b6bcc2')
    for y in range(16):
        for x in range(16):
            c=base;r=(x*5+y*3)%13
            if r==0:c=darken(base,8)
            elif r==1:c=lighten(base,6)
            if x%8==0 or y%8==0:c=darken(base,14)
            s.set(x,y,c)
    return s
def tile_parquet():    # warm studio parquet, alternating plank blocks
    s=Spr(16,16);a=h2('#c9a05a');b=h2('#bb8c48')
    for y in range(16):
        for x in range(16):
            blk=((x//8)+(y//8))%2
            c=a if blk else b
            if (blk==0 and y%8==0) or (blk==1 and x%8==0):c=darken(c,12)
            if (blk==0 and x%4==0) or (blk==1 and y%4==0):c=darken(c,5)
            s.set(x,y,c)
    return s
def tile_boardcarpet(): # deep boardroom carpet with subtle weave
    s=Spr(16,16);base=h2('#3f5e86')
    for y in range(16):
        for x in range(16):
            c=base if (x//2+y//2)%2 else lighten(base,7)
            if (x+y)%6==0:c=darken(base,8)
            s.set(x,y,c)
    return s
def tile_road():       # asphalt
    s=Spr(16,16);base=h2('#4a4e54')
    for y in range(16):
        for x in range(16):
            c=base;r=(x*5+y*7)%13
            if r==0:c=darken(base,8)
            elif r==1:c=lighten(base,6)
            s.set(x,y,c)
    return s
def tile_roadline():   # asphalt with a dashed centre line (horizontal road)
    s=tile_road()
    for x in range(2,14):
        if x%6<4: s.set(x,7,h2('#e8c838'));s.set(x,8,h2('#e8c838'))
    return s
def tile_pavement():   # light paving slabs
    s=Spr(16,16);base=h2('#bdb6a4')
    for y in range(16):
        for x in range(16):
            if x%8==0 or y%8==0:s.set(x,y,darken(base,12))
            else:s.set(x,y, base if (x//8+y//8)%2 else lighten(base,6))
    return s
TILE={'floor':tile_floor,'wall':tile_wall,'wallbase':tile_wallbase,'grass':tile_grass,
      'gravel':tile_gravel,'track':tile_track,'platform':tile_platform,'platedge':tile_platedge,'carpetM':tile_carpetM,'carpetO':tile_carpetO,'tilefloor':tile_tilefloor,
      'concrete':tile_concrete,'parquet':tile_parquet,'boardcarpet':tile_boardcarpet,
      'road':tile_road,'roadline':tile_roadline,'pavement':tile_pavement}

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
