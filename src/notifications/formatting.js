"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.formatTimeAus = void 0;
var moment_1 = __importDefault(require("moment"));
var times_1 = require("../gridRenewables/times");
function formatTimeAus(timeframe) {
    return timeframe
        .split(' - ')
        .map(function (time) { return moment_1["default"].tz(time, times_1.TIMEZONE).format('h:mma').replace(/:00/g, ''); })
        .join('-');
}
exports.formatTimeAus = formatTimeAus;
