import sys; sys.path.insert(0,'/tmp')
import importlib, artlib, charart, zlib, struct, random
importlib.reload(artlib); importlib.reload(charart)
from artlib import *
TS=16
# ---- floor plan ----
W,H=30,18
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
for (dy,dx) in [(3,10),(4,10),(11,10),(12,10),(3,21),(4,21),(11,21),(12,21)]: g[dy][dx]='+'
g[H-1][15]='X'
FLOORFN={'.':f_wood,'+':f_wood,'X':f_wood,'M':f_carpet,
         'O':lambda x,y:( (106,122,106) if (x//2+y//2)%2 else (114,130,114)),
         'B':f_tilefloor,'D':f_tilefloor}
def isfloor(c): return c in FLOORFN
WALLBODY=h2('#cfc7b4');WALLHI=h2('#e6e0cf');WALLFACE=h2('#b3aa96');WALLLO=h2('#8c8472')
class Scene:
    def __init__(s,W,H):s.W=W*TS;s.H=H*TS;s.px=[[(0,0,0)]*s.W for _ in range(s.H)]
    def build(s):
        for ty in range(H):
            for tx in range(W):
                c=g[ty][tx]
                if isfloor(c):
                    fn=FLOORFN[c]
                    for j in range(TS):
                        for i in range(TS):
                            col=fn(tx*TS+i,ty*TS+j)
                            s.px[ty*TS+j][tx*TS+i]=col
                    # shadow if wall above
                    if ty>0 and g[ty-1][tx]=='#':
                        for j in range(3):
                            for i in range(TS):
                                r,gg,b=s.px[ty*TS+j][tx*TS+i];s.px[ty*TS+j][tx*TS+i]=(int(r*0.72),int(gg*0.72),int(b*0.74))
        # walls (after floors so faces overlay shadow)
        for ty in range(H):
            for tx in range(W):
                if g[ty][tx]!='#': continue
                south_floor = ty+1<H and isfloor(g[ty+1][tx])
                for j in range(TS):
                    for i in range(TS):
                        col=WALLBODY
                        if j<3: col=WALLHI
                        if south_floor and j>=11: col=WALLFACE
                        if south_floor and j>=15: col=WALLLO
                        if south_floor and j==15: col=darken(WALLLO,18)
                        if i==0 and g[ty][tx-1] if tx>0 else False: pass
                        s.px[ty*TS+j][tx*TS+i]=col
                # vertical seam texture
                for j in range(TS): s.px[ty*TS+j][tx*TS]=darken(WALLBODY,10)
    def blit(s,spr,px,py):
        for j in range(spr.h):
            for i in range(spr.w):
                c=spr.p[j][i]
                if c is not None and 0<=px+i<s.W and 0<=py+j<s.H: s.px[py+j][px+i]=c
    def shadow(s,cx,cy,rx,ry):
        for y in range(cy-ry,cy+ry+1):
            for x in range(cx-rx,cx+rx+1):
                if 0<=x<s.W and 0<=y<s.H:
                    dx=(x-cx)/rx;dy=(y-cy)/ry
                    if dx*dx+dy*dy<=1:
                        r,gg,b=s.px[y][x];s.px[y][x]=(int(r*0.74),int(gg*0.74),int(b*0.76))
    def save(s,fn,scale=4):
        Wp,Hp=s.W*scale,s.H*scale;rows=bytearray()
        for Y in range(Hp):
            rows.append(0)
            for X in range(Wp):
                r,gg,b=s.px[Y//scale][X//scale];rows+=bytes((r,gg,b))
        comp=zlib.compress(bytes(rows),9)
        def c_(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
        open(fn,'wb').write(b'\x89PNG\r\n\x1a\n'+c_(b'IHDR',struct.pack('>IIBBBBB',Wp,Hp,8,2,0,0,0))+c_(b'IDAT',comp)+c_(b'IEND',b''))

sc=Scene(W,H);sc.build()
def OBJ(spr,tx,ty,sh=True):
    if sh: sc.shadow(tx*TS+spr.w//2, ty*TS+spr.h-2, max(6,spr.w//2-2),3)
    sc.blit(spr,tx*TS,ty*TS)
DESK=desk();CHAIR=chair();PLANT=plant();SOFA=sofa();SHELF=bookshelf();TBL=table();WC=watercooler();WB=whiteboard()
# OPEN PLAN workstations: two columns (x12-13, x16-17); aisles kept clear at x11, x14-15, x18-20
WS=[(12,2),(16,2),(12,6),(16,6),(13,10)]
for (tx,ty) in WS:
    OBJ(DESK,tx,ty); sc.blit(CHAIR,tx*TS+9,ty*TS+20)
# MEETING ROOM (east half kept clear for the doorway at x9)
OBJ(TBL,2,3)
for (cx,cy) in [(2,1),(5,1),(2,6),(5,6)]: sc.blit(chair('#6a4c9a'),cx*TS,cy*TS)
sc.blit(WB,3*TS,1*TS)
# YOUR OFFICE (west kept clear for doorway at x22)
OBJ(DESK,24,3); sc.blit(CHAIR,24*TS+9,3*TS+20); OBJ(PLANT,27,5)
# BREAK ROOM (east kept clear for doorway at x9)
OBJ(SOFA,2,10); OBJ(WC,7,10); OBJ(PLANT,2,14)
# DOCUMENTS (west kept clear for doorway at x22)
OBJ(SHELF,24,9); OBJ(SHELF,26,9); OBJ(SHELF,24,13); OBJ(SHELF,26,13)
# RECEPTION (left of the central exit aisle x14-15)
OBJ(DESK,12,14); OBJ(PLANT,18,14)
OBJ(PLANT,19,2)
import charart as CA
def npc(cfg,tx,ty):
    s=CA.Spr(20,30); CA.drawchar(s,cfg,dir=0,frame=0); s=add_outline(shade(s)); sc.blit(s,tx*TS-2,ty*TS-2)
cfgs=[{'skin':'#f8c8a0','hair':'#e8c848','shirt':'#5888c8','pants':'#4868a0','hairStyle':'long'},
      {'skin':'#c89060','hair':'#8e5e28','shirt':'#e88838','pants':'#383848'},
      {'skin':'#f8c8a0','hair':'#c84828','shirt':'#e8c038','pants':'#383848','hairStyle':'long'},
      {'skin':'#c89060','hair':'#a8a098','shirt':'#787880','pants':'#383848'},
      {'skin':'#8e6038','hair':'#383028','shirt':'#8858b8','pants':'#4868a0','hairStyle':'long'}]
for cfg,(tx,ty) in zip(cfgs,[(12,4),(16,4),(12,8),(16,8),(13,12)]):
    npc(cfg,tx,ty)
npc({'skin':'#f8c8a0','hair':'#8e5e28','shirt':'#48a86a','pants':'#4868a0'},14,15)
# labels

LET={'A':"010 101 111 101 101",'B':"110 101 110 101 110",'C':"011 100 100 100 011",'D':"110 101 101 101 110",'E':"111 100 110 100 111",'F':"111 100 110 100 100",'G':"011 100 101 101 011",'H':"101 101 111 101 101",'I':"111 010 010 010 111",'K':"101 110 100 110 101",'L':"100 100 100 100 111",'M':"101 111 111 101 101",'N':"110 101 101 101 101",'O':"010 101 101 101 010",'P':"110 101 110 100 100",'R':"110 101 110 101 101",'S':"011 100 010 001 110",'T':"111 010 010 010 010",'U':"101 101 101 101 111",'W':"101 101 111 111 101",'Y':"101 101 010 010 010",' ':"000 000 000 000 000"}
def label(cx,cy,s,col=(60,44,30),sc2=2):
    wpx=len(s)*4*sc2
    x=cx-wpx//2; y=cy
    # pill bg
    for yy in range(y-2,y+5*sc2+2):
        for xx in range(x-3,x+wpx+1):
            if 0<=xx<sc.W and 0<=yy<sc.H:
                r,g2,b=sc.px[yy][xx]; sc.px[yy][xx]=(int(r*0.55+255*0.45),int(g2*0.55+248*0.45),int(b*0.55+220*0.45))
    for ch in s:
        gl=LET.get(ch,LET[' ']).split()
        for j in range(5):
            for i in range(3):
                if gl[j][i]=='1':
                    for dy in range(sc2):
                        for dx in range(sc2):
                            xx=x+i*sc2+dx; yy=y+j*sc2+dy
                            if 0<=xx<sc.W and 0<=yy<sc.H: sc.px[yy][xx]=col
        x+=4*sc2
label(5*TS,1*TS+1,"MEETING ROOM")
label(15*TS,1*TS+1,"OPEN PLAN")
label(25*TS,1*TS+1,"YOUR OFFICE")
label(5*TS,9*TS+1,"BREAK ROOM")
label(25*TS,9*TS+1,"DOCUMENTS")
label(15*TS,16*TS-2,"RECEPTION")
sc.save('/tmp/office_rooms.png',4)
print('saved', sc.W*4, sc.H*4)
