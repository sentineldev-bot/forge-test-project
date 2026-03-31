/**
 * Weather App — Test Suite (SEN-339)
 *
 * Runs in Node.js — validates API layer logic and utility functions.
 * Usage: node tests.js
 */
'use strict';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log('  ✅ ' + testName);
  } else {
    failed++;
    errors.push(testName);
    console.log('  ❌ ' + testName);
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    console.log('  ✅ ' + testName);
  } else {
    failed++;
    errors.push(testName + ' (got: ' + JSON.stringify(actual) + ', expected: ' + JSON.stringify(expected) + ')');
    console.log('  ❌ ' + testName + ' — got: ' + JSON.stringify(actual) + ', expected: ' + JSON.stringify(expected));
  }
}

// ------------------------------------------------------------------
// Mock browser globals for loading weather-api.js
// ------------------------------------------------------------------
global.window = {};
global.fetch = async function () { return { ok: true, json: async () => ({}) }; };

// Load the API module
require('./weather-api.js');
const API = global.window.WeatherAPI;

// ==================================================================
console.log('\n🧪 Weather API Test Suite\n');

// ------------------------------------------------------------------
console.log('📦 Module Loading');
assert(typeof API === 'object', 'WeatherAPI is exported');
assert(typeof API.searchCities === 'function', 'searchCities is a function');
assert(typeof API.fetchWeather === 'function', 'fetchWeather is a function');
assert(typeof API.reverseGeocode === 'function', 'reverseGeocode is a function');
assert(typeof API.decodeWeatherCode === 'function', 'decodeWeatherCode is a function');
assert(typeof API.windDirection === 'function', 'windDirection is a function');
assert(typeof API.uvLabel === 'function', 'uvLabel is a function');
assert(typeof API.formatDay === 'function', 'formatDay is a function');
assert(typeof API.WMO_CODES === 'object', 'WMO_CODES is exported');

// ------------------------------------------------------------------
console.log('\n🌤️ WMO Weather Codes');
const wmoCodes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99];
wmoCodes.forEach(code => {
  const result = API.decodeWeatherCode(code, false);
  assert(result.desc && result.icon, 'WMO code ' + code + ' → "' + result.desc + '" ' + result.icon);
});

// Day vs night icons
const clearDay = API.decodeWeatherCode(0, false);
const clearNight = API.decodeWeatherCode(0, true);
assertEqual(clearDay.icon, '☀️', 'Clear day icon is ☀️');
assertEqual(clearNight.icon, '🌙', 'Clear night icon is 🌙');

// Unknown code
const unknown = API.decodeWeatherCode(999, false);
assertEqual(unknown.desc, 'Unknown', 'Unknown code returns "Unknown"');

// ------------------------------------------------------------------
console.log('\n🧭 Wind Direction');
assertEqual(API.windDirection(0), 'N', '0° = N');
assertEqual(API.windDirection(90), 'E', '90° = E');
assertEqual(API.windDirection(180), 'S', '180° = S');
assertEqual(API.windDirection(270), 'W', '270° = W');
assertEqual(API.windDirection(45), 'NE', '45° = NE');
assertEqual(API.windDirection(135), 'SE', '135° = SE');
assertEqual(API.windDirection(225), 'SW', '225° = SW');
assertEqual(API.windDirection(315), 'NW', '315° = NW');
assertEqual(API.windDirection(360), 'N', '360° = N');
assertEqual(API.windDirection(22), 'NNE', '22° = NNE');

// ------------------------------------------------------------------
console.log('\n☀️ UV Index Labels');
let uv;
uv = API.uvLabel(0);   assertEqual(uv.label, 'Low', 'UV 0 = Low');
uv = API.uvLabel(2);   assertEqual(uv.label, 'Low', 'UV 2 = Low');
uv = API.uvLabel(3);   assertEqual(uv.label, 'Moderate', 'UV 3 = Moderate');
uv = API.uvLabel(5);   assertEqual(uv.label, 'Moderate', 'UV 5 = Moderate');
uv = API.uvLabel(6);   assertEqual(uv.label, 'High', 'UV 6 = High');
uv = API.uvLabel(7);   assertEqual(uv.label, 'High', 'UV 7 = High');
uv = API.uvLabel(8);   assertEqual(uv.label, 'Very High', 'UV 8 = Very High');
uv = API.uvLabel(10);  assertEqual(uv.label, 'Very High', 'UV 10 = Very High');
uv = API.uvLabel(11);  assertEqual(uv.label, 'Extreme', 'UV 11 = Extreme');

