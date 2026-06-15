import sys,json,zlib,struct; sys.path.insert(0,'/tmp')
import importlib,charart; importlib.reload(charart)
from charart import Spr,drawchar,add_outline
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
            a=ln[i-ch] if i>=ch else 0;b=prev[i];cc=prev[i-ch] if i>=ch else 0
            if fil==1:ln[i]=(ln[i]+a)&255
            elif fil==2:ln[i]=(ln[i]+b)&255
            elif fil==3:ln[i]=(ln[i]+((a+b)>>1))&255
            elif fil==4:
                pp=a+b-cc;pa=abs(pp-a);pb=abs(pp-b);pc=abs(pp-cc)
                pr=a if(pa<=pb and pa<=pc) else (b if pb<=pc else cc);ln[i]=(ln[i]+pr)&255
        out+=ln;prev=ln
    return w,h,out
AW,AH,APX=load_png('art/atlas.png'); MAN=json.load(open('art/manifest.json'))
TS=16; W,H=30,20; SW,SH=W*TS,H*TS; buf=[[(0,0,0)]*SW for _ in range(SH)]
def blit(name,dx,dy):
    if name not in MAN:return
    sx,sy,w,h=MAN[name]
    for j in range(h):
        for i in range(w):
            o=((sy+j)*AW+(sx+i))*4;al=APX[o+3]
            if al>10 and 0<=dx+i<SW and 0<=dy+j<SH: buf[dy+j][dx+i]=(APX[o],APX[o+1],APX[o+2])
# ground: grass everywhere, gravel compound right, platform upper-left, track band
for y in range(H):
    for x in range(W): blit('grass',x*TS,y*TS)
for y in range(1,H-1):
    for x in range(17,W-0): blit('gravel',x*TS,y*TS)        # fenced compound (right)
for y in range(6,9):
    for x in range(1,15): blit('platform' if y<8 else 'platedge',x*TS,y*TS)  # station platform
for y in range(10,12):
    for x in range(0,W): blit('track',x*TS,y*TS)            # track corridor across
# objects (atlas), y-sorted
OBJ=[('cabin',18,2),('cabin',24,2),                         # site office + welfare cabins
     ('railstack',18,14),('sleeperstack',23,14),('ballastpile',18,16),('ballastpile',23,16),
     ('excavator',9,5),('cone',3,9),('cone',7,9),('cone',13,9),('cone',26,12)]
# fence along compound left edge with a gate gap at track rows
for y in range(1,H-1):
    if 9<=y<=11: continue
    OBJ.append(('fence',16,y))
for x in range(17,W-1): OBJ.append(('fence',x,H-2))
ents=[(ty*TS+MAN[n][3],('o',n,tx*TS,ty*TS)) for (n,tx,ty) in OBJ]
# crew (hi-vis): use orange shirt chars
crew=[('amelia',5,13),('bob',12,13),('alex',22,8)]
for sh,tx,ty in crew: ents.append((ty*TS+28,('c',sh,tx*TS,ty*TS)))
ents.append((14*TS+28,('c','adam',2*TS,13*TS)))  # player entering bottom-left
ents.sort(key=lambda e:e[0])
def blit_spr(spr,dx,dy):
    for j in range(spr.h):
        for i in range(spr.w):
            c=spr.p[j][i]
            if c is not None and 0<=dx+i<SW and 0<=dy+j<SH: buf[dy+j][dx+i]=c
for _,e in ents:
    if e[0]=='o': blit(e[1],e[2],e[3])
    else:
        cfg={'amelia':{'skin':'#f8c8a0','hair':'#8e5e28','shirt':'#f0902a','pants':'#3a3a44'},
             'bob':{'skin':'#c89060','hair':'#383028','shirt':'#f0902a','pants':'#3a3a44'},
             'alex':{'skin':'#f8c8a0','hair':'#c84828','shirt':'#f0902a','pants':'#3a3a44','hairStyle':'long'},
             'adam':{'skin':'#c89060','hair':'#a8a098','shirt':'#48a86a','pants':'#4868a0'}}[e[1]]
        s=Spr(20,30);drawchar(s,cfg,0,0);s=add_outline(s);blit_spr(s,e[2]-2,e[3]-2)
sc=4;rows=bytearray()
for Y in range(SH*sc):
    rows.append(0)
    for X in range(SW*sc):
        r,gg,b=buf[Y//sc][X//sc];rows+=bytes((r,gg,b))
comp=zlib.compress(bytes(rows),9)
def chk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
open('/tmp/ingame_site.png','wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',SW*sc,SH*sc,8,2,0,0,0))+chk(b'IDAT',comp)+chk(b'IEND',b''))
print('ingame_site saved',SW*sc,SH*sc)
