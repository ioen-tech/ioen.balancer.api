"use strict";
exports.__esModule = true;
exports.delay = void 0;
var delay = function (time) {
    return new Promise(function (resolve) { return setTimeout(resolve, time); });
};
exports.delay = delay;
