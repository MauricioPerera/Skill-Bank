# Contributing to Skill Bank

First off, thanks for considering contributing to Skill Bank! 🎉

This document provides guidelines for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Adding New Skills](#adding-new-skills)
- [Adding New Tools](#adding-new-tools)

---

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Code samples** if applicable

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:
- **Use case**: Why is this enhancement needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: What other approaches did you think about?

### 🔧 Pull Requests

We actively welcome pull requests for:
- Bug fixes
- New skills or tools
- Documentation improvements
- Performance improvements
- Test coverage improvements

---

## Development Setup

### Prerequisites

- **Node.js** >= 18.x (20.x recommended)
- **npm** >= 9.x
- **Git**

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Skill-Bank.git
cd Skill-Bank

# Install dependencies
npm install

# Run tests to ensure everything works
npm run test:skills
```

### Project Structure

```
Skill-Bank/
├── src/skills/           # Core Skill Bank code
│   ├── executor/         # Execution engines
│   ├── memory/           # Memory & Learning
│   ├── store/            # Data persistence
│   ├── types/            # TypeScript types
│   └── __tests__/        # Test suites
├── examples/             # Demo scripts
├── data/                 # Skills, tools, documents
│   ├── skills/           # Skill YAML files
│   ├── tools/            # Tool YAML files
│   └── docs/             # Example documents
└── docs/                 # Documentation
```

---

## Pull Request Process

### 1. Fork & Create Branch

```bash
# Fork the repo on GitHub, then:
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Follow the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all critical tests (must pass)
npm run test:skills

# If changing RAG functionality, run optional tests
ENABLE_RAG_TESTS=true npm run test:skills

# Run demos to ensure they still work
npm run demo:complete
npm run demo:memory
```

### 4. Commit

Use clear, descriptive commit messages:

```bash
# Good examples:
git commit -m "feat: add multi-value preference support"
git commit -m "fix: prevent duplicate preference creation"
git commit -m "docs: update Memory & Learning section"
git commit -m "test: add edge cases for pattern detection"

# Follow Conventional Commits format:
# feat: new feature
# fix: bug fix
# docs: documentation
# test: tests
# refactor: code refactoring
# perf: performance improvement
```

### 5. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- **Clear title** following Conventional Commits
- **Description** explaining what and why
- **Testing details** showing tests pass
- **Screenshots** if UI changes

### 6. Code Review

- Address review feedback promptly
- Keep PR scope focused (one feature/fix per PR)
- Be responsive to questions

---

## Coding Standards

### TypeScript

- **Strict mode**: All code must pass TypeScript strict checks
- **ESM modules**: Use `import/export`, not `require`
- **Types**: Avoid `any`, prefer explicit types
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants

### Code Style

```typescript
// ✅ Good
export async function executeSkill(
  skillId: string,
  input: Record<string, any>,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  // Implementation
  
  return {
    success: true,
    output,
    metadata: {
      executionTime: Date.now() - startTime
    }
  };
}

// ❌ Bad
export async function executeSkill(skillId:string,input:any,options?:any):Promise<any>{
  let startTime=Date.now()
  // Implementation
  return {success:true,output:output,metadata:{executionTime:Date.now()-startTime}}
}
```

### Documentation

- **JSDoc comments** for public functions
- **Inline comments** for complex logic
- **README updates** for new features

Example:
```typescript
/**
 * Apply user preferences to input parameters
 * 
 * Only fills parameters that are NOT explicitly provided by the user.
 * Returns both the final parameters and metadata about what was applied.
 * 
 * @param userId - User identifier
 * @param skillId - Skill identifier
 * @param input - User-provided input parameters
 * @param config - Learning configuration (optional)
 * @returns Result with final parameters and applied preferences
 */
export function applyUserPreferences(
  userId: string,
  skillId: string,
  input: Record<string, any>,
  config?: PreferenceLearningConfig
): PreferenceApplicationResult {
  // Implementation
}
```

---

## Testing Requirements

### Critical Tests (Must Pass)

All PRs must maintain 100% pass rate for critical tests:

```bash
npm run test:skills
```

Expected output:
```
Test Files  6 passed | 1 skipped (7)
Tests       128 passed | 16 skipped (144)
```

### Writing Tests

Follow existing test patterns in `src/skills/__tests__/`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('My New Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Arrange
    const input = { /* ... */ };

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

### Test Coverage

- **Unit tests**: For isolated functions
- **Integration tests**: For component interactions
- **E2E tests**: For complete flows

Aim for:
- New features: 80%+ coverage
- Bug fixes: Test that reproduces the bug + fix

---

## Adding New Skills

Skills are defined in YAML files in `data/skills/`.

### 1. Create Skill YAML

```yaml
# data/skills/my_new_skill.yaml
id: my_new_skill
name: My New Skill
type: skill
category: productivity
skillType: tool_based  # or: instructional, context_aware, hybrid
overview: Brief description of what this skill does
instructions: |
  Detailed step-by-step instructions for executing this skill.
  
  1. First step
  2. Second step
  3. etc.

usesTools:
  - tool_id_1
  - tool_id_2

parameters:
  - name: param1
    type: string
    required: true
    description: Description of parameter

outputs:
  - name: result
    type: object
    description: What this skill returns

examples:
  - input:
      param1: "example value"
    output:
      result: { success: true }
    explanation: What this example demonstrates
```

### 2. Register the Skill

```bash
npx tsx src/cli/registerSkill.ts data/skills/my_new_skill.yaml
```

### 3. Add Tests

```typescript
// src/skills/__tests__/myNewSkill.test.ts
import { describe, it, expect } from 'vitest';
import { skillBank } from '../skillBank.js';

describe('My New Skill', () => {
  it('should be discoverable', async () => {
    const result = await skillBank.discover({
      query: 'do something specific',
      mode: 'skills'
    });

    const found = result.skills.find(s => s.skill.id === 'my_new_skill');
    expect(found).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await skillBank.execute({
      targetId: 'my_new_skill',
      targetType: 'skill',
      input: { param1: 'test' }
    });

    expect(result.success).toBe(true);
  });
});
```

---

## Adding New Tools

Tools are atomic capabilities in `data/tools/`.

### 1. Create Tool YAML

```yaml
# data/tools/my_new_tool.yaml
id: my_new_tool
name: My New Tool
type: tool
category: integration
description: Brief description of what this tool does

parameters:
  - name: action
    type: string
    required: true
    description: Action to perform

outputs:
  - name: result
    type: any
    description: Result of the action
```

### 2. Implement Executor

```typescript
// src/skills/executor/myNewToolExecutor.ts
export async function executeMyNewTool(
  action: string,
  params: Record<string, any>
): Promise<any> {
  // Implementation
  return { success: true, data: /* ... */ };
}
```

### 3. Register the Tool

```bash
npx tsx src/cli/registerTool.ts data/tools/my_new_tool.yaml
```

### 4. Add Tests

Similar to skills, add comprehensive tests.

---

## Documentation

When adding features, update:

- **README.md**: If user-facing
- **Inline docs**: JSDoc comments
- **Example scripts**: If applicable
- **Type definitions**: If new types introduced

---

## Questions?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Pull Requests**: For code contributions

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- Project documentation

---

**Thank you for contributing to Skill Bank!** 🎉

Every contribution, no matter how small, makes this project better for everyone.
