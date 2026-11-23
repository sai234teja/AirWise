# AirWise: Urban Air Quality Assistant

AI-powered urban air quality assistant with personalized health and commute recommendations.

GenAI assistant for families facing winter smog. Enter a city and household; get live AQI, a low-emission routine, indoor air hacks, sustainable alternatives and a quantified impact.

- **Gen AI:** Google Gemini (gemini-2.5-flash) writes the personalised impact explanation in pi/advice.js. Without a key the app still works using the rule engine.
- **Data:** Open-Meteo geocoding and air-quality APIs (no key).
- **Security:** server-side key, input validation/allow-lists, rate limiting, CSP headers, 	extContent rendering (no XSS).
- **Accessibility:** labels, fieldset/legend, live region, focus management, 44px targets, dark mode, reduced motion.
- **Testing:** 
pm test (Node built-in runner, zero deps): unit tests plus API tests with mocked network; GitHub Actions CI on every push.
- **Languages:** English, Hindi, Telugu (UI, plan and AI summary). **PWA:** installable, offline shell.

## Run


pm test then GEMINI_API_KEY=... npx vercel dev.

Deploy: import the repo on Vercel and set GEMINI_API_KEY.

Disclaimer: general guidance, not medical advice. CO2 factors are approximate.
