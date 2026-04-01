/**
 * Timezone App — Test Suite (SEN-369)
 * Usage: node tests.js
 */
'use strict';

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
  if (condition) { passed++; console.log('  ✅ ' + testName); }
  else { failed++; errors.push(testName); console.log('  ❌ ' + testName); }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) { passed++; console.log('  ✅ ' + testName); }
  else {
    failed++; errors.push(testName + ' (got: ' + JSON.stringify(actual) + ', expected: ' + JSON.stringify(expected) + ')');
    console.log('  ❌ ' + testName + ' — got: ' + JSON.stringify(actual) + ', expected: ' + JSON.stringify(expected));
  }
}

// Mock browser globals
global.window = {};
global.Intl = Intl; // Node has native Intl
global.document = { createElement: () => ({ textContent: '', get innerHTML() { return this.textContent; } }) };

require('./timezone-data.js');
const TZ = global.window.TimezoneData;

// ==================================================================
console.log('\n🧪 Timezone App Test Suite\n');

// ------------------------------------------------------------------
console.log('📦 Module Loading');
assert(typeof TZ === 'object', 'TimezoneData is exported');
assert(typeof TZ.getTimeInZone === 'function', 'getTimeInZone is a function');
assert(typeof TZ.getLocalTimezone === 'function', 'getLocalTimezone is a function');
assert(typeof TZ.formatOffset === 'function', 'formatOffset is a function');
assert(typeof TZ.getUTCOffset === 'function', 'getUTCOffset is a function');
assert(typeof TZ.search === 'function', 'search is a function');
assert(typeof TZ.getByTz === 'function', 'getByTz is a function');
assert(typeof TZ.getRegions === 'function', 'getRegions is a function');
assert(typeof TZ.pad === 'function', 'pad is a function');
assert(Array.isArray(TZ.POPULAR_TIMEZONES), 'POPULAR_TIMEZONES is an array');

// ------------------------------------------------------------------
console.log('\n🌍 Popular Timezones Data');
assert(TZ.POPULAR_TIMEZONES.length >= 40, 'At least 40 popular timezones (' + TZ.POPULAR_TIMEZONES.length + ')');

// Validate structure of each entry
let allValid = true;
TZ.POPULAR_TIMEZONES.forEach(tz => {
  if (!tz.tz || !tz.city || !tz.region) allValid = false;
});
assert(allValid, 'All entries have tz, city, region');

// Check key cities are present
const cities = TZ.POPULAR_TIMEZONES.map(t => t.city);
['New York', 'London', 'Tokyo', 'Sydney', 'Paris', 'Berlin', 'Dubai', 'Singapore'].forEach(city => {
  assert(cities.includes(city), 'Has ' + city);
});

// Check regions
const regions = TZ.getRegions();
assert(regions.includes('Americas'), 'Has Americas region');
assert(regions.includes('Europe'), 'Has Europe region');
assert(regions.includes('Asia'), 'Has Asia region');
assert(regions.includes('Oceania'), 'Has Oceania region');
assert(regions.includes('Africa'), 'Has Africa region');

// ------------------------------------------------------------------
console.log('\n⏰ getTimeInZone');
const nyTime = TZ.getTimeInZone('America/New_York');
assert(nyTime !== null, 'New York returns data');
assert(typeof nyTime.hours === 'number', 'hours is number');
assert(typeof nyTime.minutes === 'number', 'minutes is number');
assert(typeof nyTime.seconds === 'number', 'seconds is number');
assert(nyTime.hours >= 0 && nyTime.hours <= 23, 'hours in range 0-23');
assert(nyTime.minutes >= 0 && nyTime.minutes <= 59, 'minutes in range 0-59');
assert(typeof nyTime.time24 === 'string', 'time24 is string');
assert(/^\d{2}:\d{2}:\d{2}$/.test(nyTime.time24), 'time24 format HH:MM:SS');
assert(typeof nyTime.time12 === 'string', 'time12 is string');
assert(typeof nyTime.date === 'string', 'date is string');
assert(typeof nyTime.dayName === 'string', 'dayName is string');
assert(typeof nyTime.isDay === 'boolean', 'isDay is boolean');
assert(typeof nyTime.offsetMinutes === 'number', 'offsetMinutes is number');
assert(typeof nyTime.offset === 'string', 'offset is string');
assertEqual(nyTime.timezone, 'America/New_York', 'timezone field matches');

const tokyoTime = TZ.getTimeInZone('Asia/Tokyo');
assert(tokyoTime !== null, 'Tokyo returns data');
assert(/^\d{2}:\d{2}:\d{2}$/.test(tokyoTime.time24), 'Tokyo time24 format');

const utcTime = TZ.getTimeInZone('UTC');
assert(utcTime !== null, 'UTC returns data');

const invalidTime = TZ.getTimeInZone('Invalid/Timezone_That_Does_Not_Exist');
assertEqual(invalidTime, null, 'Invalid timezone returns null');

// ------------------------------------------------------------------
console.log('\n🧭 getLocalTimezone');
const localTz = TZ.getLocalTimezone();
assert(typeof localTz === 'string', 'Returns a string');
assert(localTz.length > 0, 'Non-empty');

// ------------------------------------------------------------------
console.log('\n📏 formatOffset');
assertEqual(TZ.formatOffset(0), 'Same time', '0 = Same time');
assertEqual(TZ.formatOffset(60), '+1h', '+60min = +1h');
assertEqual(TZ.formatOffset(-60), '-1h', '-60min = -1h');
assertEqual(TZ.formatOffset(330), '+5h 30m', '+330min = +5h 30m');
assertEqual(TZ.formatOffset(-480), '-8h', '-480min = -8h');
assertEqual(TZ.formatOffset(90), '+1h 30m', '+90min = +1h 30m');
assertEqual(TZ.formatOffset(-345), '-5h 45m', '-345min = -5h 45m');

