// Weather icons as inline SVGs for WMO weather codes
// Designed to be crisp and readable at <50px

const WEATHER_ICONS = (() => {
    // Reusable SVG parts
    const sun = `<circle cx="16" cy="16" r="6" fill="#FFB800"/>
        <g stroke="#FFB800" stroke-width="2" stroke-linecap="round">
            <line x1="16" y1="3" x2="16" y2="6"/>
            <line x1="16" y1="26" x2="16" y2="29"/>
            <line x1="3" y1="16" x2="6" y2="16"/>
            <line x1="26" y1="16" x2="29" y2="16"/>
            <line x1="6.8" y1="6.8" x2="8.9" y2="8.9"/>
            <line x1="23.1" y1="23.1" x2="25.2" y2="25.2"/>
            <line x1="6.8" y1="25.2" x2="8.9" y2="23.1"/>
            <line x1="23.1" y1="8.9" x2="25.2" y2="6.8"/>
        </g>`;

    const sunSmall = `<circle cx="24" cy="8" r="4.5" fill="#FFB800"/>
        <g stroke="#FFB800" stroke-width="1.5" stroke-linecap="round">
            <line x1="24" y1="1" x2="24" y2="3"/>
            <line x1="24" y1="13" x2="24" y2="15"/>
            <line x1="17" y1="8" x2="19" y2="8"/>
            <line x1="29" y1="8" x2="31" y2="8"/>
            <line x1="19.1" y1="3.1" x2="20.5" y2="4.5"/>
            <line x1="27.5" y1="11.5" x2="28.9" y2="12.9"/>
            <line x1="19.1" y1="12.9" x2="20.5" y2="11.5"/>
            <line x1="27.5" y1="4.5" x2="28.9" y2="3.1"/>
        </g>`;

    const cloud = `<path d="M8 24 Q4 24 4 20 Q4 16 8 16 Q8 12 13 11 Q18 10 21 13 Q22 10 26 11 Q30 12 30 16 Q30 16 30 16 Q32 16 32 20 Q32 24 28 24 Z" fill="#B0BEC5"/>`;

    const cloudDark = `<path d="M8 24 Q4 24 4 20 Q4 16 8 16 Q8 12 13 11 Q18 10 21 13 Q22 10 26 11 Q30 12 30 16 Q30 16 30 16 Q32 16 32 20 Q32 24 28 24 Z" fill="#78909C"/>`;

    // Rain drops (vertical lines)
    const rainLight = `<g stroke="#4FC3F7" stroke-width="2" stroke-linecap="round">
        <line x1="14" y1="26" x2="14" y2="30"/>
        <line x1="22" y1="26" x2="22" y2="30"/>
    </g>`;

    const rainMod = `<g stroke="#29B6F6" stroke-width="2" stroke-linecap="round">
        <line x1="11" y1="26" x2="11" y2="31"/>
        <line x1="18" y1="26" x2="18" y2="31"/>
        <line x1="25" y1="26" x2="25" y2="31"/>
    </g>`;

    const rainHeavy = `<g stroke="#0288D1" stroke-width="2.5" stroke-linecap="round">
        <line x1="10" y1="26" x2="10" y2="32"/>
        <line x1="16" y1="26" x2="16" y2="32"/>
        <line x1="22" y1="26" x2="22" y2="32"/>
        <line x1="28" y1="26" x2="28" y2="32"/>
    </g>`;

    // Drizzle dots
    const drizzleLight = `<g fill="#4FC3F7">
        <circle cx="14" cy="28" r="1.5"/>
        <circle cx="22" cy="28" r="1.5"/>
    </g>`;

    const drizzleMod = `<g fill="#29B6F6">
        <circle cx="11" cy="27" r="1.5"/>
        <circle cx="18" cy="29" r="1.5"/>
        <circle cx="25" cy="27" r="1.5"/>
    </g>`;

    const drizzleDense = `<g fill="#0288D1">
        <circle cx="10" cy="27" r="1.8"/>
        <circle cx="16" cy="29" r="1.8"/>
        <circle cx="22" cy="27" r="1.8"/>
        <circle cx="28" cy="29" r="1.8"/>
    </g>`;

    // Snowflakes (asterisk shapes)
    const snowLight = `<g stroke="#90CAF9" stroke-width="1.5" stroke-linecap="round">
        <line x1="14" y1="26" x2="14" y2="30"/><line x1="12" y1="28" x2="16" y2="28"/>
        <line x1="22" y1="26" x2="22" y2="30"/><line x1="20" y1="28" x2="24" y2="28"/>
    </g>`;

    const snowMod = `<g stroke="#64B5F6" stroke-width="1.5" stroke-linecap="round">
        <line x1="10" y1="26" x2="10" y2="30"/><line x1="8" y1="28" x2="12" y2="28"/>
        <line x1="18" y1="26" x2="18" y2="30"/><line x1="16" y1="28" x2="20" y2="28"/>
        <line x1="26" y1="26" x2="26" y2="30"/><line x1="24" y1="28" x2="28" y2="28"/>
    </g>`;

    const snowHeavy = `<g stroke="#42A5F5" stroke-width="2" stroke-linecap="round">
        <line x1="9" y1="26" x2="9" y2="31"/><line x1="6.5" y1="28.5" x2="11.5" y2="28.5"/>
        <line x1="16.5" y1="26" x2="16.5" y2="31"/><line x1="14" y1="28.5" x2="19" y2="28.5"/>
        <line x1="24" y1="26" x2="24" y2="31"/><line x1="21.5" y1="28.5" x2="26.5" y2="28.5"/>
    </g>`;

    // Snow grains (small open circles)
    const snowGrains = `<g fill="none" stroke="#90CAF9" stroke-width="1.5">
        <circle cx="12" cy="28" r="2"/>
        <circle cx="20" cy="28" r="2"/>
        <circle cx="28" cy="28" r="2"/>
    </g>`;

    // Freezing accent (small ice crystal in corner)
    const freezing = `<g stroke="#E1F5FE" stroke-width="1.5" stroke-linecap="round">
        <line x1="28" y1="4" x2="28" y2="10"/>
        <line x1="25" y1="7" x2="31" y2="7"/>
        <line x1="25.9" y1="4.9" x2="30.1" y2="9.1"/>
        <line x1="30.1" y1="4.9" x2="25.9" y2="9.1"/>
    </g>`;

    // Lightning bolt
    const lightning = `<polygon points="18,10 14,18 17,18 13,26 22,16 18,16 22,10" fill="#FDD835"/>`;

    // Hail circles
    const hail = `<g fill="#B3E5FC" stroke="#81D4FA" stroke-width="0.5">
        <circle cx="12" cy="28" r="2.5"/>
        <circle cx="22" cy="29" r="2.5"/>
    </g>`;

    // Fog lines
    const fog = `<g stroke="#B0BEC5" stroke-width="2" stroke-linecap="round" opacity="0.7">
        <line x1="6" y1="26" x2="30" y2="26"/>
        <line x1="8" y1="29" x2="28" y2="29"/>
        <line x1="10" y1="32" x2="26" y2="32"/>
    </g>`;

    function svg(content, viewBox = '0 0 36 34') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${content}</svg>`;
    }

    return {
        // 0: Clear sky
        0: svg(sun, '0 0 32 32'),

        // 1: Mainly clear
        1: svg(`${sunSmall}
            <path d="M6 24 Q2 24 2 20 Q2 17 5 16 Q6 13 10 12.5 Q14 12 16 14" fill="#B0BEC5" opacity="0.6"/>`),

        // 2: Partly cloudy
        2: svg(`${sunSmall}
            <path d="M6 24 Q2 24 2 20 Q2 16 6 16 Q6 12 11 11 Q16 10 18 13 Q19 11 22 11.5 Q25 12 25 15 Q27 15.5 27 19 Q27 24 23 24 Z" fill="#B0BEC5"/>`),

        // 3: Overcast
        3: svg(cloud),

        // 45: Fog
        45: svg(`<path d="M8 20 Q4 20 4 16 Q4 12 8 12 Q8 8 13 7 Q18 6 21 9 Q22 6 26 7 Q30 8 30 12 Q32 12 32 16 Q32 20 28 20 Z" fill="#B0BEC5" opacity="0.6"/>
            ${fog}`),

        // 48: Depositing rime fog
        48: svg(`<path d="M8 20 Q4 20 4 16 Q4 12 8 12 Q8 8 13 7 Q18 6 21 9 Q22 6 26 7 Q30 8 30 12 Q32 12 32 16 Q32 20 28 20 Z" fill="#90A4AE" opacity="0.6"/>
            ${fog}
            ${freezing}`),

        // 51: Drizzle light
        51: svg(`${cloud}${drizzleLight}`),

        // 53: Drizzle moderate
        53: svg(`${cloud}${drizzleMod}`),

        // 55: Drizzle dense
        55: svg(`${cloud}${drizzleDense}`),

        // 56: Freezing drizzle light
        56: svg(`${cloud}${drizzleLight}${freezing}`),

        // 57: Freezing drizzle dense
        57: svg(`${cloud}${drizzleDense}${freezing}`),

        // 61: Rain slight
        61: svg(`${cloud}${rainLight}`),

        // 63: Rain moderate
        63: svg(`${cloud}${rainMod}`),

        // 65: Rain heavy
        65: svg(`${cloudDark}${rainHeavy}`),

        // 66: Freezing rain light
        66: svg(`${cloud}${rainLight}${freezing}`),

        // 67: Freezing rain heavy
        67: svg(`${cloudDark}${rainHeavy}${freezing}`),

        // 71: Snow slight
        71: svg(`${cloud}${snowLight}`),

        // 73: Snow moderate
        73: svg(`${cloud}${snowMod}`),

        // 75: Snow heavy
        75: svg(`${cloudDark}${snowHeavy}`),

        // 77: Snow grains
        77: svg(`${cloud}${snowGrains}`),

        // 80: Rain showers slight
        80: svg(`${cloudDark}${rainLight}`),

        // 81: Rain showers moderate
        81: svg(`${cloudDark}${rainMod}`),

        // 82: Rain showers violent
        82: svg(`${cloudDark}${rainHeavy}`),

        // 85: Snow showers slight
        85: svg(`${cloudDark}${snowLight}`),

        // 86: Snow showers heavy
        86: svg(`${cloudDark}${snowHeavy}`),

        // 95: Thunderstorm
        95: svg(`${cloudDark}${lightning}`),

        // 96: Thunderstorm with slight hail
        96: svg(`${cloudDark}${lightning}${hail}`),

        // 99: Thunderstorm with heavy hail
        99: svg(`${cloudDark}${lightning}
            <g fill="#B3E5FC" stroke="#81D4FA" stroke-width="0.5">
                <circle cx="10" cy="28" r="2.8"/>
                <circle cx="19" cy="30" r="2.8"/>
                <circle cx="27" cy="27" r="2.8"/>
            </g>`)
    };
})();

/**
 * Get an SVG weather icon string for a WMO weather code.
 * @param {number} code - WMO weather interpretation code
 * @returns {string} Inline SVG string, or a fallback cloud icon for unknown codes
 */
function getWeatherIconSVG(code) {
    var svg = WEATHER_ICONS[code] || WEATHER_ICONS[3];
    var desc = weatherCodeToDescription(code);
    return svg.replace(/(<svg[^>]*>)/, '$1<title>' + desc + '</title>');
}
