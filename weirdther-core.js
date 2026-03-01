/* Weirdther Core - Shared JavaScript for all HTML files
 * Compatible with older browsers (no ES6+)
 */

/* ========== CONFIGURATION ========== */
var WEIRDTHER_CONFIG = {
    DAILY_VARS: "weather_code,temperature_2m_max,temperature_2m_min,rain_sum,showers_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunshine_duration,daylight_duration",
    HOURLY_VARS: "temperature_2m,weather_code,relative_humidity_2m,precipitation_probability,rain,showers,snowfall,visibility,cloud_cover,wind_speed_10m,wind_gusts_10m",
    DEFAULT_DELTA: 5,
    HISTORICAL_YEARS: 26,
    SCORE_VARS: ["temperature_2m_max", "temperature_2m_min", "rain_sum", "snowfall_sum", "wind_speed_10m_max", "sunshine_duration"],
    SCORE_WEIGHTS: {
        "temperature_2m_max": 1.0,
        "temperature_2m_min": 1.0,
        "rain_sum": 1.0,
        "snowfall_sum": 1.0,
        "wind_speed_10m_max": 0.6,
        "sunshine_duration": 0.3
    },
    SCORE_EXPONENT: 3,
    SCORE_EXTREME_THRESHOLD: 0.9, // Boost kicks in at 95th/5th percentile (normalized)
    SCORE_EXTREME_BOOST: 4,       // Multiplier for excess beyond threshold
    SCORE_DENOM: 2.0,             // Fixed denominator for RMS (rewards breadth)
    METRIC_UNIT_STRING: "",
};

/* ========== VARIABLE METADATA ========== */

var FRIENDLY_NAMES = {
    "temperature_2m_max": {
        "name": "Max Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F",
        "metric_short": "&#186;C",
        "imperial_short": " F",
        "colors": ["blue", "white", "red"],
        "color_limits": [0, 50, 100],
    },
    "temperature_2m_min": {
        "name": "Min Temp",
        "lower": "colder",
        "higher": "warmer",
        "metric": "&#186;C",
        "imperial": " F",
        "metric_short": "&#186;C",
        "imperial_short": " F",
        "colors": ["blue", "white", "red"],
        "color_limits": [0, 50, 100]
    },
    "rain_sum": {
        "name": "Rain",
        "lower": "drier",
        "higher": "rainier",
        "metric": " mm",
        "imperial": " inch",
        "metric_short": " mm",
        "imperial_short": " inch",
        "colors": ["white", "#DDDDff", "blue"],
        "color_limits": [0, 80, 99]
    },
    "snowfall_sum": {
        "name": "Snow",
        "lower": "less snowy",
        "higher": "snowier",
        "metric": " mm",
        "imperial": " inch",
        "metric_short": " mm",
        "imperial_short": " inch",
        "colors": ["white", "blue"],
        "color_limits": [0, 99]
    },
    "wind_speed_10m_max": {
        "name": "Wind",
        "lower": "calmer",
        "higher": "windier",
        "metric": " km/h",
        "imperial": " mph",
        "metric_short": " km/h",
        "imperial_short": " mph",
        "colors": ["white", "#DDDDff", "blue", "lightgreen", "red"],
        "color_limits": [0, 25, 50, 75, 100],
    },
    "sunshine_duration": {
        "name": "Sunshine",
        "lower": "less sunny",
        "higher": "sunnier",
        "metric": "% of daylight hours",
        "imperial": " % of daylight hours",
        "metric_short": "%",
        "imperial_short": "%",
        "colors": ["gray", "yellow"],
        "color_limits": [0, 68]
    },
};

/* ========== UTILITY FUNCTIONS ========== */

function cacheKey(dateStr, lat, lon) {
    return dateStr.replace(/-/g, '') + Math.round(parseFloat(lat) * 100) + "|" + Math.round(parseFloat(lon) * 100);
}

// Decimal places to keep per variable when writing to cache
var CACHE_VAR_DECIMALS = {
    "weather_code": 0, "temperature_2m_max": 1, "temperature_2m_min": 1,
    "rain_sum": 1, "showers_sum": 1, "snowfall_sum": 1, "wind_speed_10m_max": 1,
    "wind_gusts_10m_max": 1, "wind_direction_10m_dominant": 0,
    "sunshine_duration": 0, "daylight_duration": 0
};

