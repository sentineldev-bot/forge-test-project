/**
 * Saved Locations Module (SEN-350)
 *
 * Manages saved/favorite locations with localStorage persistence.
 * Provides save/remove/list/reorder operations and renders the saved locations panel.
 *
 * Depends on: WeatherAPI (weather-api.js), App global hooks
 * Exports: window.SavedLocations
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'weather-app-saved-locations';
  var MAX_LOCATIONS = 20;
  var API = window.WeatherAPI;

  // --- State ---
  var locations = []; // Array of { id, name, country, admin1, lat, lon, timezone, addedAt }

  // =========================================================
  //  PERSISTENCE
  // =========================================================
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      locations = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(locations)) locations = [];
    } catch (e) {
      locations = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  }

  // =========================================================
  //  CRUD
  // =========================================================

  /**
   * Generate a stable ID from lat/lon (rounded to ~1km).
   */
  function makeId(lat, lon) {
    return Math.round(lat * 100) + '_' + Math.round(lon * 100);
  }

  /**
   * Add a location to saved list.
   * @param {{ name, country, admin1?, lat, lon, timezone? }} loc
   * @returns {boolean} true if added, false if already exists or limit reached
   */
  function addLocation(loc) {
    if (!loc || !loc.name || loc.lat == null || loc.lon == null) return false;

    var id = makeId(loc.lat, loc.lon);
    // Check for duplicate
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === id) return false;
    }

    if (locations.length >= MAX_LOCATIONS) return false;

    locations.push({
      id: id,
      name: loc.name,
      country: loc.country || '',
      admin1: loc.admin1 || '',
      lat: loc.lat,
      lon: loc.lon,
      timezone: loc.timezone || 'auto',
      addedAt: new Date().toISOString(),
    });

    save();
    return true;
  }

  /**
   * Remove a location by ID.
   * @param {string} id
   * @returns {boolean}
   */
  function removeLocation(id) {
    var before = locations.length;
    locations = locations.filter(function (l) { return l.id !== id; });
    if (locations.length !== before) {
      save();
      return true;
    }
    return false;
  }

  /**
   * Check if a location is saved (by lat/lon).
   * @param {number} lat
   * @param {number} lon
   * @returns {boolean}
   */
  function isSaved(lat, lon) {
    var id = makeId(lat, lon);
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === id) return true;
    }
    return false;
  }

  /**
   * Get all saved locations.
   * @returns {Array}
   */
  function getAll() {
    return locations.slice(); // return copy
  }

  /**
   * Get count of saved locations.
   * @returns {number}
   */
  function count() {
    return locations.length;
  }

  /**
   * Move a location up or down in the list.
   * @param {string} id
   * @param {number} direction - -1 for up, +1 for down
   * @returns {boolean}
   */
  function reorder(id, direction) {
    var idx = -1;
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return false;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= locations.length) return false;

    var temp = locations[idx];
    locations[idx] = locations[newIdx];
    locations[newIdx] = temp;
    save();
    return true;
  }

  /**
   * Clear all saved locations.
   */
  function clearAll() {
    locations = [];
    save();
  }

  // =========================================================
  //  UI RENDERING
  // =========================================================

  /**
   * Render the saved locations section.
   * @param {object} opts
   * @param {HTMLElement} opts.container - The #savedLocations section
   * @param {HTMLElement} opts.listEl - The #savedList div
   * @param {function} opts.onSelect - Called with location when user clicks one
   * @param {function} [opts.onRender] - Called after render (for updating save button state etc.)
   */
  function render(opts) {
    var container = opts.container;
    var listEl = opts.listEl;
    var onSelect = opts.onSelect;

    if (locations.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    listEl.innerHTML = '';

    locations.forEach(function (loc) {
      var card = document.createElement('div');
      card.className = 'saved-card';
      card.setAttribute('data-id', loc.id);

      var display = loc.name;
      if (loc.admin1) display += ', ' + loc.admin1;

      card.innerHTML =
        '<div class="saved-card-info">' +
          '<span class="saved-card-name">' + escapeHtml(display) + '</span>' +
          '<span class="saved-card-country">' + escapeHtml(loc.country) + '</span>' +
        '</div>' +
        '<div class="saved-card-actions">' +
          '<button class="saved-card-btn saved-card-select" title="View weather" aria-label="View weather for ' + escapeHtml(loc.name) + '">🌤️</button>' +
          '<button class="saved-card-btn saved-card-remove" title="Remove" aria-label="Remove ' + escapeHtml(loc.name) + '">✕</button>' +
        '</div>';

      // Select handler
      card.querySelector('.saved-card-select').addEventListener('click', function (e) {
        e.stopPropagation();
        if (onSelect) onSelect(loc);
      });

      // Click anywhere on card to select
      card.addEventListener('click', function () {
        if (onSelect) onSelect(loc);
      });

      // Remove handler
      card.querySelector('.saved-card-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        removeLocation(loc.id);
        render(opts);
        if (opts.onRender) opts.onRender();
      });

      listEl.appendChild(card);
    });

    if (opts.onRender) opts.onRender();
  }

  /**
   * Create or update the save/unsave button for the current weather display.
   * @param {object} opts
   * @param {HTMLElement} opts.parent - Element to append the button to (e.g. .cw-location)
   * @param {{ name, country, admin1?, lat, lon, timezone? }} opts.location - Current location
   * @param {function} opts.onToggle - Called after save/unsave with (isSaved)
   */
  function renderSaveButton(opts) {
    var parent = opts.parent;
    var loc = opts.location;
    if (!loc || loc.lat == null) return;

    // Remove existing button if any
    var existing = parent.querySelector('.save-location-btn');
    if (existing) existing.remove();

    var saved = isSaved(loc.lat, loc.lon);
    var btn = document.createElement('button');
    btn.className = 'save-location-btn' + (saved ? ' saved' : '');
    btn.title = saved ? 'Remove from saved' : 'Save location';
    btn.setAttribute('aria-label', btn.title);
    btn.textContent = saved ? '★' : '☆';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isSaved(loc.lat, loc.lon)) {
        removeLocation(makeId(loc.lat, loc.lon));
      } else {
        addLocation(loc);
      }
      // Re-render button
      renderSaveButton(opts);
      if (opts.onToggle) opts.onToggle(isSaved(loc.lat, loc.lon));
    });

    parent.appendChild(btn);
  }

  // =========================================================
  //  HELPERS
  // =========================================================
  function escapeHtml(str) {
    var div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = str;
      return div.innerHTML;
    }
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // =========================================================
  //  INIT
  // =========================================================
  load();

  // --- Public API ---
  window.SavedLocations = {
    addLocation: addLocation,
    removeLocation: removeLocation,
    isSaved: isSaved,
    getAll: getAll,
    count: count,
    reorder: reorder,
    clearAll: clearAll,
    makeId: makeId,
    render: render,
    renderSaveButton: renderSaveButton,
    load: load,
    MAX_LOCATIONS: MAX_LOCATIONS,
  };
})();
