'use strict';
const test = require('node:test');
const assert = require('node:assert');
const handler = require('../api/advice');

const res = () => { const r = { code: 200, body: null, setHeader() {} };
  r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const req = (ip, body, method = 'POST') => ({ method, body, headers: { 'x-forwarded-for': ip } });
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const mockFetch = (found = true) => async (url) => {
  if (url.includes('geocoding')) return ok(found ? { results: [{ name: 'Delhi', country: 'India', latitude: 28.6, longitude: 77.2 }] } : {});
  if (url.includes('air-quality')) return ok({ current: { us_aqi: 210 } });
  return ok({ candidates: [{ content: { parts: [{ text: 'AI says wear a mask.' }] } }] });
};

test('rejects non-POST and invalid city', async () => {
  let r = res(); await handler(req('1.1.1.1', {}, 'GET'), r); assert.strictEqual(r.code, 405);
  r = res(); await handler(req('1.1.1.2', { city: '<b>' }), r); assert.strictEqual(r.code, 400);
});
test('returns plan from live AQI without Gemini key', async () => {
  delete process.env.GEMINI_API_KEY; global.fetch = mockFetch();
  const r = res(); await handler(req('2.2.2.2', { city: 'Delhi', household: ['asthma'] }), r);
  assert.strictEqual(r.code, 200); assert.strictEqual(r.body.aqi, 210);
  assert.strictEqual(r.body.summary, null); assert.ok(r.body.routine.some((x) => x.includes('N95')));
});
test('includes Gemini summary when key present', async () => {
  process.env.GEMINI_API_KEY = 'test'; global.fetch = mockFetch();
  const r = res(); await handler(req('3.3.3.3', { city: 'Delhi' }), r);
  assert.strictEqual(r.body.summary, 'AI says wear a mask.'); delete process.env.GEMINI_API_KEY;
});
test('502 when city not found; 429 after 10 requests', async () => {
  global.fetch = mockFetch(false);
  let r = res(); await handler(req('4.4.4.4', { city: 'Nowhere' }), r); assert.strictEqual(r.code, 502);
  for (let i = 0; i < 11; i++) { r = res(); await handler(req('5.5.5.5', { city: 'Nowhere' }), r); }
  assert.strictEqual(r.code, 429);
});
