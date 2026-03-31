/**
 * Saved Locations — Test Suite (SEN-350)
 *
 * Usage: node tests-saved-locations.js
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
// Mock browser globals
// ------------------------------------------------------------------
const store = {};
global.window = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
global.document = {
  createElement: (tag) => ({
    textContent: '',
    innerHTML: '',
    get innerText() { return this.textContent; },
  }),
};
global.fetch = async () => ({ ok: true, json: async () => ({}) });

// Load modules
require('./weather-api.js');
require('./saved-locations.js');
const SL = global.window.SavedLocations;

// ==================================================================
console.log('\n🧪 Saved Locations Test Suite\n');

// ------------------------------------------------------------------
console.log('📦 Module Loading');
assert(typeof SL === 'object', 'SavedLocations is exported');
assert(typeof SL.addLocation === 'function', 'addLocation is a function');
assert(typeof SL.removeLocation === 'function', 'removeLocation is a function');
assert(typeof SL.isSaved === 'function', 'isSaved is a function');
assert(typeof SL.getAll === 'function', 'getAll is a function');
assert(typeof SL.count === 'function', 'count is a function');
assert(typeof SL.reorder === 'function', 'reorder is a function');
assert(typeof SL.clearAll === 'function', 'clearAll is a function');
assert(typeof SL.makeId === 'function', 'makeId is a function');
assert(typeof SL.render === 'function', 'render is a function');
assert(typeof SL.renderSaveButton === 'function', 'renderSaveButton is a function');
assert(typeof SL.MAX_LOCATIONS === 'number', 'MAX_LOCATIONS is exported');

// ------------------------------------------------------------------
console.log('\n🔑 ID Generation');
assertEqual(SL.makeId(51.5074, -0.1278), '5151_-13', 'London coords generate stable ID');
assertEqual(SL.makeId(40.7128, -74.006), '4071_-7401', 'NYC coords generate stable ID');
assertEqual(SL.makeId(0, 0), '0_0', 'Origin coords generate 0_0');
assertEqual(SL.makeId(51.5074, -0.1278), SL.makeId(51.5074, -0.1278), 'Same coords = same ID (deterministic)');
assert(SL.makeId(51.5074, -0.1278) !== SL.makeId(48.8566, 2.3522), 'Different coords = different IDs');

// ------------------------------------------------------------------
console.log('\n➕ Adding Locations');
SL.clearAll();
assertEqual(SL.count(), 0, 'Starts empty after clearAll');

const london = { name: 'London', country: 'UK', admin1: 'England', lat: 51.5074, lon: -0.1278 };
const paris = { name: 'Paris', country: 'France', admin1: 'Île-de-France', lat: 48.8566, lon: 2.3522 };
const nyc = { name: 'New York', country: 'US', admin1: 'New York', lat: 40.7128, lon: -74.006 };
const tokyo = { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 };

assertEqual(SL.addLocation(london), true, 'Add London → true');
assertEqual(SL.count(), 1, 'Count is 1');
assertEqual(SL.addLocation(paris), true, 'Add Paris → true');
assertEqual(SL.count(), 2, 'Count is 2');
assertEqual(SL.addLocation(nyc), true, 'Add NYC → true');
assertEqual(SL.addLocation(tokyo), true, 'Add Tokyo → true');
assertEqual(SL.count(), 4, 'Count is 4');

// ------------------------------------------------------------------
console.log('\n🚫 Duplicate Prevention');
assertEqual(SL.addLocation(london), false, 'Adding London again → false (duplicate)');
assertEqual(SL.count(), 4, 'Count still 4 after duplicate');

// Similar coords (within ~1km) should also be treated as duplicate
const londonClose = { name: 'London Close', country: 'UK', lat: 51.508, lon: -0.128 };
assertEqual(SL.addLocation(londonClose), false, 'Very close coords → false (dedup by rounded lat/lon)');

// ------------------------------------------------------------------
console.log('\n❌ Invalid Input');
assertEqual(SL.addLocation(null), false, 'null → false');
assertEqual(SL.addLocation({}), false, 'empty obj → false');
assertEqual(SL.addLocation({ name: 'X' }), false, 'missing lat/lon → false');
assertEqual(SL.addLocation({ lat: 1, lon: 1 }), false, 'missing name → false');

// ------------------------------------------------------------------
console.log('\n🔍 isSaved');
assertEqual(SL.isSaved(51.5074, -0.1278), true, 'London is saved');
assertEqual(SL.isSaved(48.8566, 2.3522), true, 'Paris is saved');
assertEqual(SL.isSaved(0, 0), false, '0,0 is not saved');
assertEqual(SL.isSaved(12.345, 67.89), false, 'Random coords not saved');

// ------------------------------------------------------------------
console.log('\n📋 getAll');
const all = SL.getAll();
assertEqual(all.length, 4, 'getAll returns 4 items');
assertEqual(all[0].name, 'London', 'First item is London');
assertEqual(all[1].name, 'Paris', 'Second item is Paris');
assert(all[0].id !== undefined, 'Items have id');
assert(all[0].addedAt !== undefined, 'Items have addedAt timestamp');
assert(all[0].country === 'UK', 'Items have country');

// Verify getAll returns a copy, not a reference
all.push({ name: 'fake' });
assertEqual(SL.count(), 4, 'getAll returns a copy (original unchanged)');

// ------------------------------------------------------------------
console.log('\n🔄 Reorder');
const ids = SL.getAll().map(l => l.id);
assertEqual(SL.reorder(ids[0], 1), true, 'Move London down → true');
assertEqual(SL.getAll()[0].name, 'Paris', 'Paris is now first');
assertEqual(SL.getAll()[1].name, 'London', 'London is now second');

assertEqual(SL.reorder(ids[0], -1), true, 'Move London back up → true');
assertEqual(SL.getAll()[0].name, 'London', 'London is first again');

assertEqual(SL.reorder(ids[0], -1), false, 'Move first item up → false (already at top)');
assertEqual(SL.reorder(ids[ids.length - 1], 1), false, 'Move last item down → false (already at bottom)');
assertEqual(SL.reorder('nonexistent', 1), false, 'Move nonexistent → false');

// ------------------------------------------------------------------
console.log('\n🗑️ Remove');
const parisId = SL.getAll().find(l => l.name === 'Paris').id;
assertEqual(SL.removeLocation(parisId), true, 'Remove Paris → true');
assertEqual(SL.count(), 3, 'Count is 3');
assertEqual(SL.isSaved(48.8566, 2.3522), false, 'Paris no longer saved');
assertEqual(SL.removeLocation(parisId), false, 'Remove Paris again → false');
assertEqual(SL.removeLocation('nonexistent'), false, 'Remove nonexistent → false');

// ------------------------------------------------------------------
console.log('\n💾 Persistence');
// Data should be in localStorage
const raw = store['weather-app-saved-locations'];
assert(raw !== undefined, 'Data persisted to localStorage');
const parsed = JSON.parse(raw);
assertEqual(parsed.length, 3, 'Persisted data has 3 entries');
assertEqual(parsed[0].name, 'London', 'First persisted entry is London');

// Simulate reload by clearing and reloading
SL.clearAll();
assertEqual(SL.count(), 0, 'clearAll empties list');
// Restore from what was in localStorage (clearAll also saves empty)
store['weather-app-saved-locations'] = raw;
SL.load();
assertEqual(SL.count(), 3, 'load() restores from localStorage');

// ------------------------------------------------------------------
console.log('\n📊 Max Locations Limit');
SL.clearAll();
for (let i = 0; i < SL.MAX_LOCATIONS; i++) {
  SL.addLocation({ name: 'City' + i, country: 'X', lat: i, lon: i });
}
assertEqual(SL.count(), SL.MAX_LOCATIONS, 'Can add up to MAX_LOCATIONS');
assertEqual(SL.addLocation({ name: 'Overflow', country: 'X', lat: 999, lon: 999 }), false, 'Adding beyond limit → false');
assertEqual(SL.count(), SL.MAX_LOCATIONS, 'Count unchanged after overflow');

// ------------------------------------------------------------------
console.log('\n🧹 clearAll');
SL.clearAll();
assertEqual(SL.count(), 0, 'clearAll → 0 count');
assertEqual(SL.getAll().length, 0, 'clearAll → empty array');
assertEqual(JSON.parse(store['weather-app-saved-locations']).length, 0, 'clearAll persists empty array');

// ------------------------------------------------------------------
console.log('\n📄 File Structure');
const fs = require('fs');

const html = fs.readFileSync(__dirname + '/index.html', 'utf-8');
assert(html.includes('saved-locations.js'), 'HTML includes saved-locations.js');
assert(html.includes('id="savedLocations"'), 'HTML has savedLocations section');
assert(html.includes('id="savedList"'), 'HTML has savedList div');
assert(html.includes('id="savedCount"'), 'HTML has savedCount element');
assert(html.includes('saved-header'), 'HTML has saved-header class');

const css = fs.readFileSync(__dirname + '/styles.css', 'utf-8');
assert(css.includes('.saved-card'), 'CSS has .saved-card');
assert(css.includes('.saved-card-name'), 'CSS has .saved-card-name');
assert(css.includes('.saved-card-remove'), 'CSS has .saved-card-remove');
assert(css.includes('.save-location-btn'), 'CSS has .save-location-btn');
assert(css.includes('.save-location-btn.saved'), 'CSS has .save-location-btn.saved');
assert(css.includes('.saved-list'), 'CSS has .saved-list grid');

const appJs = fs.readFileSync(__dirname + '/app.js', 'utf-8');
assert(appJs.includes('SavedLocations'), 'app.js references SavedLocations');
assert(appJs.includes('renderSavedLocations'), 'app.js has renderSavedLocations');
assert(appJs.includes('renderSaveButton'), 'app.js calls renderSaveButton');

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
