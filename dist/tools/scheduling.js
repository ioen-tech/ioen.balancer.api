"use strict";
exports.__esModule = true;
exports.RESILIENCE_OPTS = exports.repeatAtMinutes = exports.repeatAtHoursAndWeekday = exports.repeatAtHours = void 0;
// these two repeatAtHours and RESILIENCE_OPTS
// can be combined, as opts to a bullmq job
var repeatAtHours = function (hours, tz) { return ({
    // uses cron-parser inside:
    // https://www.npmjs.com/package/cron-parser
    cron: "0 ".concat(hours, " * * *"),
    // schedule it according to the set time zone
    tz: tz
}); };
exports.repeatAtHours = repeatAtHours;
var repeatAtMinutes = function (minutes, tz) { return ({
    // uses cron-parser inside:
    // https://www.npmjs.com/package/cron-parser
    cron: "".concat(minutes, " * * * *"),
    // schedule it according to the set time zone
    tz: tz
}); };
exports.repeatAtMinutes = repeatAtMinutes;
var repeatAtHoursAndWeekday = function (hours, weekDay, tz) { return ({
    cron: "0 ".concat(hours, " * * ").concat(weekDay),
    tz: tz
}); };
exports.repeatAtHoursAndWeekday = repeatAtHoursAndWeekday;
var RESILIENCE_OPTS = {
    // give it a little bit of resilience
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000
    }
};
exports.RESILIENCE_OPTS = RESILIENCE_OPTS;
