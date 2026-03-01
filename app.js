
const VARS_TO_GET_HOURLY = "";
const METRIC="";

const DATA_PATH = "data";
const SEPARATOR = "&nbsp;";
const COLORS = ["gray", "#004074", "red" /*"#00c0b1"*/, "#00c0b1"];
const SYMBOLS_RAW = ["#", "B", "S", "A"];
// zip colors and symbols
const SYMBOLS = SYMBOLS_RAW.map((x, i) => `<a href='###'><font title='%%%' color='${COLORS[i]}'>${x}</font></a>`);
const COLUMN_WIDTH = 3;
const DEFAULT_DELTA = 5;

const CLIMATE_NORMALS = [
    {"start": 2001, "end": 2030},
    {"start": 1991, "end": 2020},
    {"start": 1981, "end": 2010},
    {"start": 1971, "end": 2000},
];

const DEFAULT_CLIMATE_NORMALS_INDEX = 0;

var SELF_LINK = null;


var LINEAR_SCALE = true;

function getDefaultUnit() {
    // check if unit is in localStorage 
    const storedUnit = localStorage.getItem('unit');
    if (storedUnit) {
        return storedUnit;
    }
    if (document.getElementById("units") && document.getElementById("units").value) {
        return document.getElementById("units").value;
    }
    const locale = navigator.language || navigator.userLanguage || "-";
    const country = locale.split('-')[1] || locale;
    const imperialCountries = ['US', 'LR', 'MM'];
    const unit = imperialCountries.includes(country.toUpperCase()) ? 'imperial' : 'metric';
    console.log("Detected locale:", locale, "Country:", country, "Using unit:", unit);
    return unit;
}

function setDefaultUnit(unit) {
    localStorage.setItem('unit', unit);
}

async function start() {
    isWidget = true;
    document.getElementById("date").value = new Date().toISOString().slice(0, 10);
    // parse GET parameters (supports both short and long names, handles + and %2B as spaces)
    const urlParams = parseUrlParams();
    const latitude = urlParams['latitude'];
    const longitude = urlParams['longitude'];
    const location = urlParams['location'];
    const date = urlParams['date'];
    const delta = urlParams['delta'];
    const units = urlParams['units'];
    const climateNormal = urlParams['climate_normal'];
    
    if (latitude && longitude) {
        document.getElementById("latitude").value = latitude;
        document.getElementById("longitude").value = longitude;
        document.getElementById("location").value = "Using coordinates";
    }
    if (location) {
        document.getElementById("location").value = location;
    }
    if (date) {
        document.getElementById("date").value = date;
    }
    if (delta) {
        document.getElementById("delta").value = delta;
    }
    if (units) {
        document.getElementById("units").value = units;
    }

    if (climateNormal) {
        document.getElementById("climate_normal").value = climateNormal;
    }

    if (((!latitude || !longitude)  && !location) && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            console.log("Using current location coordinates:", position.coords.latitude, position.coords.longitude);
            document.getElementById("latitude").value = position.coords.latitude.toFixed(2);
            document.getElementById("longitude").value = position.coords.longitude.toFixed(2);
            document.getElementById("location").value = "Current location";
            getWeather();
        });
        return;
    }
    
    getWeather();
}

window.addEventListener("unhandledrejection", function (msg, url, lineNo, columnNo, error) {
        // log errors
    document.getElementById("chart").innerHTML = "Error";
    document.getElementById("loading").innerHTML = "An error occurred while loading the weather data: " +
        msg.reason;
    return false;
});

window.onerror = function (msg, url, lineNo, columnNo, error) {
    // log errors
    document.getElementById("chart").innerHTML = "Error";
    document.getElementById("loading").innerHTML = "An error occurred while loading the weather data." + 
        error;
    console.log(msg, url, lineNo, columnNo, error);
    return false;
}

