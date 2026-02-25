/* Weirdther Core - Shared JavaScript for all HTML files
 * Compatible with older browsers (no ES6+)
 */

/* ========== CONFIGURATION ========== */
var WEIRDTHER_CONFIG = {
    DAILY_VARS: "weather_code,temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunshine_duration,daylight_duration",
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
    return "historical-" + dateStr + "-" + lat + "-" + lon + ".json";
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
            var key = decodeURIComponent(pair[0]);
            var value = decodeURIComponent(pair[1]);

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