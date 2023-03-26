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
var express_1 = require("express");
var jwt_simple_1 = __importDefault(require("jwt-simple"));
var jwt_1 = require("../jwt");
var bcrypt_1 = __importDefault(require("bcrypt"));
var messaging_1 = require("firebase-admin/messaging");
// a bcrypt configuration
var saltRounds = 10;
var createTokenResponseForUser = function (user, groupMember) {
    var payload = {
        user_id: user.user_id
    };
    var route = '';
    if (groupMember) {
        route = '/home';
    }
    else {
        route = '/groupmgmt';
    }
    var tokenResponse = {
        token: jwt_simple_1["default"].encode(payload, (0, jwt_1.jwtConfig)().jwtSecret),
        route: route
    };
    return tokenResponse;
};
function makeRouter(client, authenticateUser, sendMail, jobQueue, uploads, firebaseAdmin) {
    var _this = this;
    var router = (0, express_1.Router)();
    // authorize yourself
    // Get a token, from an email and password
    // TODO: share the route magic string with nanogrid.
    router.post('/sign_in', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input, username, password, user, groupMember, signInResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = req.body;
                    // early exit if not passing required fields
                    if (!input.username || !input.password) {
                        res.status(400).json({
                            message: 'email and password are required fields'
                        });
                        return [2 /*return*/];
                    }
                    username = input.username, password = input.password;
                    return [4 /*yield*/, client.users.findFirst({
                            where: {
                                username: username
                            }
                        })
                        // important, compare the hashed version of the
                        // password that was given, with the hashed password
                        // that has been stored in the database
                    ];
                case 1:
                    user = _a.sent();
                    if (!user) return [3 /*break*/, 6];
                    return [4 /*yield*/, bcrypt_1["default"].compare(password, user.password)];
                case 2:
                    if (!_a.sent()) return [3 /*break*/, 4];
                    return [4 /*yield*/, client.groupMembers.findFirst({
                            where: {
                                user_id: user.user_id
                            }
                        })];
                case 3:
                    groupMember = _a.sent();
                    signInResponse = createTokenResponseForUser(user, groupMember);
                    // res.cookie('jwt', signInResponse, {
                    //   httpOnly: true,
                    //   maxAge: 24 * 60 * 60 * 1000
                    // })
                    res.json(signInResponse);
                    return [3 /*break*/, 5];
                case 4:
                    res.status(400).json({
                        message: 'bad password'
                    });
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    res.status(404).json({
                        message: 'no user was found with that email'
                    });
                    _a.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    }); });
    // Upload Logo
    router.post('/upload_logo', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input;
        return __generator(this, function (_a) {
            input = req.body;
            res.status(400).json({
                message: "this is just a test"
            });
            return [2 /*return*/];
        });
    }); });
    // Creates a new group
    router.post('/new_group', authenticateUser, uploads.array("files"), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input, img, groupRec, groupLogo, groupInfo, createGroupsArgs, group, member, createGroupMemberArgs, groupMember, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = req.body;
                    img = req.files[0];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, client.groups.findFirst({
                            where: {
                                group_name: input.group_name
                            }
                        })];
                case 2:
                    groupRec = _a.sent();
                    groupLogo = img.path;
                    groupInfo = {
                        group_name: input.group_name,
                        min_users: parseInt(input.min_users),
                        max_users: parseInt(input.max_users),
                        reward_start_balance: parseInt(input.reward_start_balance),
                        group_logo: img.originalname
                    };
                    if (!!groupRec) return [3 /*break*/, 5];
                    createGroupsArgs = {
                        data: __assign({}, groupInfo)
                    };
                    return [4 /*yield*/, client.groups.create(createGroupsArgs)
                        // The group admin will automatically be a mamber of the group.
                    ];
                case 3:
                    group = _a.sent();
                    member = {
                        user_id: req.user.user_id,
                        group_id: group.group_id
                    };
                    createGroupMemberArgs = {
                        data: __assign({}, member)
                    };
                    return [4 /*yield*/, client.groupMembers.create(createGroupMemberArgs)
                        // Update
                    ];
                case 4:
                    groupMember = _a.sent();
                    // Update
                    client.users.update({
                        where: {
                            user_id: req.user.user_id
                        },
                        data: {
                            group_id: group.group_id
                        }
                    }).then(function (value) {
                    })["catch"](function (e) {
                        console.log(e);
                        res.status(500).json({
                            message: 'there was a server error while updating your password'
                        });
                    });
                    res.json({
                        message: 'New group and member has been created'
                    });
                    return [3 /*break*/, 6];
                case 5:
                    // IF group exist, return 400 error.
                    res.status(400).json({
                        message: "Group name exist!"
                    });
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    console.log('unexpected error', e_1);
                    res.status(400).json({
                        message: e_1.message
                    });
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); });
    // Get Group Info
    router.get('/get_group_info', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input, gInfo, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = req.body;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client.groups.findFirst({
                            where: {
                                group_id: req.user.group_id
                            }
                        })];
                case 2:
                    gInfo = _a.sent();
                    res.json(gInfo);
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.log('unexpected error', e_2);
                    res.status(400).json({
                        message: e_2.message
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Creates a new group
    router.post('/join_group', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input, group, mg, numMembers, gdata, createGroupMemberArgs, groupMember, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = req.body;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, client.groups.findFirst({
                            where: {
                                group_name: input.group_name
                            }
                        })];
                case 2:
                    group = _a.sent();
                    if (!group) return [3 /*break*/, 10];
                    return [4 /*yield*/, client.groupMembers.findFirst({
                            where: {
                                user_id: req.user.user_id
                            }
                        })];
                case 3:
                    mg = _a.sent();
                    if (!!mg) return [3 /*break*/, 8];
                    return [4 /*yield*/, client.groupMembers.count({
                            where: {
                                group_id: group.group_id
                            }
                        })];
                case 4:
                    numMembers = _a.sent();
                    if (!(numMembers < group.max_users)) return [3 /*break*/, 6];
                    gdata = {
                        user_id: req.user.user_id,
                        group_id: group.group_id
                    };
                    client.users.update({
                        where: {
                            user_id: req.user.user_id
                        },
                        data: {
                            group_id: group.group_id
                        }
                    }).then(function (value) {
                    })["catch"](function (e) {
                        console.log(e);
                        res.status(500).json({
                            message: 'there was a server error while updating your password'
                        });
                    });
                    createGroupMemberArgs = {
                        data: __assign({}, gdata)
                    };
                    return [4 /*yield*/, client.groupMembers.create(createGroupMemberArgs)];
                case 5:
                    groupMember = _a.sent();
                    res.json({
                        message: 'Member has been added to the group'
                    });
                    return [3 /*break*/, 7];
                case 6:
                    res.status(404).json({
                        message: 'Group has reached the maximum users'
                    });
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    res.status(404).json({
                        message: 'User is already a member of a group'
                    });
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    // Group name does not exist.
                    res.status(404).json({
                        message: 'Group name does not exist.'
                    });
                    return [2 /*return*/];
                case 11: return [3 /*break*/, 13];
                case 12:
                    e_3 = _a.sent();
                    console.log('unexpected error', e_3);
                    res.status(400).json({
                        message: e_3.message
                    });
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    }); });
    // sign up / register (create a user)
    // hash their password along the way for secure storage
    router.post('/', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var hashedPassword, input, e_4, userInfo, createUserArgs, user, daily, signUpResponse, e_5;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    input = req.body;
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    if (!input.password)
                        throw new Error('password is a required field');
                    if (typeof input.password !== 'string')
                        throw new Error('password must be a string');
                    return [4 /*yield*/, bcrypt_1["default"].hash(input.password, saltRounds)];
                case 2:
                    hashedPassword = _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_4 = _d.sent();
                    res.status(400).json({
                        message: e_4.message
                    });
                    return [2 /*return*/];
                case 4:
                    delete input.password;
                    userInfo = {
                        username: input.username,
                        password: hashedPassword,
                        email_address: input.email,
                        retailer: input.retailer,
                        meter_hardware: input.meter_hardware,
                        is_group_admin: 0,
                        group_id: 0
                    };
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 8, , 9]);
                    createUserArgs = {
                        data: __assign(__assign({}, userInfo), { fronius_info: {
                                create: {
                                    fronius_userid: input.fronius_userid,
                                    fronius_password: input.fronius_password,
                                    fronius_accesskey_id: input.fronius_accesskey_id,
                                    fronius_accesskey_value: input.fronius_accesskey_value,
                                    fronius_device_id: input.fronius_device_id
                                }
                            } })
                    };
                    return [4 /*yield*/, client.users.create(createUserArgs)
                        // Create daily notification table.
                    ];
                case 6:
                    user = _d.sent();
                    return [4 /*yield*/, client.dailyNotification.create({
                            data: {
                                user_id: user.user_id,
                                daily_rewards: 0,
                                balanced_count: 0,
                                producing_count: 0,
                                consuming_count: 0
                            }
                        })
                        // success!
                    ];
                case 7:
                    daily = _d.sent();
                    signUpResponse = createTokenResponseForUser(user, null);
                    res.json(signUpResponse);
                    return [2 /*return*/];
                case 8:
                    e_5 = _d.sent();
                    console.log("meta target: ".concat((_a = e_5 === null || e_5 === void 0 ? void 0 : e_5.meta) === null || _a === void 0 ? void 0 : _a.target));
                    if (((_b = e_5 === null || e_5 === void 0 ? void 0 : e_5.meta) === null || _b === void 0 ? void 0 : _b.target) === 'email_address_UNIQUE') {
                        res.status(400).json({
                            message: 'Email address already taken'
                        });
                    }
                    else if (((_c = e_5 === null || e_5 === void 0 ? void 0 : e_5.meta) === null || _c === void 0 ? void 0 : _c.target) === 'username_unique') {
                        res.status(400).json({
                            message: 'Username already taken!'
                        });
                    }
                    else {
                        console.log('unexpected error', e_5);
                        res.status(400).json({
                            message: 'Unexpected Error occured!'
                        });
                    }
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); });
    router.get('/me', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            user = req.user;
            delete user.password;
            res.json(user);
            return [2 /*return*/];
        });
    }); });
    // Get Collections Info
    router.get('/my_collections', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var collections, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.nftCollections.findMany({
                            where: {
                                user_id: req.user.user_id
                            }
                        })];
                case 1:
                    collections = _a.sent();
                    res.json(collections);
                    return [3 /*break*/, 3];
                case 2:
                    e_6 = _a.sent();
                    console.log('unexpected error', e_6);
                    res.status(400).json({
                        message: e_6.message
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Get store Info
    router.get('/stores', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var stores, e_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, client.nftStore.findMany({})];
                case 1:
                    stores = _a.sent();
                    res.json(stores);
                    return [3 /*break*/, 3];
                case 2:
                    e_7 = _a.sent();
                    console.log('unexpected error', e_7);
                    res.status(400).json({
                        message: e_7.message
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    router.post('/buy', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input, store, collection, createCollectionArgs, createdCollection, deleteStore, newIOEN, e_8;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    input = req.body;
                    console.log("input: ".concat(input));
                    return [4 /*yield*/, client.nftStore.findFirst({
                            where: {
                                store_id: input.store_id
                            }
                        })];
                case 1:
                    store = _d.sent();
                    console.log(store);
                    if (req.user.rewards_points < store.item_price) {
                        console.log("Insufficient IEON Balance");
                        res.status(400).json({
                            message: 'Insufficient IOEN Balance.'
                        });
                        return [2 /*return*/];
                    }
                    collection = {
                        items: store.items,
                        description: store.description,
                        item_price: store.item_price,
                        user_id: req.user.user_id
                    };
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 6, , 7]);
                    createCollectionArgs = {
                        data: __assign({}, collection)
                    };
                    return [4 /*yield*/, client.nftCollections.create(createCollectionArgs)];
                case 3:
                    createdCollection = _d.sent();
                    if (!createdCollection) return [3 /*break*/, 5];
                    return [4 /*yield*/, client.nftStore["delete"]({
                            where: {
                                store_id: input.store_id
                            }
                        })];
                case 4:
                    deleteStore = _d.sent();
                    if (deleteStore) {
                        newIOEN = req.user.rewards_points - store.item_price;
                        // Update IOEN balance if success
                        client.users.update({
                            where: {
                                user_id: req.user.user_id
                            },
                            data: {
                                rewards_points: newIOEN
                            }
                        }).then(function (value) {
                        })["catch"](function (e) {
                            console.log(e);
                            res.status(500).json({
                                message: 'there was a server error while updating your password'
                            });
                        });
                        res.json({
                            message: 'Successful!'
                        });
                    }
                    _d.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    e_8 = _d.sent();
                    console.log("meta target: ".concat((_a = e_8 === null || e_8 === void 0 ? void 0 : e_8.meta) === null || _a === void 0 ? void 0 : _a.target));
                    if (((_b = e_8 === null || e_8 === void 0 ? void 0 : e_8.meta) === null || _b === void 0 ? void 0 : _b.target) === 'email_address_UNIQUE') {
                        res.status(400).json({
                            message: 'Email address already taken'
                        });
                    }
                    else if (((_c = e_8 === null || e_8 === void 0 ? void 0 : e_8.meta) === null || _c === void 0 ? void 0 : _c.target) === 'username_unique') {
                        res.status(400).json({
                            message: 'Username already taken!'
                        });
                    }
                    else {
                        console.log('unexpected error', e_8);
                        res.status(400).json({
                            message: 'Unexpected Error occured!'
                        });
                    }
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    router.post('/set_fcm_token', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var input;
        return __generator(this, function (_a) {
            input = req.body;
            // Check if token is valid or null
            try {
                if (!input.fcm_token)
                    throw new Error('FCM token is a required field');
            }
            catch (e) {
                console.log("Throws an ERRRORRRRR");
                res.status(400).json({
                    message: e.message
                });
                return [2 /*return*/];
            }
            // Update user fcm token
            client.users.update({
                where: {
                    user_id: req.user.user_id
                },
                data: {
                    fcm_token: input.fcm_token
                }
            }).then(function (value) {
            })["catch"](function (e) {
                console.log(e);
                res.status(500).json({
                    message: 'there was a server error while updating your password'
                });
            });
            return [2 /*return*/];
        });
    }); });
    router.get('/send_notif', authenticateUser, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
        var fcmToken, message;
        return __generator(this, function (_a) {
            fcmToken = req.user.fcm_token;
            message = {
                notification: {
                    title: "Nanogrid",
                    body: "Congratulations You have been rewarded!"
                },
                token: fcmToken
            };
            (0, messaging_1.getMessaging)().send(message)
                .then(function (response) {
                console.log("sent notif success: ", response);
            })["catch"](function (e) {
                console.log('error sending message: ', e);
            });
            res.status(200).json({
                message: "test notification"
            });
            return [2 /*return*/];
        });
    }); });
    return router;
}
exports["default"] = makeRouter;
