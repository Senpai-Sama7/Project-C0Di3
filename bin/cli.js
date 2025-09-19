#!/usr/bin/env node

// Auto-load .gitsensei as env if present
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const gitsenseiPath = path.join(process.cwd(), '.gitsensei');
if (fs.existsSync(gitsenseiPath)) {
  dotenv.config({ path: gitsenseiPath });
}

require('dotenv/config');
process.env.TS_NODE_PREFER_TS_EXTS = process.env.TS_NODE_PREFER_TS_EXTS || 'true';
require('ts-node/register');
const { GemmaAgent } = require('../gemma3n:4B-agent');
const { ToolRegistry } = require('../tools/tool-registry');
const readline = require('readline');
const { spawn } = require('child_process');

// Import TypeScript modules (assuming they're compiled or using ts-node)
let AuthService, AuthMiddleware, CAGService, EventBus, Logger, ShortcutService;

try {
  // Try to import TypeScript modules
  const tsNode = require('ts-node');
  tsNode.register();

  const { AuthService: AuthServiceClass } = require('../services/auth-service.ts');
  const { AuthMiddleware: AuthMiddlewareClass } = require('../middleware/auth-middleware.ts');
  const { CAGService: CAGServiceClass } = require('../services/cag-service.ts');
  const { EventBus: EventBusClass } = require('../events/event-bus.ts');
  const { Logger: LoggerClass } = require('../utils/logger.ts');
  const { ShortcutService: ShortcutServiceClass } = require('../services/shortcut-service.ts');

  AuthService = AuthServiceClass;
  AuthMiddleware = AuthMiddlewareClass;
  CAGService = CAGServiceClass;
  EventBus = EventBusClass;
  Logger = LoggerClass;
  ShortcutService = ShortcutServiceClass;
} catch (error) {
  console.error('Failed to load TypeScript modules:', error.message);
  process.exit(1);
}

// Production configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set. Application cannot start.');
  process.exit(1);
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const PRODUCTION_CONFIG = {
  jwtSecret: JWT_SECRET,
  jwtExpiration: 24 * 60 * 60, // 24 hours
  maxFailedAttempts: 5,
  lockoutDuration: 30, // 30 minutes
  sessionTimeout: 60, // 60 minutes
  passwordMinLength: 8,
  requireMFA: false,
  auditLogRetention: 90 // 90 days
};

if (!ADMIN_PASSWORD) {
  console.error('FATAL ERROR: ADMIN_PASSWORD environment variable is not set. Application cannot start.');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < PRODUCTION_CONFIG.passwordMinLength) {
  console.error(`FATAL ERROR: ADMIN_PASSWORD must be at least ${PRODUCTION_CONFIG.passwordMinLength} characters long.`);
  process.exit(1);
}

class EnhancedCLI {
  constructor() {
    this.eventBus = new EventBus();
    this.logger = new Logger('EnhancedCLI');
    this.authService = new AuthService(this.eventBus, PRODUCTION_CONFIG);
    this.authMiddleware = new AuthMiddleware(this.authService, this.eventBus);
    this.shortcutService = new ShortcutService(this.eventBus);
    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;
    this.naturalLanguageMode = true;
  }

