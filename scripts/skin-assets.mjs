import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
await mkdir('public/wardrobe', { recursive: true });
// Original LOAM Field skin and cape: hand-placed pixel art, no borrowed game art.
// A field explorer in LOAM's terracotta jacket with brass goggles, a cream "L" patch, a leather
// belt, olive cargo trousers and laced boots. Faces are drawn as character grids; each face then
// gets light from above (top brighter, sides and back darker, bottom darkest) and a little
// deterministic grain so flat colours read as cloth, leather and hair.

const P = {
  // hair: darkest → highlight
  a: [30, 21, 18], b: [48, 33, 26], c: [70, 47, 34], d: [96, 66, 45],
  // skin: shadow → highlight, blush
  s: [170, 113, 84], t: [196, 138, 104], u: [219, 163, 126], v: [235, 186, 150], r: [214, 136, 110],
  W: [242, 238, 230], I: [52, 112, 92], m: [146, 80, 66],
  // jacket (terracotta, LOAM accent at 2)
  0: [104, 44, 28], 1: [144, 63, 39], 2: [193, 95, 60], 3: [214, 124, 84], 4: [232, 156, 114],
  // cream shirt and patch
  x: [196, 184, 162], y: [226, 216, 196], z: [246, 241, 230],
  // leather, brass, sole
  o: [38, 27, 22], l: [64, 43, 31], n: [94, 63, 44], g: [222, 178, 96], h: [160, 116, 58], K: [24, 21, 19],
  // trousers (olive stone)
  p: [50, 50, 39], q: [70, 70, 53], w: [92, 90, 68], e: [116, 112, 85],
  // goggle lenses
  D: [40, 96, 100], E: [86, 162, 164], F: [176, 226, 222],
};

const W = 64;
const img = (h) => ({ h, px: Buffer.alloc(W * h * 4) });
const hash = (x, y, k) => { let n = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
const LIGHT = { top: 1.07, front: 1, side: 0.93, back: 0.9, bottom: 0.8 };
// Grain: hair and leather a little rougher than cloth; skin and lenses almost smooth.
const GRAIN = (ch) => ("abcd".includes(ch) ? 6 : "olnK".includes(ch) ? 5 : "stuvrWImDEFgh".includes(ch) ? 2 : 3.5);
const flip = (rows) => rows.map((r) => [...r].reverse().join(''));

function face(t, x0, y0, rows, light = 'front') {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const base = P[ch]; if (!base) throw new Error(`no colour ${ch}`);
    const g = (hash(x0 + x, y0 + y, t.h) - 0.5) * 2 * GRAIN(ch);
    // Light also falls off down each tall face, which gives the cloth some volume.
    const k = LIGHT[light] * (rows.length > 4 && light !== 'top' && light !== 'bottom' ? 1.05 - 0.1 * (y / (rows.length - 1)) : 1);
    const i = ((y0 + y) * W + x0 + x) * 4;
    for (let c = 0; c < 3; c++) t.px[i + c] = Math.max(0, Math.min(255, Math.round(base[c] * k + g)));
    t.px[i + 3] = 255;
  }));
}
const fill = (ch, w, h) => Array.from({ length: h }, () => ch.repeat(w));
// A box: top, bottom, right, front, left, back laid out the way Minecraft's skin format expects.
function box(t, x, y, w, h, d, f) {
  face(t, x + d, y, f.top ?? fill('2', w, d), 'top');
  face(t, x + d + w, y, f.bottom ?? fill('0', w, d), 'bottom');
  face(t, x, y + d, f.right, 'side');
  face(t, x + d, y + d, f.front, 'front');
  face(t, x + d + w, y + d, f.left, 'side');
  face(t, x + d + w + d, y + d, f.back, 'back');
}

const s = img(64);

