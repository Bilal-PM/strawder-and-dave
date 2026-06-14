import sys,json,zlib,struct; sys.path.insert(0,'/tmp')
import importlib,charart; importlib.reload(charart)
from charart import Spr,drawchar,add_outline
# decode atlas
def load_png(fn):
    d=open(fn,'rb').read();pos=8;idat=b''
    while pos<len(d):
        ln=struct.unpack('>I',d[pos:pos+4])[0];t=d[pos+4:pos+8];c=d[pos+8:pos+8+ln];pos+=12+ln
        if t==b'IHDR':w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        elif t==b'IDAT':idat+=c
        elif t==b'IEND':break
    raw=zlib.decompress(idat);ch=4;st=w*ch;out=bytearray();prev=bytearray(st);p=0
    for y in range(h):
        fil=raw[p];p+=1;ln=bytearray(raw[p:p+st]);p+=st
        for i in range(st):
            a=ln[i-ch] if i>=ch else 0;b=prev[i];cc=ln[i-ch] if False else (prev[i-ch] if i>=ch else 0)
            if fil==1:ln[i]=(ln[i]+a)&255
            elif fil==2:ln[i]=(ln[i]+b)&255
            elif fil==3:ln[i]=(ln[i]+((a+b)>>1))&255
            elif fil==4:
                pp=a+b-cc;pa=abs(pp-a);pb=abs(pp-b);pc=abs(pp-cc)
                pr=a if(pa<=pb and pa<=pc) else (b if pb<=pc else cc);ln[i]=(ln[i]+pr)&255
        out+=ln;prev=ln
    return w,h,out
AW,AH,APX=load_png('art/atlas.png')
MAN=json.load(open('art/manifest.json'))
TS=16; W,H=30,18
# OMAP (mirror JS)
g=[['.']*W for _ in range(H)]
for x in range(W): g[0][x]='#';g[H-1][x]='#'
for y in range(H): g[y][0]='#';g[y][W-1]='#'
for y in range(1,H-1): g[y][10]='#';g[y][21]='#'
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
GROUND={'.':'floor','+':'floor','X':'floor','M':'carpetM','O':'carpetO','B':'tilefloor','D':'tilefloor','#':'wall'}
OBJ=[('desk',12,2),('desk',16,2),('desk',12,6),('desk',16,6),('desk',13,10),
     ('table',2,3),('chair',2,1),('chair',6,1),('chair',2,6),('chair',6,6),
     ('desk',24,3),('plant',27,5),('sofa',2,10),('watercooler',7,10),('plant',2,14),
     ('bookshelf',24,9),('bookshelf',26,9),('bookshelf',24,13),('bookshelf',26,13),
     ('desk',12,14),('plant',18,14),('plant',19,2)]
SC_W,SC_H=W*TS,H*TS
buf=[[(0,0,0)]*SC_W for _ in range(SC_H)]
def blit(name,dx,dy):
    if name not in MAN:return
    sx,sy,w,h=MAN[name]
    for j in range(h):
        for i in range(w):
            o=((sy+j)*AW+(sx+i))*4; al=APX[o+3]
            if al>10 and 0<=dx+i<SC_W and 0<=dy+j<SC_H:
                buf[dy+j][dx+i]=(APX[o],APX[o+1],APX[o+2])
# ground
for y in range(H):
    for x in range(W):
        c=g[y][x]
        if c=='#':
            below=g[y+1][x] if y+1<H else '#'
            blit('wallbase' if below!='#' else 'wall', x*TS,y*TS)
        else:
            blit(GROUND[c], x*TS,y*TS)
# objects + chars y-sorted
ents=[]
for name,tx,ty in OBJ:
    h=MAN[name][3]; ents.append((ty*TS+h, ('obj',name,tx*TS,ty*TS)))
seats=[('amelia',12,4),('bob',16,4),('alex',12,8),('adam',16,8),('amelia',13,12)]
for sh,tx,ty in seats:
    ents.append((ty*TS+28, ('npc',sh,tx*TS,ty*TS)))
ents.append((15*TS+28, ('npc','adam',14*TS,15*TS)))  # player
ents.sort(key=lambda e:e[0])
def blit_spr(spr,dx,dy):
    for j in range(spr.h):
        for i in range(spr.w):
            c=spr.p[j][i]
            if c is not None and 0<=dx+i<SC_W and 0<=dy+j<SC_H: buf[dy+j][dx+i]=c
for _,e in ents:
    if e[0]=='obj': blit(e[1],e[2],e[3])
    else:
        cfg={'amelia':{'skin':'#f8c8a0','hair':'#e8c848','shirt':'#5888c8','pants':'#4868a0','hairStyle':'long'},
             'bob':{'skin':'#c89060','hair':'#8e5e28','shirt':'#e88838','pants':'#383848'},
             'alex':{'skin':'#f8c8a0','hair':'#c84828','shirt':'#e8c038','pants':'#383848','hairStyle':'long'},
             'adam':{'skin':'#c89060','hair':'#a8a098','shirt':'#787880','pants':'#383848'}}[e[1]]
        s=Spr(20,30); drawchar(s,cfg,0,0); s=add_outline(s); blit_spr(s,e[2]-2,e[3]-2)
sc=4;rows=bytearray()
for Y in range(SC_H*sc):
    rows.append(0)
    for X in range(SC_W*sc):
        r,gg,b=buf[Y//sc][X//sc];rows+=bytes((r,gg,b))
comp=zlib.compress(bytes(rows),9)
def chk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
open('/tmp/ingame_office.png','wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',SC_W*sc,SC_H*sc,8,2,0,0,0))+chk(b'IDAT',comp)+chk(b'IEND',b''))
print('ingame_office saved',SC_W*sc,SC_H*sc)
