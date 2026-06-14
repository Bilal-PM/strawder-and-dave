import zlib,struct
def h2(c): c=c.lstrip('#'); return (int(c[0:2],16),int(c[2:4],16),int(c[4:6],16))
def lighten(c,a):
    r,g,b=h2(c) if isinstance(c,str) else c
    return (min(255,r+a),min(255,g+a),min(255,b+a))
def darken(c,a):
    r,g,b=h2(c) if isinstance(c,str) else c
    return (max(0,r-a),max(0,g-a),max(0,b-a))
def hueshift_dark(c,a):  # shadow shifts toward cool/purple
    r,g,b=c; return (max(0,r-a),max(0,g-int(a*1.1)),max(0,b-int(a*0.6)))
class Spr:
    def __init__(s,w,h): s.w=w;s.h=h;s.p=[[None]*w for _ in range(h)]
    def set(s,x,y,c):
        if 0<=x<s.w and 0<=y<s.h and c is not None: s.p[y][x]=c
    def rect(s,x,y,w,h,c):
        for j in range(h):
            for i in range(w): s.set(x+i,y+j,c)

C={'skin':'#f8c8a0','hair':'#8e5e28','shirt':'#5888c8','pants':'#4868a0','shoe':'#584028',
   'white':'#f8f0e8','black':'#2a2018','blush':'#f0a0a0','red':'#e04838','shoeDk':'#382818'}

def drawchar(s, cfg, dir=0, frame=0):
    skin=h2(cfg.get('skin',C['skin'])); hair=h2(cfg.get('hair',C['hair']))
    shirt=h2(cfg.get('shirt',C['shirt'])); pants=h2(cfg.get('pants',C['pants'])); shoes=h2(C['shoe'])
    hairHL=lighten(hair,40);hairSH=darken(hair,30)
    shirtHL=lighten(shirt,25);shirtSH=darken(shirt,30)
    pantsHL=lighten(pants,20);pantsSH=darken(pants,25)
    skinHL=lighten(skin,20);skinSH=darken(skin,25)
    f=frame%4; bob=-1 if f in (1,3) else 0
    leg=[0,1,0,-1]; legL=leg[f];legR=leg[(f+2)%4]
    def px(rx,ry,rw,rh,c): s.rect(rx,ry+bob,rw,rh,c)
    def dot(x,y,c): s.set(x,y+bob,c)
    # legs
    px(4,18+legL,3,4,pants);px(4,18+legL,3,1,pantsHL);px(4,21+legL,3,1,pantsSH)
    px(9,18+legR,3,4,pants);px(9,18+legR,3,1,pantsHL);px(9,21+legR,3,1,pantsSH)
    px(4,22+legL,3,1,shoes);px(9,22+legR,3,1,shoes)
    # body
    px(4,12,8,6,shirt);px(4,12,8,1,shirtHL);px(4,17,8,1,shirtSH)
    px(7,12,2,1,skin);dot(8,14,shirtSH);dot(8,16,shirtSH)
    px(4,14,2,3,shirtSH);px(10,14,2,3,shirtSH)
    px(2,12,2,5,shirt);px(2,12,2,1,shirtHL);px(2,16,2,1,skin)
    px(12,12,2,5,shirt);px(12,12,2,1,shirtHL);px(12,16,2,1,skin)
    # head
    hX,hY,hW,hH=3,1,10,10
    px(hX,hY,hW,3,hair);px(hX,hY,hW,1,hairHL)
    px(hX,hY+1,1,5,hair);px(hX+hW-1,hY+1,1,5,hair)
    if cfg.get('hairStyle')=='long': px(hX,hY+1,2,7,hair);px(hX+hW-2,hY+1,2,7,hair)
    px(hX+1,hY+2,hW-2,hH-3,skin);px(hX+1,hY+2,hW-2,1,skinHL)
    px(hX+2,hY+4,3,2,h2(C['white']));px(hX+6,hY+4,3,2,h2(C['white']))
    dot(hX+3,hY+5,h2(C['black']));dot(hX+7,hY+5,h2(C['black']))
    dot(hX+3,hY+4,h2(cfg.get('eye','#2848a0')));dot(hX+7,hY+4,h2(cfg.get('eye','#2848a0')))
    px(hX+2,hY+3,3,1,hairSH);px(hX+6,hY+3,3,1,hairSH)
    dot(hX+1,hY+6,h2(C['blush']));dot(hX+2,hY+6,h2(C['blush']))
    dot(hX+8,hY+6,h2(C['blush']));dot(hX+9,hY+6,h2(C['blush']))
    px(hX+4,hY+7,3,1,darken(skin,40));dot(hX+5,hY+7,h2(C['red']))
    px(hX+3,hY+8,5,1,skinSH)
    px(5,11,6,1,shirtSH)