function mergeShowersIntoRain(data) {
    if (!data || !data.daily) return;
    var rain = data.daily.rain_sum;
    var showers = data.daily.showers_sum;
    if (!rain || !showers) return;
    for (var i = 0; i < rain.length; i++) {
        rain[i] = +((rain[i] || 0) + (showers[i] || 0)).toFixed(1);
    }
}

/**
 * Parses URL query string parameters with support for both short and long names
 * Short names: l, lat, lon, u, d, r, s, c
 * Long names: location, latitude, longitude, units, delta, rotation, scale, climate_normal
 * @param {Object} defaults - Default values for parameters
 * @returns {Object} Parsed parameters with standardized long names
 */
function parseUrlParams(defaults) {
    var params = defaults || {};
    var qs = window.location.search.substring(1);
    if (!qs) return params;

    var pairs = qs.split("&");
    var paramMap = {
        // Short name -> long name mappings
        "l": "location",
        "lat": "latitude",
        "lon": "longitude",
        "u": "units",
        "d": "delta",
        "r": "rotation",
        "s": "scale",
        "c": "climate_normal"
    };

    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        if (pair.length === 2) {
            var key = decodeURIComponent(pair[0].replace(/\+/g, "%20")).replace(/\+/g, " ");
            var value = decodeURIComponent(pair[1].replace(/\+/g, "%20")).replace(/\+/g, " ");

            // Map short name to long name if it exists
            var longKey = paramMap[key] || key;

            // If both short and long exist, prefer the one that was set last (this one)
            params[longKey] = value;
        }
    }

    return params;
}

/**
 * Builds a URL query string with short parameter names for compact URLs
 * @param {Object} params - Parameters with long names (location, latitude, etc.)
 * @param {Array} keys - Optional list of keys to include (uses long names)
 * @returns {string} Query string starting with ? or empty string
 */
function buildUrlQuery(params, keys) {
    var shortMap = {
        "location": "l",
        "latitude": "lat",
        "longitude": "lon",
        "units": "u",
        "delta": "d",
        "rotation": "r",
        "scale": "s",
        "climate_normal": "c",
        "date": "date" // Keep date as-is for readability
    };

    var allKeys = keys || ["location", "latitude", "longitude", "units", "date", "rotation", "scale", "delta", "climate_normal"];
    var qs = "";

    for (var i = 0; i < allKeys.length; i++) {
        var longKey = allKeys[i];
        var value = params[longKey];
        if (value != null && value !== "") {
            var shortKey = shortMap[longKey] || longKey;
            qs += (qs ? "&" : "?") + shortKey + "=" + encodeURIComponent(value);
        }
    }

    return qs;
}