// ------------------------------------------------------------------
console.log('\n📅 Format Day');
const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
assertEqual(API.formatDay(todayStr), 'Today', 'Today\'s date returns "Today"');

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);
assertEqual(API.formatDay(tomorrowStr), 'Tomorrow', 'Tomorrow\'s date returns "Tomorrow"');

const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 5);
const nextWeekStr = nextWeek.toISOString().slice(0, 10);
const dayResult = API.formatDay(nextWeekStr);
assert(dayResult !== 'Today' && dayResult !== 'Tomorrow', '5 days out returns a weekday: "' + dayResult + '"');
assert(dayResult.length <= 3, 'Weekday is short format (3 chars): "' + dayResult + '"');

// ------------------------------------------------------------------
console.log('\n🔌 searchCities Input Validation');
(async () => {
  // Short query returns empty
  let results = await API.searchCities('', 5);
  assertEqual(results.length, 0, 'Empty query returns []');

  results = await API.searchCities('a', 5);
  assertEqual(results.length, 0, 'Single char query returns []');

  // ------------------------------------------------------------------
  console.log('\n📊 HTML Structure Validation');
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/index.html', 'utf-8');

  assert(html.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
  assert(html.includes('<meta charset="UTF-8">'), 'Has UTF-8 charset');
  assert(html.includes('<meta name="viewport"'), 'Has viewport meta');
  assert(html.includes('styles.css'), 'Links styles.css');
  assert(html.includes('weather-api.js'), 'Links weather-api.js');
  assert(html.includes('app.js'), 'Links app.js');
  assert(html.includes('id="searchInput"'), 'Has search input');
  assert(html.includes('id="currentWeather"'), 'Has current weather section');
  assert(html.includes('id="forecast"'), 'Has forecast section');
  assert(html.includes('id="alerts"'), 'Has alerts section placeholder');
  assert(html.includes('id="savedLocations"'), 'Has saved locations placeholder');
  assert(html.includes('id="weatherMap"'), 'Has weather map placeholder');
  assert(html.includes('id="loading"'), 'Has loading state');
  assert(html.includes('id="errorBanner"'), 'Has error banner');
  assert(html.includes('id="themeBtn"'), 'Has theme button');

  // ------------------------------------------------------------------
  console.log('\n🎨 CSS Validation');
  const css = fs.readFileSync(__dirname + '/styles.css', 'utf-8');

  assert(css.includes('[data-theme="dark"]'), 'Has dark theme');
  assert(css.includes('[data-theme="light"]'), 'Has light theme');
  assert(css.includes('--bg:'), 'Has --bg variable');
  assert(css.includes('--accent:'), 'Has --accent variable');
  assert(css.includes('--text:'), 'Has --text variable');
  assert(css.includes('.hidden'), 'Has .hidden utility');
  assert(css.includes('@media'), 'Has media queries');
  assert(css.includes('.spinner'), 'Has spinner animation');
  assert(css.includes('.forecast-card'), 'Has forecast card styles');
  assert(css.includes('.search-results'), 'Has search results styles');
  assert(css.includes('.error-banner'), 'Has error banner styles');
  assert(css.includes('.current-weather'), 'Has current weather styles');

  // ------------------------------------------------------------------
  console.log('\n🔧 App.js Validation');
  const appJs = fs.readFileSync(__dirname + '/app.js', 'utf-8');

  assert(appJs.includes('WeatherAPI'), 'References WeatherAPI');
  assert(appJs.includes('searchCities'), 'Uses searchCities');
  assert(appJs.includes('fetchWeather'), 'Uses fetchWeather');
  assert(appJs.includes('geolocation'), 'Has geolocation support');
  assert(appJs.includes('localStorage'), 'Uses localStorage');
  assert(appJs.includes('data-theme'), 'Manages theme attribute');
  assert(appJs.includes('renderCurrentWeather'), 'Has renderCurrentWeather');
  assert(appJs.includes('renderForecast'), 'Has renderForecast');
  assert(appJs.includes('showLoading'), 'Has loading state management');
  assert(appJs.includes('showError'), 'Has error state management');
  assert(appJs.includes('debounce') || appJs.includes('setTimeout'), 'Has search debouncing');
  assert(appJs.includes('ArrowDown') || appJs.includes('ArrowUp'), 'Has keyboard navigation for results');

  // ==================================================================
  console.log('\n' + '='.repeat(50));
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total');

  if (failed > 0) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log('  ❌ ' + e));
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
})();
