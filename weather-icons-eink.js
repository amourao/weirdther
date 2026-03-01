// Weather icons as inline SVGs for WMO weather codes
// Optimized for e-ink grayscale displays (Kindle etc.)
// High contrast black/gray on white, bold strokes, no color

var WEATHER_ICONS_EINK = (function() {
    // Reusable SVG parts — all grayscale
    var sun = '<circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
        '<line x1="16" y1="3" x2="16" y2="6.5"/>' +
        '<line x1="16" y1="25.5" x2="16" y2="29"/>' +
        '<line x1="3" y1="16" x2="6.5" y2="16"/>' +
        '<line x1="25.5" y1="16" x2="29" y2="16"/>' +
        '<line x1="6.8" y1="6.8" x2="9.3" y2="9.3"/>' +
        '<line x1="22.7" y1="22.7" x2="25.2" y2="25.2"/>' +
        '<line x1="6.8" y1="25.2" x2="9.3" y2="22.7"/>' +
        '<line x1="22.7" y1="9.3" x2="25.2" y2="6.8"/>' +
        '</g>';

    var sunSmall = '<circle cx="24" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
        '<line x1="24" y1="1" x2="24" y2="3"/>' +
        '<line x1="24" y1="13" x2="24" y2="15"/>' +
        '<line x1="17" y1="8" x2="19" y2="8"/>' +
        '<line x1="29" y1="8" x2="31" y2="8"/>' +
        '<line x1="19.1" y1="3.1" x2="20.8" y2="4.8"/>' +
        '<line x1="27.2" y1="11.2" x2="28.9" y2="12.9"/>' +
        '<line x1="19.1" y1="12.9" x2="20.8" y2="11.2"/>' +
        '<line x1="27.2" y1="4.8" x2="28.9" y2="3.1"/>' +
        '</g>';

    var cloud = '<path d="M8 24 Q4 24 4 20 Q4 16 8 16 Q8 12 13 11 Q18 10 21 13 Q22 10 26 11 Q30 12 30 16 Q32 16 32 20 Q32 24 28 24 Z" fill="#ccc" stroke="currentColor" stroke-width="1.5"/>';

    var cloudDark = '<path d="M8 24 Q4 24 4 20 Q4 16 8 16 Q8 12 13 11 Q18 10 21 13 Q22 10 26 11 Q30 12 30 16 Q32 16 32 20 Q32 24 28 24 Z" fill="#888" stroke="currentColor" stroke-width="1.5"/>';

    // Rain drops (vertical lines)
    var rainLight = '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="14" y1="26" x2="14" y2="30"/>' +
        '<line x1="22" y1="26" x2="22" y2="30"/>' +
        '</g>';

    var rainMod = '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="11" y1="26" x2="11" y2="31"/>' +
        '<line x1="18" y1="26" x2="18" y2="31"/>' +
        '<line x1="25" y1="26" x2="25" y2="31"/>' +
        '</g>';

    var rainHeavy = '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
        '<line x1="10" y1="26" x2="10" y2="32"/>' +
        '<line x1="16" y1="26" x2="16" y2="32"/>' +
        '<line x1="22" y1="26" x2="22" y2="32"/>' +
        '<line x1="28" y1="26" x2="28" y2="32"/>' +
        '</g>';

    // Drizzle dots
    var drizzleLight = '<g fill="currentColor" opacity="0.7">' +
        '<circle cx="14" cy="28" r="1.8"/>' +
        '<circle cx="22" cy="28" r="1.8"/>' +
        '</g>';

    var drizzleMod = '<g fill="currentColor" opacity="0.8">' +
        '<circle cx="11" cy="27" r="1.8"/>' +
        '<circle cx="18" cy="29" r="1.8"/>' +
        '<circle cx="25" cy="27" r="1.8"/>' +
        '</g>';

    var drizzleDense = '<g fill="currentColor">' +
        '<circle cx="10" cy="27" r="2"/>' +
        '<circle cx="16" cy="29" r="2"/>' +
        '<circle cx="22" cy="27" r="2"/>' +
        '<circle cx="28" cy="29" r="2"/>' +
        '</g>';

    // Snowflakes (+ shapes, bold)
    var snowLight = '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="14" y1="26" x2="14" y2="30"/><line x1="12" y1="28" x2="16" y2="28"/>' +
        '<line x1="22" y1="26" x2="22" y2="30"/><line x1="20" y1="28" x2="24" y2="28"/>' +
        '</g>';

    var snowMod = '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="10" y1="26" x2="10" y2="30"/><line x1="8" y1="28" x2="12" y2="28"/>' +
        '<line x1="18" y1="26" x2="18" y2="30"/><line x1="16" y1="28" x2="20" y2="28"/>' +
        '<line x1="26" y1="26" x2="26" y2="30"/><line x1="24" y1="28" x2="28" y2="28"/>' +
        '</g>';

    var snowHeavy = '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
        '<line x1="9" y1="26" x2="9" y2="31"/><line x1="6.5" y1="28.5" x2="11.5" y2="28.5"/>' +
        '<line x1="16.5" y1="26" x2="16.5" y2="31"/><line x1="14" y1="28.5" x2="19" y2="28.5"/>' +
        '<line x1="24" y1="26" x2="24" y2="31"/><line x1="21.5" y1="28.5" x2="26.5" y2="28.5"/>' +
        '</g>';

    // Snow grains (open circles)
    var snowGrains = '<g fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<circle cx="12" cy="28" r="2.2"/>' +
        '<circle cx="20" cy="28" r="2.2"/>' +
        '<circle cx="28" cy="28" r="2.2"/>' +
        '</g>';

    // Freezing accent (asterisk in corner)
    var freezing = '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="28" y1="4" x2="28" y2="10"/>' +
        '<line x1="25" y1="7" x2="31" y2="7"/>' +
        '<line x1="25.9" y1="4.9" x2="30.1" y2="9.1"/>' +
        '<line x1="30.1" y1="4.9" x2="25.9" y2="9.1"/>' +
        '</g>';

    // Lightning bolt (solid black)
    var lightning = '<polygon points="18,10 14,18 17,18 13,26 22,16 18,16 22,10" fill="currentColor"/>';

    // Hail (filled circles)
    var hail = '<g fill="currentColor">' +
        '<circle cx="12" cy="28" r="2.5"/>' +
        '<circle cx="22" cy="29" r="2.5"/>' +
        '</g>';

    // Fog lines (thick horizontal dashes)
    var fog = '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.6">' +
        '<line x1="6" y1="26" x2="30" y2="26"/>' +
        '<line x1="8" y1="29" x2="28" y2="29"/>' +
        '<line x1="10" y1="32" x2="26" y2="32"/>' +
        '</g>';

    function svg(content, viewBox) {
        viewBox = viewBox || '0 0 36 34';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" width="52" height="52" fill="none">' + content + '</svg>';
    }

    return {
        // 0: Clear sky
        0: svg(sun, '0 0 32 32'),

        // 1: Mainly clear
        1: svg(sunSmall +
            '<path d="M6 24 Q2 24 2 20 Q2 17 5 16 Q6 13 10 12.5 Q14 12 16 14" fill="#ddd" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>'),

        // 2: Partly cloudy
        2: svg(sunSmall +
            '<path d="M6 24 Q2 24 2 20 Q2 16 6 16 Q6 12 11 11 Q16 10 18 13 Q19 11 22 11.5 Q25 12 25 15 Q27 15.5 27 19 Q27 24 23 24 Z" fill="#ccc" stroke="currentColor" stroke-width="1.2"/>'),

        // 3: Overcast
        3: svg(cloud),

        // 45: Fog
        45: svg('<path d="M8 20 Q4 20 4 16 Q4 12 8 12 Q8 8 13 7 Q18 6 21 9 Q22 6 26 7 Q30 8 30 12 Q32 12 32 16 Q32 20 28 20 Z" fill="#ccc" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>' + fog),

        // 48: Depositing rime fog
        48: svg('<path d="M8 20 Q4 20 4 16 Q4 12 8 12 Q8 8 13 7 Q18 6 21 9 Q22 6 26 7 Q30 8 30 12 Q32 12 32 16 Q32 20 28 20 Z" fill="#aaa" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>' + fog + freezing),

        // 51: Drizzle light
        51: svg(cloud + drizzleLight),

        // 53: Drizzle moderate
        53: svg(cloud + drizzleMod),

        // 55: Drizzle dense
        55: svg(cloud + drizzleDense),

        // 56: Freezing drizzle light
        56: svg(cloud + drizzleLight + freezing),

        // 57: Freezing drizzle dense
        57: svg(cloud + drizzleDense + freezing),

        // 61: Rain slight
        61: svg(cloud + rainLight),

        // 63: Rain moderate
        63: svg(cloud + rainMod),

        // 65: Rain heavy
        65: svg(cloudDark + rainHeavy),

        // 66: Freezing rain light
        66: svg(cloud + rainLight + freezing),

        // 67: Freezing rain heavy
        67: svg(cloudDark + rainHeavy + freezing),

        // 71: Snow slight
        71: svg(cloud + snowLight),

        // 73: Snow moderate
        73: svg(cloud + snowMod),

        // 75: Snow heavy
        75: svg(cloudDark + snowHeavy),

        // 77: Snow grains
        77: svg(cloud + snowGrains),

        // 80: Rain showers slight
        80: svg(cloudDark + rainLight),

        // 81: Rain showers moderate
        81: svg(cloudDark + rainMod),

        // 82: Rain showers violent
        82: svg(cloudDark + rainHeavy),

        // 85: Snow showers slight
        85: svg(cloudDark + snowLight),

        // 86: Snow showers heavy
        86: svg(cloudDark + snowHeavy),

        // 95: Thunderstorm
        95: svg(cloudDark + lightning),

        // 96: Thunderstorm with slight hail
        96: svg(cloudDark + lightning + hail),

        // 99: Thunderstorm with heavy hail
        99: svg(cloudDark + lightning +
            '<g fill="currentColor">' +
            '<circle cx="10" cy="28" r="2.8"/>' +
            '<circle cx="19" cy="30" r="2.8"/>' +
            '<circle cx="27" cy="27" r="2.8"/>' +
            '</g>')
    };
})();

