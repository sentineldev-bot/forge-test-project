/**
 * Timezone Data Module (SEN-369)
 *
 * Provides timezone utilities using the browser's native Intl API.
 * No external dependencies — all IANA timezones supported natively.
 *
 * Exports: window.TimezoneData
 */
(function () {
  'use strict';

  /**
   * Curated list of popular timezones with display metadata.
   * Grouped by region for easy browsing.
   */
  var POPULAR_TIMEZONES = [
    // Americas
    { tz: 'America/New_York',      city: 'New York',       region: 'Americas',  country: 'US' },
    { tz: 'America/Chicago',       city: 'Chicago',        region: 'Americas',  country: 'US' },
    { tz: 'America/Denver',        city: 'Denver',         region: 'Americas',  country: 'US' },
    { tz: 'America/Los_Angeles',   city: 'Los Angeles',    region: 'Americas',  country: 'US' },
    { tz: 'America/Anchorage',     city: 'Anchorage',      region: 'Americas',  country: 'US' },
    { tz: 'Pacific/Honolulu',      city: 'Honolulu',       region: 'Americas',  country: 'US' },
    { tz: 'America/Toronto',       city: 'Toronto',        region: 'Americas',  country: 'CA' },
    { tz: 'America/Vancouver',     city: 'Vancouver',      region: 'Americas',  country: 'CA' },
    { tz: 'America/Mexico_City',   city: 'Mexico City',    region: 'Americas',  country: 'MX' },
    { tz: 'America/Sao_Paulo',     city: 'São Paulo',      region: 'Americas',  country: 'BR' },
    { tz: 'America/Buenos_Aires',  city: 'Buenos Aires',   region: 'Americas',  country: 'AR' },
    { tz: 'America/Bogota',        city: 'Bogotá',         region: 'Americas',  country: 'CO' },
    { tz: 'America/Lima',          city: 'Lima',           region: 'Americas',  country: 'PE' },
    // Europe
    { tz: 'Europe/London',         city: 'London',         region: 'Europe',    country: 'GB' },
    { tz: 'Europe/Paris',          city: 'Paris',          region: 'Europe',    country: 'FR' },
    { tz: 'Europe/Berlin',         city: 'Berlin',         region: 'Europe',    country: 'DE' },
    { tz: 'Europe/Madrid',         city: 'Madrid',         region: 'Europe',    country: 'ES' },
    { tz: 'Europe/Rome',           city: 'Rome',           region: 'Europe',    country: 'IT' },
    { tz: 'Europe/Amsterdam',      city: 'Amsterdam',      region: 'Europe',    country: 'NL' },
    { tz: 'Europe/Zurich',         city: 'Zurich',         region: 'Europe',    country: 'CH' },
    { tz: 'Europe/Stockholm',      city: 'Stockholm',      region: 'Europe',    country: 'SE' },
    { tz: 'Europe/Oslo',           city: 'Oslo',           region: 'Europe',    country: 'NO' },
    { tz: 'Europe/Helsinki',       city: 'Helsinki',       region: 'Europe',    country: 'FI' },
    { tz: 'Europe/Warsaw',         city: 'Warsaw',         region: 'Europe',    country: 'PL' },
    { tz: 'Europe/Athens',         city: 'Athens',         region: 'Europe',    country: 'GR' },
    { tz: 'Europe/Istanbul',       city: 'Istanbul',       region: 'Europe',    country: 'TR' },
    { tz: 'Europe/Moscow',         city: 'Moscow',         region: 'Europe',    country: 'RU' },
    // Asia & Middle East
    { tz: 'Asia/Dubai',            city: 'Dubai',          region: 'Asia',      country: 'AE' },
    { tz: 'Asia/Riyadh',           city: 'Riyadh',         region: 'Asia',      country: 'SA' },
    { tz: 'Asia/Karachi',          city: 'Karachi',        region: 'Asia',      country: 'PK' },
    { tz: 'Asia/Kolkata',          city: 'Mumbai',         region: 'Asia',      country: 'IN' },
    { tz: 'Asia/Dhaka',            city: 'Dhaka',          region: 'Asia',      country: 'BD' },
    { tz: 'Asia/Bangkok',          city: 'Bangkok',        region: 'Asia',      country: 'TH' },
    { tz: 'Asia/Singapore',        city: 'Singapore',      region: 'Asia',      country: 'SG' },
    { tz: 'Asia/Hong_Kong',        city: 'Hong Kong',      region: 'Asia',      country: 'HK' },
    { tz: 'Asia/Shanghai',         city: 'Shanghai',       region: 'Asia',      country: 'CN' },
    { tz: 'Asia/Seoul',            city: 'Seoul',          region: 'Asia',      country: 'KR' },
    { tz: 'Asia/Tokyo',            city: 'Tokyo',          region: 'Asia',      country: 'JP' },
    { tz: 'Asia/Taipei',           city: 'Taipei',         region: 'Asia',      country: 'TW' },
    { tz: 'Asia/Jakarta',          city: 'Jakarta',        region: 'Asia',      country: 'ID' },
    // Oceania
    { tz: 'Australia/Sydney',      city: 'Sydney',         region: 'Oceania',   country: 'AU' },
    { tz: 'Australia/Melbourne',   city: 'Melbourne',      region: 'Oceania',   country: 'AU' },
    { tz: 'Australia/Perth',       city: 'Perth',          region: 'Oceania',   country: 'AU' },
    { tz: 'Pacific/Auckland',      city: 'Auckland',       region: 'Oceania',   country: 'NZ' },
    // Africa
    { tz: 'Africa/Cairo',          city: 'Cairo',          region: 'Africa',    country: 'EG' },
    { tz: 'Africa/Lagos',          city: 'Lagos',          region: 'Africa',    country: 'NG' },
    { tz: 'Africa/Johannesburg',   city: 'Johannesburg',   region: 'Africa',    country: 'ZA' },
    { tz: 'Africa/Nairobi',        city: 'Nairobi',       region: 'Africa',    country: 'KE' },
    { tz: 'Africa/Casablanca',     city: 'Casablanca',    region: 'Africa',    country: 'MA' },
    // UTC
    { tz: 'UTC',                   city: 'UTC',            region: 'Other',     country: '' },
  ];

  /**
   * Get current time in a timezone.
   * @param {string} tz - IANA timezone identifier
   * @returns {{ hours, minutes, seconds, time12, time24, date, dayName, monthDay, year, offset, offsetMinutes, isDay }}
   */
  function getTimeInZone(tz) {
    var now = new Date();
    try {
      var options = { timeZone: tz, hour12: false };
      var parts = {};

      // Get individual components
      var timeFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      var timeStr = timeFmt.format(now);
      var timeParts = timeStr.split(':');

      var dateFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
      var dateStr = dateFmt.format(now);

      var dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long' });
      var dayName = dayFmt.format(now);

      var time12Fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true
      });

      var h = parseInt(timeParts[0], 10);
      var m = parseInt(timeParts[1], 10);
      var s = parseInt(timeParts[2], 10);

      // Calculate offset from local
      var localOffset = now.getTimezoneOffset(); // in minutes, inverted
      var tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      var localDate = new Date(now.toLocaleString('en-US'));
      var diffMs = tzDate.getTime() - localDate.getTime();
      var offsetMinutes = Math.round(diffMs / 60000);

      return {
        hours: h,
        minutes: m,
        seconds: s,
        time24: pad(h) + ':' + pad(m) + ':' + pad(s),
        time12: time12Fmt.format(now),
        date: dateStr,
        dayName: dayName,
        year: now.getFullYear(),
        offset: formatOffset(offsetMinutes),
        offsetMinutes: offsetMinutes,
        isDay: h >= 6 && h < 20,
        timezone: tz,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the local timezone IANA name.
   * @returns {string}
   */
  function getLocalTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return 'UTC';
    }
  }

  /**
   * Format an offset in minutes to a string like "UTC+5:30" or "UTC-8".
   * @param {number} minutes - Offset from local time in minutes
   * @returns {string}
   */
  function formatOffset(minutes) {
    if (minutes === 0) return 'Same time';
    var sign = minutes > 0 ? '+' : '-';
    var abs = Math.abs(minutes);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    var result = sign + h + 'h';
    if (m > 0) result += ' ' + m + 'm';
    return result;
  }

  /**
   * Format UTC offset for a timezone (e.g., "UTC+5:30").
   * @param {string} tz - IANA timezone
   * @returns {string}
   */
  function getUTCOffset(tz) {
    var now = new Date();
    try {
      var fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      });
      var parts = fmt.formatToParts(now);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') {
          return parts[i].value;
        }
      }
    } catch (e) {
      // Fallback
    }
    return '';
  }

  /**
   * Search timezones by query with fuzzy matching.
   * Scores results: exact city match > starts-with > contains > fuzzy.
   * @param {string} query
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function search(query, limit) {
    limit = limit || 10;
    if (!query || query.trim().length < 1) return [];
    var q = query.toLowerCase().trim();
    var words = q.split(/\s+/);

    var scored = [];
    for (var i = 0; i < POPULAR_TIMEZONES.length; i++) {
      var tz = POPULAR_TIMEZONES[i];
      var city = tz.city.toLowerCase();
      var searchable = (tz.city + ' ' + tz.tz.replace(/_/g, ' ') + ' ' + tz.country + ' ' + tz.region).toLowerCase();

      var score = 0;
      // Exact city match
      if (city === q) score = 100;
      // City starts with query
      else if (city.indexOf(q) === 0) score = 80;
      // Any field contains query
      else if (searchable.indexOf(q) !== -1) score = 60;
      // All words match somewhere (multi-word fuzzy)
      else {
        var allMatch = true;
        for (var w = 0; w < words.length; w++) {
          if (searchable.indexOf(words[w]) === -1) { allMatch = false; break; }
        }
        if (allMatch) score = 40;
      }

      if (score > 0) {
        scored.push({ tz: tz, score: score });
      }
    }

    // Sort by score descending, then by city name
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.tz.city.localeCompare(b.tz.city);
    });

    var results = [];
    for (var j = 0; j < Math.min(scored.length, limit); j++) {
      results.push(scored[j].tz);
    }
    return results;
  }

  /**
   * Get all timezones grouped by region.
   * @returns {Object} - { "Americas": [...], "Europe": [...], ... }
   */
  function getByRegion() {
    var groups = {};
    for (var i = 0; i < POPULAR_TIMEZONES.length; i++) {
      var tz = POPULAR_TIMEZONES[i];
      if (!groups[tz.region]) groups[tz.region] = [];
      groups[tz.region].push(tz);
    }
    return groups;
  }

  /**
   * Get timezone info by IANA identifier.
   * @param {string} tz
   * @returns {object|null}
   */
  function getByTz(tz) {
    for (var i = 0; i < POPULAR_TIMEZONES.length; i++) {
      if (POPULAR_TIMEZONES[i].tz === tz) return POPULAR_TIMEZONES[i];
    }
    // Not in popular list — create a dynamic entry
    try {
      var parts = tz.split('/');
      var city = parts[parts.length - 1].replace(/_/g, ' ');
      return { tz: tz, city: city, region: parts[0] || 'Other', country: '' };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get all unique regions from the curated list.
   * @returns {string[]}
   */
  function getRegions() {
    var seen = {};
    var regions = [];
    for (var i = 0; i < POPULAR_TIMEZONES.length; i++) {
      var r = POPULAR_TIMEZONES[i].region;
      if (!seen[r]) {
        seen[r] = true;
        regions.push(r);
      }
    }
    return regions;
  }

  // --- Helpers ---
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /**
   * Convert a specific time from one timezone to another.
   * @param {number} hours - 0-23
   * @param {number} minutes - 0-59
   * @param {string} dateStr - YYYY-MM-DD
   * @param {string} fromTz - Source IANA timezone
   * @param {string} toTz - Target IANA timezone
   * @returns {{ hours, minutes, date, time24, time12, dayShift, fromOffset, toOffset } | null}
   */
  function convertTime(hours, minutes, dateStr, fromTz, toTz) {
    try {
      // Build a Date object in the source timezone
      // Strategy: create a date string and parse it relative to the source tz
      var srcStr = dateStr + 'T' + pad(hours) + ':' + pad(minutes) + ':00';

      // Get UTC offset for source timezone at that date/time
      // We use a trick: format the same instant in both timezones
      var refDate = new Date(srcStr + 'Z'); // treat as UTC first

      // Get source timezone's offset by comparing formatted times
      var srcFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: fromTz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      var srcParts = parseDateTimeParts(srcFmt.format(refDate));

      // Calculate the offset: the difference between what we asked for and what the tz shows
      var askedMs = Date.UTC(
        parseInt(dateStr.split('-')[0]),
        parseInt(dateStr.split('-')[1]) - 1,
        parseInt(dateStr.split('-')[2]),
        hours, minutes, 0
      );
      var srcShownMs = Date.UTC(srcParts.year, srcParts.month - 1, srcParts.day, srcParts.hours, srcParts.minutes, 0);
      var srcOffsetMs = srcShownMs - refDate.getTime();

      // The actual UTC time of the user's input in the source timezone
      var actualUtcMs = askedMs - srcOffsetMs;

      // Now format that UTC time in the target timezone
      var targetDate = new Date(actualUtcMs);
      var tgtFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: toTz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      var tgtParts = parseDateTimeParts(tgtFmt.format(targetDate));

      var tgtFmt12 = new Intl.DateTimeFormat('en-US', {
        timeZone: toTz, hour: 'numeric', minute: '2-digit', hour12: true
      });

      // Day shift
      var srcDayMs = Date.UTC(
        parseInt(dateStr.split('-')[0]),
        parseInt(dateStr.split('-')[1]) - 1,
        parseInt(dateStr.split('-')[2])
      );
      var tgtDayMs = Date.UTC(tgtParts.year, tgtParts.month - 1, tgtParts.day);
      var dayShift = Math.round((tgtDayMs - srcDayMs) / 86400000);

      return {
        hours: tgtParts.hours,
        minutes: tgtParts.minutes,
        date: tgtParts.year + '-' + pad(tgtParts.month) + '-' + pad(tgtParts.day),
        time24: pad(tgtParts.hours) + ':' + pad(tgtParts.minutes),
        time12: tgtFmt12.format(targetDate),
        dayShift: dayShift,
        fromOffset: getUTCOffset(fromTz),
        toOffset: getUTCOffset(toTz),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Parse "DD/MM/YYYY, HH:MM:SS" from Intl.DateTimeFormat('en-GB').
   */
  function parseDateTimeParts(str) {
    // Format: "31/03/2026, 14:30:00"
    var match = str.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return { year: 2000, month: 1, day: 1, hours: 0, minutes: 0 };
    return {
      day: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      year: parseInt(match[3], 10),
      hours: parseInt(match[4], 10),
      minutes: parseInt(match[5], 10),
    };
  }

  // --- Public API ---
  window.TimezoneData = {
    POPULAR_TIMEZONES: POPULAR_TIMEZONES,
    getTimeInZone: getTimeInZone,
    getLocalTimezone: getLocalTimezone,
    formatOffset: formatOffset,
    getUTCOffset: getUTCOffset,
    search: search,
    getByTz: getByTz,
    getByRegion: getByRegion,
    getRegions: getRegions,
    convertTime: convertTime,
    pad: pad,
  };
})();
