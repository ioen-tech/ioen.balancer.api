"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.jobHandler = exports.SEND_DAILY_NOTIFICATION = exports.QUERY_GROUP_NAMES = exports.QUERY_FRONIUS_USER = exports.QUERY_FRONIUS_USERS = void 0;
var scheduling_1 = require("../tools/scheduling");
var notifications_1 = require("../notifications/notifications");
var axios_1 = __importDefault(require("axios"));
// JOB TYPES
var QUERY_FRONIUS_USERS = 'query_fronius_users';
exports.QUERY_FRONIUS_USERS = QUERY_FRONIUS_USERS;
var QUERY_FRONIUS_USER = 'query_fronius_user';
exports.QUERY_FRONIUS_USER = QUERY_FRONIUS_USER;
var QUERY_GROUP_NAMES = 'query_group_names';
exports.QUERY_GROUP_NAMES = QUERY_GROUP_NAMES;
var QUERY_USERS_PER_GROUP = 'query_users_per_group';
var SEND_DAILY_NOTIFICATION = 'send_daily_notification';
exports.SEND_DAILY_NOTIFICATION = SEND_DAILY_NOTIFICATION;
var jobHandler = function (dbClient, expo, jobQueue, firebaseAdmin) { return function (job) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, groupId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = job.name;
                switch (_a) {
                    case QUERY_GROUP_NAMES: return [3 /*break*/, 1];
                    case QUERY_USERS_PER_GROUP: return [3 /*break*/, 3];
                    case SEND_DAILY_NOTIFICATION: return [3 /*break*/, 5];
                }
                return [3 /*break*/, 7];
            case 1: return [4 /*yield*/, queryGroupNames(dbClient, jobQueue)];
            case 2:
                _b.sent();
                return [3 /*break*/, 8];
            case 3:
                groupId = job.data.group_id;
                return [4 /*yield*/, queryUsersPerGroup(dbClient, groupId, jobQueue)];
            case 4:
                _b.sent();
                return [3 /*break*/, 8];
            case 5: return [4 /*yield*/, sendDailyNotification(dbClient, jobQueue, firebaseAdmin)];
            case 6:
                _b.sent();
                return [3 /*break*/, 8];
            case 7:
                console.log('unrecognized Job name: ' + job.name);
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); }; };
exports.jobHandler = jobHandler;
var sendDailyNotification = function (dbClient, queue, firebaseAdmin) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Send daily Notifications");
                return [4 /*yield*/, (0, notifications_1.sendDailyPushNotification)(dbClient, queue, firebaseAdmin)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var queryUsersPerGroup = function (dbClient, groupId, queue) { return __awaiter(void 0, void 0, void 0, function () {
    var groupMembers, totalGroupEnergy, _i, groupMembers_1, groupMember, user, jwtQuery, token, bearer, url, froniusQuery, userEnergy, group, numMembers, groupReward, memberReward, gupdate, _a, groupMembers_2, user, _b, groupMembers_3, user, _c, groupMembers_4, user, _d, groupMembers_5, user;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, dbClient.groupMembers.findMany({
                    where: {
                        group_id: groupId
                    }
                })];
            case 1:
                groupMembers = _e.sent();
                totalGroupEnergy = 0;
                _i = 0, groupMembers_1 = groupMembers;
                _e.label = 2;
            case 2:
                if (!(_i < groupMembers_1.length)) return [3 /*break*/, 7];
                groupMember = groupMembers_1[_i];
                return [4 /*yield*/, dbClient.users.findFirst({
                        include: {
                            fronius_info: true
                        },
                        where: {
                            user_id: groupMember.user_id
                        }
                    })
                    // Query fronius Info
                ];
            case 3:
                user = _e.sent();
                if (!user) return [3 /*break*/, 6];
                return [4 /*yield*/, axios_1["default"].post(process.env.FRONIUS_URL, {
                        userId: user.fronius_info.fronius_userid,
                        password: user.fronius_info.fronius_password
                    }, {
                        headers: {
                            accept: 'application/json',
                            AccessKeyId: user.fronius_info.fronius_accesskey_id,
                            AccessKeyValue: user.fronius_info.fronius_accesskey_value
                        }
                    })];
            case 4:
                jwtQuery = _e.sent();
                token = jwtQuery.data.jwtToken;
                bearer = 'Bearer ' + token;
                url = "".concat(process.env.FRONIUS_PVSYSTEMS_URL, "/").concat(user.fronius_info.fronius_device_id, "/").concat(process.env.FRONIUS_PVSYSTEMS_AGGDATA);
                return [4 /*yield*/, axios_1["default"].get(url, {
                        headers: {
                            'accept': 'application/json',
                            'AccessKeyId': user.fronius_info.fronius_accesskey_id,
                            'AccessKeyValue': user.fronius_info.fronius_accesskey_value,
                            'Authorization': bearer
                        }
                    })];
            case 5:
                froniusQuery = _e.sent();
                userEnergy = parseInt(JSON.stringify(froniusQuery.data.data.channels[0].value), 10);
                totalGroupEnergy += userEnergy;
                console.log("user: ".concat(user.user_id, ":").concat(user.username, ", energy: ").concat(userEnergy));
                _e.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7:
                if (!totalGroupEnergy) return [3 /*break*/, 30];
                return [4 /*yield*/, dbClient.groups.findFirst({
                        where: {
                            group_id: groupId
                        }
                    })];
            case 8:
                group = _e.sent();
                console.log("".concat(group.group_name, " Energy: ").concat(totalGroupEnergy));
                return [4 /*yield*/, dbClient.groupMembers.count({
                        where: {
                            group_id: groupId
                        }
                    })
                    // Check if group has minimum users, if not skip this
                ];
            case 9:
                numMembers = _e.sent();
                if (!(numMembers >= group.min_users)) return [3 /*break*/, 29];
                groupReward = Math.round(group.reward_start_balance / 8640);
                memberReward = Math.round(groupReward / numMembers);
                gupdate = { group_energy: totalGroupEnergy };
                if (!(totalGroupEnergy > -500 && totalGroupEnergy < 500)) return [3 /*break*/, 18];
                // Group energy is Balanced
                console.log("groupReward: ".concat(groupReward));
                console.log("memberReward: ".concat(memberReward));
                gupdate['reward_start_balance'] = { increment: groupReward };
                _a = 0, groupMembers_2 = groupMembers;
                _e.label = 10;
            case 10:
                if (!(_a < groupMembers_2.length)) return [3 /*break*/, 13];
                user = groupMembers_2[_a];
                return [4 /*yield*/, dbClient.users.update({
                        where: {
                            user_id: user.user_id
                        },
                        data: {
                            rewards_points: {
                                increment: memberReward
                            }
                        }
                    })];
            case 11:
                _e.sent();
                _e.label = 12;
            case 12:
                _a++;
                return [3 /*break*/, 10];
            case 13:
                _b = 0, groupMembers_3 = groupMembers;
                _e.label = 14;
            case 14:
                if (!(_b < groupMembers_3.length)) return [3 /*break*/, 17];
                user = groupMembers_3[_b];
                return [4 /*yield*/, dbClient.dailyNotification.update({
                        where: {
                            user_id: user.user_id
                        },
                        data: {
                            daily_rewards: {
                                increment: groupReward
                            },
                            balanced_count: {
                                increment: 1
                            }
                        }
                    })];
            case 15:
                _e.sent();
                _e.label = 16;
            case 16:
                _b++;
                return [3 /*break*/, 14];
            case 17: return [3 /*break*/, 27];
            case 18:
                if (!(totalGroupEnergy < -500)) return [3 /*break*/, 23];
                // Group Energy is Producing
                console.log("Group energy is Producing");
                _c = 0, groupMembers_4 = groupMembers;
                _e.label = 19;
            case 19:
                if (!(_c < groupMembers_4.length)) return [3 /*break*/, 22];
                user = groupMembers_4[_c];
                return [4 /*yield*/, dbClient.dailyNotification.update({
                        where: {
                            user_id: user.user_id
                        },
                        data: {
                            daily_rewards: {
                                increment: groupReward
                            },
                            producing_count: {
                                increment: 1
                            }
                        }
                    })];
            case 20:
                _e.sent();
                _e.label = 21;
            case 21:
                _c++;
                return [3 /*break*/, 19];
            case 22: return [3 /*break*/, 27];
            case 23:
                // Group Energy is Consuming
                console.log("Group energy is Consuming");
                _d = 0, groupMembers_5 = groupMembers;
                _e.label = 24;
            case 24:
                if (!(_d < groupMembers_5.length)) return [3 /*break*/, 27];
                user = groupMembers_5[_d];
                return [4 /*yield*/, dbClient.dailyNotification.update({
                        where: {
                            user_id: user.user_id
                        },
                        data: {
                            daily_rewards: {
                                increment: groupReward
                            },
                            consuming_count: {
                                increment: 1
                            }
                        }
                    })];
            case 25:
                _e.sent();
                _e.label = 26;
            case 26:
                _d++;
                return [3 /*break*/, 24];
            case 27: 
            // Update Group Energy
            return [4 /*yield*/, dbClient.groups.update({
                    where: {
                        group_id: groupId
                    },
                    data: gupdate
                })];
            case 28:
                // Update Group Energy
                _e.sent();
                return [3 /*break*/, 30];
            case 29:
                console.log("Group ".concat(group.group_name, " does not reach the minimum users"));
                _e.label = 30;
            case 30: return [2 /*return*/];
        }
    });
}); };
var queryGroupNames = function (dbClient, queue) { return __awaiter(void 0, void 0, void 0, function () {
    var groups, _i, groups_1, group;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, dbClient.groups.findMany({})];
            case 1:
                groups = _a.sent();
                for (_i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
                    group = groups_1[_i];
                    queue.add(QUERY_USERS_PER_GROUP, {
                        group_id: group.group_id
                    }, __assign({}, scheduling_1.RESILIENCE_OPTS))["catch"](function (e) {
                        console.log("Error while trying to add a ".concat(QUERY_USERS_PER_GROUP));
                    });
                }
                return [2 /*return*/];
        }
    });
}); };
