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
exports.setupQueue = void 0;
var ioredis_1 = __importDefault(require("ioredis"));
var bullmq_1 = require("bullmq");
var scheduling_1 = require("../tools/scheduling");
var TIMEZONE = 'Australia/Victoria';
var jobHandlers_1 = require("./jobHandlers");
/* Explanation

*/
// https://docs.bullmq.io/
var setupQueue = function (dbClient, expo, mail, firebaseAdmin) {
    var redisUrl = process.env.REDISCLOUD_URL;
    // just use default localhost:6379 as fallback
    var redisConnection = redisUrl ? new ioredis_1["default"](redisUrl) : new ioredis_1["default"]({ maxRetriesPerRequest: null });
    var queueOpts = { connection: redisConnection };
    /*
      Repeatable jobs are just delayed jobs, therefore you also
      need a QueueScheduler instance to schedule the jobs accordingly.
    */
    var QUEUE_NAME = 'nanogrid';
    var jobQueue = new bullmq_1.Queue(QUEUE_NAME, queueOpts);
    var queueScheduler = new bullmq_1.QueueScheduler(QUEUE_NAME, queueOpts);
    // These can be uncommented and run to clean the queue
    jobQueue.drain(true);
    jobQueue.clean(0, 0);
    process.on('beforeExit', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queueScheduler.close()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    var worker = new bullmq_1.Worker(QUEUE_NAME, (0, jobHandlers_1.jobHandler)(dbClient, expo, jobQueue, firebaseAdmin), queueOpts);
    worker.on('failed', function (error) {
        console.error('attempt ' + error.attemptsMade + ':', error.failedReason);
    });
    // Repeat job to query fronius server every 5 minute interval
    setupRepeatingJob(jobQueue, jobHandlers_1.QUERY_GROUP_NAMES, (0, scheduling_1.repeatAtMinutes)('*/5', TIMEZONE), // every 5 minutes
    'successfully scheduled every 5 minutes to query Fronius', 'failed to schedule to query Fronius every 5 minutes', false);
    // Repet job to send a daily push notification to subscibe users.
    setupRepeatingJob(jobQueue, jobHandlers_1.SEND_DAILY_NOTIFICATION, (0, scheduling_1.repeatAtMinutes)('53', TIMEZONE), // every 5 minutes
    'successfully scheduled every day to send daily push notification', 'failed to schedule to send daily push notification', false);
    return jobQueue;
};
exports.setupQueue = setupQueue;
var setupRepeatingJob = function (jobQueue, jobName, atTimes, successMessage, failureMessage, skipResilience) { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, jobQueue.add(jobName, null, __assign({ repeat: atTimes }, (skipResilience ? {} : scheduling_1.RESILIENCE_OPTS)))
                    // log(successMessage)
                ];
            case 1:
                _a.sent();
                // log(successMessage)
                console.log(successMessage);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error(failureMessage, error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