function toISODate(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function parseDate(str) {
    var parts = str.split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function daysIntoYear(date) {
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000;
}

/**
 * Filters historical data by day-of-year window and climate normal years
 * @param {Array} values - Historical values
 * @param {Array} dates - Historical dates (ISO strings)
 * @param {string} currentDate - Current date (ISO string)
 * @param {number} delta - Days before/after to include
 * @param {Object} climateNormal - {start: year, end: year}
 * @returns {Object} {values: Array, dates: Array} - Filtered and sorted arrays
 */
function filterHistoricalByDateWindow(values, dates, currentDate, delta, climateNormal) {
    var currentDateObj = parseDate(currentDate);
    var startDayOfYear = daysIntoYear(currentDateObj) - delta;
    var endDayOfYear = daysIntoYear(currentDateObj) + delta;

    var combined = [];
    for (var i = 0; i < dates.length; i++) {
        if (values[i] == null) continue;

        var dateObj = parseDate(dates[i]);
        var dayOfYear = daysIntoYear(dateObj);
        var year = dateObj.getFullYear();

        // Check day-of-year window (handles year wraparound)
        var inWindow;
        if (endDayOfYear >= startDayOfYear) {
            inWindow = dayOfYear >= startDayOfYear && dayOfYear <= endDayOfYear;
        } else {
            // Year wraparound case (e.g., December to January)
            inWindow = dayOfYear >= startDayOfYear || dayOfYear <= endDayOfYear;
        }

        // Check climate normal years
        var inYearRange = year >= climateNormal.start && year <= climateNormal.end;

        if (inWindow && inYearRange) {
            combined.push([dates[i], values[i]]);
        }
    }

    // Sort by value
    combined.sort(function(a, b) { return a[1] - b[1]; });

    var filteredDates = [];
    var filteredValues = [];
    for (var j = 0; j < combined.length; j++) {
        filteredDates.push(combined[j][0]);
        filteredValues.push(combined[j][1]);
    }

    return { dates: filteredDates, values: filteredValues };
}

/* ========== STATISTICAL FUNCTIONS ========== */

function getPercentile(data, percentile) {
    var index = Math.floor(data.length * percentile);
    return data[index];
}

function getMedian(data) {
    return getPercentile(data, 0.5);
}

function getMean(data) {
    var sum = 0;
    for (var i = 0; i < data.length; i++) {
        sum += data[i];
    }
    return sum / data.length;
}

function getStd(data) {
    var mean = getMean(data);
    var sumSqDiff = 0;
    for (var i = 0; i < data.length; i++) {
        var diff = data[i] - mean;
        sumSqDiff += diff * diff;
    }
    return Math.sqrt(sumSqDiff / data.length);
}

/* ========== PERCENTILE CALCULATION ========== */

/**
 * Finds the percentile for a value in sorted data
 * @param {Array} sortedData - Sorted array of values
 * @param {number} value - Value to find percentile for
 * @returns {Array} [percentile, firstIndex, lastIndex] where:
 *   - percentile: 0-1 (or <0 for below min, >1 for above max)
 *   - firstIndex: index of first value >= target
 *   - lastIndex: index of first value > target
 */
function findPercentileForValue(sortedData, value) {
    var firstIndex = -1, lastIndex = -1, i;
    for (i = 0; i < sortedData.length; i++) {
        if (sortedData[i] >= value) { firstIndex = i; break; }
    }
    for (i = 0; i < sortedData.length; i++) {
        if (sortedData[i] > value) { lastIndex = i; break; }
    }
    if (firstIndex === -1 && lastIndex === -1) return [1.01, firstIndex, lastIndex];
    if (firstIndex === -1 || (firstIndex === 0 && lastIndex === 0)) return [-0.01, firstIndex, lastIndex];
    if (firstIndex === 0 && lastIndex === 1) return [0, firstIndex, lastIndex];
    if (lastIndex === -1) return [firstIndex === 0 ? 0.5 : 1, firstIndex, lastIndex];
    if (firstIndex <= sortedData.length / 2 && lastIndex >= sortedData.length / 2) return [0.5, firstIndex, lastIndex];
    var pL = firstIndex / sortedData.length;
    var pR = lastIndex / sortedData.length;
    var percentile = Math.abs(pL - 0.5) < Math.abs(pR - 0.5) ? pL : pR;
    return [percentile, firstIndex, lastIndex];
}

/* ========== WEIRDTHER SCORE COMPUTATION ========== */

function computeWeirdtherScore(percentile) {
    var diff = Math.abs(percentile - 0.5);
    var normalized = diff * 2; // 0 at 50th, 1 at 100th, >1 beyond historical range
    var score = Math.pow(normalized, WEIRDTHER_CONFIG.SCORE_EXPONENT);
    // Steep boost for extreme percentiles (above 95th / below 5th)
    if (normalized > WEIRDTHER_CONFIG.SCORE_EXTREME_THRESHOLD) {
        score += (normalized - WEIRDTHER_CONFIG.SCORE_EXTREME_THRESHOLD) * WEIRDTHER_CONFIG.SCORE_EXTREME_BOOST;
    }
    return score;
}

/**
 * Computes the final weirdther score from multiple variable scores using weighted RMS
 * @param {Array} varScores - Array of {varName, score} objects
 * @returns {number} Final score 0-100 (capped at 99)
 */
function computeFinalWeirdtherScore(varScores) {
    var sumWS = 0;
    for (var i = 0; i < varScores.length; i++) {
        var w = WEIRDTHER_CONFIG.SCORE_WEIGHTS[varScores[i].varName] || 1.0;
        var s = varScores[i].score;
        if (s > 0) sumWS += s * s * w;
    }
    if (sumWS === 0) return 0;
    // Fixed denominator: more extreme variables always increase the score
    var rms = Math.sqrt(sumWS / WEIRDTHER_CONFIG.SCORE_DENOM);
    var finalScore = Math.round(rms * 100);
    if (finalScore > 99) finalScore = 99;
    return finalScore;
}

function isScoreVar(varName) {
    for (var i = 0; i < WEIRDTHER_CONFIG.SCORE_VARS.length; i++) {
        if (WEIRDTHER_CONFIG.SCORE_VARS[i] === varName) return true;
    }
    return false;
}

/* ========== SCORE LABELS ========== */

function getScoreLabel(score) {
    if (score >= 99) return "EXTREME";
    if (score >= 90) return "WEIRD";
    if (score > 70) return "UNUSUAL";
    if (score >= 30) return "MODERATE";
    return "TYPICAL";
}

function genOnceEvery(percentile, startYear, endYear) {
    var p = 1 - Math.abs(0.5 - percentile) * 2;
    var days = Math.round(1 / p);
    if (percentile < 0 || percentile > 1) return "never in " + startYear + "-" + endYear + "!";
    if (isNaN(days) || !isFinite(days)) return "once in " + startYear + "-" + endYear + "!";
    if (days <= 1) return "every other day";
    if (days >= 365) return "once every " + Math.round(days / 365) + "yr";
    if (days >= 28 && days <= 32) return "once a month";
    if (days >= 6 && days <= 8) return "once a week";
    return "once every " + days + "d";
}

/* ========== DATA PROCESSING ========== */

function groupAllHistorical(datas) {
    var varList = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
    var grouped = {};
    var k;
    for (k = 0; k < varList.length; k++) grouped[varList[k]] = [];
    grouped["time"] = [];

    for (var i = 0; i < datas.length; i++) {
        var daily = datas[i].daily;
        for (var j = 0; j < daily.time.length; j++) {
            grouped["time"].push(daily.time[j]);
            for (k = 0; k < varList.length; k++) {
                var vn = varList[k];
                var val = (daily[vn] && daily[vn][j] != null) ? daily[vn][j] : null;
                grouped[vn].push(val);
            }
        }
    }
    return grouped;
}

/* ========== PERCENTILE DISPLAY ========== */

function pctPretty(p) {
    var v = Math.round(p * 100);
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    if (v === 1) return "1st";
    if (v === 2) return "2nd";
    if (v === 3) return "3rd";
    if (v === 21) return "21st";
    if (v === 22) return "22nd";
    if (v === 23) return "23rd";
    if (v === 31) return "31st";
    if (v === 32) return "32nd";
    if (v === 33) return "33rd";
    return v + "th";
}

function isUnusual(percentile) {
    return percentile < 0.15 || percentile > 0.85;
}

function unusualClass(percentile) {
    if (percentile < 0.15) return "bld-lo";
    if (percentile > 0.85) return "bld";
    return "";
}

/* ========== UNIFIED SCORE COMPUTATION ========== */

/**
 * Computes percentile and weirdther score for a weather variable
 * @param {string} varName - Variable name (e.g., "temperature_2m_max")
 * @param {Array} historicalValues - Historical values for this variable
 * @param {Array} historicalDates - Corresponding dates (ISO format)
 * @param {number} currentValue - Current/forecast value
 * @param {string} currentDate - Current date (ISO format)
 * @param {number} latitude - Latitude for sunshine normalization
 * @returns {Object} { percentile: number, score: number, normalizedValue: number, firstIndex: number, lastIndex: number }
 */
function computeVariableScore(varName, historicalValues, historicalDates, currentValue, currentDate, latitude) {
    var hist = [];
    for (var i = 0; i < historicalValues.length; i++) {
        var val = historicalValues[i];
        if (val == null) continue;
        hist.push(val);
    }
    hist.sort(function(a, b) { return a - b; });

    var cmpVal = currentValue;
    if (hist.length === 0) {
        return { percentile: 0.5, score: 0, normalizedValue: cmpVal, firstIndex: -1, lastIndex: -1 };
    }

    var percentileData = findPercentileForValue(hist, cmpVal);
    var percentile = percentileData[0];
    var score = computeWeirdtherScore(percentile);

    return {
        percentile: percentile,
        score: score,
        normalizedValue: cmpVal,
        firstIndex: percentileData[1],
        lastIndex: percentileData[2]
    };
}

function weatherCodeToDescription(code) {
    var mapping = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };
    return mapping[code] || "Unknown";
}

/* ========== UI UTILITIES ========== */

function show(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = text;
    el.style.display = text ? "" : "none";
}

function setupRotation(angle, zoom) {
    var deg = parseInt(angle, 10);
    if (isNaN(deg)) return;
    if (!zoom || zoom <= 0) zoom = 1;
    var el = document.getElementById("wrapper");
    if (!el) return;
    var w = window.innerWidth || document.documentElement.clientWidth || screen.width || 600;
    var h = window.innerHeight || document.documentElement.clientHeight || screen.height || 800;
    /* For 90/270 rotation, swap and scale wrapper dimensions */
    var a = Math.abs(deg % 360);
    if (a === 90 || a === 270) {
        var wrapW = Math.round(h / zoom);
        var wrapH = Math.round(w / zoom);
        el.style.width = wrapW + "px";
        el.style.height = wrapH + "px";
        el.style.position = "absolute";
        el.style.left = Math.round((w - wrapW) / 2) + "px";
        el.style.top = Math.round((h - wrapH) / 2) + "px";
        el.style.overflow = "hidden";
    }
    var xf = "rotate(" + deg + "deg)";
    if (zoom !== 1) xf += " scale(" + zoom + ")";
    el.style.webkitTransformOrigin = "50% 50%";
    el.style.webkitTransform = xf;
    el.style.transformOrigin = "50% 50%";
    el.style.transform = xf;
}

/* ========== HTTP ========== */

function httpGet(url, callback) {
    var xhr = new XMLHttpRequest();
    var done = false;
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && !done) {
            done = true;
            if (xhr.status === 200) {
                var parsed;
                try { parsed = JSON.parse(xhr.responseText); }
                catch (e) { callback("JSON parse error", null); return; }
                callback(null, parsed);
            } else if (xhr.status === 429) {
                callback("Rate limit exceeded (429 Too Many Requests)", null);
            } else {
                callback("HTTP error " + xhr.status, null);
            }
        }
    };
    xhr.send(null);
}

