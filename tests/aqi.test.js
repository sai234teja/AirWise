'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { aqiCategory, sanitize, buildPlan } = require('../lib/aqi');

test('aqiCategory maps bands and rejects bad input', () => {
  assert.strictEqual(aqiCategory(40), 'Good');
  assert.strictEqual(aqiCategory(180), 'Unhealthy');
  assert.strictEqual(aqiCategory(450), 'Hazardous');
  assert.throws(() => aqiCategory(-1), RangeError);
  assert.throws(() => aqiCategory(NaN), RangeError);
});
test('sanitize validates and clamps', () => {
  assert.throws(() => sanitize({ city: '<script>' }));
  assert.throws(() => sanitize(null));
  const p = sanitize({ city: ' Delhi ', household: ['asthma', 'x'], commute: 'rocket', km: 9999 });
  assert.deepStrictEqual(p, { city: 'Delhi', household: ['asthma'], commute: 'car', km: 200, lang: 'en' });
});
test('high AQI plan recommends N95 and indoor exercise', () => {
  const plan = buildPlan({ household: ['children'], commute: 'car', km: 10 }, 320);
  assert.ok(plan.routine.some((r) => r.includes('N95')));
  assert.ok(plan.routine[0].includes('indoors'));
});
test('impact is quantified for car commuters only', () => {
  assert.match(buildPlan({ household: [], commute: 'car', km: 10 }, 80).impact, /15\.0 kg/);
  assert.match(buildPlan({ household: [], commute: 'walk', km: 10 }, 80).impact, /already low-emission/);
});
test('plans are localised for Hindi and Telugu', () => {
  assert.match(buildPlan({ household: [], commute: 'bus', km: 5, lang: 'hi' }, 80).routine[0], /दोपहर/);
  assert.match(buildPlan({ household: [], commute: 'bus', km: 5, lang: 'te' }, 80).category, /మధ్యస్థం/);
  assert.strictEqual(sanitize({ city: 'Pune', lang: 'xx' }).lang, 'en');
});