// ------------------------------------------------------------------
console.log('\n🔢 pad');
assertEqual(TZ.pad(0), '00', 'pad(0) = "00"');
assertEqual(TZ.pad(5), '05', 'pad(5) = "05"');
assertEqual(TZ.pad(9), '09', 'pad(9) = "09"');
assertEqual(TZ.pad(10), '10', 'pad(10) = "10"');
assertEqual(TZ.pad(23), '23', 'pad(23) = "23"');

// ------------------------------------------------------------------
console.log('\n🔍 search');
let results;
results = TZ.search('');
assertEqual(results.length, 0, 'Empty query → []');

results = TZ.search('london');
assert(results.length >= 1, 'london → at least 1 result');
assertEqual(results[0].city, 'London', 'First result is London');

results = TZ.search('new york');
assert(results.length >= 1, 'new york → at least 1');
assertEqual(results[0].city, 'New York', 'First result is New York');

results = TZ.search('US');
assert(results.length >= 3, 'US → at least 3 results (US cities)');

results = TZ.search('asia');
assert(results.length >= 5, 'asia → at least 5 results');

results = TZ.search('xyz_nothing');
assertEqual(results.length, 0, 'Nonsense query → 0');

results = TZ.search('tokyo', 1);
assertEqual(results.length, 1, 'limit=1 returns exactly 1');

// ------------------------------------------------------------------
console.log('\n📋 getByTz');
const london = TZ.getByTz('Europe/London');
assert(london !== null, 'Europe/London found');
assertEqual(london.city, 'London', 'city is London');
assertEqual(london.country, 'GB', 'country is GB');

const custom = TZ.getByTz('America/Argentina/Buenos_Aires');
assert(custom !== null, 'Custom tz returns dynamic entry');
assertEqual(custom.city, 'Buenos Aires', 'Parsed city from tz path');

const utcEntry = TZ.getByTz('UTC');
assert(utcEntry !== null, 'UTC found');
assertEqual(utcEntry.city, 'UTC', 'UTC city is UTC');

// ------------------------------------------------------------------
console.log('\n🌐 getUTCOffset');
const utcOffset = TZ.getUTCOffset('UTC');
assert(typeof utcOffset === 'string', 'Returns string');

const nyOffset = TZ.getUTCOffset('America/New_York');
assert(typeof nyOffset === 'string', 'NY offset is string');
assert(nyOffset.length > 0, 'NY offset non-empty');

// ------------------------------------------------------------------
console.log('\n📄 File Structure');
const fs = require('fs');

const html = fs.readFileSync(__dirname + '/index.html', 'utf-8');
assert(html.includes('<!DOCTYPE html>'), 'Has DOCTYPE');
assert(html.includes('timezone-data.js'), 'Links timezone-data.js');
assert(html.includes('app.js'), 'Links app.js');
assert(html.includes('styles.css'), 'Links styles.css');
assert(html.includes('id="localTimeDisplay"'), 'Has local time display');
assert(html.includes('id="clockGrid"'), 'Has clock grid');
assert(html.includes('id="searchInput"'), 'Has search input');
assert(html.includes('id="searchResults"'), 'Has search results');
assert(html.includes('id="themeBtn"'), 'Has theme button');
assert(html.includes('id="emptyState"'), 'Has empty state');
assert(html.includes('id="timeCompare"'), 'Has time compare placeholder');

const css = fs.readFileSync(__dirname + '/styles.css', 'utf-8');
assert(css.includes('[data-theme="dark"]'), 'Has dark theme');
assert(css.includes('[data-theme="light"]'), 'Has light theme');
assert(css.includes('.clock-card'), 'Has clock-card styles');
assert(css.includes('.clock-grid'), 'Has clock-grid layout');
assert(css.includes('.clock-time'), 'Has clock-time');
assert(css.includes('.clock-offset'), 'Has clock-offset');
assert(css.includes('.local-time-display'), 'Has local-time-display');
assert(css.includes('.analog-clock'), 'Has analog-clock styles');
assert(css.includes('.search-results'), 'Has search-results');
assert(css.includes('.empty-state'), 'Has empty-state');
assert(css.includes('@media'), 'Has responsive media queries');
assert(css.includes('.hidden'), 'Has .hidden utility');

const appJs = fs.readFileSync(__dirname + '/app.js', 'utf-8');
assert(appJs.includes('TimezoneData'), 'References TimezoneData');
assert(appJs.includes('localStorage'), 'Uses localStorage');
assert(appJs.includes('setInterval'), 'Has tick interval');
assert(appJs.includes('renderClocks'), 'Has renderClocks');
assert(appJs.includes('tickClocks'), 'Has tickClocks');
assert(appJs.includes('addClock'), 'Has addClock');
assert(appJs.includes('removeClock'), 'Has removeClock');
assert(appJs.includes('performSearch'), 'Has performSearch');
assert(appJs.includes('data-theme'), 'Manages theme');
assert(appJs.includes('ArrowDown'), 'Has keyboard navigation');

// ==================================================================
console.log('\n' + '='.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total');

if (failed > 0) {
  console.log('\nFailed tests:');
  errors.forEach(e => console.log('  ❌ ' + e));
  process.exit(1);
} else {
  console.log('✅ All tests passed!\n');
  process.exit(0);
}
