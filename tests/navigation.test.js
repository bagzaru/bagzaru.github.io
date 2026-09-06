import test from 'node:test';
import assert from 'node:assert/strict';
import { PageNavigation } from '../src/navigation.js';

test('long documents scroll before navigating', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.vertical(1, { top: 100, max: 900, now: 1000 }), 'scroll');
  assert.equal(nav.index, 0);
});

test('document bottom requires 200ms and a new gesture', () => {
  const nav = new PageNavigation(11);
  nav.observe(900, 900, 1000);
  assert.equal(nav.vertical(1, { top: 900, max: 900, now: 1199 }), 'wait');
  assert.equal(nav.vertical(1, { top: 900, max: 900, now: 1200 }), 'wait');
  assert.equal(nav.vertical(1, { top: 900, max: 900, now: 1400 }), 'page');
  assert.equal(nav.index, 1);
});

test('continued trackpad momentum cannot turn another short page', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 0 }), 'wait');
  for (let now = 40; now < 400; now += 40) assert.equal(nav.vertical(1, { top: 0, max: 0, now }), 'wait');
  assert.equal(nav.index, 0);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 600 }), 'page');
  for (let now = 640; now < 1800; now += 40) assert.equal(nav.vertical(1, { top: 0, max: 0, now }), 'wait');
  assert.equal(nav.index, 1);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 2000 }), 'wait');
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 2200 }), 'page');
});

test('short-page backwards navigation needs only one gesture and clears confirmation', () => {
  const nav = new PageNavigation(11, 5);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 0 }), 'wait');
  assert.equal(nav.vertical(-1, { top: 0, max: 0, now: 200 }), 'page');
  assert.equal(nav.index, 4);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 1400 }), 'wait');
});

test('keyboard down can still navigate a short page with one press', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 0, fresh: true, confirmShortForward: false }), 'page');
});

test('a layout that becomes scrollable clears short-page confirmation', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 0 }), 'wait');
  nav.observe(0, 500, 200);
  nav.observe(0, 0, 400);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 600 }), 'wait');
});

test('top edge follows the same delay when moving backwards', () => {
  const nav = new PageNavigation(11, 5);
  nav.observe(0, 500, 0);
  assert.equal(nav.vertical(-1, { top: 0, max: 500, now: 199, fresh: true }), 'wait');
  assert.equal(nav.vertical(-1, { top: 0, max: 500, now: 200, fresh: true }), 'page');
  assert.equal(nav.index, 4);
});

test('leaving and returning to an edge restarts the delay', () => {
  const nav = new PageNavigation(11);
  nav.observe(500, 500, 0);
  nav.observe(400, 500, 450);
  nav.observe(500, 500, 500);
  assert.equal(nav.vertical(1, { top: 500, max: 500, now: 699, fresh: true }), 'wait');
  assert.equal(nav.vertical(1, { top: 500, max: 500, now: 700, fresh: true }), 'page');
});

test('held arrow key scrolls but cannot repeatedly turn pages', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.vertical(1, { top: 10, max: 500, now: 0, fresh: false }), 'scroll');
  nav.observe(500, 500, 200);
  assert.equal(nav.vertical(1, { top: 500, max: 500, now: 800, fresh: false }), 'wait');
  assert.equal(nav.vertical(1, { top: 500, max: 500, now: 900, fresh: true }), 'page');
});

test('direct page moves bypass inner scrolling, with 1000ms transition lock', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.move(8, 0), true);
  assert.equal(nav.move(9, 999), false);
  assert.equal(nav.move(9, 1000), true);
});

test('first and last pages never wrap or leave valid range', () => {
  const nav = new PageNavigation(11);
  assert.equal(nav.move(-1, 0), false);
  assert.equal(nav.move(10, 0), true);
  assert.equal(nav.vertical(1, { top: 0, max: 0, now: 1000 }), 'wait');
  assert.equal(nav.index, 10);
});
