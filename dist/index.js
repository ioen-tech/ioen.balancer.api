"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var server_1 = __importDefault(require("./server"));
(0, server_1["default"])()["catch"](function (e) {
    console.error('There was a fatal error', e);
    process.exit(1);
});
