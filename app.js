/**
 * Weather App — Main Controller (SEN-339)
 *
 * Handles: search, geolocation, rendering current weather, theme toggle,
 * and provides hooks for subsequent feature tickets.
 */
(function () {
  'use strict';

  var API = window.WeatherAPI;
  var $ = function (id) { return document.getElementById(id); };

  // --- DOM refs ---
  var searchInput   = $('searchInput');
  var searchResults = $('searchResults');
  var geoBtn        = $('geoBtn');
  var loading       = $('loading');
  var errorBanner   = $('errorBanner');
  var errorMsg      = $('errorMsg');
  var errorDismiss  = $('errorDismiss');
  var currentWeather= $('currentWeather');
  var forecastEl    = $('forecast');
  var forecastGrid  = $('forecastGrid');
  var themeBtn      = $('themeBtn');

  // --- State ---
  var searchTimer = null;
  var currentLocation = null; // { name, country, lat, lon, ... }
  var SL = window.SavedLocations; // Saved locations module (SEN-350)

  // =========================================================
  //  THEME
  // =========================================================
  var THEME_KEY = 'weather-app-theme';

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
  //  UI HELPERS
  // =========================================================
  function showLoading() {
    loading.classList.remove('hidden');
    currentWeather.classList.add('hidden');
    forecastEl.classList.add('hidden');
  }

  function hideLoading() {
    loading.classList.add('hidden');
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorBanner.classList.remove('hidden');
    hideLoading();
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  errorDismiss.addEventListener('click', hideError);

  function hideSearchResults() {
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
  }

  // =========================================================
  //  SEARCH
  // =========================================================
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var q = searchInput.value.trim();
    if (q.length < 2) {
      hideSearchResults();
      return;
    }
    searchTimer = setTimeout(function () {
      performSearch(q);
    }, 350);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      hideSearchResults();
      searchInput.blur();
    }
    if (e.key === 'Enter') {
      var active = searchResults.querySelector('.active');
      if (active) {
        active.click();
      } else {
        // Search for first result
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

  async function performSearch(query) {
    try {
      var results = await API.searchCities(query, 6);
      if (results.length === 0) {
        searchResults.innerHTML = '<li class="no-results">No cities found</li>';
        searchResults.classList.remove('hidden');
        return;
      }
      searchResults.innerHTML = '';
      results.forEach(function (city) {
        var li = document.createElement('li');
        var display = city.name;
        if (city.admin1) display += ', ' + city.admin1;
        li.innerHTML = display + '<span class="sr-country">' + city.country + '</span>';
        li.addEventListener('click', function () {
          selectCity(city);
        });
        searchResults.appendChild(li);
      });
      searchResults.classList.remove('hidden');
    } catch (err) {
      showError('Search failed: ' + err.message);
    }
  }

  function selectCity(city) {
    currentLocation = city;
    searchInput.value = city.name + (city.admin1 ? ', ' + city.admin1 : '');
    hideSearchResults();
    hideError();
    fetchAndRender(city.lat, city.lon, city.timezone, city.name, city.country);
  }

  // Close search on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-container')) {
      hideSearchResults();
    }
  });

  // =========================================================
  //  GEOLOCATION
  // =========================================================
  geoBtn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }
    geoBtn.textContent = '⏳';
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        geoBtn.textContent = '📍';
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;

        // Reverse geocode to get city name
        var loc = await API.reverseGeocode(lat, lon);
        var name = loc ? loc.name : 'Current Location';
        var country = loc ? loc.country : '';
        searchInput.value = name;
        currentLocation = { name: name, country: country, lat: lat, lon: lon };

        hideError();
        fetchAndRender(lat, lon, 'auto', name, country);
      },
      function (err) {
        geoBtn.textContent = '📍';
        var msgs = {
          1: 'Location access denied. Please enable location permissions.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out. Please try again.',
        };
        showError(msgs[err.code] || 'Could not get location.');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });

  // =========================================================
  //  FETCH & RENDER
  // =========================================================
  async function fetchAndRender(lat, lon, timezone, cityName, country) {
    showLoading();
    try {
      var data = await API.fetchWeather(lat, lon, timezone);
      hideLoading();
      renderCurrentWeather(data, cityName, country);
      renderForecast(data);
    } catch (err) {
      hideLoading();
      showError('Failed to fetch weather: ' + err.message);
    }
  }

  function renderCurrentWeather(data, cityName, country) {
    var c = data.current;

    $('cwCity').textContent = cityName + (country ? ', ' + country : '');
    $('cwCoords').textContent = data.latitude.toFixed(2) + '°, ' + data.longitude.toFixed(2) + '°';

    if (c.time) {
      var d = new Date(c.time);
      $('cwTime').textContent = 'Updated: ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    $('cwIcon').textContent = c.icon;
    $('cwTemp').textContent = c.temp + '°C';
    $('cwDesc').textContent = c.description;
    $('cwFeels').textContent = c.feelsLike + '°C';
    $('cwHumidity').textContent = c.humidity + '%';
    $('cwWind').textContent = c.windSpeed + ' km/h ' + API.windDirection(c.windDir);
    $('cwPressure').textContent = c.pressure + ' hPa';

    var uv = parseFloat(c.uvIndex);
    if (!isNaN(uv)) {
      var uvInfo = API.uvLabel(uv);
      $('cwUV').textContent = c.uvIndex + ' ' + uvInfo.label;
      $('cwUV').style.color = uvInfo.color;
    } else {
      $('cwUV').textContent = '--';
      $('cwUV').style.color = '';
    }

    $('cwVisibility').textContent = c.visibility + ' km';

    currentWeather.classList.remove('hidden');

    // Update page title
    document.title = c.temp + '°C ' + cityName + ' — Weather App';

    // Render save button (SEN-350)
    if (SL && currentLocation) {
      SL.renderSaveButton({
        parent: $('cwCity').parentElement,
        location: currentLocation,
        onToggle: function () { renderSavedLocations(); },
      });
    }
  }

  function renderForecast(data) {
    if (!data.daily || data.daily.length === 0) {
      forecastEl.classList.add('hidden');
      return;
    }

    forecastGrid.innerHTML = '';

    // Show 5 days (skip today if we have 7)
    var days = data.daily.slice(1, 6);
    days.forEach(function (day) {
      var card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML =
        '<div class="fc-day">' + API.formatDay(day.date) + '</div>' +
        '<div class="fc-icon">' + day.icon + '</div>' +
        '<div class="fc-temps">' +
          '<span class="fc-high">' + day.tempMax + '°</span> ' +
          '<span class="fc-low">' + day.tempMin + '°</span>' +
        '</div>';
      forecastGrid.appendChild(card);
    });

    forecastEl.classList.remove('hidden');
  }

  // =========================================================
  //  SAVED LOCATIONS (SEN-350)
  // =========================================================
  function renderSavedLocations() {
    if (!SL) return;
    SL.render({
      container: $('savedLocations'),
      listEl: $('savedList'),
      onSelect: function (loc) {
        currentLocation = loc;
        searchInput.value = loc.name + (loc.admin1 ? ', ' + loc.admin1 : '');
        hideError();
        fetchAndRender(loc.lat, loc.lon, loc.timezone, loc.name, loc.country);
      },
      onRender: function () {
        var countEl = $('savedCount');
        if (countEl) countEl.textContent = SL.count() + '/' + SL.MAX_LOCATIONS;
      },
    });
  }

  // =========================================================
  //  KEYBOARD SHORTCUTS
  // =========================================================
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) toggleTheme();
    if (e.code === 'Slash' || e.code === 'KeyK' && e.ctrlKey) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // =========================================================
  //  INIT
  // =========================================================
  loadTheme();
  renderSavedLocations();

  // Auto-detect location on first visit
  var VISITED_KEY = 'weather-app-visited';
  if (!localStorage.getItem(VISITED_KEY)) {
    localStorage.setItem(VISITED_KEY, '1');
    // Try geolocation automatically on first visit
    if (navigator.geolocation) {
      geoBtn.click();
    }
  }

})();