def add_outline(s, ocol=(38,24,18)):
    out=Spr(s.w,s.h)
    for y in range(s.h):
        for x in range(s.w): out.p[y][x]=s.p[y][x]
    for y in range(s.h):
        for x in range(s.w):
            if s.p[y][x] is None:
                # adjacent to opaque?
                nb=False
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    if 0<=x+dx<s.w and 0<=y+dy<s.h and s.p[y+dy][x+dx] is not None: nb=True;break
                if nb: out.p[y][x]=ocol
    return out

def add_ao(s):
    out=Spr(s.w,s.h)
    for y in range(s.h):
        for x in range(s.w):
            c=s.p[y][x]
            if c is None: out.p[y][x]=None; continue
            below = s.p[y+1][x] if y+1<s.h else None
            if below is None and isinstance(c,tuple):  # bottom edge -> AO + hue shift
                out.p[y][x]=hueshift_dark(c,28)
            else:
                out.p[y][x]=c
    return out

# ---- PNG ----
def save(fn,sprites,scale=10,pad=8,bg=(212,168,104)):
    cols=len(sprites); cw=sprites[0].w; ch=sprites[0].h
    W=cols*(cw*scale+pad)+pad; H=ch*scale+2*pad
    img=bytearray()
    rows=[]
    for Y in range(H):
        row=bytearray([0])
        for X in range(W):
            r,g,b=bg
            # which sprite
            col=(X-pad)//(cw*scale+pad)
            lx=(X-pad)-col*(cw*scale+pad)
            if 0<=col<cols and 0<=lx<cw*scale and pad<=Y<pad+ch*scale:
                sx=lx//scale; sy=(Y-pad)//scale
                c=sprites[col].p[sy][sx]
                if c is not None: r,g,b=c
            row+=bytes((r,g,b))
        rows+=row
    comp=zlib.compress(bytes(rows),9)
    def ch_(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(fn,'wb').write(b'\x89PNG\r\n\x1a\n'+ch_(b'IHDR',struct.pack('>IIBBBBB',W,H,8,2,0,0,0))+ch_(b'IDAT',comp)+ch_(b'IEND',b''))

cfgs=[
 {'skin':'#f8c8a0','hair':'#8e5e28','shirt':'#5888c8','pants':'#4868a0','eye':'#2848a0'},
 {'skin':'#c89060','hair':'#383028','shirt':'#58a858','pants':'#383848','eye':'#284828'},
 {'skin':'#8e6038','hair':'#e888a8','shirt':'#e878a0','pants':'#383848','hairStyle':'long','eye':'#483828'},
]
before=[]; after=[]
for cfg in cfgs:
    s=Spr(16,24); drawchar(s,cfg); before.append(s)
    s2=Spr(16,24); drawchar(s2,cfg); s2=add_ao(s2); s2=add_outline(s2); after.append(s2)
save('/tmp/char_before.png',before,scale=12)
save('/tmp/char_after.png',after,scale=12)
print('done')
