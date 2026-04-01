/**
 * Timezone App — Main Controller (SEN-369)
 *
 * Handles: local time display, clock grid, search, theme, localStorage preferences.
 * Provides hooks for SEN-370 (live clocks) and SEN-371 (search/add).
 */
(function () {
  'use strict';

  var TZ = window.TimezoneData;
  var $ = function (id) { return document.getElementById(id); };

  // --- DOM refs ---
  var localTimeDisplay = $('localTimeDisplay');
  var localDate        = $('localDate');
  var localTz          = $('localTz');
  var searchInput      = $('searchInput');
  var searchResults    = $('searchResults');
  var clockGrid        = $('clockGrid');
  var emptyState       = $('emptyState');
  var themeBtn         = $('themeBtn');

  // --- State ---
  var CLOCKS_KEY   = 'timezone-app-clocks';
  var THEME_KEY    = 'timezone-app-theme';
  var tickInterval = null;
  var addedClocks  = []; // Array of IANA timezone strings
  var searchTimer  = null;

  // =========================================================
  //  THEME
  // =========================================================
  function loadTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    } else {
      applyTheme('dark');
    }
  }

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    themeBtn.textContent = name === 'dark' ? '🌙' : '☀️';
    localStorage.setItem(THEME_KEY, name);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  themeBtn.addEventListener('click', toggleTheme);

  // =========================================================
  //  LOCAL TIME
  // =========================================================
  function updateLocalTime() {
    var tz = TZ.getLocalTimezone();
    var info = TZ.getTimeInZone(tz);
    if (!info) return;

    localTimeDisplay.textContent = info.time24;
    localDate.textContent = info.date;
    localTz.textContent = tz + ' (' + TZ.getUTCOffset(tz) + ')';
  }

  // =========================================================
  //  SAVED CLOCKS (localStorage)
  // =========================================================
  function loadClocks() {
    try {
      var raw = localStorage.getItem(CLOCKS_KEY);
      addedClocks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(addedClocks)) addedClocks = [];
    } catch (e) {
      addedClocks = [];
    }
  }

  function saveClocks() {
    localStorage.setItem(CLOCKS_KEY, JSON.stringify(addedClocks));
  }

  function addClock(tz) {
    if (addedClocks.indexOf(tz) !== -1) return false;
    addedClocks.push(tz);
    saveClocks();
    return true;
  }

  function removeClock(tz) {
    var idx = addedClocks.indexOf(tz);
    if (idx === -1) return false;
    addedClocks.splice(idx, 1);
    saveClocks();
    return true;
  }

  function isClockAdded(tz) {
    return addedClocks.indexOf(tz) !== -1;
  }

  // =========================================================
  //  CLOCK GRID RENDERING
  // =========================================================
  function renderClocks() {
    // Keep emptyState or remove it
    if (addedClocks.length === 0) {
      clockGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      clockGrid.appendChild(emptyState);
      return;
    }

    emptyState.classList.add('hidden');
    clockGrid.innerHTML = '';

    addedClocks.forEach(function (tz) {
      var info = TZ.getTimeInZone(tz);
      var meta = TZ.getByTz(tz);
      if (!info || !meta) return;

      var card = document.createElement('div');
      card.className = 'clock-card';
      card.setAttribute('data-tz', tz);

      var offsetClass = info.offsetMinutes > 0 ? 'ahead' : info.offsetMinutes < 0 ? 'behind' : 'same';

      card.innerHTML =
        '<div class="clock-card-header">' +
          '<div>' +
            '<div class="clock-city">' + escapeHtml(meta.city) + '</div>' +
            '<div class="clock-region">' + escapeHtml(meta.country || meta.region) + '</div>' +
          '</div>' +
          '<span class="clock-daynight">' + (info.isDay ? '☀️' : '🌙') + '</span>' +
          '<button class="clock-remove" data-tz="' + escapeHtml(tz) + '" title="Remove" aria-label="Remove ' + escapeHtml(meta.city) + '">✕</button>' +
        '</div>' +
        '<div class="clock-time" data-tz-time="' + escapeHtml(tz) + '">' + info.time24 + '</div>' +
        '<div class="clock-date" data-tz-date="' + escapeHtml(tz) + '">' + info.date + '</div>' +
        '<div class="clock-offset ' + offsetClass + '">' + info.offset + '</div>';

      clockGrid.appendChild(card);
    });

    // Wire remove buttons
    clockGrid.querySelectorAll('.clock-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tz = btn.getAttribute('data-tz');
        removeClock(tz);
        renderClocks();
      });
    });
  }

  /**
   * Update only the time/date/daynight parts of existing cards (no re-render).
   */
  function tickClocks() {
    updateLocalTime();

    addedClocks.forEach(function (tz) {
      var info = TZ.getTimeInZone(tz);
      if (!info) return;

      var timeEl = document.querySelector('[data-tz-time="' + tz + '"]');
      var dateEl = document.querySelector('[data-tz-date="' + tz + '"]');
      if (timeEl) timeEl.textContent = info.time24;
      if (dateEl) dateEl.textContent = info.date;
    });
  }

  // =========================================================
  //  SEARCH
  // =========================================================
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var q = searchInput.value.trim();
    if (q.length < 1) {
      hideSearchResults();
      return;
    }
    searchTimer = setTimeout(function () {
      performSearch(q);
    }, 200);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      hideSearchResults();
      searchInput.blur();
    }
    if (e.key === 'Enter') {
      var active = searchResults.querySelector('.active');
      if (active) active.click();
      else {
        var first = searchResults.querySelector('li');
        if (first) first.click();
      }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      navigateResults(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  function navigateResults(dir) {
    var items = searchResults.querySelectorAll('li');
    if (!items.length) return;
    var current = searchResults.querySelector('.active');
    var idx = -1;
    if (current) {
      current.classList.remove('active');
      for (var i = 0; i < items.length; i++) {
        if (items[i] === current) { idx = i; break; }
      }
    }
    idx += dir;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  function performSearch(query) {
    var results = TZ.search(query, 8);
    if (results.length === 0) {
      searchResults.innerHTML = '<li>No timezones found</li>';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = '';
    results.forEach(function (tz) {
      var li = document.createElement('li');
      var utcOffset = TZ.getUTCOffset(tz.tz);
      var alreadyAdded = isClockAdded(tz.tz);
      li.innerHTML =
        '<span>' + escapeHtml(tz.city) +
        (tz.country ? ' <span class="sr-offset">' + escapeHtml(tz.country) + '</span>' : '') +
        '</span>' +
        '<span class="sr-offset">' + escapeHtml(utcOffset) +
        (alreadyAdded ? ' ✓' : '') + '</span>';

      if (!alreadyAdded) {
        li.addEventListener('click', function () {
          addClock(tz.tz);
          renderClocks();
          hideSearchResults();
          searchInput.value = '';
        });
      } else {
        li.style.opacity = '0.5';
        li.style.cursor = 'default';
      }
      searchResults.appendChild(li);
    });
    searchResults.classList.remove('hidden');
  }

  function hideSearchResults() {
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-container')) {
      hideSearchResults();
    }
  });

  // =========================================================
  //  KEYBOARD SHORTCUTS
  // =========================================================
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) toggleTheme();
    if (e.code === 'Slash') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // =========================================================
  //  HELPERS
  // =========================================================
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // =========================================================
  //  INIT
  // =========================================================
  loadTheme();
  loadClocks();
  updateLocalTime();
  renderClocks();

  // Add default clocks if first visit
  var VISITED_KEY = 'timezone-app-visited';
  if (!localStorage.getItem(VISITED_KEY)) {
    localStorage.setItem(VISITED_KEY, '1');
    // Add a few default world clocks
    var defaults = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
    var localTzName = TZ.getLocalTimezone();
    defaults.forEach(function (tz) {
      if (tz !== localTzName) addClock(tz);
    });
    renderClocks();
  }

  // Start ticking every second
  tickInterval = setInterval(tickClocks, 1000);

})();