function geocode(location, callback) {
    var url = "https://geocoding-api.open-meteo.com/v1/search?name=" +
              encodeURIComponent(location) + "&count=10&format=json";
    httpGet(url, function(err, data) {
        if (err || !data || !data.results || data.results.length === 0) {
            callback("Location not found"); return;
        }
        var r = data.results[0];
        var name = r.name;
        if (r.admin1) name += ", " + r.admin1;
        if (r.country) name += ", " + r.country;
        callback(null, parseFloat(r.latitude).toFixed(2), parseFloat(r.longitude).toFixed(2), name);
    });
}

/* ========== UNIT CONVERSION ========== */

function convertToImperial(data) {
    for (var varName in data) {
        if (!data.hasOwnProperty(varName)) continue;
        if (!Array.isArray(data[varName])) continue;
        if (varName === "temperature_2m_max" || varName === "temperature_2m_min" ||
            varName === "temperature_2m" || varName === "apparent_temperature") {
            for (var i = 0; i < data[varName].length; i++) {
                if (data[varName][i] != null) data[varName][i] = data[varName][i] * 9/5 + 32;
            }
        } else if (varName === "wind_speed_10m_max" || varName === "wind_gusts_10m_max") {
            for (var i = 0; i < data[varName].length; i++) {
                if (data[varName][i] != null) data[varName][i] = data[varName][i] * 0.621371;
            }
        } else if (varName === "rain_sum") {
            for (var i = 0; i < data[varName].length; i++) {
                if (data[varName][i] != null) data[varName][i] = data[varName][i] * 0.0393701;
            }
        } else if (varName === "snowfall_sum") {
            for (var i = 0; i < data[varName].length; i++) {
                if (data[varName][i] != null) data[varName][i] = data[varName][i] * 0.393701;
            }
        }
    }
    return data;
}