// ---------------------------------------------------------------- head
const headSide = [ // character's right side: x 0 = back of head, x 7 = face
  'ccdccdcc',
  'bccdcccc',
  'bbcccccb',
  'bbccbuub',
  'abctsuut',
  'abbttuut',
  'aattuuut',
  'astttttt',
];
box(s, 0, 0, 8, 8, 8, {
  top: ['bccdccdb', 'ccdddccc', 'cdccdcdc', 'ccdcccdc', 'cdccdccc', 'ccdcddcc', 'cccdcccc', 'bcdccdcb'],
  bottom: ['sttttts', 'ttttttts', 'ttttttts', 'ttttttts', 'ttttttts', 'atttttta', 'aabbbbaa', 'aaaaaaaa'].map((r) => r.padEnd(8, 't').slice(0, 8)),
  right: headSide,
  front: [
    'bcdccdcb',
    'bccdcccb',
    'bcvcuvcb',
    'bbbuubbb',
    'tWIuuIWt',
    'turvtrut',
    'tuummuut',
    'stttttts',
  ],
  left: flip(headSide),
  back: ['ccdccdcc', 'cdcccdcc', 'ccdcdccc', 'bcccdccb', 'bccdcccb', 'bbccccbb', 'abbbbbba', 'aasssaaa'],
});
// Hat layer: brass goggles pushed up on the forehead, their strap all the way round, a few
// tufts of hair over the top.
box(s, 32, 0, 8, 8, 8, {
  top: ['........', '........', '........', '........', '........', '........', '.d...c..', 'c.d..d.c'],
  bottom: fill('.', 8, 8),
  right: ['c.d..c..', 'b.......', 'llllllll', '........', '........', '........', '........', '........'],
  front: ['.d...d..', 'lgghhggl', 'lFEhhFEl', '........', '........', '........', '........', '........'],
  left: ['..c..d.c', '.......b', 'llllllll', '........', '........', '........', '........', '........'],
  back: ['c.dc..dc', '.b....c.', 'lllhglll', '........', '........', '........', '........', '........'],
});

// ---------------------------------------------------------------- body
box(s, 16, 16, 8, 12, 4, {
  top: ['22233222', '2223y322', '233yy332', '33yzzy33'],
  bottom: ['qqqqqqqq', 'qqqqqqqq', 'qqqqqqqq', 'qqqqqqqq'],
  right: ['1222', '1222', '1222', '1223', '1223', '1222', '1222', '1222', 'olnl', '1221', '1221', '0110'],
  front: [
    '13zyyz31',
    '233xy332',
    '2221h222',
    '2112111' + '2',
    '2332133' + '2',
    '2332z33' + '2',
    '2222zz2' + '2',
    '12221221',
    'llngglll',
    '12221221',
    '12221221',
    '01110110',
  ],
  left: ['2221', '2221', '2221', '3221', '3221', '2221', '2221', '2221', 'lnlo', '1221', '1221', '0110'],
  back: [
    '13333331',
    '11111111',
    '22222222',
    '222zz222',
    '222z2222',
    '222z2222',
    '222zzz22',
    '12222221',
    'lllllllo',
    '12222221',
    '12222221',
    '01111110',
  ],
});
// Jacket layer: collar and lapels, 3-D pocket flaps, a flared hem.
box(s, 16, 32, 8, 12, 4, {
  top: fill('.', 8, 4), bottom: fill('.', 8, 4),
  right: ['3333', '....', '....', '....', '....', '....', '....', '....', '....', '....', '....', '1111'],
  front: ['33....33', '.3....3.', '........', '.11..11.', '........', '........', '........', '........', '........', '........', '........', '11110111'],
  left: ['3333', '....', '....', '....', '....', '....', '....', '....', '....', '....', '....', '1111'],
  back: ['34444443', '........', '........', '........', '........', '........', '........', '........', '........', '........', '........', '11111111'],
});

// ---------------------------------------------------------------- arms (4 px, classic)
// Drawn outer-edge first; mirrored where the texture runs the other way.
const armFront = ['3332', '2332', '2322', '2322', '2222', '2221', '2221', '2221', '3443', '1001', 'uvvu', 'tuut'];
const armOuter = ['3333', '2332', '2332', '2222', '2222', '2112', '2222', '2222', '3443', '1001', 'uvvt', 'tuut'];
const armInner = ['2222', '1221', '1221', '1221', '1111', '1111', '1111', '1111', '3443', '1001', 'tuut', 'sttt'];
const armBack = ['2222', '2221', '2221', '2221', '2221', '1221', '1221', '1221', '3443', '1001', 'tuut', 'sttt'];
const watch = ['....', '....', '....', '....', '....', '....', '....', '....', '....', 'lghl', '....', '....'];
const over = (a, b) => a.map((r, y) => [...r].map((c, x) => (b[y][x] !== '.' ? b[y][x] : c)).join(''));
// Right arm (character's right): front x0 is the outer edge; back x0 is the inner edge.
box(s, 40, 16, 4, 12, 4, { top: ['3333', '3333', '2332', '2222'], bottom: ['tttt', 'tsst', 'tsst', 'tttt'], right: armOuter, front: armFront, left: armInner, back: armBack });
// Left arm: mirrored, with a field watch on the wrist.
box(s, 32, 48, 4, 12, 4, { top: ['3333', '3333', '2332', '2222'], bottom: ['tttt', 'tsst', 'tsst', 'tttt'], right: armInner, front: over(flip(armFront), watch), left: flip(armOuter), back: flip(armBack) });
// Sleeve layer: a rolled cuff that stands out from the arm.
const cuff = { top: fill('.', 4, 4), bottom: fill('.', 4, 4), right: [...fill('.', 4, 8), '3443', ...fill('.', 4, 3)], front: [...fill('.', 4, 8), '3443', ...fill('.', 4, 3)], left: [...fill('.', 4, 8), '3443', ...fill('.', 4, 3)], back: [...fill('.', 4, 8), '3443', ...fill('.', 4, 3)] };
box(s, 40, 32, 4, 12, 4, cuff);
box(s, 48, 48, 4, 12, 4, cuff);

