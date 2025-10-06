# Contributing to Project C0Di3

Thank you for your interest in contributing to Project C0Di3! This guide will help you get started with development, testing, and submitting contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Security](#security)

---

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Report any unacceptable behavior to the maintainers

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Latest stable version
- **TypeScript**: v5.2.2 or higher (installed via npm)

Optional but recommended:
- **Python**: v3.8+ (for Python components)
- **Docker**: For containerized development
- **PostgreSQL**: For database features (can use in-memory alternatives)

### Quick Start

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Project-C0Di3.git
   cd Project-C0Di3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.template .env
   # Edit .env and set required variables
   # Minimum: MEMORY_ENCRYPTION_KEY (32+ characters)
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

---

## Development Setup

### Environment Configuration

Create a `.env` file with the following required variables:

```bash
# Required - Generate with: openssl rand -base64 32
MEMORY_ENCRYPTION_KEY=your-secure-32-character-minimum-key-here

# Optional - Customize as needed
LLM_API_URL=http://localhost:11434
LLM_MODEL=gemma3n:4b
PORT=3000
LOG_LEVEL=debug
```

### IDE Setup

**VS Code** (Recommended):
- Install the "TypeScript" extension
- Install "ESLint" extension
- Install "Prettier" extension
- Enable "Format on Save" in settings

**Configuration files provided**:
- `.vscode/settings.json` - Editor settings
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Testing configuration

---

## Project Structure

```
Project-C0Di3/
├── bin/                    # CLI entry points
├── clients/                # External service clients
├── config/                 # Configuration management
├── context/                # Context managers
├── data/                   # Runtime data (logs, memory, etc.)
├── docs/                   # Documentation
├── events/                 # Event bus system
├── integrations/           # Third-party integrations
├── learning/               # Learning and feedback systems
├── memory/                 # Memory systems
│   └── stores/            # Vector storage implementations
├── middleware/             # Middleware components
├── monitoring/             # Performance monitoring
├── plugins/                # Plugin system
├── reasoning/              # AI reasoning engines
├── scripts/                # Build and deployment scripts
├── services/               # Core services
├── test/                   # Test files
│   ├── reasoning/         # Reasoning engine tests
│   └── utils/             # Utility tests
├── tools/                  # Security tools
│   ├── blue/              # Blue team (defense) tools
│   └── red/               # Red team (offense) tools
└── utils/                  # Utility functions
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Update your fork
git checkout master
git pull upstream master

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

### 2. Make Changes

- Write clean, documented code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/utils/validation.test.ts

# Run tests with coverage
npm test -- --coverage

# Build to check for type errors
npm run build
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new feature X"
```

**Commit message format**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- test/utils/validation.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should validate"
```

### Writing Tests

#### Unit Test Example

```typescript
import { validateEmail } from '../../utils/validation';

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com', 'email')).toBe('user@example.com');
  });

  it('should reject invalid email addresses', () => {
    expect(() => validateEmail('invalid', 'email'))
      .toThrow('email must be a valid email address');
  });
});
```

#### Integration Test Example

```typescript
describe('Memory System Integration', () => {
  let memorySystem: MemorySystem;

  beforeEach(() => {
    memorySystem = new MemorySystem({
      encryptionKey: 'test-key-minimum-32-characters-long'
    });
  });

  it('should store and retrieve memories', async () => {
    await memorySystem.storeMemory('test', { value: 123 });
    const result = await memorySystem.retrieveMemory('test');
    expect(result.value).toBe(123);
  });
});
```

### Test Coverage Goals

- **Minimum**: 70% code coverage
- **Target**: 85% code coverage
- **Ideal**: 95% code coverage

Focus coverage on:
- Core business logic
- Security-critical functions
- Complex algorithms
- Error handling paths

---

## Code Style

### TypeScript Guidelines

1. **Use strong typing** - Avoid `any` types
   ```typescript
   // ❌ Bad
   function process(data: any): any { }

   // ✅ Good
   function process(data: InputData): ProcessedResult { }
   ```

2. **Use interfaces for object shapes**
   ```typescript
   interface UserConfig {
     name: string;
     email: string;
     role: 'admin' | 'user';
   }
   ```

3. **Document complex functions**
   ```typescript
   /**
    * Validates and sanitizes user input
    * @param input - Raw user input
    * @param options - Validation options
    * @returns Sanitized input string
    * @throws ValidationError if input is invalid
    */
   function sanitizeInput(input: string, options: ValidationOptions): string {
     // Implementation
   }
   ```

### General Guidelines

- **Line length**: Maximum 100 characters
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing commas**: Required in multi-line objects/arrays

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserData`)
- **Classes/Interfaces**: PascalCase (`MemorySystem`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files**: kebab-case (`memory-system.ts`)
- **Private members**: prefix with `_` (`_internalCache`)

---

## Submitting Changes

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create a Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the PR template:
   - **Title**: Clear, concise description
   - **Description**: What changes were made and why
   - **Related Issues**: Reference any related issues
   - **Testing**: Describe how you tested the changes
   - **Screenshots**: Include if UI changes were made

### 3. PR Review Process

- Automated CI/CD checks will run
- Maintainers will review your code
- Address any feedback or requested changes
- Once approved, your PR will be merged

### PR Checklist

Before submitting, ensure:
- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] No sensitive data in commits
- [ ] Code follows style guidelines

---

## Security

### Reporting Security Issues

**Do not open public issues for security vulnerabilities!**

Instead:
1. Email security concerns to the maintainers
2. Provide detailed description of the vulnerability
3. Include steps to reproduce if possible
4. Wait for confirmation before public disclosure

### Security Best Practices

When contributing:
- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive configuration
- Validate and sanitize all user inputs
- Follow OWASP security guidelines
- Use security-focused utilities from `utils/validation.ts`

Example:
```typescript
import { sanitizeInput, validateCommandArgs } from '../utils/validation';

// Sanitize user input
const safeInput = sanitizeInput(userInput, { maxLength: 1000 });

// Validate command arguments
const safeArgs = validateCommandArgs(args); // Prevents injection
```

---

## Additional Resources

- [Architecture Documentation](./docs/COMPREHENSIVE_AUDIT_REPORT.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Enhancement Summary](./docs/ENHANCEMENT_SUMMARY.md)

---

## Questions?

- Open a GitHub Discussion for general questions
- Check existing issues for known problems
- Review documentation in the `docs/` directory

---

## License

By contributing to Project C0Di3, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Project C0Di3! 🚀**
