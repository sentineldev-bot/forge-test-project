/**
 * Weather API Integration Layer (SEN-339)
 *
 * Uses Open-Meteo (https://open-meteo.com/) — free, no API key required.
 * Geocoding via Open-Meteo Geocoding API.
 *
 * Exports: window.WeatherAPI
 */
(function () {
  'use strict';

  const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1';
  const WEATHER_BASE = 'https://api.open-meteo.com/v1';

  // WMO weather code → { description, icon (emoji) }
  const WMO_CODES = {
    0:  { desc: 'Clear sky',            icon: '☀️',  night: '🌙' },
    1:  { desc: 'Mainly clear',         icon: '🌤️',  night: '🌙' },
    2:  { desc: 'Partly cloudy',        icon: '⛅',   night: '☁️' },
    3:  { desc: 'Overcast',             icon: '☁️',   night: '☁️' },
    45: { desc: 'Fog',                  icon: '🌫️',  night: '🌫️' },
    48: { desc: 'Depositing rime fog',  icon: '🌫️',  night: '🌫️' },
    51: { desc: 'Light drizzle',        icon: '🌦️',  night: '🌧️' },
    53: { desc: 'Moderate drizzle',     icon: '🌦️',  night: '🌧️' },
    55: { desc: 'Dense drizzle',        icon: '🌧️',  night: '🌧️' },
    56: { desc: 'Light freezing drizzle', icon: '🌧️', night: '🌧️' },
    57: { desc: 'Dense freezing drizzle', icon: '🌧️', night: '🌧️' },
    61: { desc: 'Slight rain',          icon: '🌦️',  night: '🌧️' },
    63: { desc: 'Moderate rain',        icon: '🌧️',  night: '🌧️' },
    65: { desc: 'Heavy rain',           icon: '🌧️',  night: '🌧️' },
    66: { desc: 'Light freezing rain',  icon: '🌧️',  night: '🌧️' },
    67: { desc: 'Heavy freezing rain',  icon: '🌧️',  night: '🌧️' },
    71: { desc: 'Slight snowfall',      icon: '🌨️',  night: '🌨️' },
    73: { desc: 'Moderate snowfall',    icon: '🌨️',  night: '🌨️' },
    75: { desc: 'Heavy snowfall',       icon: '❄️',   night: '❄️' },
    77: { desc: 'Snow grains',          icon: '❄️',   night: '❄️' },
    80: { desc: 'Slight rain showers',  icon: '🌦️',  night: '🌧️' },
    81: { desc: 'Moderate rain showers',icon: '🌧️',  night: '🌧️' },
    82: { desc: 'Violent rain showers', icon: '⛈️',   night: '⛈️' },
    85: { desc: 'Slight snow showers',  icon: '🌨️',  night: '🌨️' },
    86: { desc: 'Heavy snow showers',   icon: '❄️',   night: '❄️' },
    95: { desc: 'Thunderstorm',         icon: '⛈️',   night: '⛈️' },
    96: { desc: 'Thunderstorm with slight hail', icon: '⛈️', night: '⛈️' },
    99: { desc: 'Thunderstorm with heavy hail',  icon: '⛈️', night: '⛈️' },
  };

  /**
   * Decode a WMO weather code into human-readable description + icon.
   * @param {number} code - WMO weather code
   * @param {boolean} [isNight=false] - Use night icon variant
   * @returns {{ desc: string, icon: string }}
   */
  function decodeWeatherCode(code, isNight) {
    const entry = WMO_CODES[code] || { desc: 'Unknown', icon: '❓', night: '❓' };
    return {
      desc: entry.desc,
      icon: isNight ? entry.night : entry.icon,
    };
  }

  /**
   * Make a fetch request with timeout and error handling.
   * @param {string} url
   * @param {number} [timeoutMs=10000]
   * @returns {Promise<object>}
   */
  async function apiFetch(url, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error('API error: HTTP ' + res.status);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out — please try again.');
      }
      throw err;
    }
  }

  /**
   * Search for cities by name using Open-Meteo Geocoding.
   * @param {string} query - City name
   * @param {number} [limit=8] - Max results
   * @returns {Promise<Array<{name,country,admin1,lat,lon,population}>>}
   */
  async function searchCities(query, limit) {
    limit = limit || 8;
    if (!query || query.trim().length < 2) return [];

    var url = GEO_BASE + '/search?name=' + encodeURIComponent(query.trim()) +
              '&count=' + limit + '&language=en&format=json';

    var data = await apiFetch(url);
    if (!data.results) return [];

    return data.results.map(function (r) {
      return {
        name: r.name,
        country: r.country || '',
        countryCode: r.country_code || '',
        admin1: r.admin1 || '',
        lat: r.latitude,
        lon: r.longitude,
        population: r.population || 0,
        timezone: r.timezone || 'auto',
      };
    });
  }

  /**
   * Fetch current weather + daily forecast for a location.
   * @param {number} lat
   * @param {number} lon
   * @param {string} [timezone='auto']
   * @returns {Promise<object>} - { current, daily, hourly_units, ... }
   */
  async function fetchWeather(lat, lon, timezone) {
    timezone = timezone || 'auto';

    var currentParams = [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'surface_pressure',
      'is_day',
      'uv_index',
      'visibility',
    ].join(',');

    var dailyParams = [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(',');

    var url = WEATHER_BASE + '/forecast' +
      '?latitude=' + lat +
      '&longitude=' + lon +
      '&current=' + currentParams +
      '&daily=' + dailyParams +
      '&timezone=' + encodeURIComponent(timezone) +
      '&forecast_days=7';

    var data = await apiFetch(url);

    if (!data.current) {
      throw new Error('Invalid weather response — no current data.');
    }

    return normalizeWeatherData(data);
  }

  /**
   * Normalize raw Open-Meteo response into a clean structure.
   */
  function normalizeWeatherData(raw) {
    var c = raw.current;
    var isNight = c.is_day === 0;
    var code = decodeWeatherCode(c.weather_code, isNight);

    var current = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDir: c.wind_direction_10m,
      pressure: Math.round(c.surface_pressure),
      uvIndex: c.uv_index !== undefined ? c.uv_index.toFixed(1) : '--',
      visibility: c.visibility !== undefined ? (c.visibility / 1000).toFixed(1) : '--',
      weatherCode: c.weather_code,
      description: code.desc,
      icon: code.icon,
      isDay: c.is_day === 1,
      time: raw.current.time || '',
    };

    var daily = [];
    if (raw.daily && raw.daily.time) {
      for (var i = 0; i < raw.daily.time.length; i++) {
        var dayCode = decodeWeatherCode(raw.daily.weather_code[i], false);
        daily.push({
          date: raw.daily.time[i],
          tempMax: Math.round(raw.daily.temperature_2m_max[i]),
          tempMin: Math.round(raw.daily.temperature_2m_min[i]),
          weatherCode: raw.daily.weather_code[i],
          description: dayCode.desc,
          icon: dayCode.icon,
          precipSum: raw.daily.precipitation_sum[i],
          precipProb: raw.daily.precipitation_probability_max[i],
          windMax: Math.round(raw.daily.wind_speed_10m_max[i]),
          uvMax: raw.daily.uv_index_max[i],
          sunrise: raw.daily.sunrise[i],
          sunset: raw.daily.sunset[i],
        });
      }
    }

    return {
      current: current,
      daily: daily,
      timezone: raw.timezone || 'auto',
      latitude: raw.latitude,
      longitude: raw.longitude,
    };
  }

  /**
   * Reverse geocode coords to a city name via Open-Meteo.
   * Finds the nearest city to given coordinates.
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<{name, country, admin1} | null>}
   */
  async function reverseGeocode(lat, lon) {
    // Open-Meteo doesn't have reverse geocoding, so we use a workaround:
    // fetch weather (which returns timezone) and use coords display.
    // For a proper name, we try the Nominatim API (free, no key).
    try {
      var url = 'https://nominatim.openstreetmap.org/reverse?lat=' + lat +
                '&lon=' + lon + '&format=json&zoom=10&accept-language=en';
      var data = await apiFetch(url, 5000);
      if (data && data.address) {
        return {
          name: data.address.city || data.address.town || data.address.village ||
                data.address.county || data.address.state || 'Unknown',
          country: data.address.country || '',
          admin1: data.address.state || '',
        };
      }
    } catch (e) {
      // Fallback: just use coordinates
    }
    return null;
  }

  /**
   * Get wind direction as compass string.
   * @param {number} degrees
   * @returns {string}
   */
  function windDirection(degrees) {
    var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    var idx = Math.round(degrees / 22.5) % 16;
    return dirs[idx];
  }

  /**
   * Get UV index severity label.
   * @param {number} uv
   * @returns {{ label: string, color: string }}
   */
  function uvLabel(uv) {
    if (uv <= 2) return { label: 'Low', color: 'var(--green)' };
    if (uv <= 5) return { label: 'Moderate', color: 'var(--yellow)' };
    if (uv <= 7) return { label: 'High', color: 'var(--orange)' };
    if (uv <= 10) return { label: 'Very High', color: 'var(--red)' };
    return { label: 'Extreme', color: 'var(--red)' };
  }

  /**
   * Format a date string (YYYY-MM-DD) to a short day name.
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDay(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    var tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en', { weekday: 'short' });
  }

  // --- Public API ---
  window.WeatherAPI = {
    searchCities: searchCities,
    fetchWeather: fetchWeather,
    reverseGeocode: reverseGeocode,
    decodeWeatherCode: decodeWeatherCode,
    windDirection: windDirection,
    uvLabel: uvLabel,
    formatDay: formatDay,
    WMO_CODES: WMO_CODES,
  };
})();
