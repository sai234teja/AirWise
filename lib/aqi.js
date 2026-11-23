'use strict';
const { STR, LANGS } = require('./i18n');
const BANDS = [[50, 'Good'], [100, 'Moderate'], [150, 'Unhealthy for sensitive groups'],
  [200, 'Unhealthy'], [300, 'Very unhealthy'], [Infinity, 'Hazardous']];
const GROUPS = ['children', 'elderly', 'asthma', 'pregnant'];
const COMMUTES = { car: 0.17, bike: 0.07, bus: 0.03, metro: 0.02, walk: 0 }; // kg CO2e/km (approx.)

function bandIndex(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) throw new RangeError('AQI must be a non-negative number');
  return BANDS.findIndex((b) => aqi <= b[0]);
}
const aqiCategory = (aqi) => BANDS[bandIndex(aqi)][1];

function sanitize(body) {
  const b = body && typeof body === 'object' ? body : {};
  const city = String(b.city || '').trim();
  if (!/^[\p{L}\s.'-]{2,60}$/u.test(city)) throw new Error('Enter a valid city name (2-60 letters).');
  const household = Array.isArray(b.household) ? b.household.filter((g) => GROUPS.includes(g)) : [];
  const commute = Object.hasOwn(COMMUTES, b.commute) ? b.commute : 'car';
  const km = Math.min(Math.max(Number(b.km) || 0, 0), 200);
  const lang = LANGS.includes(b.lang) ? b.lang : 'en';
  return { city, household, commute, km, lang };
}

function buildPlan({ household, commute, km, lang = 'en' }, aqi) {
  const t = STR[lang] || STR.en, idx = bandIndex(aqi);
  const high = aqi > 150, sensitive = household.length > 0 && aqi > 100;
  const routine = [high ? t.high : t.low, t.check];
  if (high || sensitive) routine.push(t.mask);
  const indoor = [t.win, t.purifier, t.mop, t.cook];
  if (household.includes('asthma')) indoor.push(t.asthma);
  const alternatives = [t.share, t.burn];
  const saved = ['metro', 'walk', 'bike'].includes(commute) ? 0 : (COMMUTES[commute] - COMMUTES.metro) * km * 10;
  const impact = saved > 0 ? t.save(km, t.cm[commute], saved.toFixed(1)) : t.ok;
  return { aqi, category: t.cats[idx], routine, indoor, alternatives, impact };
}

module.exports = { aqiCategory, sanitize, buildPlan, COMMUTES, GROUPS };
