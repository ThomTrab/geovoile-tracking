var µ = {
    IS_DEBUG: true,
    events: {
        TIMELINE_CHANGE: "timeline_change",
        TIMELINE_UPDATE: "timeline_update",
        TIMELINE_CATCHED: "timeline_catched",
        TIMELINE_RELEASED: "timeline_released",
        ONOFF_TAG_CLICK: "onoff_tag_click"
    },
    __classTimerIsInit: false,
    __classHtmlDefinitionIsInit: false,
    __classGridDataIsInit: false,
    __classVectorFieldIsInit: false,
    IS_TOUCHE_DEVICE: (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)),
    NULL_GIF: "data:image/gif;base64,R0lGODlhZABkAIAAAAAAAAAAACH5BAEAAAAALAAAAABkAGQAAAJzhI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfM" + "pvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CGlYAAA7",
    MAP_MAX_AREA: {
        left: -180,
        top: 75,
        width: 360,
        height: 150
    },
    MONTH_NAMES: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    DAY_NAMES: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    clipboard: "",
    MOUSE: {
        x: 0,
        y: 0
    },
    LANG: "fr",
    TRANSLATIONS: {},
    TIMECODE: 0,
    WEBROOT: "/",
    CURRENT_PAGE_ROOT: "/",
    init: function (params) {
        this.WEBROOT = params != undefined && params.rooturl != undefined ? params.rooturl : "/"
    },
    getTimer: function () {
        return new µ.Timer()
    },
    getTimecode: function (dateStr) {
        return (new Date(dateStr)).getTime() / 1000
    },
    getDate: function (timecode) {
        var date = new Date();
        date.setTime(timecode * 1000);
        return date
    },
    get: function (url, callback, fromCache) {
        var version = fromCache ? "" : (url.indexOf("?") >= 0 ? "&v=" : "?v=") + (new Date()).getTime();
        $.get({
            url: url + version,
            success: function (data) {
                callback(data)
            }
        })
    },
    post: function (url, data, callback, fromCache) {
        var version = fromCache ? "" : (url.indexOf("?") >= 0 ? "&v=" : "?v=") + (new Date()).getTime();
        $.ajax({
            type: "POST",
            url: url + version,
            data: data,
            success: callback
        })
    },
    loadTxtFile: function (url, datatype, callback) {
        $.get({
            url: url,
            data: "",
            success: function (data) {
                callback($(data))
            },
            dataType: datatype
        })
    },
    loadHwxFile: function (url, datatype, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function (e) {
            if (this.status == 200) {
                var uInt8Array = new UInt8Array(this.response);
                var data = new TextDecoder("utf-8").decode(uInt8Array);
                callback(datatype == "json" ? eval("(" + data + ")") : datatype == "xml" ? $(data) : data)
            }
        };
        xhr.send()
    },
    getMousAngle: function (evt, target) {
        var isTouch = evt.originalEvent.touches != undefined;
        var offset = target.offset();
        var center_x = offset.left + target.width() / 2;
        var center_y = offset.top + target.height() / 2;
        var mouse_x = isTouch ? evt.originalEvent.touches[0].pageX : evt.pageX;
        var mouse_y = isTouch ? evt.originalEvent.touches[0].pageY : evt.pageY;
        var radians = Math.atan2(mouse_x - center_x, mouse_y - center_y);
        return (radians * (180 / Math.PI) * -1) + 180
    },
    toNumber: function (value, format) {
        if (value == undefined || isNaN(value) || value.toString() == "") return "";
        value = Number(value);
        var formatParts = format.split("¤");
        var thousandDelimiter = formatParts[0];
        var nbDecimals = formatParts[1];
        var decimalDelimiter = formatParts[2];
        var re = '\\d(?=(\\d{3})+' + (nbDecimals > 0 ? '\\D' : '$') + ')';
        var num = value.toFixed(Math.max(0, ~~nbDecimals));
        return (decimalDelimiter ? num.replace('.', decimalDelimiter) : num).replace(new RegExp(re, 'g'), '$&' + (thousandDelimiter || ','))
    },
    toNumberSign: function (value, format) {
        var formatParts = format.split("¤");
        return formatParts[value < 0 ? 0 : value == 0 ? 1 : 2]
    },
    toDate: function (value, format, utc) {
        var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
        var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
        var timezoneClip = /[^-+\dA-Z]/g;
        var pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val
        };
        return function (date, mask, utc) {
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined
            }
            date = date ? new Date(date) : new Date;
            if (isNaN(date)) throw SyntaxError("invalid date");
            mask = String(mask || "yyyy/mm/dd HH:MM:ss'UTC");
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true
            } else if (mask.slice(0, 3) == "GMT") {
                var maskParts = mask.split(":");
                var utcDelta = Number(maskParts[0].slice(3)) * 60 * 60 * 1000;
                date = new Date(date.getTime() + utcDelta);
                mask = maskParts.slice(1).join(":");
                utc = true
            } else if (mask.slice(0, 3) == "FR:") {
                var timecode = date.getTime() / 1000;
                var year = date.getFullYear();
                var utcDelta = 0;
                mask = mask.slice(3);
                utc = true;
                switch (year) {
                case 2007:
                    utcDelta = (timecode >= 1174788000) && (timecode < 1193540400) ? 2 : 1;
                    break;
                case 2008:
                    utcDelta = (timecode >= 1206842400) && (timecode < 1224990000) ? 2 : 1;
                    break;
                case 2009:
                    utcDelta = (timecode >= 1238292000) && (timecode < 1256439600) ? 2 : 1;
                    break;
                case 2010:
                    utcDelta = (timecode >= 1269741600) && (timecode < 1288494000) ? 2 : 1;
                    break;
                case 2011:
                    utcDelta = (timecode >= 1301191200) && (timecode < 1319943600) ? 2 : 1;
                    break;
                case 2012:
                    utcDelta = (timecode >= 1332554400) && (timecode < 1351393200) ? 2 : 1;
                    break;
                case 2013:
                    utcDelta = (timecode >= 1364695200) && (timecode < 1382842800) ? 2 : 1;
                    break;
                case 2014:
                    utcDelta = (timecode >= 1396144800) && (timecode < 1414292400) ? 2 : 1;
                    break;
                case 2015:
                    utcDelta = (timecode >= 1427594400) && (timecode < 1445742000) ? 2 : 1;
                    break;
                case 2016:
                    utcDelta = (timecode >= 1459044000) && (timecode < 1477796400) ? 2 : 1;
                    break;
                case 2017:
                    utcDelta = (timecode >= 1490493600) && (timecode < 1509246000) ? 2 : 1;
                    break;
                case 2018:
                    utcDelta = (timecode >= 1521943200) && (timecode < 1540695600) ? 2 : 1;
                    break;
                case 2019:
                    utcDelta = (timecode >= 1553997600) && (timecode < 1572145200) ? 2 : 1;
                    break;
                case 2020:
                    utcDelta = (timecode >= 1585447200) && (timecode < 1603594800) ? 2 : 1;
                    break;
                case 2021:
                    utcDelta = (timecode >= 1616896800) && (timecode < 1635649200) ? 2 : 1;
                    break;
                case 2022:
                    utcDelta = (timecode >= 1648346400) && (timecode < 1667098800) ? 2 : 1;
                    break;
                case 2023:
                    utcDelta = (timecode >= 1679796000) && (timecode < 1698548400) ? 2 : 1;
                    break;
                case 2024:
                    utcDelta = (timecode >= 1711850400) && (timecode < 1729998000) ? 2 : 1;
                    break;
                case 2025:
                    utcDelta = (timecode >= 1743300000) && (timecode < 1761447600) ? 2 : 1;
                    break;
                case 2026:
                    utcDelta = (timecode >= 1774749600) && (timecode < 1792897200) ? 2 : 1;
                    break;
                case 2027:
                    utcDelta = (timecode >= 1806199200) && (timecode < 1824951600) ? 2 : 1;
                    break;
                case 2028:
                    utcDelta = (timecode >= 1837648800) && (timecode < 1856401200) ? 2 : 1;
                    break;
                case 2029:
                    utcDelta = (timecode >= 1869098400) && (timecode < 1887850800) ? 2 : 1;
                    break
                }
                date = new Date(date.getTime() + utcDelta * 60 * 60 * 1000)
            }
            var _ = utc ? "getUTC" : "get",
                d = date[_ + "Date"](),
                D = date[_ + "Day"](),
                m = date[_ + "Month"](),
                y = date[_ + "FullYear"](),
                H = date[_ + "Hours"](),
                M = date[_ + "Minutes"](),
                s = date[_ + "Seconds"](),
                L = date[_ + "Milliseconds"](),
                o = utc ? 0 : date.getTimezoneOffset(),
                flags = {
                    d: d,
                    dd: pad(d),
                    ddd: µ.DAY_NAMES[D],
                    dddd: µ.DAY_NAMES[D + 7],
                    m: m + 1,
                    mm: pad(m + 1),
                    mmm: µ.MONTH_NAMES[m],
                    mmmm: µ.MONTH_NAMES[m + 12],
                    yy: String(y).slice(2),
                    yyyy: y,
                    h: H % 12 || 12,
                    hh: pad(H % 12 || 12),
                    H: H,
                    HH: pad(H),
                    M: M,
                    MM: pad(M),
                    s: s,
                    ss: pad(s),
                    l: pad(L, 3),
                    L: pad(L > 99 ? Math.round(L / 10) : L),
                    t: H < 12 ? "a" : "p",
                    tt: H < 12 ? "am" : "pm",
                    T: H < 12 ? "A" : "P",
                    TT: H < 12 ? "AM" : "PM",
                    Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                    o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                    S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };
            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1)
            })
        }
    }(),
    timecodeToDate: function (value) {
        return µ.toDate(value * 1000, "UTC:yyyy/mm/dd HH:MM:ss'Z'")
    },
    toRacetime: function (value, format) {
        var result = "";
        var sign = value < 0 ? "-" : "";
        var rest = Math.abs(value);
        var days = Math.floor(rest / 86400);
        rest -= days * 86400;
        var hours = Math.floor(rest / 3600);
        rest -= hours * 3600;
        var minutes = Math.floor(rest / 60);
        var seconds = rest - minutes * 60;
        var $hours = hours >= 10 ? hours : "0" + hours;
        var $minutes = minutes >= 10 ? minutes : "0" + minutes;
        var $seconds = seconds >= 10 ? seconds : "0" + seconds;
        var providedFormats = format.replace(/\[/gi, "{").replace(/\]/gi, "}").split("¤");
        var usefullFormatIndex = Math.min(providedFormats.length - 1, days != 0 ? 0 : hours != 0 ? 1 : minutes != 0 ? 2 : seconds != 0 ? 3 : 4);
        var usefullFormat = providedFormats[usefullFormatIndex];
        try {
            switch (usefullFormatIndex) {
            case 0:
                result = usefullFormat.formatWith(sign + days, $hours, $minutes, $seconds);
                break;
            case 1:
                result = usefullFormat.formatWith(sign + $hours, $minutes, $seconds);
                break;
            case 2:
                result = usefullFormat.formatWith(sign + $minutes, $seconds);
                break;
            case 3:
                result = usefullFormat.formatWith(sign + $seconds);
                break;
            case 4:
                result = usefullFormat;
                break
            }
        } catch (err) {
            result = "{0},{1},{2},{3}".FormatWith(self.Days, $hours, $minutes, $seconds)
        }
        return result
    },
    toCoordinate: function (value, format) {
        var isLat = format == "LAT";
        var positive = value >= 0;
        var secondsTotal = Math.abs(value * 3600);
        var degrees = Math.floor(secondsTotal / 3600);
        var minutes = Math.floor(secondsTotal % 3600 / 60);
        var secondsDec = Math.floor((secondsTotal % 3600 / 60 - minutes) * 100);
        return ("000" + degrees).substr(isLat ? -2 : -3) + "°" + ("00" + minutes).substr(-2) + "." + ("00" + secondsDec).substr(-2) + "'" + (isLat ? (positive ? "N" : "S") : (positive ? "E" : "W"))
    },
    toCardinalAngle: function (value, format) {
        var angle = (value + 720) % 360;
        return angle < 11.25 ? "N" : angle < 33.75 ? "NNE" : angle < 56.25 ? "NE" : angle < 78.75 ? "ENE" : angle < 101.25 ? "E" : angle < 123.75 ? "ESE" : angle < 146.25 ? "SE" : angle < 168.75 ? "SSE" : angle < 191.25 ? "S" : angle < 213.75 ? "SSW" : angle < 236.25 ? "SW" : angle < 258.75 ? "WSW" : angle < 281.25 ? "W" : angle < 303.75 ? "WNW" : angle < 326.25 ? "NW" : angle < 348.75 ? "NNW" : "N"
    },
    fromCoordinate: function (value) {
        var regVal = new RegExp("[^0-9+\.\-]", "gi");
        var regQuadran = new RegExp("(N|S|E|W)$", "gi");
        var num = 0;
        if (regVal.test(value)) {
            var quadran = value.match(regQuadran);
            quadran = quadran == undefined ? "N" : quadran[0];
            value = value.replace(regQuadran, "");
            values = value.replace(regVal, "|").split("|");
            nbValues = values.length;
            var deg = (nbValues >= 1 ? Math.abs(parseFloat(values[0])) : 0);
            var min = (nbValues >= 2 ? Math.abs(parseFloat(values[1])) : 0);
            var sec = (nbValues >= 3 ? Math.abs(parseFloat(values[2])) : 0);
            var num = (isNaN(deg) ? 0 : deg) + (isNaN(min) ? 0 : min) / 60 + (isNaN(sec) ? 0 : sec) / 3600;
            num = num * (quadran == "N" || quadran == "E" ? 1 : -1)
        } else {
            num = parseFloat(value)
        }
        return num
    },
    toArrayValue: function (value, format) {
        var values = format.split("|");
        var index = Number(value);
        return isNaN(value) || value < 0 || value >= values.length ? "" : values[value]
    },
    toRegexReplace: function (value, format) {
        var regParts = format.split("¤");
        var reg = new RegExp(regParts[0], 'gi');
        return value.replace(reg, regParts[1])
    },
    trace: function () {
        var text = "";
        for (i = 0; i < arguments.length; i++) {
            text += arguments[i] + " "
        }
        $("#debug").html(text)
    },
    prettifyJson: function (str) {
        str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key'
                } else {
                    cls = 'string'
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean'
            } else if (/null/.test(match)) {
                cls = 'null'
            }
            return '<span class="' + cls + '">' + match + '</span>'
        })
    },
    _extends: function () {
        $.fn.getHexColor = function (attr, asNumber) {
            var rgb = $(this).css(attr == "" || attr == undefined ? "color" : attr);
            if (!rgb) return "#FFFFFF";
            rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

            function hex(x) {
                return ("0" + parseInt(x).toString(16)).slice(-2)
            }
            var result = hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            return asNumber ? Number("0x" + result) : "#" + result
        };
        String.prototype.formatWith = function () {
            var values = arguments;
            return this.replace(/\{(\d+)\}/gi, function (match, index) {
                return values[index]
            })
        };
        window.location.setLocal = function (name, value) {
            window.localStorage.setItem(this.pathname + "$" + name, value)
        };
        window.location.getLocal = function (name) {
            return window.localStorage.getItem(this.pathname + "$" + name)
        };
        if (!Array.prototype.find) {
            Array.prototype.find = function (predicate) {
                if (this == null) {
                    throw new TypeError('Array.prototype.find a été appelé sur null ou undefined')
                }
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate doit être une fonction')
                }
                var list = Object(this);
                var length = list.length >>> 0;
                var thisArg = arguments[1];
                var value;
                for (var i = 0; i < length; i++) {
                    value = list[i];
                    if (predicate.call(thisArg, value, i, list)) {
                        return value
                    }
                }
                return undefined
            }
        };
        if (window.TextDecoder == undefined) {
            window.TextDecoder = function () {};
            window.TextDecoder.prototype.decode = function (array) {
                var out, i, len, c;
                var char2, char3;
                out = "";
                len = array.length;
                i = 0;
                while (i < len) {
                    c = array[i++];
                    switch (c >> 4) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        out += String.fromCharCode(c);
                        break;
                    case 12:
                    case 13:
                        char2 = array[i++];
                        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                        break;
                    case 14:
                        char2 = array[i++];
                        char3 = array[i++];
                        out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0));
                        break
                    }
                }
                return out
            }
        };
        if (typeof Uint16Array !== 'undefined') {
            if (!Uint16Array.prototype.fill) Uint16Array.prototype.fill = Array.prototype.fill;
            if (!Uint16Array.prototype.slice) Uint16Array.prototype.slice = Array.prototype.slice
        };
        $(document).on("timeline_change.µ", function (evt, timecode) {
            if (window.top != window.self) window.top.postMessage(timecode * 1000, '*');
            µ.TIMECODE = timecode
        });
        document.addEventListener("DOMContentLoaded", function () {
            $(".wait").each(function () {
                $(this).append("<svg viewbox='0 0 20 20'>" + "<path d='M10 2v4z' />" + "<path stroke-opacity='0.25' d='M14 10h4z' />" + "<path d='M10 14v4z' stroke-opacity='0.5' />" + "<path d='M2 10h4z' stroke-opacity='0.75' />" + "<g transform='rotate(45 10 10)'>" + "<path stroke-opacity='0.125' d='M10 2v4z' />" + "<path stroke-opacity='0.375' d='M14 10h4z' />" + "<path d='M10 14v4z' stroke-opacity='0.675' />" + "<path d='M2 10h4z' stroke-opacity='0.875' />" + "</g>" + "</svg>")
            });
            $(".dropzone").on("dragover", function (evt) {
                evt.preventDefault()
            });
            $("#translations>dfn").each(function (i, def) {
                var $def = $(def);
                µ.TRANSLATIONS[$def.attr("rel")] = $def.text()
            });
            $("#translations").remove()
        });
        return null
    }()
};
µ.math = {
    getSpline: function (controls, factor) {
        var result = [];
        if (controls.length < 2) return controls;
        var steps = 10;
        var xValues = [];
        var yValues = [];
        $.each(controls, function (index, control) {
            xValues.push(control[0] * factor);
            yValues.push(control[1] * factor)
        });
        var nbCubics = controls.length - 1;
        var xCubics = this._getOpenCubics(nbCubics, xValues);
        var yCubics = this._getOpenCubics(nbCubics, yValues);
        var u;
        result.push([Math.round(xCubics[0](0)) / factor, Math.round(yCubics[0](0)) / factor]);
        for (var i = 0; i < nbCubics; i++) {
            for (var j = 1; j <= steps; j++) {
                u = j / steps;
                result.push([Math.round(xCubics[i](u)) / factor, Math.round(yCubics[i](u)) / factor])
            }
        }
        return result
    },
    polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians)
        }
    },
    describeArc: function (x, y, radius, startAngle, endAngle) {
        var start = this._polarToCartesian(x, y, radius, endAngle);
        var end = this._polarToCartesian(x, y, radius, startAngle);
        var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
        var d = ["M", start.x, start.y, "A", radius, radius, "0", arcSweep, "0", end.x, end.y];
        return d.join(" ")
    },
    getLinearFc: function (x1, y1, x2, y2) {
        var a = x1 == x2 ? 0 : (y1 - y2) / (x1 - x2);
        var b = x1 == x2 ? 0 : (x1 * y2 - x2 * y1) / (x1 - x2);
        var fc = function (x) {
            return a * x + b
        };
        fc.a = a;
        fc.b = b;
        return fc
    },
    _getOpenCubics: function (n, x) {
        var result = [];
        var i;
        var gamma = new Array(n + 1);
        var delta = new Array(n + 1);
        var D = new Array(n + 1);
        gamma[0] = 1.0 / 2.0;
        for (i = 1; i < n; i++) gamma[i] = 1 / (4 - gamma[i - 1]);
        gamma[n] = 1 / (2 - gamma[n - 1]);
        delta[0] = 3 * (x[1] - x[0]) * gamma[0];
        for (i = 1; i < n; i++) delta[i] = (3 * (x[i + 1] - x[i - 1]) - delta[i - 1]) * gamma[i];
        delta[n] = (3 * (x[n] - x[n - 1]) - delta[n - 1]) * gamma[n];
        D[n] = delta[n];
        for (i = n - 1; i >= 0; i--) D[i] = delta[i] - gamma[i] * D[i + 1];
        for (i = 0; i < n; i++) {
            result.push(new this._CubicFc(2 * (x[i] - x[i + 1]) + D[i] + D[i + 1], 3 * (x[i + 1] - x[i]) - 2 * D[i] - D[i + 1], D[i], x[i]))
        }
        return result
    },
    _CubicFc: function (a, b, c, d) {
        return function (val) {
            return (((a * val) + b) * val + c) * val + d
        }
    }
};
µ.geo = {
    __classGeoPolygonIsInit: false,
    getHeading: function (latA, lngA, latB, lngB) {
        var latArad = latA * Math.PI / 180;
        var latBrad = latB * Math.PI / 180;
        var lngArad = lngA * Math.PI / 180;
        var lngBrad = lngB * Math.PI / 180;
        var y = Math.sin(lngBrad - lngArad) * Math.cos(latBrad);
        var x = Math.cos(latArad) * Math.sin(latBrad) - Math.sin(latArad) * Math.cos(latBrad) * Math.cos(lngBrad - lngArad);
        var angle = Math.round(Math.atan2(y, x) * 180 / Math.PI);
        return (angle + 360) % 360
    },
    getGreatCircle: function (a, b, minDist, addFirstPoint, inc) {
        var result = [];
        if (addFirstPoint) result.push(a);
        if (this.getOrthodromy(a, b) < minDist) {
            result.push(b);
            return result
        }
        if (inc++ > 15) return result;
        var midPoint = this.getMidPoint(a, b);
        result = result.concat(this.getGreatCircle(a, midPoint, minDist, false, inc)).concat(this.getGreatCircle(midPoint, b, minDist, false, inc));
        return result
    },
    getOrthodromy: function (a, b) {
        var degToRad = Math.PI / 180;
        var Alat = a[0] * degToRad;
        var Alng = a[1] * degToRad;
        var Blat = b[0] * degToRad;
        var Blng = b[1] * degToRad;
        return 2 * 6371 / 1.852 * Math.asin(Math.sqrt(Math.sin((Blat - Alat) / 2) * Math.sin((Blat - Alat) / 2) + Math.sin((Blng - Alng) / 2) * Math.sin((Blng - Alng) / 2) * Math.cos(Alat) * Math.cos(Blat)))
    },
    getLoxodromy: function (a, b) {
        var degToRad = Math.PI / 180;
        var Alat = a[0] * degToRad;
        var Alng = a[1] * degToRad;
        var Blat = b[0] * degToRad;
        var Blng = b[1] * degToRad;
        var dLat = Blat - Alat;
        var loxo = 0;
        if (Math.abs(dLat) > 10e-12) {
            var tg = (Blng - Alng) / (Math.log(Math.tan(Blat / 2 + Math.PI / 4)) - Math.log(Math.tan(Alat / 2 + Math.PI / 4)));
            loxo = (Blat - Alat) / Math.cos(Math.atan(tg))
        } else {
            loxo = Math.cos(Alat) * (Blng - Alng)
        }
        return Math.abs(6371 / 1.852 * loxo)
    },
    getMidPoint: function (a, b) {
        var degToRad = Math.PI / 180;
        var rad2Deg = 180 / Math.PI;
        var latA$rad = a[0] * degToRad;
        var lngA$rad = a[1] * degToRad;
        var latB$rad = b[0] * degToRad;
        var lngB$rad = b[1] * degToRad;
        var deltaLat$rad = latB$rad - latA$rad;
        var deltaLng$rad = lngB$rad - lngA$rad;
        var cosLatA = Math.cos(latA$rad);
        var cosLatB = Math.cos(latB$rad);
        var Bx = cosLatB * Math.cos(deltaLng$rad);
        var By = cosLatB * Math.sin(deltaLng$rad);
        var latitudeMidPoint$rad = Math.atan2(Math.sin(latA$rad) + Math.sin(latB$rad), Math.sqrt(Math.pow(cosLatA + Bx, 2) + Math.pow(By, 2)));
        var longitudeMidPoint = (lngA$rad + Math.atan2(By, cosLatA + Bx)) * rad2Deg;
        if (longitudeMidPoint > 180) longitudeMidPoint -= 360;
        if (longitudeMidPoint < -180) longitudeMidPoint += 360;
        return [latitudeMidPoint$rad * rad2Deg, longitudeMidPoint]
    },
    getLoxoPointAtDistance: function (lat, lng, heading, nmDistance) {
        var lat1 = lat / 180 * Math.PI;
        var lng1 = lng / 180 * Math.PI;
        var distRatio = nmDistance / (6371 / 1.852);
        var angle = (heading + (heading > 180 ? -360 : 0)) / 180 * Math.PI;
        var dLat = distRatio * Math.cos(angle);
        var lat2 = lat1 + dLat;
        var k = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
        var q = (Math.abs(k) > 10e-12) ? dLat / k : Math.cos(lat1);
        var dLng = distRatio * Math.sin(angle) / q;
        var lng2 = lng1 + dLng;
        return [lat2 / Math.PI * 180, lng2 / Math.PI * 180]
    },
    getArea: function (top, bottom, left, right) {
        var isGeoArea = arguments.length == 1;
        var l = isGeoArea ? arguments[0].left : arguments[2];
        var t = isGeoArea ? arguments[0].top : arguments[0];
        var w = isGeoArea ? arguments[0].width : arguments[3] - arguments[2] + (arguments[3] < arguments[2] ? 360 : 0);
        var h = isGeoArea ? arguments[0].height : arguments[0] - arguments[1];
        return {
            left: l,
            right: l + w,
            top: t,
            bottom: t - h,
            width: w,
            height: h
        }
    }
};
µ.base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function (input) {
        try {
            return btoa(input)
        } catch (err) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = this._utf8_encode(input);
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64
                } else if (isNaN(chr3)) {
                    enc4 = 64
                }
                output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4)
            }
            return output
        }
    },
    decode: function (input, toByteArray) {
        var output = "";
        try {
            output = atob(input)
        } catch (err) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = this._keyStr.indexOf(input.charAt(i++));
                enc2 = this._keyStr.indexOf(input.charAt(i++));
                enc3 = this._keyStr.indexOf(input.charAt(i++));
                enc4 = this._keyStr.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2)
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3)
                }
            }
            output = this._utf8_decode(output)
        }
        if (toByteArray) {
            var len = output.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                bytes[i] = output.charCodeAt(i)
            }
            return bytes.buffer
        } else {
            return output
        }
    },
    encodeUInt8: function (u8Arr) {
        var CHUNK_SIZE = 0x8000;
        var index = 0;
        var length = u8Arr.length;
        var result = '';
        var slice;
        while (index < length) {
            slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
            result += String.fromCharCode.apply(null, slice);
            index += CHUNK_SIZE
        }
        return btoa(result)
    },
    _utf8_encode: function (string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c)
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128)
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128)
            }
        }
        return utftext
    },
    _utf8_decode: function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++
            } else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2
            } else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3
            }
        }
        return string
    }
};
µ.clipboard = {
    _exists: false,
    _$tag: null,
    _content: [],
    empty: function (hide) {
        this._content = [];
        if (this._$tag) {
            this._$tag.empty();
            if (hide) this._$tag.hide()
        }
    },
    add: function (text) {
        this._content.push(text)
    },
    show: function (container, text) {
        if (!this._exists) this._create(container);
        this._$tag.show().empty().append(text != undefined ? text : this._content.join("\n"))
    },
    hide: function () {
        this.empty(true)
    },
    _create: function (container) {
        var that = this;
        this._$tag = $("<textarea id='clipboard'></textarea>");
        container.append(this._$tag);
        this._$tag.dblclick(function (evt) {
            if (evt.ctrlKey) that.hide()
        })
    }
};
µ.Timer = function () {
    var __package = µ;
    this._date = new Date();
    if (!__package.__classTimerIsInit) {
        var __class = __package.Timer;
        var __proto = __class.prototype;
        __proto.getTime = function () {
            return (new Date() - this._date)
        };
        __proto.getLog = function (label, resetDate) {
            var text = (label == undefined ? "" : label + " : ") + (new Date() - this._date);
            if (resetDate) this._date = new Date();
            return text
        };
        __proto.log = function (label, resetDate) {
            console.log(this.getLog(label, resetDate))
        };
        __package.__classTimerIsInit = true
    };
};
µ.HtmlDefinition = function (html) {
    var __package = µ;
    this.target = null;
    this._html = "";
    this._variables = [];
    this._nbVars = 0;
    if (!__package.__classHtmlDefinitionIsInit) {
        var __class = __package.HtmlDefinition;
        var __proto = __class.prototype;
        __proto.update = function (target) {
            var that = this;
            var result = "";
            $.each(this._variables, function (index, variable) {
                result += that._html[index] + that._variables[index](target)
            });
            result += this._html[this._nbVars];
            return result
        };
        __proto._init = function (html) {
            var that = this;
            this._html = html.replace(/\{([^\}]+)\}/gi, function (match, variable) {
                var func = "(function(target) { try {return " + variable + ";}catch(err){if(µ.IS_DEBUG) console.log(target, err.message);return ''};})";
                that._variables.push(eval(func));
                return "§"
            }).split("§");
            this._nbVars = this._variables.length
        };
        __package.__classHtmlDefinitionIsInit = true
    };
    this._init(html)
};
µ.GridData = function (width, height, data, isAngularValues, factor) {
    var __package = µ;
    this.data = data;
    this.headers = {};
    this.width = width || 0;
    this.height = height || 0;
    this.isAngularValues = isAngularValues || false;
    this.smoothRadius = 1.8;
    this._factor = factor || 1;
    if (!__package.__classGridDataIsInit) {
        var __class = __package.GridData;
        var __proto = __class.prototype;
        __proto.get = function (i, j) {
            var index = j * this.width + i;
            return this.data[index] * this._factor
        };
        __proto.getValAt = function (x, y) {
            var x = Math.round(x);
            if (x < 0) x = 0;
            if (x >= this.width) x = this.width - 1;
            var y = Math.round(y);
            if (y < 0) y = 0;
            if (y >= this.height) y = this.height - 1;
            var index = y * this.width + x;
            return this.data[index] * this._factor
        };
        __proto.getSmoother = function (x, y) {
            var xmin = Math.round(x - this.smoothRadius);
            if (xmin < 0) xmin = 0;
            var xmax = Math.round(x + this.smoothRadius) + 1;
            if (xmax >= this.width) xmax = this.width - 1;
            var ymin = Math.round(y - this.smoothRadius);
            if (ymin < 0) ymin = 0;
            var ymax = Math.round(y + this.smoothRadius) + 1;
            if (ymax >= this.height) ymax = this.height - 1;
            if (this.isAngularValues == true) {
                var totalWeight = 0;
                var xsum = 0;
                var ysum = 0;
                var k = Math.PI / 180.0;
                for (var ix = xmin; ix < xmax; ix++) {
                    var dx = (x - ix) / this.smoothRadius;
                    dx *= dx;
                    for (var iy = ymin; iy < ymax; iy++) {
                        var dy = (y - iy) / this.smoothRadius;
                        dy *= dy;
                        var d = Math.sqrt(dx + dy);
                        if (d < 1) {
                            var angle = this.data[iy * this.width + ix] * k;
                            var weight = 2 * d * d * d - 3 * d * d + 1;
                            totalWeight += weight;
                            xsum += Math.cos(angle) * weight;
                            ysum += Math.sin(angle) * weight
                        }
                    }
                }
                return (totalWeight ? Math.atan2(ysum / totalWeight, xsum / totalWeight) / k : 0)
            } else {
                var totalWeight = 0;
                var sum = 0;
                for (var ix = xmin; ix < xmax; ix++) {
                    var dx = (x - ix) / this.smoothRadius;
                    dx *= dx;
                    for (var iy = ymin; iy < ymax; iy++) {
                        var dy = (y - iy) / this.smoothRadius;
                        dy *= dy;
                        var d = Math.sqrt(dx + dy);
                        if (d < 1) {
                            var index = iy * this.width + ix;
                            var value = this.data[index] * this._factor;
                            var weight = 2 * d * d * d - 3 * d * d + 1;
                            totalWeight += weight;
                            sum += (value * weight)
                        }
                    }
                }
                return totalWeight ? sum / totalWeight : 0
            }
        };
        __proto.getBuffer = function (zoomFactor) {
            var width = this.width * zoomFactor;
            var height = this.height * zoomFactor;
            var buffer = new Uint8Array(width * height);
            buffer.width = width;
            buffer.height = height;
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var sy = this.height * y / height;
                    var sx = this.width * x / width;
                    var v = this.getSmoother(sx, sy);
                    buffer[y * width + x] = v
                }
            }
            return buffer
        };
        __proto.getBufferRGBA = function (zoomFactor, colors, area, rect) {
            var width = Math.round((this.width) * zoomFactor);
            var height = Math.round((this.height) * zoomFactor);
            var buffer = new Uint8Array(width * height * 4);
            for (var h = 0; h < height; h++) {
                for (var w = 0; w < width; w++) {
                    var x = rect.left + rect.width * w / width;
                    var y = rect.top + rect.height * h / height;
                    var lng = sig.getLng(x, y, true);
                    var lat = sig.getLat(x, y);
                    var sx = (lng - area.left) / area.width * (this.width);
                    var sy = (area.top - lat) / area.height * (this.height);
                    var v = this.getSmoother(sx, sy);
                    var index = (h * width + w) * 4;
                    if (this.isAngularValues) {
                        var gray = 512. * (v + 180) / 360;
                        if (gray > 255) gray = 511 - gray;
                        buffer[index] = gray;
                        buffer[index + 1] = gray;
                        buffer[index + 2] = gray;
                        buffer[index + 3] = 255
                    } else {
                        v = Math.min(10, Math.max(0, v / 5));
                        var vSup = Math.min(Math.ceil(v), 10);
                        var vInf = Math.max(vSup - 1, 0);
                        var colorSup = colors[vSup];
                        var colorInf = colors[vInf];
                        buffer[index] = colorInf.r + (colorSup.r - colorInf.r) * (v - vInf);
                        buffer[index + 1] = colorInf.g + (colorSup.g - colorInf.g) * (v - vInf);
                        buffer[index + 2] = colorInf.b + (colorSup.b - colorInf.b) * (v - vInf);
                        buffer[index + 3] = colorInf.a + (colorSup.a - colorInf.a) * (v - vInf)
                    }
                }
            }
            buffer.width = width;
            buffer.height = height;
            return buffer
        };
        __package.__classGridDataIsInit = true
    };
};
µ.VectorField = function (speeds, angles, ratio, nbVectors) {
    var __package = µ;
    this.height = Math.round(Math.sqrt((nbVectors || 125000) / ratio));
    this.width = Math.round(this.height * ratio);
    this.maxLength = 0;
    this._data = [];
    this._speeds = speeds;
    this._angles = angles;
    this._ratio = ratio;
    if (!__package.__classVectorFieldIsInit) {
        var __class = __package.VectorField;
        var __proto = __class.prototype;
        __proto.contains = function (x, y) {
            return x >= 0 && x < this.width && y >= 0 && y < this.height
        };
        __proto.get = function (x, y) {
            return this._data[Math.floor(x)][Math.floor(y)]
        };
        __proto.resample = function (i, j, width, height) {
            this._data = [];
            for (var ii = 0; ii < this.width; ii++) {
                this._data[ii] = [];
                for (var jj = 0; jj < this.height; jj++) {
                    var x = i + width * ii / this.width;
                    var y = j + height * jj / this.height;
                    var a = this._angles.getSmoother(x, y) * Math.PI / 180;
                    var s = this._speeds.getSmoother(x, y);
                    s = Math.pow(s / 25, 1.2) * 25;
                    var vx = -s * Math.sin(a) * 180 / Math.PI;
                    var vy = +s * Math.cos(a) * 180 / Math.PI;
                    var length = Math.sqrt(vx * vx + vy * vy);
                    var vector = {
                        x: vx,
                        y: vy,
                        length: length
                    };
                    this._data[ii][jj] = vector;
                    this.maxLength = Math.max(this.maxLength, length)
                }
            }
        };
        __package.__classVectorFieldIsInit = true
    };
    this.resample(0, 0, speeds.width, speeds.height)
};
µ.geo.GeoPolygon = function (definition) {
    var __package = µ.geo;
    this.left = 0;
    this.right = 0;
    this.top = 0;
    this.bottom = 0;
    this.width = 0;
    this.height = 0;
    if (!__package.__classGeoPolygonIsInit) {
        var __class = __package.GeoPolygon;
        var __proto = __class.prototype;
        __proto.contains = function (lat, lng) {
            if (lat < this.bottom || lat > this.top || lng < this.left || lng > this.right) return false;
            var j = this.length - 1;
            var odd = 0;
            for (i = 0; i < this.length; i++) {
                var latA = this[i][1];
                var lngA = this[i][0];
                var latB = this[j][1];
                var lngB = this[j][0];
                if ((latA < lat && latB >= lat || latB < lat && latA >= lat) && (lngA <= lng || lngB <= lng)) {
                    odd ^= (lngA + (lat - latA) / (latB - latA) * (lngB - lngA) < lng)
                }
                j = i
            }
            return odd == 1
        };
        __proto._init = function (def) {
            this.push.apply(this, def);
            var latMin = Number.MAX_VALUE;
            var latMax = Number.MIN_VALUE;
            var lngMin = Number.MAX_VALUE;
            var lngMax = Number.MIN_VALUE;
            for (var i = 0; i < this.length; i++) {
                latMin = Math.min(latMin, this[i][1]);
                latMax = Math.max(latMax, this[i][1]);
                lngMin = Math.min(lngMin, this[i][0]);
                lngMax = Math.max(lngMax, this[i][0])
            };
            this.left = lngMin;
            this.right = lngMax;
            this.top = latMax;
            this.bottom = latMin;
            this.width = lngMax - lngMin;
            this.height = latMax - latMin
        };
        __package.__classGeoPolygonIsInit = true
    };
    this._init(definition);
};
µ.geo.GeoPolygon.prototype = Object.create(Array.prototype);
