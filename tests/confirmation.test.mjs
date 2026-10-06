import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmsGameName } from '../src/lib/confirmation.ts';
test('removal confirmation accepts casing and surrounding whitespace, rejects partial or different names', () => {
 assert.equal(confirmsGameName('  MY WORLD  ', 'My World'), true);
 assert.equal(confirmsGameName('My World', 'My World'), true);
 assert.equal(confirmsGameName('My', 'My World'), false);
 assert.equal(confirmsGameName('My World 2', 'My World'), false);
 assert.equal(confirmsGameName(' ', ' '), false);
});