function convertSunshineToPct(data) {
    if (!data || !Array.isArray(data["sunshine_duration"]) || !Array.isArray(data["daylight_duration"])) return data;
    for (var i = 0; i < data["sunshine_duration"].length; i++) {
        if (data["sunshine_duration"][i] != null) {
            data["sunshine_duration"][i] = data["sunshine_duration"][i] / (data["daylight_duration"][i] || 1) * 100;
        }
    }
    return data;
}

/* ========== CACHE HELPERS ========== */

var useCache = (function() {
    try {
        var t = "__wh_test__";
        localStorage.setItem(t, t);
        localStorage.removeItem(t);
        // Evict any entry that isn't a cache day (8 leading digits) or "units"
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k !== "units" && !/^\d{8}/.test(k)) toRemove.push(k);
        }
        for (var j = 0; j < toRemove.length; j++) {
            try { localStorage.removeItem(toRemove[j]); } catch (e) {}
        }
        return true;
    } catch (e) {
        return false;
    }
})();

function clearTodayCache(lat, lon) {
    if (!useCache) return;
    try { localStorage.removeItem(cacheKey(toISODate(new Date()), lat, lon)); } catch (e) {}
}

/* ========== DATA FETCHING ========== */

function fetchForecast(lat, lon, callback) {
    var currentVars = "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,relative_humidity_2m";
    var hourlyVars = "precipitation_probability,precipitation,weather_code,temperature_2m,snowfall,wind_speed_10m,wind_direction_10m";
    var url = "https://api.open-meteo.com/v1/forecast?forecast_days=16&past_days=1&latitude=" + lat +
              "&longitude=" + lon + "&daily=" + WEIRDTHER_CONFIG.DAILY_VARS + ",weather_code" +
              "&current=" + currentVars + "&hourly=" + hourlyVars + "&timezone=auto";
    httpGet(url, function(err, data) {
        if (!err && data) mergeShowersIntoRain(data);
        callback(err, data);
    });
}

