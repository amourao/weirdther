/* Weirdther Core - Shared JavaScript for all HTML files
 * Compatible with older browsers (no ES6+)
 */

/* ========== CONFIGURATION ========== */
var WEIRDTHER_CONFIG = {
    DAILY_VARS: "temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum,wind_speed_10m_max,sunshine_duration",
    DEFAULT_DELTA: 5,
    HISTORICAL_YEARS: 26,
    SCORE_VARS: ["temperature_2m_max", "temperature_2m_min", "rain_sum", "snowfall_sum"],
    METRIC_UNIT_STRING: "",
    IMPERIAL_UNIT_STRING: "temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
};

/* ========== UTILITY FUNCTIONS ========== */

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

function getUnitString(units) {
    if (units === "imperial") return WEIRDTHER_CONFIG.IMPERIAL_UNIT_STRING;
    return WEIRDTHER_CONFIG.METRIC_UNIT_STRING;
}

/* ========== DAYLIGHT CALCULATION ========== */

function calculateDayLength(latitude, dayOfYear) {
    var declination = 23.44 * Math.sin((360 / 365) * (284 + dayOfYear) * Math.PI / 180);
    var latRad = latitude * Math.PI / 180;
    var decRad = declination * Math.PI / 180;
    var cosHA = -Math.tan(latRad) * Math.tan(decRad);
    if (cosHA > 1) return 0;    // Polar night
    if (cosHA < -1) return 24;  // Polar day
    var hourAngle = Math.acos(cosHA) * 180 / Math.PI;
    return (2 / 15) * hourAngle;
}

function getDaylightHours(dateStr, latitude) {
    var d = parseDate(dateStr);
    return calculateDayLength(latitude, daysIntoYear(d));
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
    var score = diff;
    if (diff > 0.3) score = diff * 2;
    return score * score;
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

/* ========== WEATHER CLASSIFICATION ========== */

function getWeather(rain, snow, sunshinePct, wind, units) {
    var rMm = rain, sMm = snow, wKmh = wind;
    if (units === "imperial") {
        rMm = rain * 25.4;
        sMm = snow * 25.4;
        wKmh = wind * 1.60934;
    }
    var c = "", icon = "";
    if (sMm > 0)               { c = "Snow";       icon = "&#10052;"; }
    else if (rMm > 20)         { c = "Heavy Rain"; icon = "&#9730;"; }
    else if (rMm > 0)          { c = "Rain";       icon = "&#9730;"; }
    else if (sunshinePct < 0.10){ c = "Overcast";  icon = "&#9729;"; }
    else if (sunshinePct < 0.30){ c = "Cloudy";    icon = "&#9729;"; }
    else if (sunshinePct < 0.60){ c = "Pt.Cloudy"; icon = "&#9728;"; }
    else if (sunshinePct < 0.85){ c = "Fair";      icon = "&#9728;"; }
    else                        { c = "Sunny";     icon = "&#9728;"; }
    if (wKmh >= 50) c += " +Gale";
    else if (wKmh >= 25) c += " +Wind";
    return {text: c, icon: icon};
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
        if (varName === "sunshine_duration") {
            var dlHours = getDaylightHours(historicalDates[i], latitude);
            val = (dlHours > 0) ? val / (dlHours * 36) : 0;
        }
        hist.push(val);
    }
    hist.sort(function(a, b) { return a - b; });

    var cmpVal = currentValue;
    if (varName === "sunshine_duration") {
        var dlHours = getDaylightHours(currentDate, latitude);
        cmpVal = (dlHours > 0) ? currentValue / (dlHours * 36) : 0;
    }

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
