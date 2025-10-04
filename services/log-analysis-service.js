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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogAnalysisService = void 0;
class LogAnalysisService {
    constructor(logAnalyzerClient, auditService, logger) {
        this.logAnalyzerClient = logAnalyzerClient;
        this.auditService = auditService;
        this.logger = logger;
    }
    analyzeAuditLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info('Fetching audit logs for analysis...');
                const logs = yield this.auditService.queryLogs({});
                if (logs.length === 0) {
                    this.logger.info('No audit logs to analyze.');
                    return [];
                }
                this.logger.info(`Analyzing ${logs.length} log entries...`);
                const analysisResult = yield this.logAnalyzerClient.analyze(logs);
                this.logger.info('Log analysis complete.');
                // You can add more logic here to handle the results,
                // like sending alerts or storing the results.
                return analysisResult;
            }
            catch (error) {
                this.logger.error('Error during log analysis:', error);
                throw error;
            }
        });
    }
}
exports.LogAnalysisService = LogAnalysisService;