function fetchHistoricalRange(lat, lon, startDate, endDate, callback) {
    var varList = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
    var start = new Date(startDate);
    var end = new Date(endDate);
    var now = new Date();
    var today = toISODate(now);

    if (toISODate(end) > today) end = now;
    if (toISODate(start) > today) { callback(null, null); return; }
    if (start > end) { callback(null, null); return; }

    /* Check cache for each day in this range */
    if (useCache) {
        var allCached = true;
        var cachedData = {daily: {}};
        for (var k = 0; k < varList.length; k++) cachedData.daily[varList[k]] = [];
        cachedData.daily.time = [];

        for (var d = new Date(start.getTime()); d <= end; d.setDate(d.getDate() + 1)) {
            if (toISODate(d) === today) continue; // today is never cached; forecast covers it
            var key = cacheKey(toISODate(d), lat, lon);
            try {
                var cached = localStorage.getItem(key);
                if (cached) {
                    var compact = JSON.parse(cached);
                    if (Array.isArray(compact) && compact.length === varList.length) {
                        cachedData.daily.time.push(toISODate(d));
                        for (var v = 0; v < varList.length; v++) {
                            cachedData.daily[varList[v]].push(compact[v]);
                        }
                        continue;
                    }
                }
            } catch (e) {}
            allCached = false;
            break;
        }

        if (allCached && cachedData.daily.time.length > 0) {
            callback(null, cachedData);
            return;
        }
    }

    var url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon +
              "&start_date=" + toISODate(start) + "&end_date=" + toISODate(end) +
              "&daily=" + WEIRDTHER_CONFIG.DAILY_VARS + "&timezone=auto";
    httpGet(url, function(err, data) {
        if (err || !data) { callback(err, null); return; }
        mergeShowersIntoRain(data);

        if (useCache && data.daily && data.daily.time) {
            try {
                for (var i = 0; i < data.daily.time.length; i++) {
                    var day = data.daily.time[i];
                    var key = cacheKey(day, lat, lon);
                    var compact = [];
                    for (var v = 0; v < varList.length; v++) {
                        var val = data.daily[varList[v]] ? data.daily[varList[v]][i] : null;
                        var dec = CACHE_VAR_DECIMALS[varList[v]];
                        compact.push(val === null || val === undefined ? null :
                            (dec === 0 ? Math.round(val) : +val.toFixed(dec)));
                    }
                    localStorage.setItem(key, JSON.stringify(compact));
                }
                clearTodayCache(lat, lon);
            } catch (e) {}
        }

        callback(null, data);
    });
}

