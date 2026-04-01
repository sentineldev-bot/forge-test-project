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
console.log('\n📄 File Structure — HTML');
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
// SEN-370: analog clock + format toggle
assert(html.includes('id="localHourHand"'), 'Has local hour hand');
assert(html.includes('id="localMinuteHand"'), 'Has local minute hand');
assert(html.includes('id="localSecondHand"'), 'Has local second hand');
assert(html.includes('id="formatToggle"'), 'Has format toggle button');
assert(html.includes('analog-clock-lg'), 'Has large analog clock class');
assert(html.includes('id="localMarkers"'), 'Has local clock markers container');

console.log('\n🎨 File Structure — CSS');
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
// SEN-370: enhanced styles
assert(css.includes('.analog-clock-lg'), 'Has large analog clock styles');
assert(css.includes('.clock-marker'), 'Has clock marker styles');
assert(css.includes('.clock-marker.major'), 'Has major marker styles');
assert(css.includes('.format-toggle'), 'Has format toggle styles');
assert(css.includes('.clock-day-rel'), 'Has relative day label styles');
assert(css.includes('.night-mode'), 'Has night-mode card styles');
assert(css.includes('.clock-day-rel.tomorrow'), 'Has tomorrow label styles');
assert(css.includes('.clock-day-rel.yesterday'), 'Has yesterday label styles');

console.log('\n🔧 File Structure — App JS');
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
// SEN-370: enhanced features
assert(appJs.includes('setHandRotations'), 'Has setHandRotations for analog clocks');
assert(appJs.includes('createMarkers'), 'Has createMarkers for clock face');
assert(appJs.includes('formatTime'), 'Has formatTime (12h/24h)');
assert(appJs.includes('toggleFormat'), 'Has toggleFormat');
assert(appJs.includes('FORMAT_KEY'), 'Has FORMAT_KEY for persistence');
assert(appJs.includes('use24h'), 'Has use24h state');
assert(appJs.includes('getRelativeDay'), 'Has getRelativeDay');
assert(appJs.includes('night-mode'), 'Has night-mode class toggling');
assert(appJs.includes('data-tz-hour'), 'Has per-card analog hour hand');
assert(appJs.includes('data-tz-min'), 'Has per-card analog minute hand');
assert(appJs.includes('data-tz-sec'), 'Has per-card analog second hand');
assert(appJs.includes('KeyF'), 'Has F shortcut for format toggle');

// ------------------------------------------------------------------
console.log('\n🔍 Enhanced Search (SEN-371)');

// Fuzzy multi-word search
results = TZ.search('new york');
assert(results.length >= 1, 'Multi-word "new york" finds results');
assertEqual(results[0].city, 'New York', 'Top result is New York');

// Partial match
results = TZ.search('lon');
assert(results.length >= 1, 'Partial "lon" finds London');
assertEqual(results[0].city, 'London', 'Top result is London');

// Score ordering: exact > starts-with > contains
results = TZ.search('paris');
assertEqual(results[0].city, 'Paris', 'Exact match "paris" → Paris first');

// Search by country code
results = TZ.search('JP');
assert(results.length >= 1, 'Country code "JP" finds results');
assertEqual(results[0].country, 'JP', 'JP result has country JP');

// Search by region
results = TZ.search('africa');
assert(results.length >= 4, 'Region "africa" finds 4+ results');

// getByRegion
console.log('\n🌐 Browse by Region (SEN-371)');
assert(typeof TZ.getByRegion === 'function', 'getByRegion is a function');
const grouped = TZ.getByRegion();
assert(typeof grouped === 'object', 'getByRegion returns object');
assert(Array.isArray(grouped['Americas']), 'Americas is an array');
assert(grouped['Americas'].length >= 10, 'Americas has 10+ timezones');
assert(Array.isArray(grouped['Europe']), 'Europe is an array');
assert(grouped['Europe'].length >= 10, 'Europe has 10+ timezones');
assert(Array.isArray(grouped['Asia']), 'Asia is an array');
assert(Array.isArray(grouped['Oceania']), 'Oceania is an array');
assert(Array.isArray(grouped['Africa']), 'Africa is an array');

// All timezones accounted for
let totalGrouped = 0;
Object.keys(grouped).forEach(r => { totalGrouped += grouped[r].length; });
assertEqual(totalGrouped, TZ.POPULAR_TIMEZONES.length, 'All timezones in region groups');

// ------------------------------------------------------------------
console.log('\n📄 SEN-371 File Checks');

// HTML
assert(html.includes('id="browseBtn"'), 'HTML has browse button');
assert(html.includes('id="browsePanel"'), 'HTML has browse panel');
assert(html.includes('id="browseTabs"'), 'HTML has browse tabs');
assert(html.includes('id="browseList"'), 'HTML has browse list');
assert(html.includes('id="toast"'), 'HTML has toast element');
assert(html.includes('id="clockCount"'), 'HTML has clock count');

// CSS
assert(css.includes('.browse-panel'), 'CSS has browse-panel');
assert(css.includes('.browse-tab'), 'CSS has browse-tab');
assert(css.includes('.browse-list'), 'CSS has browse-list');
assert(css.includes('.browse-time'), 'CSS has browse-time');
assert(css.includes('.toast'), 'CSS has toast styles');
assert(css.includes('.toast.show'), 'CSS has toast.show');
assert(css.includes('.clock-count'), 'CSS has clock-count');
assert(css.includes('.dragging'), 'CSS has dragging class');
assert(css.includes('.drag-over'), 'CSS has drag-over class');
assert(css.includes('.sr-time'), 'CSS has sr-time (search result time preview)');

// App JS
assert(appJs.includes('MAX_CLOCKS'), 'app.js has MAX_CLOCKS');
assert(appJs.includes('showToast'), 'app.js has showToast');
assert(appJs.includes('tryAddClock'), 'app.js has tryAddClock');
assert(appJs.includes('openBrowse'), 'app.js has openBrowse');
assert(appJs.includes('closeBrowse'), 'app.js has closeBrowse');
assert(appJs.includes('renderBrowseList'), 'app.js has renderBrowseList');
assert(appJs.includes('getByRegion'), 'app.js uses getByRegion');
assert(appJs.includes('enableDragReorder'), 'app.js has enableDragReorder');
assert(appJs.includes('reorderClocks'), 'app.js has reorderClocks');
assert(appJs.includes('updateClockCount'), 'app.js has updateClockCount');
assert(appJs.includes('dragstart'), 'app.js has dragstart event');
assert(appJs.includes('drop'), 'app.js has drop event');
assert(appJs.includes('draggable'), 'app.js sets draggable attribute');

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
