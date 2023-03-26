"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.makeApp = void 0;
// load in environment variables from .env file
var dotenv = __importStar(require("dotenv"));
dotenv.config();
var express_1 = __importDefault(require("express"));
var passport_1 = __importDefault(require("passport"));
var expo_server_sdk_1 = __importDefault(require("expo-server-sdk"));
var cors_1 = __importDefault(require("cors"));
var multer_1 = __importDefault(require("multer"));
var energy_schema_1 = require("energy-schema");
var jwt_1 = __importDefault(require("./jwt"));
var users_1 = __importDefault(require("./routes/users"));
var mail_1 = require("./tools/mail");
var scheduler_1 = require("./scheduler");
var path_1 = __importDefault(require("path"));
var port = process.env.PORT || 3000;
var loggerMiddleware = function (req, _res, next) {
    if (process.env.NODE_ENV === 'development') {
        console.log('received request to path: ', req.path);
    }
    next();
};
var middlewares = [loggerMiddleware];
function makeApp(dbClient, mail, jobQueue, firebaseAdmin, portOverride) {
    return __awaiter(this, void 0, void 0, function () {
        var app, authenticateRoute, storage, fileFilter, uploads, portToUse, server;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app = (0, express_1["default"])();
                    app.use(express_1["default"].static('public'));
                    // json parser for (req.body)
                    app.use(express_1["default"].json());
                    app.use((0, cors_1["default"])({
                        origin: '*'
                    }));
                    // other custom middleware
                    app.use.apply(app, middlewares);
                    authenticateRoute = (0, jwt_1["default"])(dbClient);
                    app.use(passport_1["default"].initialize());
                    storage = multer_1["default"].diskStorage({
                        destination: function (req, file, callback) {
                            callback(null, __dirname + "/uploads");
                        },
                        filename: function (req, file, callback) {
                            callback(null, file.originalname);
                        }
                    });
                    fileFilter = function (req, file, cb) {
                        if (file.mimetype === 'image/jpeg' ||
                            file.mimetype === 'image/png' ||
                            file.mimetype === 'image/webp') {
                            cb(null, true);
                        }
                        else {
                            cb(new Error("Not an image! Please upload an image"));
                        }
                    };
                    app.use('/logos', express_1["default"].static('src/uploads'));
                    uploads = (0, multer_1["default"])({
                        storage: storage,
                        limits: {
                            fileSize: 5241288,
                            files: 1
                        },
                        fileFilter: fileFilter
                    });
                    // mount routers
                    app.use('/users', (0, users_1["default"])(dbClient, authenticateRoute, mail, jobQueue, uploads, firebaseAdmin));
                    portToUse = portOverride || port;
                    server = app.listen(portToUse);
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            server.on('listening', resolve);
                            server.on('error', reject);
                        })];
                case 1:
                    _a.sent();
                    console.log("RedGrid API listening at http://localhost:".concat(portToUse));
                    return [2 /*return*/, {
                            app: app,
                            server: server
                        }];
            }
        });
    });
}
exports.makeApp = makeApp;
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var dbClient, USE_MAIL, mail, firebaseAdmin, serviceAccount, jobQueue, expo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dbClient = new energy_schema_1.PrismaClient();
                    USE_MAIL = process.env.USE_MAIL;
                    if (USE_MAIL === 'true') {
                        mail = mail_1.sendMail;
                    }
                    else {
                        mail = mail_1.mockSendMail;
                    }
                    firebaseAdmin = require("firebase-admin");
                    serviceAccount = require(path_1["default"].join(__dirname, '../nanogrid-fcm.json'));
                    firebaseAdmin.initializeApp({
                        credential: firebaseAdmin.credential.cert(serviceAccount)
                    });
                    if (!process.env.JEST_WORKER_ID) {
                        expo = new expo_server_sdk_1["default"]({ accessToken: process.env.EXPO_ACCESS_TOKEN });
                        jobQueue = (0, scheduler_1.setupQueue)(dbClient, expo, mail, firebaseAdmin);
                    }
                    return [4 /*yield*/, makeApp(dbClient, mail, jobQueue, firebaseAdmin)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports["default"] = start;
