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
TS=16; W,H=30,20
ENDS=[28,24,20,16,12,8,4,0,-4,-8]
def pidx(w):
    for i,e in enumerate(ENDS):
        if w>e: return i
    return 9
def frac(w):
    pi=pidx(w)
    return 0 if pi<5 else (0.45 if pi==5 else (0.8 if pi==6 else 1))
def render(week):
    buf=[[(0,0,0)]*(W*TS) for _ in range(H*TS)]
    g=[['g']*W for _ in range(H)]
    for y in range(1,H-1):
        for x in range(17,W): g[y][x]='r'
    for y in range(6,9):
        for x in range(1,15): g[y][x]='p' if y<8 else 'e'
    for y in range(10,12):
        for x in range(W): g[y][x]='t'
    GR={'g':'grass','r':'gravel','t':'track','p':'platform','e':'platedge'}
    f=frac(week)
    def blit(name,dx,dy):
        if name not in MAN:return
        sx,sy,w,h=MAN[name]
        for j in range(h):
            for i in range(w):
                o=((sy+j)*AW+(sx+i))*4;al=APX[o+3]
                if al>10 and 0<=dx+i<W*TS and 0<=dy+j<H*TS: buf[dy+j][dx+i]=(APX[o],APX[o+1],APX[o+2])
    for y in range(H):
        for x in range(W):
            ch=g[y][x]; key=GR[ch]
            if ch=='t': key='track' if (x/W)<=f else 'gravel'
            blit(key,x*TS,y*TS)
    pi=pidx(week)
    OBJ=[('cabin',18,2,0),('cabin',24,2,0),('railstack',18,14,3),('sleeperstack',23,14,3),
         ('ballastpile',18,16,3),('ballastpile',23,16,3),('excavator',9,5,4),
         ('cone',3,9,4),('cone',7,9,4),('cone',13,9,4),('cone',26,12,4)]
    for y in range(1,H-1):
        if 9<=y<=11: continue
        OBJ.append(('fence',16,y,0))
    ents=[(ty*TS+MAN[n][3],(n,tx*TS,ty*TS)) for (n,tx,ty,m) in OBJ if pi>=m]
    ents.sort(key=lambda e:e[0])
    for _,e in ents: blit(e[0],e[1],e[2])
    return buf
# two panels side by side: week 32 (kickoff) | week 8 (construction late)
b1=render(32); b2=render(8)
GAP=8; PW=W*TS
sc=2; OW=(PW*2+GAP); rows=bytearray()
for Y in range(H*TS):
    for _ in range(sc):
        rows.append(0)
        for X in range(OW):
            for _ in range(sc):
                if X<PW: r,gg,b=b1[Y][X]
                elif X>=PW+GAP: r,gg,b=b2[Y][X-PW-GAP]
                else: r,gg,b=(20,16,10)
                rows+=bytes((r,gg,b))
# fix: above double-loops wrong; rebuild simply
rows=bytearray()
def px(b,X):
    if X<PW: return b1[0] and b[X]
for Y in range(H*TS):
  for sy in range(sc):
    rows.append(0)
    for X in range(OW):
      if X<PW: col=b1[Y][X]
      elif X>=PW+GAP: col=b2[Y][X-PW-GAP]
      else: col=(20,16,10)
      for sx in range(sc): rows+=bytes(col)
comp=zlib.compress(bytes(rows),9)
def chk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
open('/tmp/site_phase.png','wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',OW*sc,H*TS*sc,8,2,0,0,0))+chk(b'IDAT',comp)+chk(b'IEND',b''))
print('saved',OW*sc,H*TS*sc)
