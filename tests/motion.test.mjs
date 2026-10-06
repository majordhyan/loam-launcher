import { test } from "node:test";
import assert from "node:assert/strict";
import { preference, resolveMotion, direction } from "../src/motion/policy.ts";
import { createNavigator } from "../src/motion/navigation.ts";

test("motion follows OS, honors Off, and does not persist session downgrade", () => {
  assert.equal(preference(null), "system");
  assert.equal(preference(null, true), "reduced");
  assert.equal(preference("invalid"), "system");
  assert.equal(resolveMotion("full", true), "reduced");
  assert.equal(resolveMotion("off", false), "off");
  assert.equal(resolveMotion("full", false, true), "off");
  assert.equal(resolveMotion("full", false, false, true), "reduced");
  assert.equal(resolveMotion("full", false), "full");
  assert.equal(direction("settings", "home", ["home", "settings"]), -1);
});

test("rapid navigation ignores superseded callbacks and cancels on cleanup", async () => {
  const callbacks = []; let skipped = 0, updates = [];
  const target = {style:{}};
  const doc = {hidden:false,querySelector:()=>target,startViewTransition:fn=>{
    callbacks.push(fn); return {skipTransition(){skipped++;},finished:new Promise(()=>{})};
  }};
  const nav = createNavigator(doc,()=>true);
  for(let i=0;i<10;i++) nav.go(()=>updates.push(i));
  callbacks.forEach(fn=>fn());
  assert.deepEqual(updates,[9]); assert.equal(skipped,9);
  nav.cancel(); assert.equal(skipped,10);
});

test("off, hidden and unsupported navigation updates synchronously", () => {
  for(const doc of [{hidden:false}, {hidden:true,startViewTransition(){throw Error('must not animate');}}]) {
    let updated=false; createNavigator(doc,()=>true).go(()=>updated=true); assert.equal(updated,true);
  }
  let updated=false; createNavigator({startViewTransition(){throw Error('must not animate');}},()=>false).go(()=>updated=true); assert.equal(updated,true);
});

test("switching to instant navigation clears interrupted snapshot state", () => {
  const target = {style:{viewTransitionName:"loam-content"}};
  const root = {dataset:{viewTransitionActive:"true"}};
  const doc = {documentElement:root, hidden:false, querySelectorAll:()=>[target]};
  let updated = false;
  createNavigator(doc,()=>false).go(()=>{updated=true;});
  assert.equal(updated,true);
  assert.equal(root.dataset.viewTransitionActive,"false");
  assert.equal(target.style.viewTransitionName,"");
});
