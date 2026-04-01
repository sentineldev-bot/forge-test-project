/**
 * Timezone App — Main Controller (SEN-369 + SEN-370)
 *
 * Handles: local time display with analog clock, clock grid with analog faces,
 * 12h/24h toggle, search, theme, localStorage preferences.
 */
(function () {
  'use strict';

  var TZ = window.TimezoneData;
  var $ = function (id) { return document.getElementById(id); };

  // --- DOM refs ---
  var localTimeDisplay = $('localTimeDisplay');
  var localDate        = $('localDate');
  var localTz          = $('localTz');
  var localHourHand    = $('localHourHand');
  var localMinuteHand  = $('localMinuteHand');
  var localSecondHand  = $('localSecondHand');
  var formatToggle     = $('formatToggle');
  var searchInput      = $('searchInput');
  var searchResults    = $('searchResults');
  var clockGrid        = $('clockGrid');
  var emptyState       = $('emptyState');
  var themeBtn         = $('themeBtn');

  // --- State ---
  var CLOCKS_KEY   = 'timezone-app-clocks';
  var THEME_KEY    = 'timezone-app-theme';
  var FORMAT_KEY   = 'timezone-app-format';
  var tickInterval = null;
  var addedClocks  = [];
  var searchTimer  = null;
  var use24h       = true;

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
  //  12h/24h FORMAT TOGGLE
  // =========================================================
  function loadFormat() {
    var saved = localStorage.getItem(FORMAT_KEY);
    use24h = saved !== '12';
    updateFormatBtn();
  }

  function updateFormatBtn() {
    formatToggle.textContent = use24h ? '24h' : '12h';
  }

  function toggleFormat() {
    use24h = !use24h;
    localStorage.setItem(FORMAT_KEY, use24h ? '24' : '12');
    updateFormatBtn();
    // Re-render to apply format change
    updateLocalTime();
    renderClocks();
  }

  formatToggle.addEventListener('click', toggleFormat);

  function formatTime(info) {
    return use24h ? info.time24 : info.time12;
  }

  // =========================================================
  //  ANALOG CLOCK HANDS
  // =========================================================
  function setHandRotations(hourEl, minuteEl, secondEl, h, m, s) {
    var hourDeg   = ((h % 12) + m / 60) * 30;  // 360/12 = 30° per hour
    var minuteDeg = (m + s / 60) * 6;           // 360/60 = 6° per minute
    var secondDeg = s * 6;                       // 360/60 = 6° per second

    if (hourEl)   hourEl.style.transform   = 'rotate(' + hourDeg + 'deg)';
    if (minuteEl) minuteEl.style.transform = 'rotate(' + minuteDeg + 'deg)';
    if (secondEl) secondEl.style.transform = 'rotate(' + secondDeg + 'deg)';
  }

  /**
   * Create hour markers inside an analog clock element.
   */
  function createMarkers(container) {
    for (var i = 0; i < 12; i++) {
      var marker = document.createElement('div');
      marker.className = 'clock-marker' + (i % 3 === 0 ? ' major' : '');
      marker.style.transform = 'rotate(' + (i * 30) + 'deg)';
      container.appendChild(marker);
    }
  }

  // Create local clock markers
  var localMarkers = $('localMarkers');
  if (localMarkers) createMarkers(localMarkers);

  // =========================================================
  //  RELATIVE DAY LABEL
  // =========================================================
  function getRelativeDay(info) {
    // Compare the date string of the timezone with local date string
    var localInfo = TZ.getTimeInZone(TZ.getLocalTimezone());
    if (!localInfo) return '';
    if (info.date === localInfo.date) return '';

    // Parse dates to determine tomorrow/yesterday
    var localD = parseShortDate(localInfo.date);
    var tzD = parseShortDate(info.date);
    if (!localD || !tzD) return '';

    var diff = Math.round((tzD - localD) / 86400000);
    if (diff === 1) return 'tomorrow';
    if (diff === -1) return 'yesterday';
    if (diff > 1) return '+' + diff + 'd';
    if (diff < -1) return diff + 'd';
    return '';
  }

  function parseShortDate(dateStr) {
    // "Mon, 31 Mar 2026" or similar Intl format
    try {
      return new Date(dateStr);
    } catch (e) {
      return null;
    }
  }

  // =========================================================
  //  LOCAL TIME
  // =========================================================
  function updateLocalTime() {
    var tz = TZ.getLocalTimezone();
    var info = TZ.getTimeInZone(tz);
    if (!info) return;

    localTimeDisplay.textContent = formatTime(info);
    localDate.textContent = info.date;
    localTz.textContent = tz + ' (' + TZ.getUTCOffset(tz) + ')';

    // Update analog hands
    setHandRotations(localHourHand, localMinuteHand, localSecondHand, info.hours, info.minutes, info.seconds);
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
  //  CLOCK GRID RENDERING (SEN-370 enhanced)
  // =========================================================
  function renderClocks() {
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
      card.className = 'clock-card' + (info.isDay ? '' : ' night-mode');
      card.setAttribute('data-tz', tz);

      var offsetClass = info.offsetMinutes > 0 ? 'ahead' : info.offsetMinutes < 0 ? 'behind' : 'same';

      // Relative day label
      var relDay = getRelativeDay(info);
      var relHtml = '';
      if (relDay === 'tomorrow') relHtml = '<span class="clock-day-rel tomorrow">TMR</span>';
      else if (relDay === 'yesterday') relHtml = '<span class="clock-day-rel yesterday">YST</span>';
      else if (relDay) relHtml = '<span class="clock-day-rel">' + escapeHtml(relDay) + '</span>';

      card.innerHTML =
        '<div class="clock-card-header">' +
          '<div>' +
            '<div class="clock-city">' + escapeHtml(meta.city) + '</div>' +
            '<div class="clock-region">' + escapeHtml(meta.country || meta.region) + '</div>' +
          '</div>' +
          '<span class="clock-daynight">' + (info.isDay ? '☀️' : '🌙') + '</span>' +
          '<button class="clock-remove" data-tz="' + escapeHtml(tz) + '" title="Remove" aria-label="Remove ' + escapeHtml(meta.city) + '">✕</button>' +
        '</div>' +
        // Analog clock
        '<div class="analog-clock">' +
          '<div class="clock-hand clock-hand-hour" data-tz-hour="' + escapeHtml(tz) + '"></div>' +
          '<div class="clock-hand clock-hand-minute" data-tz-min="' + escapeHtml(tz) + '"></div>' +
          '<div class="clock-hand clock-hand-second" data-tz-sec="' + escapeHtml(tz) + '"></div>' +
          '<div class="clock-center-dot"></div>' +
          '<div class="clock-markers-container" data-tz-markers="' + escapeHtml(tz) + '"></div>' +
        '</div>' +
        // Digital time
        '<div class="clock-time" data-tz-time="' + escapeHtml(tz) + '">' + formatTime(info) + '</div>' +
        '<div class="clock-date" data-tz-date="' + escapeHtml(tz) + '">' + info.date + relHtml + '</div>' +
        '<div class="clock-offset ' + offsetClass + '">' + info.offset + '</div>';

      clockGrid.appendChild(card);

      // Set initial hand positions
      setHandRotations(
        card.querySelector('[data-tz-hour="' + tz + '"]'),
        card.querySelector('[data-tz-min="' + tz + '"]'),
        card.querySelector('[data-tz-sec="' + tz + '"]'),
        info.hours, info.minutes, info.seconds
      );

      // Create markers
      var markersEl = card.querySelector('[data-tz-markers="' + tz + '"]');
      if (markersEl) createMarkers(markersEl);
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
   * Update time/hands on existing cards without full re-render.
   */
  function tickClocks() {
    updateLocalTime();

    addedClocks.forEach(function (tz) {
      var info = TZ.getTimeInZone(tz);
      if (!info) return;

      var timeEl = document.querySelector('[data-tz-time="' + tz + '"]');
      var dateEl = document.querySelector('[data-tz-date="' + tz + '"]');
      if (timeEl) timeEl.textContent = formatTime(info);
      if (dateEl) {
        var relDay = getRelativeDay(info);
        var relHtml = '';
        if (relDay === 'tomorrow') relHtml = '<span class="clock-day-rel tomorrow">TMR</span>';
        else if (relDay === 'yesterday') relHtml = '<span class="clock-day-rel yesterday">YST</span>';
        dateEl.innerHTML = escapeHtml(info.date) + relHtml;
      }

      // Update analog hands
      setHandRotations(
        document.querySelector('[data-tz-hour="' + tz + '"]'),
        document.querySelector('[data-tz-min="' + tz + '"]'),
        document.querySelector('[data-tz-sec="' + tz + '"]'),
        info.hours, info.minutes, info.seconds
      );

      // Update day/night
      var card = document.querySelector('[data-tz="' + tz + '"]');
      if (card) {
        card.classList.toggle('night-mode', !info.isDay);
        var dnEl = card.querySelector('.clock-daynight');
        if (dnEl) dnEl.textContent = info.isDay ? '☀️' : '🌙';
      }
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
    if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) toggleFormat();
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
  loadFormat();
  loadClocks();
  updateLocalTime();
  renderClocks();

  // Add default clocks if first visit
  var VISITED_KEY = 'timezone-app-visited';
  if (!localStorage.getItem(VISITED_KEY)) {
    localStorage.setItem(VISITED_KEY, '1');
    var defaults = [
      'America/New_York', 'Europe/London', 'Europe/Berlin',
      'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney'
    ];
    var localTzName = TZ.getLocalTimezone();
    defaults.forEach(function (tz) {
      if (tz !== localTzName) addClock(tz);
    });
    renderClocks();
  }

  // Start ticking every second
  tickInterval = setInterval(tickClocks, 1000);

})();
