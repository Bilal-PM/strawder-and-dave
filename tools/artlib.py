import zlib,struct,random
def h2(c):
    if isinstance(c,tuple):return c
    c=c.lstrip('#');return (int(c[0:2],16),int(c[2:4],16),int(c[4:6],16))
def lighten(c,a):r,g,b=h2(c);return(min(255,r+a),min(255,g+a),min(255,b+a))
def darken(c,a):r,g,b=h2(c);return(max(0,r-a),max(0,g-a),max(0,b-a))
def huedark(c,a):r,g,b=h2(c);return(max(0,r-a),max(0,g-int(a*1.1)),max(0,b-int(a*0.6)))
class Spr:
    def __init__(s,w,h):s.w=w;s.h=h;s.p=[[None]*w for _ in range(h)]
    def set(s,x,y,c):
        if 0<=x<s.w and 0<=y<s.h and c is not None:s.p[y][x]=c
    def rect(s,x,y,w,h,c):
        for j in range(h):
            for i in range(w):s.set(x+i,y+j,c)
OUT=(44,31,24)
def add_outline(s,ocol=OUT):
    o=Spr(s.w,s.h)
    for y in range(s.h):
        for x in range(s.w):o.p[y][x]=s.p[y][x]
    for y in range(s.h):
        for x in range(s.w):
            if s.p[y][x] is None:
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    if 0<=x+dx<s.w and 0<=y+dy<s.h and s.p[y+dy][x+dx] is not None:o.p[y][x]=ocol;break
    return o
def shade(s):
    o=Spr(s.w,s.h)
    for y in range(s.h):
        for x in range(s.w):
            c=s.p[y][x]
            if c is None:continue
            up=s.p[y-1][x] if y>0 else None;dn=s.p[y+1][x] if y+1<s.h else None
            lf=s.p[y][x-1] if x>0 else None;rt=s.p[y][x+1] if x+1<s.w else None
            if dn is None:o.p[y][x]=huedark(c,26)
            elif up is None:o.p[y][x]=lighten(c,16)
            elif lf is None or rt is None:o.p[y][x]=darken(c,10)
            else:o.p[y][x]=c
    return o
def finish(s):return add_outline(shade(s))
# ---- objects ----
def desk():
    s=Spr(32,22);wood=h2('#b07c44')
    s.rect(0,8,32,12,wood);s.rect(0,8,32,3,h2('#c9974f'))
    s.rect(11,1,10,7,h2('#454b54'));s.rect(12,2,8,5,h2('#2b3340'));s.rect(13,3,3,3,h2('#7fd0e0'));s.rect(15,8,2,2,h2('#454b54'))
    s.rect(9,15,12,3,h2('#d9cdb6'));s.rect(23,16,2,2,h2('#d9cdb6'));s.rect(26,11,3,3,h2('#e0e6ee'));s.rect(3,11,5,5,h2('#f4ecd8'))
    return finish(s)
def chair(col='#7a5cae'):
    s=Spr(14,16);seat=h2(col)
    s.rect(2,1,10,4,darken(seat,16));s.rect(1,5,12,8,seat);s.rect(1,5,12,2,lighten(seat,18));s.rect(3,13,2,3,h2('#4a4a55'));s.rect(9,13,2,3,h2('#4a4a55'))
    return finish(s)
def plant():
    s=Spr(16,20);pot=h2('#bd6a3c')
    s.rect(4,13,8,7,pot);s.rect(4,13,8,2,lighten(pot,20));s.rect(5,4,6,10,h2('#4f9a4c'));s.rect(3,7,4,6,h2('#6cb85f'));s.rect(9,6,4,7,h2('#6cb85f'));s.rect(6,2,4,5,h2('#6cb85f'));s.rect(5,10,6,3,h2('#327a3a'))
    return finish(s)
def sofa():
    s=Spr(40,20);body=h2('#c4694e');cush=h2('#d77f63')
    s.rect(0,2,40,16,body);s.rect(2,6,36,10,cush);s.rect(2,6,36,2,lighten(cush,16))
    for cx in(2,15,28):s.rect(cx,6,1,10,darken(body,18))
    s.rect(0,2,4,16,darken(body,12));s.rect(36,2,4,16,darken(body,12))
    return finish(s)
def bookshelf():
    s=Spr(20,28);fr=h2('#7e5630');s.rect(0,0,20,28,fr);s.rect(2,1,16,2,lighten(fr,18))
    books=['#c0503e','#4f86d6','#5bb56a','#e8c24a','#a877d8','#d77f4a']
    for r in range(3):
        x=3
        while x<17:
            w=2+(x%3);col=h2(books[(x+r)%6]);s.rect(x,4+r*8,w,6,col);s.rect(x,4+r*8,w,1,lighten(col,30));x+=w+1
    return finish(s)
def table():
    s=Spr(48,24);wood=h2('#b07c44');s.rect(0,4,48,16,wood);s.rect(0,4,48,3,h2('#c9974f'))
    s.rect(4,18,3,4,darken(wood,20));s.rect(41,18,3,4,darken(wood,20));s.rect(8,8,8,7,h2('#f4ecd8'));s.rect(22,7,10,7,h2('#3a4250'));s.rect(23,8,8,5,h2('#7fd0e0'));s.rect(36,9,5,4,h2('#e0e6ee'))
    return finish(s)
def watercooler():
    s=Spr(12,22);s.rect(2,8,8,14,h2('#dfe6ee'));s.rect(3,2,6,7,h2('#7fc8e6'));s.rect(3,2,6,2,h2('#aee0f2'));s.rect(2,8,8,2,h2('#b8c2cc'))
    return finish(s)
def whiteboard():
    s=Spr(28,16);s.rect(0,0,28,14,h2('#eef0ee'));s.rect(0,0,28,14,h2('#eef0ee'));s.rect(1,1,26,12,h2('#f6f8f6'))
    s.rect(3,3,14,1,h2('#5b8ef5'));s.rect(3,6,18,1,h2('#e05577'));s.rect(3,9,10,1,h2('#4aca8a'));s.rect(0,0,28,2,h2('#b8b4a8'));s.rect(0,13,28,2,h2('#9a9488'))
    return finish(s)
# ---- floors (full-bleed 16x16 pixel funcs) ----
def f_wood(x,y):
    base=h2('#c79a5e')
    c=base
    if x%16 in(0,6,11):c=h2('#a87f47')
    elif x%16 in(3,9,14):c=h2('#bd8f52')
    if y%16==0:c=darken(c,8)
    return c
def f_carpet(x,y):
    base=h2('#4f6f96')
    c=base if (x//2+y//2)%2 else lighten(base,6)
    return c
def f_tilefloor(x,y):
    base=h2('#d8d2c2')
    if x%8==0 or y%8==0:return darken(base,14)
    return base if (x//8+y//8)%2 else lighten(base,8)
def f_reception(x,y):  # warm light wood
    base=h2('#cda86a')
    c=base
    if x%16 in(0,7):c=h2('#b58e4f')
    if y%16==0:c=darken(c,7)
    return c
def f_grass(x,y):
    base=h2('#6fae4e');r=(x*7+y*13)%17
    if r==0:return h2('#62a043')
    if r==1:return h2('#7eba5a')
    return base
def f_gravel(x,y):
    g=h2('#b3a68c');r=(x*3+y*7)%11
    if r==0:return darken(g,12)
    if r==1:return lighten(g,12)
    return g
