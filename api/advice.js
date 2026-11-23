'use strict';
const { sanitize, buildPlan } = require('../lib/aqi');
const NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu' };
const hits = new Map(); // naive per-instance rate limit

const getJson = async (url, opts = {}) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), ...opts });
  if (!r.ok) throw new Error(`Upstream ${r.status}`);
  return r.json();
};

async function liveAqi(city) {
  const g = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`);
  const p = g.results && g.results[0];
  if (!p) throw new Error('City not found.');
  const a = await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.latitude}&longitude=${p.longitude}&current=us_aqi`);
  return { aqi: Math.round(a.current.us_aqi), place: `${p.name}, ${p.country || ''}`.replace(/, $/, '') };
}

async function aiSummary(profile, plan) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const prompt = `You are a caring air-quality coach. In under 90 words, written in ${NAMES[profile.lang]}, plainly explain to a family in ${profile.city} (AQI ${plan.aqi}, ${plan.category}; sensitive members: ${profile.household.join(', ') || 'none'}) why today's steps matter and the direct health impact. No medical diagnosis. Plan: ${JSON.stringify(plan.routine.concat(plan.indoor))}`;
  try {
    const d = await getJson('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    return String(d.candidates[0].content.parts[0].text).slice(0, 800);
  } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const ip = String(req.headers['x-forwarded-for'] || 'anon').split(',')[0];
  const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  hits.set(ip, [...recent, now]);
  let profile;
  try { profile = sanitize(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    const { aqi, place } = await liveAqi(profile.city);
    const plan = buildPlan(profile, aqi);
    res.status(200).json({ place, ...plan, summary: await aiSummary(profile, plan) });
  } catch (e) { res.status(502).json({ error: e.message || 'Air data unavailable.' }); }
};
