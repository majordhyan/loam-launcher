import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
await mkdir('public/wardrobe', {recursive:true});
// Original LOAM field jacket skin and monogram cape; pixel textures, no borrowed game art.
const colors={paper:[244,243,238,255],ink:[23,23,21,255],accent:[193,95,60,255],deep:[159,74,43,255],muted:[177,173,161,255]};
function pixels(w,h){const p=Buffer.alloc(w*h*4);return {p,rect(x,y,rw,rh,c){for(let j=y;j<y+rh;j++)for(let i=x;i<x+rw;i++)Buffer.from(colors[c]).copy(p,(j*w+i)*4)}};}
const s=pixels(64,64);
s.rect(0,0,32,16,'paper');s.rect(0,0,32,5,'ink');s.rect(0,8,8,8,'ink');s.rect(24,8,8,8,'ink');
s.rect(8,8,8,2,'ink');s.rect(9,11,2,1,'ink');s.rect(13,11,2,1,'ink');s.rect(11,14,2,1,'deep');
s.rect(16,16,24,16,'accent');s.rect(20,20,8,2,'paper');s.rect(23,22,2,10,'deep');s.rect(21,24,2,3,'paper');
s.rect(40,16,16,16,'accent');s.rect(44,29,4,3,'paper');
s.rect(0,16,16,16,'ink');s.rect(4,20,4,8,'muted');s.rect(0,29,16,3,'ink');
s.rect(16,48,16,16,'ink');s.rect(20,52,4,8,'muted');s.rect(16,61,16,3,'ink');
s.rect(32,48,16,16,'accent');s.rect(36,61,4,3,'paper');
await sharp(s.p,{raw:{width:64,height:64,channels:4}}).png().toFile('public/wardrobe/loam-field.png');
const c=pixels(64,32);c.rect(0,0,22,17,'deep');c.rect(1,1,10,16,'accent');c.rect(12,1,10,16,'accent');
for(const x of [1,12]){c.rect(x,14,10,2,'paper');c.rect(x+2,4,2,7,'paper');c.rect(x+4,9,4,2,'paper');}
await sharp(c.p,{raw:{width:64,height:32,channels:4}}).png().toFile('public/wardrobe/loam-cape.png');