function fetchHistoricalYear(lat, lon, date, delta, year, callback) {
    var varList = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
    var target = new Date(date.getTime());
    target.setFullYear(year);
    var startDate = new Date(target.getTime() - delta * 86400000);
    var endDate = new Date(target.getTime() + delta * 86400000);
    var now = new Date();
    if (startDate > now) { callback(null, null); return; }
    if (endDate > now) endDate = new Date(now.getTime() - 86400000);
    if (startDate > endDate) { callback(null, null); return; }

    /* Check cache for each day in this range */
    if (useCache) {
        var allCached = true;
        var cachedData = {daily: {}};
        for (var k = 0; k < varList.length; k++) cachedData.daily[varList[k]] = [];
        cachedData.daily.time = [];

        for (var d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
            var key = cacheKey(toISODate(d), lat, lon);
            try {
                var cached = localStorage.getItem(key);
                if (cached) {
                    var compact = JSON.parse(cached);
                    if (Array.isArray(compact) && compact.length === varList.length) {
                        cachedData.daily.time.push(toISODate(d));
                        for (var v = 0; v < varList.length; v++) {
                            cachedData.daily[varList[v]].push(compact[v]);
                        }
                        continue;
                    }
                }
            } catch (e) {}
            allCached = false;
            break;
        }

        if (allCached && cachedData.daily.time.length > 0) {
            callback(null, cachedData);
            return;
        }
    }

    /* Fetch from API */
    var url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon +
        "&start_date=" + toISODate(startDate) + "&end_date=" + toISODate(endDate) +
        "&daily=" + WEIRDTHER_CONFIG.DAILY_VARS;
    httpGet(url, function(err, data) {
        if (err || !data) { callback(err, null); return; }
        mergeShowersIntoRain(data);

        /* Cache individual days as compact arrays */
        if (useCache && data.daily && data.daily.time) {
            try {
                for (var i = 0; i < data.daily.time.length; i++) {
                    var day = data.daily.time[i];
                    var key = cacheKey(day, lat, lon);
                    var compact = [];
                    for (var v = 0; v < varList.length; v++) {
                        var val = data.daily[varList[v]] ? data.daily[varList[v]][i] : null;
                        var dec = CACHE_VAR_DECIMALS[varList[v]];
                        compact.push(val === null || val === undefined ? null :
                            (dec === 0 ? Math.round(val) : +val.toFixed(dec)));
                    }
                    localStorage.setItem(key, JSON.stringify(compact));
                }
                clearTodayCache(lat, lon);
            } catch (e) {}
        }

        callback(null, data);
    });
}

/**
 * Fetches historical data for all years in [startYear, endYear).
 * Calls callback(null, results) where results is a raw array of per-year data objects.
 * Callers should invoke groupAllHistorical(results) to get the flat grouped form.
 */
function fetchAllHistorical(lat, lon, date, delta, startYear, endYear, onProgress, callback) {
    var results = [];
    var total = endYear - startYear;

    function next(year) {
        if (year >= endYear) { callback(null, results); return; }
        onProgress(year - startYear, total);
        fetchHistoricalYear(lat, lon, date, delta, year, function(err, data) {
            if (err) { callback(err, null); return; }
            if (data && data.daily && data.daily.time && data.daily.time.length > 0) {
                results.push(data);
            }
            next(year + 1);
        });
    }
    next(startYear);
}

/**
 * Merges forecast and historical data, preferring historical values when available.
 * Returns merged {daily: {time: [], ...}} object sorted by date.
 */
function mergeForecastHistorical(forecast, historical) {
    var vars = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
    vars.push("time");
    var merged = {daily: {}};

    for (var i = 0; i < vars.length; i++) {
        merged.daily[vars[i]] = forecast.daily[vars[i]] ? forecast.daily[vars[i]].slice() : [];
    }

    if (historical && historical.daily) {
        for (var j = 0; j < historical.daily.time.length; j++) {
            var day = historical.daily.time[j];
            var offset = merged.daily.time.indexOf(day);
            if (offset === -1) {
                merged.daily.time.push(day);
                for (var k = 0; k < vars.length; k++) {
                    if (vars[k] !== "time") {
                        merged.daily[vars[k]].push(historical.daily[vars[k]] ? historical.daily[vars[k]][j] : null);
                    }
                }
            } else {
                for (var k = 0; k < vars.length; k++) {
                    if (vars[k] !== "time") {
                        var histVal = historical.daily[vars[k]] ? historical.daily[vars[k]][j] : null;
                        if (histVal != null) merged.daily[vars[k]][offset] = histVal;
                    }
                }
            }
        }
    }

    /* Sort by date */
    var combined = [];
    for (var i = 0; i < merged.daily.time.length; i++) {
        var obj = {time: merged.daily.time[i]};
        for (var k = 0; k < vars.length; k++) {
            if (vars[k] !== "time") obj[vars[k]] = merged.daily[vars[k]][i];
        }
        combined.push(obj);
    }
    combined.sort(function(a, b) { return a.time < b.time ? -1 : (a.time > b.time ? 1 : 0); });
    for (var k = 0; k < vars.length; k++) merged.daily[vars[k]] = [];
    for (var i = 0; i < combined.length; i++) {
        for (var k = 0; k < vars.length; k++) merged.daily[vars[k]].push(combined[i][vars[k]]);
    }

    return merged;
}