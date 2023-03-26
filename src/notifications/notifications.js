"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.sendDailyPushNotification = exports.handlePushNotifications = exports.findNonNullFcmTokens = void 0;
var messaging_1 = require("firebase-admin/messaging");
var findNonNullFcmTokens = function (dbClient) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, dbClient.users.findMany({
                where: {
                    fcm_token: {
                        not: null
                    }
                }
            })];
    });
}); };
exports.findNonNullFcmTokens = findNonNullFcmTokens;
var unsubscribeFromPush = function (dbClient, pushNotifToken) { return __awaiter(void 0, void 0, void 0, function () {
    var found;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, dbClient.users.findFirst({
                    where: {
                        fcm_token: pushNotifToken
                    }
                })];
            case 1:
                found = _a.sent();
                if (!found) {
                    return [2 /*return*/];
                }
                return [2 /*return*/, dbClient.users.update({
                        where: {
                            user_id: found.user_id
                        },
                        data: {
                            fcm_token: null
                        }
                    })];
        }
    });
}); };
// unregister everyone who we should no longer send to
var unsubTheseTokens = function (dbClient, unsubTokens) { return __awaiter(void 0, void 0, void 0, function () {
    var _i, unsubTokens_1, unsubToken;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _i = 0, unsubTokens_1 = unsubTokens;
                _a.label = 1;
            case 1:
                if (!(_i < unsubTokens_1.length)) return [3 /*break*/, 4];
                unsubToken = unsubTokens_1[_i];
                return [4 /*yield*/, unsubscribeFromPush(dbClient, unsubToken)];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                if (unsubTokens.length) {
                    console.log("".concat(unsubTokens.length, " users are no longer available for push notifications and their push tokens have been removed from our system"));
                }
                return [2 /*return*/];
        }
    });
}); };
var sendDailyPushNotification = function (dbClient, jobQueue, firebaseAdmin) { return __awaiter(void 0, void 0, void 0, function () {
    var usersWithFcmToken, _i, usersWithFcmToken_1, user, dailyNotif, title, message, notif;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, findNonNullFcmTokens(dbClient)];
            case 1:
                usersWithFcmToken = _a.sent();
                _i = 0, usersWithFcmToken_1 = usersWithFcmToken;
                _a.label = 2;
            case 2:
                if (!(_i < usersWithFcmToken_1.length)) return [3 /*break*/, 5];
                user = usersWithFcmToken_1[_i];
                return [4 /*yield*/, dbClient.dailyNotification.findFirst({
                        where: {
                            user_id: user.user_id
                        }
                    })];
            case 3:
                dailyNotif = _a.sent();
                title = '';
                if ((dailyNotif.balanced_count > dailyNotif.consuming_count) && (dailyNotif.balanced_count > dailyNotif.producing_count)) {
                    title = "Your group have been using Balanced energy";
                }
                else if ((dailyNotif.consuming_count > dailyNotif.balanced_count) && (dailyNotif.consuming_count > dailyNotif.producing_count)) {
                    title = "Your group have been Consuming energy";
                }
                else {
                    title = "Your group have been Producing energy";
                }
                message = {
                    notification: {
                        title: title,
                        body: "Your groups daily reward is: ".concat(dailyNotif.daily_rewards)
                    },
                    token: user.fcm_token
                };
                (0, messaging_1.getMessaging)().send(message)
                    .then(function (response) {
                    console.log("sent notif success: ", response);
                })["catch"](function (e) {
                    console.log('error sending message: ', e);
                });
                _a.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5: return [4 /*yield*/, dbClient.dailyNotification.updateMany({
                    data: {
                        daily_rewards: 0,
                        balanced_count: 0,
                        producing_count: 0,
                        consuming_count: 0
                    }
                })];
            case 6:
                notif = _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.sendDailyPushNotification = sendDailyPushNotification;
var handlePushNotifications = function (messages, dbClient, jobQueue) { return __awaiter(void 0, void 0, void 0, function () {
    var _i, messages_1, message;
    return __generator(this, function (_a) {
        for (_i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            message = messages_1[_i];
            (0, messaging_1.getMessaging)().send(message)
                .then(function (response) {
                console.log('send notif success: ', response);
            })["catch"](function (e) {
                console.log("error sending message: ", e);
            });
        }
        return [2 /*return*/];
    });
}); };
exports.handlePushNotifications = handlePushNotifications;
