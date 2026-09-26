/* LINESIDE — editorial flat-vector portraits (SVG).
 * Style reference: modern flat illustration (two-tone shading, simplified features),
 * the look used by narrative games like Florence and editorial illustration.
 * LS.portrait(look, mood) -> SVG markup string. mood: 'neutral' | 'smile' | 'concern'
 */
window.LS = window.LS || {};
(function () {
  let uid = 0;
  function shade(hex, amt) { // amt < 0 darkens, > 0 lightens
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
    r = Math.round(r + (f - r) * t); g = Math.round(g + (f - g) * t); b = Math.round(b + (f - b) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  LS.shade = shade;

  LS.portrait = function (look, mood) {
    if (!look) return '';
    mood = mood || 'neutral';
    const id = 'p' + (++uid);
    const skin = look.skin, skinS = shade(skin, -0.16), skinD = shade(skin, -0.3);
    const hair = look.hair, hairS = shade(hair, -0.22), hairL = shade(hair, 0.18);
    const top = look.top, topS = shade(top, -0.22), topL = shade(top, 0.12);
    const bg = look.bg || '#ddd';
    let s = `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
    s += `<defs><clipPath id="${id}c"><circle cx="60" cy="65" r="60"/></clipPath>`;
    s += `<clipPath id="${id}h"><ellipse cx="60" cy="56" rx="23" ry="27"/></clipPath>`;
    s += `<clipPath id="${id}b"><path d="M6 132 C8 106 28 96 46 93 L74 93 C92 96 112 106 114 132 Z"/></clipPath>`;
    s += `<radialGradient id="${id}g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${shade(bg, 0.25)}"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs>`;
    s += `<g clip-path="url(#${id}c)"><rect width="120" height="130" fill="url(#${id}g)"/>`;

    // Hair behind the head
    const hs = look.hairStyle;
    if (hs === 'long') s += `<path d="M34 50 C30 80 32 104 40 112 L80 112 C88 104 90 80 86 50 Z" fill="${hairS}"/>`;
    if (hs === 'bob') s += `<path d="M33 48 C31 70 33 82 38 86 L82 86 C87 82 89 70 87 48 Z" fill="${hairS}"/>`;
    if (hs === 'ponytail') s += `<path d="M78 40 C96 44 98 70 90 92 C86 80 84 64 76 54 Z" fill="${hairS}"/>`;
    if (hs === 'curly') {
      for (const [x, y, r] of [[40, 34, 13], [52, 24, 14], [68, 24, 14], [80, 34, 13], [36, 50, 10], [84, 50, 10]])
        s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${hairS}"/>`;
    }

    // Body + clothing
    s += `<path d="M6 132 C8 106 28 96 46 93 L74 93 C92 96 112 106 114 132 Z" fill="${top}"/>`;
    s += `<g clip-path="url(#${id}b)">`;
    s += `<path d="M60 93 L114 132 L114 100 C100 96 84 93 74 93 Z" fill="${topS}" opacity="0.55"/>`;
    const ts = look.topStyle;
    if (ts === 'hivis') {
      s += `<rect x="0" y="110" width="120" height="5" fill="#dfe3e6"/><rect x="0" y="120" width="120" height="5" fill="#dfe3e6"/>`;
      s += `<rect x="40" y="93" width="6" height="40" fill="#dfe3e6"/><rect x="74" y="93" width="6" height="40" fill="#dfe3e6"/>`;
    } else if (ts === 'suit') {
      s += `<path d="M48 93 L60 120 L72 93 Z" fill="#f2efe9"/><path d="M57 98 L60 96 L63 98 L61 122 L59 122 Z" fill="${shade(top, -0.45)}"/>`;
      s += `<path d="M46 93 L60 124 L50 104 L40 98 Z" fill="${topL}"/><path d="M74 93 L60 124 L70 104 L80 98 Z" fill="${topS}"/>`;
    } else if (ts === 'cardigan') {
      s += `<path d="M50 93 L60 118 L70 93 Z" fill="#efe6d6"/><path d="M50 93 L58 132 L52 132 L44 96 Z" fill="${topS}"/><path d="M70 93 L62 132 L68 132 L76 96 Z" fill="${topS}"/>`;
    } else if (ts === 'jacket') {
      s += `<path d="M48 93 L60 110 L72 93 Z" fill="${shade(top, 0.55)}"/><path d="M46 93 L58 114 L48 106 L38 99 Z" fill="${topL}"/><path d="M74 93 L62 114 L72 106 L82 99 Z" fill="${topS}"/>`;
    } else {
      s += `<path d="M50 93 C52 100 68 100 70 93 Z" fill="${skinS}"/>`;
    }
    s += `</g>`;

    // Neck + ears
    s += `<path d="M51 76 L51 96 C55 100 65 100 69 96 L69 76 Z" fill="${skinS}"/>`;
    s += `<ellipse cx="37" cy="60" rx="4.5" ry="6.5" fill="${skinS}"/><ellipse cx="83" cy="60" rx="4.5" ry="6.5" fill="${skinS}"/>`;
    // Head with two-tone shading (light from the upper left)
    s += `<ellipse cx="60" cy="56" rx="23" ry="27" fill="${skin}"/>`;
    s += `<g clip-path="url(#${id}h)"><ellipse cx="76" cy="62" rx="16" ry="30" fill="${skinS}" opacity="0.45"/><ellipse cx="60" cy="88" rx="26" ry="8" fill="${skinS}" opacity="0.5"/></g>`;

    // Beard
    if (look.beard) s += `<path d="M38 58 C39 80 50 86 60 86 C70 86 81 80 82 58 C78 70 72 72 66 72 C62 69 58 69 54 72 C48 72 42 70 38 58 Z" fill="${hair}"/>`;

    // Features
    const browY = mood === 'concern' ? 50 : 49;
    const bt = mood === 'concern' ? 2.2 : (mood === 'smile' ? -0.6 : 0);
    s += `<path d="M46 ${browY + bt} Q51 ${browY - 2.5} 56 ${browY}" stroke="${hairS}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M64 ${browY} Q69 ${browY - 2.5} 74 ${browY + bt}" stroke="${hairS}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    if (mood === 'smile') {
      s += `<path d="M47.5 58 Q51 55 54.5 58" stroke="#2a1d1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M65.5 58 Q69 55 72.5 58" stroke="#2a1d1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    } else {
      s += `<ellipse cx="51" cy="58" rx="2.3" ry="2.8" fill="#2a1d1a"/><ellipse cx="69" cy="58" rx="2.3" ry="2.8" fill="#2a1d1a"/>`;
      s += `<circle cx="51.8" cy="57" r="0.8" fill="#fff" opacity="0.8"/><circle cx="69.8" cy="57" r="0.8" fill="#fff" opacity="0.8"/>`;
    }
    s += `<path d="M60 60 Q57 67 59 69 Q61 70 63 69" stroke="${skinD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7"/>`;
    s += `<ellipse cx="46" cy="67" rx="4" ry="2.4" fill="#e0706a" opacity="0.18"/><ellipse cx="74" cy="67" rx="4" ry="2.4" fill="#e0706a" opacity="0.18"/>`;
    const mouthCol = look.beard ? shade(hair, -0.4) : '#8a3f3a';
    const mouth = mood === 'smile' ? `M53 74 Q60 80 67 74` : mood === 'concern' ? `M54 77 Q60 73.5 66 77` : `M54 75.5 Q60 77.5 66 75.5`;
    s += `<path d="${mouth}" stroke="${mouthCol}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

    // Hair on top
    if (hs === 'short') s += `<path d="M36 54 C34 30 48 22 62 23 C76 23 87 32 84 54 C81 42 74 36 62 37 C54 37 48 34 44 38 C40 42 38 48 36 54 Z" fill="${hair}"/>`;
    if (hs === 'bun') s += `<circle cx="60" cy="24" r="10" fill="${hair}"/><path d="M36 52 C35 32 48 26 60 26 C72 26 85 32 84 52 C80 40 70 35 60 35 C50 35 40 40 36 52 Z" fill="${hair}"/><path d="M52 28 Q60 24 68 28" stroke="${hairL}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
    if (hs === 'long' || hs === 'bob') s += `<path d="M35 64 C31 34 46 24 60 24 C76 24 90 34 85 64 C82 48 78 40 70 36 C62 42 48 44 40 42 C37 48 36 56 35 64 Z" fill="${hair}"/>`;
    if (hs === 'ponytail') s += `<path d="M36 54 C34 32 48 24 60 24 C74 24 86 32 84 52 C80 40 72 36 60 36 C50 36 42 40 36 54 Z" fill="${hair}"/><circle cx="80" cy="38" r="4" fill="${shade(look.top, -0.1)}"/>`;
    if (hs === 'curly') {
      for (const [x, y, r] of [[42, 38, 10], [50, 29, 11], [60, 26, 11], [70, 29, 11], [78, 38, 10]])
        s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${hair}"/>`;
      s += `<circle cx="54" cy="26" r="3" fill="${hairL}" opacity="0.35"/>`;
    }

    // Accessories
    if (look.glasses) {
      s += `<g stroke="#2b2522" stroke-width="1.8" fill="rgba(255,255,255,0.12)"><circle cx="51" cy="58" r="6.2"/><circle cx="69" cy="58" r="6.2"/></g>`;
      s += `<path d="M57.2 58 Q60 56 62.8 58" stroke="#2b2522" stroke-width="1.8" fill="none"/>`;
    }
    if (look.hat) {
      s += `<path d="M34 44 C33 20 87 20 86 44 Z" fill="${look.hat}"/><path d="M58 24 C57 30 57 38 58 44 L62 44 C63 38 63 30 62 24 Z" fill="${shade(look.hat, -0.12)}"/>`;
      s += `<rect x="28" y="42" width="64" height="6" rx="3" fill="${shade(look.hat, -0.08)}"/><path d="M40 30 Q48 24 56 24" stroke="#fff" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    }
    s += `</g></svg>`;
    return s;
  };
})();