async function geocode(){
    const location = document.getElementById("location").value;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=10&format=json`
    const response = await fetch(url);
    const data = await response.json();
    if (data && data["results"] && data["results"].length > 0) {
        let result = data["results"][0]
        document.getElementById("latitude").value = result.latitude.toFixed(2);
        document.getElementById("longitude").value = result.longitude.toFixed(2);
        document.getElementById("geocode_result").innerHTML = result.name + ", " + result.admin1 + ", " + result.country;  
    }
}

async function getWeather(){
    document.getElementById("loading").innerHTML = "Loading weather data...";
    document.getElementById("summary").innerHTML = "";
    document.getElementById("chart").innerHTML = "";
    if (document.getElementById("location").value != "" &&
        document.getElementById("location").value != "Current location" &&
        document.getElementById("location").value != "Using coordinates") {
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";
        await geocode();
    }
    
    if (document.getElementById("latitude").value == "" || document.getElementById("longitude").value == "") {
        document.getElementById("loading").innerHTML = "Location not found";
        document.getElementById("summary").innerHTML = "";

        // set widget data to null
        window.widgetData = null;
        return;
    }

    const latitude = parseFloat(document.getElementById("latitude").value);
    const longitude = parseFloat(document.getElementById("longitude").value);

    if (document.getElementById("location").value == "") {
        document.getElementById("location").value = "Using coordinates";
        document.getElementById("geocode_result").innerHTML = latitude + ", " + longitude;
    }

    if (document.getElementById("location").value == "Current location") {
        document.getElementById("location").value = "Current location";
        document.getElementById("geocode_result").innerHTML = "Current location (" + latitude + ", " + longitude + ")";
    }

    if (document.getElementById("location").value == "Using coordinates") {
        document.getElementById("geocode_result").innerHTML = latitude + ", " + longitude;
    }

    var dateString = document.getElementById("date").value;
    // parse YYYY-MM-DD to Date object
    var date = new Date(dateString);
    if (date == null || isNaN(date.getTime())) {
        date = new Date();
        dateString = date.toISOString().slice(0, 10);
        document.getElementById("date").value = dateString;
    }
    var delta = document.getElementById("delta").value;

    if (delta == null || isNaN(parseInt(delta)) || parseInt(delta) <= 0) {
        delta = DEFAULT_DELTA;
        document.getElementById("delta").value = delta;
    }

    var units = document.getElementById("units").value;

    if (units != "metric" && units != "imperial") {
        units = getDefaultUnit();
        document.getElementById("units").value = units;
    }


    const location = document.getElementById("location").value;

    const response = {
        "parameters": {
            "latitude": latitude,
            "longitude": longitude,
            "location": location,
            "date": dateString,
        },
        "results": {}
    }
    // update URL
    const climateNormalIndex = parseInt(document.getElementById("climate_normal").value) || DEFAULT_CLIMATE_NORMALS_INDEX;

    var urlParamsToSet = {};
    if (location == "Using coordinates") {
        urlParamsToSet.latitude = latitude;
        urlParamsToSet.longitude = longitude;
    } else if (location != "Current location") {
        urlParamsToSet.location = location;
    }
    if (dateString != new Date().toISOString().slice(0, 10))
        urlParamsToSet.date = dateString;
    if (delta && delta != DEFAULT_DELTA)
        urlParamsToSet.delta = delta;
    if (units && units != getDefaultUnit())
        urlParamsToSet.units = units;
    if (climateNormalIndex && climateNormalIndex != DEFAULT_CLIMATE_NORMALS_INDEX)
        urlParamsToSet.climate_normal = climateNormalIndex;

    var newSearch = buildUrlQuery(urlParamsToSet);
    shareUrl = window.location.origin + window.location.pathname + newSearch;
    if (shareUrl != window.location.href) {
        window.history.pushState({}, '', window.location.pathname + newSearch);
    }

    const isApiCall = parseUrlParams()['json'] == 'true';

    SELF_LINK = new URL(window.location.href);

    // today or yesterday
    let current = null;
    let delta_starts = new Date(date)
    delta_starts.setDate(new Date(date).getDate()-parseInt(delta));
    let delta_ends = new Date()
    delta_ends.setDate(new Date().getDate()+parseInt(16));
    // set delta_ends at midnight
    delta_ends.setHours(0, 0, 0, 0);

    if (date >= delta_ends) {
        document.getElementById('loading').innerHTML = "Date too far in the future";
        window.widgetData = null;
        return;
    } else if (date > delta_starts) {
        // delta is in days
        const currentA = await getCurrentWeather([latitude, longitude], units);
        const currentB = await getHistoricalWeatherCurrent([latitude, longitude], date, delta, units);

        current = mergeForecastHistorical(currentA, currentB);
    } else {
        current = await getHistoricalWeatherCurrent([latitude, longitude], date, delta, units);
    }
    const parsedData = splitPastPresentFuture(current, date, delta);
    current = parsedData;

    const start_year = CLIMATE_NORMALS[climateNormalIndex]["start"];
    const end_year = CLIMATE_NORMALS[climateNormalIndex]["end"];

    // Use selected date as center, fetch delta + 16-day forecast window around it.
    // delta_ends is always today+16 which produces an enormous range for historical dates, so compute widerDelta relative to the selected date only.
    const widerDelta = parseInt(delta) + 16;
    console.log(`Historical data: center=${date.toISOString().split('T')[0]}, widerDelta=${widerDelta}`);

    const historical = await getHistoricalWeather([latitude, longitude], date, widerDelta, start_year, end_year, units, true);
    const historical_grouped = groupAllHistorical(historical);
    const historical_histogram = createHistogram(historical, latitude);
    const current_histograms = [...historical_histogram];
    for (var i = 0; i < current.length; i++) {
        current_histograms.push(...createHistogram([current[i]], latitude));
    }
    const gg = groupHistogramsByValue(current_histograms);
    const varsToGetDaily = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
    
    let currentVal = getCurrentValue(current, date);
    document.getElementById('chart').innerHTML = "";
    document.getElementById('summary').innerHTML = "";
    document.getElementById('loading').innerHTML = "";

    for (const varName of varsToGetDaily) {
        if (!FRIENDLY_NAMES[varName]) {
            continue;
        }
        let chart = createAsciiChart(varName, gg[varName], currentVal[varName], date, latitude, historical_grouped[varName].slice());
        document.getElementById('chart').innerHTML += chart;
    }

    for (const info of [["Selected day",1], ["Days before",0], ["Days after",2]]) {


        response["results"][info[0]] = JSON.parse(JSON.stringify(current[info[1]]["daily"]));
            response["results"][info[0]]["percentiles"] = {};

        if (current[info[1]]["daily"]["time"].length == 0) {
            continue;
        }
        var days = current[info[1]]["daily"]["time"][0].replaceAll("-", "/");
        if (current[info[1]]["daily"]["time"].length > 1) {
            days += "-" + current[info[1]]["daily"]["time"][current[info[1]]["daily"]["time"].length-1].replaceAll("-", "/");
        }
        document.getElementById('summary').innerHTML += "<b>" + info[0] + ":</b> " + days + "<br>";
        var numDays = current[info[1]]["daily"]["time"].length;
        // Collect per-day per-variable scores for weighted RMS
        var dayVarScores = [];
        let percentiles = [];
        for (var i = 0; i < numDays; i++) {
            dayVarScores.push([]);
            percentiles.push(0);
        }
        var text = ""
        for (const varName of varsToGetDaily) {

            // not in Friendly names, skip
            if (!FRIENDLY_NAMES[varName]) {
                continue;
            }
            const datas = friendlyStats(historical_grouped[varName], historical_grouped["time"], current[info[1]]["daily"][varName], current[info[1]]["daily"]["time"], varName, units, delta, info[1], CLIMATE_NORMALS[climateNormalIndex], latitude);
            if (datas.length == 0) {
                delete response["results"][info[0]][varName];
                continue;
            }
            text += "<li>" + datas[0] + "</li>\n";
            response["results"][info[0]]["percentiles"][varName] = [];
            for (var i = 0; i < datas[1].length; i++) {
                response["results"][info[0]]["percentiles"][varName].push((datas[5][i]).toFixed(2));
                if (isScoreVar(varName)) {
                    dayVarScores[i].push({ varName: varName, score: datas[1][i] });
                }
                if (datas[4][i] > percentiles[i]) {
                    percentiles[i] = datas[4][i];
                }
            }
            text += datas[3] + "\n";
        }
        let score = [];
        for (var i = 0; i < numDays; i++) {
            score.push(computeFinalWeirdtherScore(dayVarScores[i]));
        }

        response["results"][info[0]]["weirdther_score"] = score;

        const sorted = score.slice().sort((a, b) => a - b);
        const max = Math.max(...score) / 100;
        const maxPercentile = Math.max(...percentiles);

        var scoreText = "";

        if (score.length == 1) {
            scoreText = score[0].toFixed(0);
        }

        if (score.length > 1) {
            scoreText = sorted[0].toFixed(0);
            scoreText += "-" + sorted[sorted.length-1].toFixed(0);
        }

        if (max < 0.75) {
            scoreText += " (what you signed up for";
        } else if (max < 0.98) {
            scoreText += " (elevator gossip worthy";
        } else if (max < 0.99) {
            scoreText += " (watch live on your local news channel";
        } else {
            scoreText += " (what you tell your grandkids about";
        }

        const message = generateOnceEveryXDays(maxPercentile, CLIMATE_NORMALS[climateNormalIndex]);
        scoreText += message + ")";

        document.getElementById('summary').innerHTML += "<b>Weirdther Score:</b> " + scoreText + "<ul>" + text + "</ul>";
    }

    if (isApiCall) {
        document.write('<pre>' + JSON.stringify(response, null, 2) + '</pre>');
    }
    
    // Export data for widget
    if (isWidget) {
        console.log("Exporting data for widget");
        window.widgetData = response;
    }
}



function parseDate(dateString) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

// findPercentileForValue is provided by weirdther-core.js
// Returns [percentile, firstIndex, lastIndex]


function findPercentileForSpan(data, value) {
    if (LINEAR_SCALE)
        return  [(value - data[0]) / (data[data.length-1] - data[0]), 0, 0];
    results = findPercentileForValue(data, value);
    if (results[2] == -1) {
        results[0] = 1;
    }
    return results;
}


// Statistical functions provided by weirdther-core.js:
// getPercentile, getMedian, getMean, getStd

// maxValues is a dict of varName -> value Count histogram
function maxValuesToValues(maxValues) {
    const values = [];
    for (var varName in maxValues) {
        for (var i = 0; i < maxValues[varName].length; i++) {
            values.push(parseInt(varName));
        }
    }
    return values;
}

// daysIntoYear is provided by weirdther-core.js

function friendlyStats(data, data_days, current_series, current_series_days, var_name, unit_type, delta, type, climateNormal, latitude) {
    // deep copy data
    data = data.slice();
    data_days = data_days.slice();
    current_series = current_series.slice();
    current_series_days = current_series_days.slice();

    var decimalPlaces = 1;

    // today + 16 days

    var last_day_with_data = new Date();
    if (type == 0) {
        last_day_with_data.setDate(last_day_with_data.getDate() + 16);
    } else if (type == 1) {
        last_day_with_data = new Date(current_series_days[current_series_days.length-1]);
    } else if (type == 2) {
        last_day_with_data.setDate(last_day_with_data.getDate() + 16);
    }

    // starting day of the year
    var start_day_of_year = daysIntoYear(new Date(current_series_days[0])) - parseInt(delta);
    // ending day of the year
    var end_day_of_year = daysIntoYear(new Date(current_series_days[current_series_days.length-1])) ;
    end_day_of_year += parseInt(delta);
    var friendly_name = FRIENDLY_NAMES[var_name]["name"];
    // sort data_days and data by the order of data 
    var combined = data_days.map((e, i) => [e, data[i]]);
    // add current series and current series days to combined

    combined = combined.filter((e) => function() {
        var day_of_year = daysIntoYear(new Date(e[0]));
        if (end_day_of_year >= start_day_of_year) {
            return day_of_year >= start_day_of_year && day_of_year <= end_day_of_year;
        } else {
            return day_of_year >= start_day_of_year || day_of_year <= end_day_of_year;
        }
    }() && new Date(e[0]).getFullYear() >= climateNormal.start
        && new Date(e[0]).getFullYear() <= climateNormal.end
    );
    data_days = combined.map((e) => e[0]);
    data = combined.map((e) => e[1]);

    var mean = getMean(data);
    var median = getMedian(data);
    var min = Math.min(...data);
    var max = Math.max(...data);
    var series_percentile = [0, 0, 0]
    var series_mean = getMean(current_series);
    var series_median = getMedian(current_series);
    var series_min_max = [Math.min(...current_series), Math.max(...current_series)];
    var scores = [];
    var scoresSum = [];
    var percentiles = [];
    var percentilesRaw = [];
    var normalizedSeriesValues = [];



    for (var i = 0; i < current_series.length; i++) {
        // Filter historical data to this specific day's ±delta window
        // This ensures consistent scores regardless of which group the day is in
        var filtered = filterHistoricalByDateWindow(data, data_days, current_series_days[i], parseInt(delta), climateNormal);
        if (i === 0) {
            console.log(`[${var_name}] First day: ${current_series_days[i]}, value: ${current_series[i]}, comparing against ${filtered.values.length} historical values`);
        }
        const result = computeVariableScore(var_name, filtered.values, filtered.dates, current_series[i], current_series_days[i], latitude);
        if (i === 0) {
            console.log(`[${var_name}] Result - percentile: ${(result.percentile * 100).toFixed(1)}%, score: ${result.score.toFixed(2)}`);
        }
        series_percentile[0] += result.percentile;
        series_percentile[1] += result.firstIndex;
        series_percentile[2] += result.lastIndex;
        percentilesRaw.push(result.percentile);
        normalizedSeriesValues.push(result.normalizedValue);
        const diff = Math.abs(result.percentile - 0.5);
        percentiles.push(diff+0.5);
        scores.push(result.score);
        if (result.firstIndex == 0 && result.lastIndex == -1)
            scoresSum.push(0);
        else
            scoresSum.push(1);
    }
    series_percentile[0] /= current_series.length;
    series_percentile[1] /= current_series.length;
    series_percentile[2] /= current_series.length;

    // Use normalized values for display if sunshine_duration
    var displaySeriesValues =  current_series;
    series_mean = getMean(displaySeriesValues);
    series_median = getMedian(displaySeriesValues);
    var displaySeriesMinMax = [Math.min(...displaySeriesValues), Math.max(...displaySeriesValues)];

    if (displaySeriesMinMax[0] === displaySeriesMinMax[1]) {
        series_min_max = displaySeriesMinMax[0].toFixed(decimalPlaces) + "";
    } else {
        series_min_max = displaySeriesMinMax[0].toFixed(decimalPlaces) + "/" + series_mean.toFixed(decimalPlaces) + "/" + displaySeriesMinMax[1].toFixed(decimalPlaces);
    }

    // Build paired historical data+days and filtering nulls
    var gradientHistData = [];
    var gradientHistDays = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i] == null || !data_days[i]) continue;
        gradientHistData.push(data[i]);
        gradientHistDays.push(data_days[i]);
    }

    // Sort historical data by value (required for percentile bar positioning)
    var gradientCombined = gradientHistDays.map(function(d, i) { return [d, gradientHistData[i]]; });
    gradientCombined.sort(function(a, b) { return a[1] - b[1]; });
    gradientHistDays = gradientCombined.map(function(e) { return e[0]; });
    gradientHistData = gradientCombined.map(function(e) { return e[1]; });

    var gradient = generateSpan(displaySeriesValues, current_series_days, gradientHistData, gradientHistDays, var_name, unit_type);

    var qualifier = "";
    var boldStart = "";
    var boldEnd = "";
    var topOrBottom = "";
    var noteDays = "";
    var percentilePretty = `${(series_percentile[0]*100).toFixed(0)}%`;
    if (series_mean === 0 && var_name === "rain_sum" && series_percentile[0] > 0.25 && series_percentile[0] < 0.75) {
        return [`<b>${friendly_name}:</b> No rain expected, which is what is typical.`, scores, scoresSum, gradient, percentiles, percentilesRaw];
    } else if (series_percentile[1] == 0 && series_percentile[2] == -1) {
        // return [`<b>${friendly_name}:</b> Not expected this time of year.`, scores, scoresSum, gradient];
        return []
    } else if (series_percentile[0] < 0) {
        qualifier = "below the minimum value recorded for the time period (" + climateNormal.start + "-" + climateNormal.end + ")!"; 
        boldStart = "<b style='color:blue'>";
        boldEnd = "</b>";
    } else if (series_percentile[0] == 0) {
        qualifier = "the minimum value recorded for the time period (" + climateNormal.start + "-" + climateNormal.end + ")!";
        boldStart = "<b style='color:blue'>";
        boldEnd = "</b>";
    } else if (series_percentile[0] == 1) {
        qualifier = "the maximum value recorded for the time period (" + climateNormal.start + "-" + climateNormal.end + ")!";
        boldStart = "<b style='color:red'>";
        boldEnd = "</b>";  
    } else if (series_percentile[0] > 1) {
        qualifier = "above the maximum value recorded for the time period (" + climateNormal.start + "-" + climateNormal.end + ")!";
        boldStart = "<b style='color:red'>";
        boldEnd = "</b>";  
    } else if (series_percentile[0] < 0.05) {
        qualifier = "significantly " + FRIENDLY_NAMES[var_name]["lower"] + " than usual."
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Bottom " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0], climateNormal);
    } else if (series_percentile[0] > 0.95) {
        qualifier = "significantly " + FRIENDLY_NAMES[var_name]["higher"] + " than usual."
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0], climateNormal);
    } else if (series_percentile[0] < 0.25) {
        qualifier = FRIENDLY_NAMES[var_name]["lower"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Bottom " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0], climateNormal);
    } else if (series_percentile[0] > 0.75) {
        qualifier = FRIENDLY_NAMES[var_name]["higher"] + " than usual.";
        boldStart = "<b>";
        boldEnd = "</b>";
        topOrBottom = "Top " + percentilePretty;
        noteDays = generateOnceEveryXDays(series_percentile[0], climateNormal);
    }  else {
        qualifier = "close to what is expected.";
    }


    //return [`<b>${friendly_name}:</b> ${boldStart}${series_min_max}${FRIENDLY_NAMES[var_name][unit_type]} is ${qualifier} ${topOrBottom} Historic median/mean ${median.toFixed(1)}/${mean.toFixed(1)}${FRIENDLY_NAMES[var_name][unit_type]} ${boldEnd}`, scores, scoresSum, gradient];
    return [`<b>${friendly_name}:</b> ${boldStart}${series_min_max}${FRIENDLY_NAMES[var_name][unit_type]} is ${qualifier} ${topOrBottom} ${boldEnd}`, scores, scoresSum, gradient, percentiles, percentilesRaw];
 
}

function printStats(data, current_value, var_name, current_date, latitude) {
    if (current_value == null) return "";
    data = data.sort((a, b) => parseFloat(a) - parseFloat(b));
    var mean = getMean(data);
    var std = getStd(data);
    var median = getMedian(data);
    var p5 = getPercentile(data, 0.05);
    var p25 = getPercentile(data, 0.25);
    var p75 = getPercentile(data, 0.75);
    var p95 = getPercentile(data, 0.95);
    var percentile = findPercentileForValue(data, current_value);
    return `mean: ${mean.toFixed(2)}, std: ${std.toFixed(2)}, 5%: ${p5.toFixed(2)}, 25%: ${p25.toFixed(2)}, 50%: ${median.toFixed(2)}, 75%: ${p75.toFixed(2)}, 95%: ${p95.toFixed(2)}<br>current value: ${current_value.toFixed(2)}, percentile: ${percentile[0].toFixed(2)}`;
}

async function getCurrentWeather(location = DEFAULT_LOCATION, unitsType = "metric") {
    location = [parseFloat(location[0]).toFixed(2), parseFloat(location[1]).toFixed(2)];
    return new Promise(function(resolve, reject) {
        fetchForecastCached(location[0], location[1], function(err, rawData) {
            if (err || !rawData) { reject(err || 'No data'); return; }
            // Deep clone so unit conversion does not mutate cached data
            var data = JSON.parse(JSON.stringify(rawData));
            if (unitsType === "imperial") {
                if (data.current) convertToImperial(data.current);
                convertToImperial(data.daily);
            }
            if (data.current) convertSunshineToPct(data.current);
            convertSunshineToPct(data.daily);
            resolve(data);
        });
    });
}

function splitPastPresentFuture(data, current_date, delta = DEFAULT_DELTA) {
    var daily = [{"daily": {}}, {"daily": {}}, {"daily": {}}];
    var vars = ("time," + WEIRDTHER_CONFIG.DAILY_VARS).split(",");
    if (data["daily"]["weather_code"]) {
        vars.push("weather_code");
    }
    var today = current_date.toISOString().split('T')[0];
    var delta_ends = new Date(current_date);
    delta_ends.setDate(new Date(current_date).getDate()+parseInt(delta));
    var last_day = delta_ends.toISOString().split('T')[0];
    for (var k = 0; k < vars.length; k++) {
        var varName = vars[k] + "";
        for (var i = 0; i < daily.length; i++) {
            daily[i]["daily"][varName] = [];
        }
        for (var i = 0; i < data["daily"]["time"].length; i++) {
            var day = data["daily"]["time"][i];
            
            if (day === today) {
                daily[1]["daily"][varName].push(data["daily"][varName][i]);
            } else if (today > day) {
                daily[0]["daily"][varName].push(data["daily"][varName][i]);
            } else if  (day <= last_day) {
                daily[2]["daily"][varName].push(data["daily"][varName][i]);
            }
        }
    }
    return daily;
}

// Thin async wrappers around the shared callback-based functions in weirdther-core.js

async function getHistoricalWeatherCurrent(location, current_date = new Date(), delta = DEFAULT_DELTA, unitsType = "metric") {
    location = [location[0].toFixed(2), location[1].toFixed(2)];
    var start = toISODate(new Date(current_date.getTime() - delta * 86400000));
    var end   = toISODate(new Date(current_date.getTime() + delta * 86400000));
    return new Promise(function(resolve) {
        fetchHistoricalRange(location[0], location[1], start, end, function(err, data) {
            if (err || !data) { resolve(null); return; }
            if (unitsType === "imperial") convertToImperial(data.daily);
            convertSunshineToPct(data.daily);
            resolve(data);
        });
    });
}

async function getHistoricalWeather(location, current_date = new Date(), delta = DEFAULT_DELTA, start_year = "2001", end_year = "2030", unitsType = "metric") {
    location = [location[0].toFixed(2), location[1].toFixed(2)];
    return new Promise(function(resolve, reject) {
        fetchAllHistorical(location[0], location[1], current_date, delta, start_year, end_year,
            function(done, total) {
                document.getElementById("loading").innerHTML =
                    "Loading weather data... (" + (((done + 1) / total) * 100).toFixed(0) + "%)";
            },
            function(err, results) {
                if (err) return reject(err);
                if (unitsType === "imperial") {
                    for (var i = 0; i < results.length; i++) convertToImperial(results[i].daily);
                }
                for (var i = 0; i < results.length; i++) convertSunshineToPct(results[i].daily);
                resolve(results);
            }
        );
    });
}


function createHistogram(datas, latitude, current_date = null) {
    // group by value
    // sample {"latitude": 39.47276, "longitude": -8.589203, "generationtime_ms": 0.11706352233886719, "utc_offset_seconds": 0, "timezone": "GMT", "timezone_abbreviation": "GMT", "elevation": 42.0, "daily_units": {"time": "iso8601", "temperature_2m_max": "\u00b0C", "temperature_2m_min": "\u00b0C", "precipitation_sum": "mm", "rain_sum": "mm", "snowfall_sum": "cm"}, "daily": {"time": ["2000-01-25", "2000-01-26", "2000-01-27", "2000-01-28", "2000-01-29", "2000-01-30", "2000-01-31", "2000-02-01", "2000-02-02", "2000-02-03", "2000-02-04"], "temperature_2m_max": [11.2, 12.7, 12.3, 14.8, 14.6, 16.7, 16.8, 16.5, 14.9, 18.6, 18.4], "temperature_2m_min": [-0.8, 2.7, 3.2, 5.9, 4.2, 2.4, 5.1, 12.1, 10.2, 7.5, 7.3], "precipitation_sum": [0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 15.9, 0.0, 0.0, 0.0], "rain_sum": [0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 15.9, 0.0, 0.0, 0.0], "snowfall_sum": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}}
    var perValue = {};
    var currentData = {};

    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        for (var j = 0; j < data["daily"]["time"].length; j++) {
            var day = data["daily"]["time"][j];
            var vars = WEIRDTHER_CONFIG.DAILY_VARS.split(",");
            for (var k = 0; k < vars.length; k++) {
                var varName = vars[k] + "";
                var val = data["daily"][varName][j];
                val = Math.round(val) + "";
                if (current_date && day == current_date.toISOString().slice(0, 10)) {
                    if (!(varName in currentData)) {
                        currentData[varName] = {};
                    }
                     currentData[varName][val] =[day];
                } else {
                    if (!(varName in perValue)) {
                        perValue[varName] = {};
                    }
                    if (varName in data["daily"]) {
                        if (!(val in perValue[varName])) {
                            perValue[varName][val] = [];
                        }
                        perValue[varName][val].push(day);
                    }
                }
            }
        }
    }
    return [perValue];
}

function groupHistogramsByValue(datas) {
    let perValue = {};

    // multiple series in the form outputted by groupByValue
    var i = 0;
    for (data in datas) {
        for (key in datas[data]) {
            if (!(key in perValue)) {
                perValue[key] = {};
            }
            var minValue = null;
            var maxValue = null;
            for (val in datas[data][key]){
                if (minValue === null || val < minValue) {
                    minValue = val;
                }
                if (maxValue === null || val > maxValue) {
                    maxValue = val;
                }
                if (!(val in perValue[key])) {
                    perValue[key][val] = [];
                }
                while (perValue[key][val].length < i) {
                    perValue[key][val].push([]);
                }
                perValue[key][val].push(datas[data][key][val]);
            }
        }
        i++;
    }
    for (key in perValue) {
        var data = perValue[key];

        let var_start = Math.min(...Object.keys(perValue[key]).map(Number));
        let var_end = Math.max(...Object.keys(perValue[key]).map(Number));
        // sort data by key
        for (let i = var_start; i <= var_end; i++) {
            if (!(i in perValue[key])) {
                perValue[key][i + ""] = [];
            }
        }
    }
    
    return perValue;
}



function createAsciiChart(name, groupedData, currentVal, currentDate, latitude, historical_grouped = null) {
    // print simple ascii chart, with one line per value
    if (Object.keys(groupedData).length === 0) {
        return;
    }
    let sortedHistoricalDataKeys = Object.keys(groupedData).sort((a, b) => parseInt(a) - parseInt(b));
    let maxValues = {};
    let symbols = {};
    let values = {};
    for (var i = 0; i < sortedHistoricalDataKeys.length; i++) {
        let varValues = groupedData[sortedHistoricalDataKeys[i]];
        symbols[sortedHistoricalDataKeys[i]] = [];
        values[sortedHistoricalDataKeys[i]] = [];
        var internalMax = 0;
        foundDates = {};
        for (var j = varValues.length-1; j >= 0; j--) {
            for (var k = 0; k < varValues[j].length; k++) {
                if (varValues[j][k] in foundDates) {
                    // remove this date from varValues[j]
                    varValues[j].splice(k, 1);
                    k--;
                } else {
                    foundDates[varValues[j][k]] = true;
                }
            }
        }
        for (var j = 0; j < varValues.length; j++) {
            internalMax += varValues[j].length;
            // repeat symbol into array
            Array(varValues[j].length).fill(SYMBOLS[j % SYMBOLS.length]).forEach(function (x) { 
                symbols[sortedHistoricalDataKeys[i]].push(x);
            });
            
            for (var k = 0; k < varValues[j].length; k++) {
                values[sortedHistoricalDataKeys[i]].push(varValues[j][k]);
            }
        }
        maxValues[sortedHistoricalDataKeys[i] + ""] = internalMax;
    }
    let maxValue = Math.max(...Object.values(maxValues));
    
    let asciiTable = "";
    for (let i = maxValue; i > 0; i--) {
        let line = "|";
        if (i === maxValue) {
            line = "/";
        }
        
        for (let varName in sortedHistoricalDataKeys) {
            var varValues = sortedHistoricalDataKeys[varName];
            if (i <= maxValues[varValues]) {
                var value = values[varValues][i-1];
                var url = SELF_LINK
                url.searchParams.set('date', value);
                line += SEPARATOR.repeat(COLUMN_WIDTH-1) + symbols[varValues][i-1].replace("%%%", value).replace("###", url)
            } else {
                line += SEPARATOR.repeat(COLUMN_WIDTH);
            }
        }
        asciiTable += line + "<br>";
    }
    asciiTable += SEPARATOR +  "-".repeat((sortedHistoricalDataKeys.length-1)*COLUMN_WIDTH) + "--><br>" + SEPARATOR;
    let line = "";
    for (let varName in sortedHistoricalDataKeys) {
        varValues = sortedHistoricalDataKeys[varName];
        varValueString = varValues + "";
        line += SEPARATOR.repeat(Math.max(0, COLUMN_WIDTH-varValueString.length)) + varValueString;
    }
    line += "<br>" + SEPARATOR;
    for (let varName in sortedHistoricalDataKeys) {
        varValues = maxValues[sortedHistoricalDataKeys[varName]];
        varValueString = varValues + "";
        line += SEPARATOR.repeat(Math.max(0, COLUMN_WIDTH-varValueString.length)) + varValueString;
    }
    line += "<br>";
    const stats = printStats(historical_grouped, currentVal, name, currentDate, latitude);
    return `<div style="overflow-x: scroll"><div class="chart-container">${asciiTable}${line}${name}<br>${stats}<br></br></div></div>`;
}

function getCurrentValue(current, currentDate) {
    // get current value
    let currentVal = {};
    for (var i = 0; i < current.length; i++) {
        var index = current[i]["daily"]["time"].indexOf(currentDate.toISOString().slice(0, 10))
        if (index !== -1) {
            for (var varName in WEIRDTHER_CONFIG.DAILY_VARS.split(",")) {
                varName = WEIRDTHER_CONFIG.DAILY_VARS.split(",")[varName];
                currentVal[varName] = current[i]["daily"][varName][index];
            }
        }
    }
    return currentVal;
}

function generateCssGradient(var_name, data) {
    let colorList = FRIENDLY_NAMES[var_name]["colors"];
    let colorListPercent = FRIENDLY_NAMES[var_name]["color_limits"];
    let output = [];
    for (var i = 0; i < colorList.length; i++) {
        let index = Math.floor((data.length-1) * colorListPercent[i]/100);
        let val = data[index];
        let position = (val - data[0]) / (data[data.length-1] - data[0]) * 100;
        output.push(`${colorList[i]} ${position}%`);
    }
    return `background: linear-gradient(to right, ${output.join(", ")});`;
}

function genBackground(text) {
    // generate text with white background, black text and border
    return `<div style="background-color: white; color: black; padding: 2px; border-radius: 1px;">${text}</div>`;
}

function generateSpan(current_series, current_series_days, historical_stats, historical_stats_days, var_name, unit_type) {
    let unit_label = FRIENDLY_NAMES[var_name][unit_type + "_short"]
    // put a point at 50% of the gradient
    var data_for_median = historical_stats.slice().concat(current_series);
    var days_for_median = historical_stats_days.slice().concat(current_series_days);
    // sort data_days and data by the order of data 
    var combined = days_for_median.map((e, i) => [e, data_for_median[i]]);
    combined = combined.sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
    
    days_for_median = combined.map((e) => e[0]);
    data_for_median = combined.map((e) => e[1]);

    if (data_for_median[0] === data_for_median[data_for_median.length-1]) {
        return "";
    }

    let gradient = generateCssGradient(var_name, data_for_median)


    let point = "⬜";    
    let points = "";
    let text = ""
    let textBottom = "";
    let textTop = "";
    let textTopTop = "";

    let stdDevsToShow = [0, 0.01, 0.05, 0.32, 0.50, 0.68, 0.95, 0.99, 1];
    let symbols = ["|", "", "", "", "|", "", "", "", "|"];
    for (var i = 0; i < stdDevsToShow.length; i++) {
        let index = Math.floor((historical_stats.length-1) * stdDevsToShow[i])
        let val = historical_stats[index];
        let date = historical_stats_days[index];
        var url = SELF_LINK
        url.searchParams.set('date', date);
        percentileData = findPercentileForSpan(data_for_median,  val);
        position = percentileData[0] * 100;
        let part1 = genBackground( val.toFixed(1))
        let part2 = genBackground((stdDevsToShow[i]*100).toFixed(0) + "%")
        textTop += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);"><a title="${date}" href="${url}">` + part1 + "</a></span>";
        textTopTop += `<span style="position: absolute; left: ${position}%; top: -10px; transform: translateX(-50%);">`+ part2 + "</span>";
        if (symbols[i] !== "") {
            points += `<span style="position: absolute; left: ${position}%; top: -5px; transform: translateX(-50%);">${symbols[i]}</span>`;
        }
    }

    for (var i = 0; i < current_series.length; i++) {
        if (current_series[i] == null) continue;
        const percentileData = findPercentileForSpan(data_for_median, current_series[i]);
        const day = current_series_days[i];
        const position = percentileData[0] * 100;
        // place the point at the right position, positions are relative to the gradient
        var url = SELF_LINK
        url.searchParams.set('date', day);
        var link = `<a href="${url}">${point}</a>`;
        points += `<span title="${day}" style="position: absolute; left: ${position}%; top: -5px; transform: translateX(-50%);">${link}</span>`;
        if (current_series.length == 1) {
            text += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);">` + current_series[i].toFixed(1) + unit_label + "</span>";
            const percentileDataSeries = findPercentileForValue(historical_stats, current_series[i]);
            const positionSeries = percentileDataSeries[0] * 100;
            const part1 = genBackground(positionSeries.toFixed(0) + "%");  
            textBottom += `<span style="position: absolute; left: ${position}%; top: 0px; transform: translateX(-50%);">` + part1 + "</span>";
        }
    }
    
    var bar = `<span style="position: relative; ${gradient}; width: 100%; height: 10px; display: inline-block;">${points}</span>`;
    var textBarBottom = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${textBottom}</span>`;
    var textBar = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${text}</span>`;
    var textBarTop = `<span style="position: relative; width: 100%; height: 20px; display: inline-block;">${textTop}</span>`;
    var textBarTopTop = `<span style="position: relative; width: 100%; height: 10px; display: inline-block;">${textTopTop}</span>`;


    return `<div style="padding: 10px;  width: 100%; display: inline-block;">` + textBarTopTop + "\n" + textBarTop + "\n" +bar + "\n" + textBar + "\n" + textBarBottom + "</div>";  
}

function generateOnceEveryXDays(percentile, climateNormal) {
    let percentilePretty = 1-(Math.abs(0.5-percentile))*2; 
    const days = Math.round(1/percentilePretty);
    if (percentile < 0 || percentile > 1) {
        return ", never happened between " + climateNormal.start + " and " + climateNormal.end + "!";
    }
    if (days === 1) {
        return ", should happen every other day";
    }
    if (days === 7) {
        return ", should happen once per week";
    }
    if (days === 30) {
        return ", should happen once per month";
    }
    if (isNaN(days) || !isFinite(days)) {
        return ", happened once between " + climateNormal.start + " and " + climateNormal.end + "!";
    }
    return `, should happen once every ${days} days`;    
}

