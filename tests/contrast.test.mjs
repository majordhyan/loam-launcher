import test from 'node:test';import assert from 'node:assert/strict';
function luminance(hex){const v=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const [name,a,b,min] of [['body','#171715','#F4F3EE',4.5],['secondary','#6F6B60','#F4F3EE',4.5],['links','#9F4A2B','#F4F3EE',4.5],['small primary','#FFFFFF','#9F4A2B',4.5],['large Play','#FFFFFF','#C15F3C',3],['selected text','#171715','#EDDED5',4.5]])test(`${name} contrast`,()=>{const r=ratio(a,b);console.log(`${name}: ${r.toFixed(2)}:1`);assert.ok(r>=min)});