/**
 * Get a grayscale SVG weather icon for a WMO weather code (e-ink optimized).
 * @param {number} code - WMO weather interpretation code
 * @returns {string} Inline SVG string
 */
function getWeatherIconEink(code) {
    return WEATHER_ICONS_EINK[code] || WEATHER_ICONS_EINK[3];
}

// Variable icons for the current conditions breakdown table
// Each is a small square SVG with bold strokes for e-ink clarity
var VAR_ICONS_EINK = (function() {
    function svg(content) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none">' + content + '</svg>';
    }

    return {
        // Thermometer up (max temp)
        "temperature_2m_max": svg(
            '<rect x="10" y="2" width="4" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<circle cx="12" cy="19" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<circle cx="12" cy="19" r="1.5" fill="currentColor"/>' +
            '<line x1="12" y1="18" x2="12" y2="8" stroke="currentColor" stroke-width="2"/>' +
            '<polygon points="17,7 20,11 14,11" fill="currentColor"/>'
        ),

        // Thermometer down (min temp)
        "temperature_2m_min": svg(
            '<rect x="10" y="2" width="4" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<circle cx="12" cy="19" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<circle cx="12" cy="19" r="1.5" fill="currentColor"/>' +
            '<line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>' +
            '<polygon points="17,11 20,7 14,7" fill="currentColor"/>'
        ),

        // Rain drop
        "rain_sum": svg(
            '<path d="M12 3 Q12 3 7 13 Q4 18 8 21 Q10 23 12 23 Q14 23 16 21 Q20 18 17 13 Z" fill="none" stroke="currentColor" stroke-width="2"/>'
        ),

        // Snowflake
        "snowfall_sum": svg(
            '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<line x1="12" y1="2" x2="12" y2="22"/>' +
            '<line x1="2" y1="12" x2="22" y2="12"/>' +
            '<line x1="5" y1="5" x2="19" y2="19"/>' +
            '<line x1="19" y1="5" x2="5" y2="19"/>' +
            '<line x1="12" y1="2" x2="9" y2="5"/><line x1="12" y1="2" x2="15" y2="5"/>' +
            '<line x1="12" y1="22" x2="9" y2="19"/><line x1="12" y1="22" x2="15" y2="19"/>' +
            '</g>'
        ),

        // Wind (wavy lines)
        "wind_speed_10m_max": svg(
            '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none">' +
            '<path d="M3 8 Q6 5 9 8 Q12 11 15 8 Q18 5 21 8"/>' +
            '<path d="M3 14 Q6 11 9 14 Q12 17 15 14 Q18 11 21 14"/>' +
            '</g>'
        ),

        // Sun (sunshine duration)
        "sunshine_duration": svg(
            '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<line x1="12" y1="1" x2="12" y2="4"/>' +
            '<line x1="12" y1="20" x2="12" y2="23"/>' +
            '<line x1="1" y1="12" x2="4" y2="12"/>' +
            '<line x1="20" y1="12" x2="23" y2="12"/>' +
            '<line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/>' +
            '<line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>' +
            '<line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/>' +
            '<line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>' +
            '</g>'
        ),

        // Humidity (water drop with % lines inside)
        "relative_humidity_2m": svg(
            '<path d="M12 4 Q12 4 7 14 Q5 18 8 21 Q10 23 12 23 Q14 23 16 21 Q19 18 17 14 Z" fill="none" stroke="currentColor" stroke-width="2"/>' +
            '<line x1="9.5" y1="17.5" x2="14.5" y2="12.5" stroke="currentColor" stroke-width="1.5"/>' +
            '<circle cx="10.5" cy="16.5" r="1" fill="currentColor"/>' +
            '<circle cx="13.5" cy="13.5" r="1" fill="currentColor"/>'
        )
    };
})();

/**
 * Get a variable icon SVG for e-ink display.
 * @param {string} varName - Variable name (e.g. "temperature_2m_max")
 * @returns {string} Inline SVG string
 */
function getVarIconEink(varName) {
    return VAR_ICONS_EINK[varName] || '';
}