  /**
   * Start the enhanced CLI with natural language as primary interface
   */
  async start() {
    console.log('🤖 Core Agent - Natural Language Cybersecurity Assistant');
    console.log('======================================================');
    console.log('💬 Natural language is the primary interface');
    console.log('🔧 Technical shortcuts available for power users');
    console.log('');

    // Check for quick authentication via environment
    // Note: Advanced/Sensei mode authentication bypass has been removed.
    // Specific privileged operations should require explicit authentication if needed.
    if (process.env.CORE_USER && process.env.CORE_PASS) {
      const authResult = await this.authService.authenticate(
          process.env.CORE_USER,
          process.env.CORE_PASS
        );
        if (authResult.success) {
          this.currentUser = authResult.user;
          this.currentSession = authResult.session;
          this.isAuthenticated = true;
          console.log(`✅ Authenticated as ${authResult.user.username}`);
        }
      }

      // If not authenticated, prompt for login
      if (!this.isAuthenticated) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          console.error('❌ Authentication failed. Exiting.');
          process.exit(1);
        }
      }
    }

    // Start the main CLI loop
    await this.mainLoop();
  }

  /**
   * Authenticate user
   */
  async authenticate() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    try {
      console.log('🔐 Authentication Required');
      console.log('==========================');

      const username = await question('Username: ');
      const password = await question('Password: ');

      rl.close();

      console.log('🔍 Authenticating...');

      const result = await this.authService.authenticate(username, password);

      if (result.success && result.user && result.token) {
        this.currentUser = result.user;
        this.currentSession = result.session;
        this.isAuthenticated = true;

        console.log('✅ Authentication successful');
        console.log(`👤 Welcome, ${result.user.username} (${result.user.role})`);

        // Log successful authentication
        await this.authMiddleware.logAuthEvent(
          { user: result.user, session: result.session, permissions: [] },
          'LOGIN_SUCCESS',
          'cli',
          { username: result.user.username }
        );

        return { success: true };
      } else {
        console.log('❌ Authentication failed');
        return { success: false, error: result.error };
      }

    } catch (error) {
      rl.close();
      console.error('❌ Authentication error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Main CLI loop with natural language and shortcuts
   */
  async mainLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    console.log('');
    console.log('💬 Natural Language Interface');
    console.log('============================');
    console.log('💡 Type your request naturally. Examples:');
    console.log('   "Check system health"');
    console.log('   "Scan my network for vulnerabilities"');
    console.log('   "Explain SQL injection attacks"');
    console.log('   "Start a learning mission"');
    console.log('   "Analyze recent security logs"');
    console.log('');
    console.log('🔧 Technical Shortcuts:');
    console.log('   health, scan, explain, learn, logs, tools, query, stats');
    console.log('   help - Show all shortcuts');
    console.log('   shortcuts - List available shortcuts');
    console.log('   mode - Toggle between natural language and technical mode');
    console.log('');
    console.log('📝 Commands:');
    console.log('   logout - Logout and re-authenticate');
    console.log('   exit/quit - Exit the system');
    console.log('');

    while (true) {
      try {
        const input = await question('🤖 Enter your request: ');

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          await this.logout();
          break;
        }

        if (input.toLowerCase() === 'logout') {
          await this.logout();
          console.log('🔐 Please authenticate again:');
          const authResult = await this.authenticate();
          if (!authResult.success) {
            console.error('❌ Authentication failed. Exiting.');
            break;
          }
          continue;
        }

        if (input.toLowerCase() === 'help') {
          console.log(this.shortcutService.getHelp());
          continue;
        }

        if (input.toLowerCase() === 'shortcuts') {
          this.showShortcuts();
          continue;
        }

        if (input.toLowerCase() === 'mode') {
          this.toggleMode();
          continue;
        }

        // Process the request with intelligent parsing
        await this.processRequest(input);

      } catch (error) {
        console.error('❌ Error:', error.message);
        this.logger.error('CLI error', error);
      }
    }

    rl.close();
    console.log('👋 Goodbye!');
  }

  /**
   * Process user request with intelligent parsing
   */
  async processRequest(input) {
    const startTime = Date.now();

    try {
      // Log the request
      await this.authMiddleware.logAuthEvent(
        { user: this.currentUser, session: this.currentSession, permissions: [] },
        'CLI_REQUEST',
        'cli',
        { input: input.substring(0, 100) }
      );

      // First, check if it's a technical shortcut
      const shortcut = this.shortcutService.findShortcut(input.split(' ')[0]);

      if (shortcut) {
        // Execute shortcut
        const args = input.split(' ').slice(1);
        const result = await this.shortcutService.executeShortcut(shortcut.name, args, {
          user: this.currentUser,
          session: this.currentSession
        });

        if (result.success) {
          console.log(`🔧 Executed shortcut: ${shortcut.name}`);
          console.log(`📝 Command: ${shortcut.command} ${args.join(' ')}`);
          console.log('✅ Shortcut completed successfully');
        } else {
          console.log(`❌ Shortcut failed: ${result.error}`);
        }
      } else {
        // Process as natural language
        const result = await this.processNaturalLanguage(input);
        console.log(result);
      }

      // Log successful execution
      const duration = Date.now() - startTime;
      await this.authMiddleware.logAuthEvent(
        { user: this.currentUser, session: this.currentSession, permissions: [] },
        'CLI_REQUEST_SUCCESS',
        'cli',
        { input: input.substring(0, 100), duration }
      );

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      await this.authMiddleware.logAuthEvent(
        { user: this.currentUser, session: this.currentSession, permissions: [] },
        'CLI_REQUEST_ERROR',
        'cli',
        { input: input.substring(0, 100), duration, error: error.message }
      );

      throw error;
    }
  }

  /**
   * Process natural language input
   */
  async processNaturalLanguage(input) {
    const lowerInput = input.toLowerCase();

    // Check for common patterns and map to shortcuts
    if (lowerInput.includes('health') || lowerInput.includes('status') || lowerInput.includes('check system')) {
      return await this.executeShortcut('health');
    }

    if (lowerInput.includes('scan') || lowerInput.includes('nmap') || lowerInput.includes('network')) {
      // Extract target from input
      const targetMatch = input.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
      const target = targetMatch ? targetMatch[0] : 'localhost';
      return await this.executeShortcut('scan', [target]);
    }

    if (lowerInput.includes('explain') || lowerInput.includes('what is') || lowerInput.includes('how to')) {
      const concept = input.replace(/explain\s+|what\s+is\s+|how\s+to\s+/i, '').trim();
      return await this.executeShortcut('explain', [concept]);
    }

    if (lowerInput.includes('learn') || lowerInput.includes('training') || lowerInput.includes('mission')) {
      return await this.executeShortcut('learn');
    }

    if (lowerInput.includes('logs') || lowerInput.includes('audit') || lowerInput.includes('analyze')) {
      return await this.executeShortcut('logs');
    }

    if (lowerInput.includes('tools') || lowerInput.includes('list') || lowerInput.includes('available')) {
      return await this.executeShortcut('tools');
    }

    if (lowerInput.includes('query') || lowerInput.includes('search') || lowerInput.includes('find')) {
      const query = input.replace(/query\s+|search\s+|find\s+/i, '').trim();
      return await this.executeShortcut('query', [query]);
    }

    if (lowerInput.includes('stats') || lowerInput.includes('statistics') || lowerInput.includes('metrics')) {
      return await this.executeShortcut('stats');
    }

    // Default response for unrecognized natural language
    return `🤖 I understand you said: "${input}"\n💡 Try using natural language like:\n   - "Check system health"\n   - "Scan my network"\n   - "Explain SQL injection"\n   - "Start learning"\n   - "Show available tools"\n\n🔧 Or use shortcuts: health, scan, explain, learn, logs, tools, query, stats`;
  }

  /**
   * Execute a shortcut with proper error handling
   */
  async executeShortcut(name, args = []) {
    try {
      const result = await this.shortcutService.executeShortcut(name, args, {
        user: this.currentUser,
        session: this.currentSession
      });

      if (result.success) {
        return `✅ ${result.shortcut.description}\n📝 Executed: ${result.shortcut.command} ${args.join(' ')}`;
      } else {
        return `❌ Failed to execute ${name}: ${result.error}`;
      }
    } catch (error) {
      return `❌ Error executing ${name}: ${error.message}`;
    }
  }

  /**
   * Show available shortcuts
   */
  showShortcuts() {
    console.log('🔧 Available Shortcuts');
    console.log('=====================');

    const categories = ['system', 'security', 'tools', 'learning', 'custom'];

    for (const category of categories) {
      const shortcuts = this.shortcutService.getShortcutsByCategory(category);
      if (shortcuts.length > 0) {
        console.log(`\n📁 ${category.toUpperCase()}`);
        console.log('-'.repeat(category.length + 8));

        for (const shortcut of shortcuts) {
          console.log(`  ${shortcut.name}`);
          if (shortcut.aliases.length > 0) {
            console.log(`    Aliases: ${shortcut.aliases.join(', ')}`);
          }
          console.log(`    Description: ${shortcut.description}`);
          if (shortcut.examples.length > 0) {
            console.log(`    Examples: ${shortcut.examples.join(', ')}`);
          }
          console.log('');
        }
      }
    }
  }

  /**
   * Toggle between natural language and technical mode
   */
  toggleMode() {
    this.naturalLanguageMode = !this.naturalLanguageMode;
    console.log(`🔄 Mode switched to: ${this.naturalLanguageMode ? 'Natural Language' : 'Technical Shortcuts'}`);

    if (this.naturalLanguageMode) {
      console.log('💬 Natural language is now the primary interface');
      console.log('💡 Type naturally: "Check system health", "Scan my network", etc.');
    } else {
      console.log('🔧 Technical shortcuts are now the primary interface');
      console.log('💡 Use shortcuts: health, scan, explain, learn, logs, tools, query, stats');
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    if (this.currentSession) {
      await this.authService.logout(this.currentSession.id);
    }

    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;

    console.log('👋 Logged out successfully');
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const stats = {
      authenticated: this.isAuthenticated,
      user: this.currentUser ? this.currentUser.username : 'none',
      role: this.currentUser ? this.currentUser.role : 'none',
      sessionActive: this.currentSession ? this.currentSession.isActive : false,
      naturalLanguageMode: this.naturalLanguageMode,
      shortcutsAvailable: this.shortcutService.getStats().total,
      timestamp: new Date().toISOString()
    };

    return stats;
  }
}

// Start the CLI
async function main() {
  try {
    const cli = new EnhancedCLI();
    await cli.start();
  } catch (error) {
    console.error('❌ CLI startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main();
}