// ---------------------------------------------------------------- legs
const legFront = ['wwwq', 'weww', 'weww', 'wewq', 'wewq', 'qeqq', 'qwwq', 'wewq', 'nnnl', 'lnxl', 'lxnl', 'KKKK'];
const legOuter = ['wwww', 'wwww', 'qppq', 'qqqq', 'qqqq', 'qqqq', 'wwww', 'wwwq', 'nnnl', 'llll', 'llll', 'KKKK'];
const legInner = ['qqqq', 'qwwq', 'qwwq', 'qwwq', 'qwwq', 'qqqq', 'qwwq', 'qqqq', 'nnnl', 'llll', 'olll', 'KKKK'];
const legBack = ['qwwq', 'qwwq', 'qwwq', 'qwwq', 'qqqq', 'qwwq', 'qwwq', 'qqqq', 'nnnl', 'llll', 'llll', 'KKKK'];
// Right leg: front x0 is the outer edge.
box(s, 0, 16, 4, 12, 4, { top: fill('w', 4, 4), bottom: fill('K', 4, 4), right: legOuter, front: legFront, left: legInner, back: legBack });
box(s, 16, 48, 4, 12, 4, { top: fill('w', 4, 4), bottom: fill('K', 4, 4), right: legInner, front: flip(legFront), left: flip(legOuter), back: flip(legBack) });
// Trouser layer: the boot's folded cuff.
const boot = { top: fill('.', 4, 4), bottom: fill('.', 4, 4), right: [...fill('.', 4, 8), 'nnnn', ...fill('.', 4, 3)], front: [...fill('.', 4, 8), 'nnnl', ...fill('.', 4, 3)], left: [...fill('.', 4, 8), 'nnnn', ...fill('.', 4, 3)], back: [...fill('.', 4, 8), 'nnnn', ...fill('.', 4, 3)] };
box(s, 0, 32, 4, 12, 4, boot);
box(s, 0, 48, 4, 12, 4, { ...boot, front: [...fill('.', 4, 8), 'lnnn', ...fill('.', 4, 3)] });

await sharp(s.px, { raw: { width: 64, height: 64, channels: 4 } }).png().toFile('public/wardrobe/loam-field.png');

// ---------------------------------------------------------------- cape (64 × 32)
// Outside: terracotta with a tone-on-tone stitched border and LOAM's "L"; inside: a darker lining.
const c = img(32);
face(c, 1, 0, ['3333333333'], 'top');
face(c, 11, 0, ['0000000000'], 'bottom');
face(c, 0, 1, fill('1', 1, 16), 'side');
face(c, 11, 1, fill('1', 1, 16), 'side');
face(c, 1, 1, [
  '1444444441',
  '1222222221',
  '1232323231',
  '1222222221',
  '1322zz2231',
  '1222zz2221',
  '1322zz2231',
  '1222zz2221',
  '1322zz2231',
  '1222zz2221',
  '1322zzzz31',
  '1222zzzz21',
  '1322222231',
  '1222222221',
  '1232323231',
  '0101010101',
], 'front');
face(c, 12, 1, [
  '0111111110', ...Array.from({ length: 14 }, (_, i) => (i % 3 === 1 ? '0110110110' : '0111111110')), '0000000000',
], 'back');
await sharp(c.px, { raw: { width: 64, height: 32, channels: 4 } }).png().toFile('public/wardrobe/loam-cape.png');
console.log('wrote public/wardrobe/loam-field.png and loam-cape.png');
