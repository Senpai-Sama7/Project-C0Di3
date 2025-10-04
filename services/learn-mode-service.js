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
exports.LearnModeService = void 0;
class LearnModeService {
    constructor(client, logger, eventBus) {
        this.missions = new Map();
        this.userProgress = new Map();
        this.client = client;
        this.logger = logger;
        this.eventBus = eventBus;
        this.initializeMissions();
    }
    initializeMissions() {
        // Initialize built-in training missions
        const missions = [
            {
                id: 'reconnaissance-basics',
                title: 'Reconnaissance Fundamentals',
                description: 'Learn the basics of information gathering and reconnaissance techniques.',
                difficulty: 'beginner',
                category: 'red-team',
                objectives: [
                    'Understand passive reconnaissance techniques',
                    'Learn about OSINT gathering',
                    'Practice network enumeration',
                    'Identify target services and versions'
                ],
                hints: [
                    'Start with passive techniques to avoid detection',
                    'OSINT tools can provide valuable information without direct contact',
                    'Port scanning should be done carefully to avoid triggering alarms'
                ],
                solution: 'Complete reconnaissance involves both passive and active techniques, starting with OSINT and progressing to careful active enumeration.',
                estimatedTime: 45,
                prerequisites: [],
                tools: ['nmap', 'osquery', 'whois'],
                simulationData: {
                    targetNetwork: '192.168.1.0/24',
                    openPorts: [22, 80, 443, 3389],
                    services: ['SSH', 'HTTP', 'HTTPS', 'RDP']
                }
            },
            {
                id: 'network-monitoring',
                title: 'Network Monitoring and Analysis',
                description: 'Learn to monitor network traffic and detect suspicious activities.',
                difficulty: 'intermediate',
                category: 'blue-team',
                objectives: [
                    'Set up network monitoring',
                    'Analyze traffic patterns',
                    'Detect anomalies',
                    'Create detection rules'
                ],
                hints: [
                    'Baseline normal traffic patterns first',
                    'Look for unusual connection patterns',
                    'Monitor for known attack signatures'
                ],
                solution: 'Effective network monitoring requires understanding normal patterns and using both signature-based and anomaly-based detection.',
                estimatedTime: 60,
                prerequisites: ['networking-fundamentals'],
                tools: ['snort', 'wireshark', 'osquery'],
                simulationData: {
                    normalTraffic: 'baseline_traffic.pcap',
                    maliciousTraffic: 'attack_traffic.pcap'
                }
            },
            {
                id: 'log-analysis',
                title: 'Security Log Analysis',
                description: 'Master the art of analyzing security logs to identify threats.',
                difficulty: 'intermediate',
                category: 'blue-team',
                objectives: [
                    'Understand different log types',
                    'Learn log correlation techniques',
                    'Identify attack patterns in logs',
                    'Create effective queries'
                ],
                hints: [
                    'Time correlation is crucial for understanding attack sequences',
                    'Look for patterns across multiple log sources',
                    'Failed login attempts often indicate brute force attacks'
                ],
                solution: 'Log analysis requires understanding the context of different log types and correlating events across multiple sources.',
                estimatedTime: 75,
                prerequisites: ['system-administration'],
                tools: ['grep', 'awk', 'splunk', 'elastic'],
                simulationData: {
                    sampleLogs: 'security_logs.txt',
                    attackPatterns: ['brute_force', 'sql_injection', 'xss']
                }
            }
        ];
        missions.forEach(mission => {
            this.missions.set(mission.id, mission);
        });
        this.logger.info(`Initialized ${missions.length} training missions`);
    }
    startMission(userId, missionId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const mission = this.missions.get(missionId);
            if (!mission) {
                throw new Error(`Mission ${missionId} not found`);
            }
            const userProgress = this.getUserProgress(userId);
            // Check prerequisites
            if (mission.prerequisites.length > 0) {
                const missingPrereqs = mission.prerequisites.filter(prereq => !userProgress.completedMissions.includes(prereq));
                if (missingPrereqs.length > 0) {
                    throw new Error(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
                }
            }
            userProgress.currentMission = missionId;
            userProgress.lastActivity = new Date();
            this.userProgress.set(userId, userProgress);
            this.eventBus.emit('learn-mode.mission.started', {
                userId,
                missionId,
                mission,
                options
            });
            let response = `🎯 **Mission Started: ${mission.title}**\n\n`;
            response += `📋 **Description:** ${mission.description}\n\n`;
            response += `⏱️ **Estimated Time:** ${mission.estimatedTime} minutes\n`;
            response += `🔧 **Tools:** ${mission.tools.join(', ')}\n\n`;
            response += `📝 **Objectives:**\n`;
            mission.objectives.forEach((objective, index) => {
                response += `${index + 1}. ${objective}\n`;
            });
            if (options.enableHints) {
                response += `\n💡 **Hints Available:** Use 'hint' command to get guidance\n`;
            }
            if (options.simulationMode) {
                response += `\n🔒 **Simulation Mode:** All actions will be simulated safely\n`;
            }
            response += `\n🚀 **Ready to begin? Type 'proceed' to start the mission!**`;
            return response;
        });
    }
    provideFeedback(userId, action, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const userProgress = this.getUserProgress(userId);
            if (!userProgress.currentMission) {
                return "No active mission. Start a mission first with 'start-mission <mission-id>'.";
            }
            const mission = this.missions.get(userProgress.currentMission);
            if (!mission) {
                return "Current mission not found.";
            }
            // Use LLM to provide contextual feedback
            const prompt = `
    You are an expert cybersecurity instructor providing feedback on a student's action.

    Mission: ${mission.title}
    Mission Description: ${mission.description}
    Student Action: ${action}
    Result: ${JSON.stringify(result)}

    Provide constructive feedback that:
    1. Explains what the student did well
    2. Identifies areas for improvement
    3. Suggests next steps
    4. Provides educational context
    5. Maintains an encouraging tone

    Keep the response concise but informative.
    `;
            try {
                const feedback = yield this.client.generate({ prompt });
                this.eventBus.emit('learn-mode.feedback.provided', {
                    userId,
                    missionId: userProgress.currentMission,
                    action,
                    result,
                    feedback
                });
                return `📚 **Instructor Feedback:**\n\n${feedback}`;
            }
            catch (error) {
                this.logger.error('Error generating feedback:', error);
                return "Unable to generate feedback at this time. Please try again later.";
            }
        });
    }
    provideHint(userId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const userProgress = this.getUserProgress(userId);
            if (!userProgress.currentMission) {
                return "No active mission. Start a mission first with 'start-mission <mission-id>'.";
            }
            const mission = this.missions.get(userProgress.currentMission);
            if (!mission) {
                return "Current mission not found.";
            }
            // Select appropriate hint based on context or progress
            let hint = '';
            if (mission.hints.length > 0) {
                // For now, return a random hint, but this could be made more intelligent
                const randomHint = mission.hints[Math.floor(Math.random() * mission.hints.length)];
                hint = randomHint;
            }
            if (context) {
                // Use LLM to provide contextual hint
                const prompt = `
      You are a cybersecurity instructor providing a hint for a student.

      Mission: ${mission.title}
      Mission Description: ${mission.description}
      Student Context: ${context}
      Available Hints: ${mission.hints.join('; ')}

      Provide a helpful hint that guides the student without giving away the complete solution.
      Make it educational and encourage learning.
      `;
                try {
                    hint = yield this.client.generate({ prompt });
                }
                catch (error) {
                    this.logger.error('Error generating contextual hint:', error);
                    // Fallback to predefined hint
                }
            }
            this.eventBus.emit('learn-mode.hint.provided', {
                userId,
                missionId: userProgress.currentMission,
                context,
                hint
            });
            return `💡 **Hint:** ${hint}`;
        });
    }
    completeMission(userId, submissionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const userProgress = this.getUserProgress(userId);
            if (!userProgress.currentMission) {
                return "No active mission to complete.";
            }
            const mission = this.missions.get(userProgress.currentMission);
            if (!mission) {
                return "Current mission not found.";
            }
            // Evaluate submission using LLM
            const prompt = `
    You are evaluating a student's completion of a cybersecurity training mission.

    Mission: ${mission.title}
    Objectives: ${mission.objectives.join('; ')}
    Student Submission: ${JSON.stringify(submissionData)}
    Expected Solution: ${mission.solution}

    Evaluate the submission and provide:
    1. A score out of 100
    2. Whether the mission is complete (true/false)
    3. Detailed feedback on what was done well
    4. Areas for improvement
    5. Next recommended steps

    Return as JSON: {"score": number, "complete": boolean, "feedback": string, "improvements": string[], "nextSteps": string[]}
    `;
            try {
                const evaluationResponse = yield this.client.generate({ prompt });
                const evaluation = JSON.parse(evaluationResponse);
                if (evaluation.complete) {
                    // Mark mission as completed
                    if (!userProgress.completedMissions.includes(userProgress.currentMission)) {
                        userProgress.completedMissions.push(userProgress.currentMission);
                    }
                    userProgress.score += evaluation.score;
                    userProgress.currentMission = undefined;
                    userProgress.lastActivity = new Date();
                    this.userProgress.set(userId, userProgress);
                    this.eventBus.emit('learn-mode.mission.completed', {
                        userId,
                        missionId: mission.id,
                        score: evaluation.score,
                        evaluation
                    });
                    let response = `🎉 **Mission Completed: ${mission.title}**\n\n`;
                    response += `📊 **Score:** ${evaluation.score}/100\n\n`;
                    response += `📚 **Feedback:** ${evaluation.feedback}\n\n`;
                    if (evaluation.nextSteps && evaluation.nextSteps.length > 0) {
                        response += `🔜 **Next Steps:**\n`;
                        evaluation.nextSteps.forEach((step, index) => {
                            response += `${index + 1}. ${step}\n`;
                        });
                    }
                    return response;
                }
                else {
                    let response = `📋 **Mission In Progress**\n\n`;
                    response += `📊 **Current Score:** ${evaluation.score}/100\n\n`;
                    response += `📚 **Feedback:** ${evaluation.feedback}\n\n`;
                    if (evaluation.improvements && evaluation.improvements.length > 0) {
                        response += `🔧 **Areas for Improvement:**\n`;
                        evaluation.improvements.forEach((improvement, index) => {
                            response += `${index + 1}. ${improvement}\n`;
                        });
                    }
                    return response;
                }
            }
            catch (error) {
                this.logger.error('Error evaluating mission submission:', error);
                return "Unable to evaluate submission at this time. Please try again later.";
            }
        });
    }
    listMissions(difficulty, category) {
        const missions = Array.from(this.missions.values());
        const filteredMissions = missions.filter(mission => {
            if (difficulty && mission.difficulty !== difficulty)
                return false;
            if (category && mission.category !== category)
                return false;
            return true;
        });
        if (filteredMissions.length === 0) {
            return "No missions found matching your criteria.";
        }
        let response = "📚 **Available Training Missions:**\n\n";
        filteredMissions.forEach(mission => {
            response += `**${mission.id}** - ${mission.title}\n`;
            response += `  📊 Difficulty: ${mission.difficulty}\n`;
            response += `  🎯 Category: ${mission.category}\n`;
            response += `  ⏱️ Time: ${mission.estimatedTime} minutes\n`;
            response += `  📝 ${mission.description}\n\n`;
        });
        return response;
    }
    getProgress(userId) {
        var _a;
        const progress = this.getUserProgress(userId);
        let response = `📊 **Your Learning Progress:**\n\n`;
        response += `🎯 **Completed Missions:** ${progress.completedMissions.length}\n`;
        response += `📈 **Total Score:** ${progress.score}\n`;
        response += `🏆 **Achievements:** ${progress.achievements.length}\n`;
        response += `📚 **Learning Path:** ${progress.learningPath}\n\n`;
        if (progress.currentMission) {
            const mission = this.missions.get(progress.currentMission);
            response += `🔄 **Current Mission:** ${(_a = mission === null || mission === void 0 ? void 0 : mission.title) !== null && _a !== void 0 ? _a : 'Unknown'}\n`;
        }
        if (progress.completedMissions.length > 0) {
            response += `✅ **Completed Missions:**\n`;
            progress.completedMissions.forEach(missionId => {
                var _a;
                const mission = this.missions.get(missionId);
                response += `  - ${(_a = mission === null || mission === void 0 ? void 0 : mission.title) !== null && _a !== void 0 ? _a : missionId}\n`;
            });
        }
        return response;
    }
    getUserProgress(userId) {
        if (!this.userProgress.has(userId)) {
            this.userProgress.set(userId, {
                userId,
                completedMissions: [],
                score: 0,
                achievements: [],
                learningPath: 'beginner',
                lastActivity: new Date()
            });
        }
        return this.userProgress.get(userId);
    }
    explainConcept(concept) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = `
    You are an expert cybersecurity instructor. Explain the following concept in a clear, educational way:

    Concept: ${concept}

    Provide:
    1. A clear definition
    2. Why it's important in cybersecurity
    3. Common use cases or scenarios
    4. Examples or analogies to help understanding
    5. Related concepts to explore

    Keep the explanation accessible but comprehensive.
    `;
            try {
                const explanation = yield this.client.generate({ prompt });
                return `📚 **Concept Explanation: ${concept}**\n\n${explanation}`;
            }
            catch (error) {
                this.logger.error('Error explaining concept:', error);
                return "Unable to explain concept at this time. Please try again later.";
            }
        });
    }
}
exports.LearnModeService = LearnModeService;
