# Skill Bank - Meta-Tool for AI Agents

[![Tests](https://img.shields.io/badge/tests-95%20passing-brightgreen)](https://github.com/MauricioPerera/Skill-Bank)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

> **Dynamic capability discovery and execution system for AI agents**

A production-ready platform that enables AI agents to discover and execute capabilities dynamically through semantic search and knowledge graphs, with built-in RAG integration and execution tracking.

---

## 🌟 What is Skill Bank?

Skill Bank is a **meta-tool system** that allows AI agents to:

- 🔍 **Discover capabilities** via semantic search (no hardcoded tool lists)
- 🧠 **Access context** from indexed documents (RAG integration)
- 📊 **Learn from executions** (analytics & tracking foundation)
- 🔗 **Understand relationships** between capabilities (knowledge graph)

### The Problem

Traditional AI agents have **static tool lists**:
- ❌ Agent needs to know all tools upfront
- ❌ No context on how to use them
- ❌ No understanding of dependencies
- ❌ Can't learn from usage patterns

### The Solution

**Skill Bank provides dynamic capability discovery:**
- ✅ Agent discovers tools/skills via semantic search
- ✅ Rich context (instructions, best practices, examples)
- ✅ Knowledge graph suggests workflows
- ✅ Execution tracking enables learning

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/MauricioPerera/Skill-Bank.git
cd Skill-Bank
npm install
```

### Run the Complete Demo

```bash
# 1. Register tools and skills
npm run demo:skillbank

# 2. Index example documents
npm run index:demo-docs

# 3. Run complete MVP demo
npm run demo:complete
```

### Test the System

```bash
# Run all tests (fast - 30s)
npm run test:skills

# With optional RAG integration tests
ENABLE_RAG_TESTS=true npm run test:skills
```

---

## 🎯 Core Concepts

### 1. Tools (Atomic Capabilities)

Generic, reusable executables:

```yaml
# data/tools/http_request.yaml
id: http_request
name: HTTP Request
type: tool
category: http
description: Makes HTTP requests to any external endpoint
```

### 2. Skills (Structured Knowledge)

Four types of skills:

- **Tool-based**: Orchestrate external tools
- **Instructional**: Use LLM native capabilities
- **Context-aware**: Query indexed documents via RAG
- **Hybrid**: Combine all of the above

```yaml
# data/skills/answer_from_terms.yaml
id: answer_from_terms
name: Answer from Terms and Conditions
type: skill
skillType: context_aware
referencesDocuments: [terms_and_conditions, privacy_policy]
```

### 3. RAG Integration

Context-aware skills automatically query your document corpus:

```typescript
const discovery = await skillBank.discover({
  query: "What is the cancellation policy?",
  mode: 'skills'
});

// Returns: "Answer from Terms and Conditions" skill
// Execution retrieves relevant sections from indexed docs
```

---

## 📊 Architecture

### 6-Layer Stack

```
Layer 6: Memory & Learning ⭐ → Personalizes (Roadmap Q4 2025)
Layer 5: Documents 📚       → RAG context (✅ Integrated)
Layer 4: Sub-Agents 🤖      → Delegation (Roadmap Q3 2025)
Layer 3: Credentials 🔐     → Security (Roadmap Q2 2025)
Layer 2: Skills             → Knowledge (✅ Implemented)
Layer 1: Tools              → Execution (✅ Implemented)
```

### Current Implementation (v1.0)

**Layers 1, 2, 5:** Fully implemented
- ✅ 4 atomic tools
- ✅ 13 skills (4 types)
- ✅ RAG integration with hierarchical document search
- ✅ Execution tracking & analytics
- ✅ Knowledge graph with 7 edge types

---

## 🔥 Features

### Dynamic Discovery

```typescript
// Agent doesn't need to know tools upfront
const { skills } = await skillBank.discover({
  query: "verify stripe payments and generate report",
  expandGraph: true
});

// Returns:
// 1. stripe_api_handler (relevance: 94%)
// 2. pdf_report_generator (from graph, complements #1)
```

### RAG-Powered Context

```typescript
// Context-aware skills query indexed documents
const execution = await skillBank.execute({
  targetId: 'answer_from_terms',
  targetType: 'skill',
  input: { query: "Can I get a refund?" }
});

// Returns sections from terms_of_service.md automatically
```

### Execution Tracking

```typescript
// Every execution is logged for analytics
const stats = getExecutionStats();
// {
//   total: 47,
//   byType: { context_aware: 15, tool_based: 25, hybrid: 7 },
//   successRate: 0.94,
//   averageExecutionTime: 234
// }
```

---

## 📚 Documentation

### Quick Start
- **[QUICK_START_PHASE1.md](QUICK_START_PHASE1.md)** - Get started in 5 minutes

### Technical Guides
- **[SKILLBANK.md](SKILLBANK.md)** - Complete overview
- **[SKILLBANK_VISION.md](SKILLBANK_VISION.md)** - v1.0 → v4.0 roadmap
- **[docs/SKILLBANK_SKILL_TYPES.md](docs/SKILLBANK_SKILL_TYPES.md)** - 4 types explained
- **[docs/SKILLBANK_VS_N8N.md](docs/SKILLBANK_VS_N8N.md)** - Comparison with n8n/Make

### Architecture
- **[docs/SKILLBANK_COMPLETE_ARCHITECTURE.md](docs/SKILLBANK_COMPLETE_ARCHITECTURE.md)** - Full stack
- **[docs/SKILLBANK_MEMORY_AND_LEARNING.md](docs/SKILLBANK_MEMORY_AND_LEARNING.md)** - Memory layer design

### Development
- **[QUALITY_GATES.md](QUALITY_GATES.md)** - Testing standards
- **[PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)** - Implementation report
- **[STABILIZATION_SUMMARY.md](STABILIZATION_SUMMARY.md)** - Test stabilization

---

## 🧪 Testing

### Test Coverage

```
Test Files:  4 passed | 1 optional (5)
Tests:       95 passed | 16 optional (111)
Duration:    ~30s
```

**Critical Tests (100% passing):**
- ✅ Unified Store (31 tests)
- ✅ Skill Bank Core (25 tests)
- ✅ E2E Integration (14 tests)
- ✅ Execution Store (25 tests)

**Optional Tests:**
- ⚠️ RAG Integration (16 tests) - Slow, enable with `ENABLE_RAG_TESTS=true`

---

## 🎨 Examples

### Example 1: Discover + Execute

```typescript
import { skillBank } from './src/skills/skillBank.js';

// 1. Discover
const discovery = await skillBank.discover({
  query: 'answer question from documentation',
  mode: 'skills',
  k: 3
});

console.log(discovery.skills[0].skill.name);
// "Answer from Terms and Conditions"

// 2. Execute
const result = await skillBank.execute({
  targetId: discovery.skills[0].skill.id,
  targetType: 'skill',
  input: { query: 'What is the cancellation policy?' }
});

console.log(result.output.context);
// RAG context with relevant sections
```

### Example 2: Via API

```bash
# Start server
npm run server

# Discover skills
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{
    "query": "verify payments in stripe",
    "mode": "skills",
    "expandGraph": true
  }'

# Execute skill
curl -X POST http://localhost:3000/api/skillbank/execute \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "stripe_api_handler",
    "targetType": "skill",
    "input": { "action": "list_customers" }
  }'
```

---

## 🗺️ Roadmap

### v1.0 (Current) ✅
- [x] Tools + Skills architecture
- [x] Semantic discovery
- [x] Knowledge graph
- [x] RAG integration
- [x] Execution tracking
- [x] 95 tests passing

### v2.0 (Q2 2025)
- [ ] Credentials vault
- [ ] Scoped access control
- [ ] Audit trail

### v3.0 (Q3 2025)
- [ ] Sub-agents
- [ ] Delegation
- [ ] Parallel execution

### v4.0 (Q4 2025)
- [ ] Memory & Learning
- [ ] User preferences
- [ ] Pattern detection
- [ ] Personalization

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Add a New Skill

1. Create skill YAML in `data/skills/`
2. Register: `npx tsx src/cli/registerSkill.ts path/to/skill.yaml`
3. Test with discovery and execution

### How to Add a New Tool

1. Create tool YAML in `data/tools/`
2. Register: `npx tsx src/cli/registerTool.ts path/to/tool.yaml`
3. Implement executor in `src/skills/executor/`

---

## 📊 Project Stats

- **Lines of Code:** ~10,000+ (TypeScript)
- **Tests:** 111 (95 critical)
- **Documentation:** 15+ files (~8,000 lines)
- **Skills:** 13 example skills
- **Tools:** 4 atomic tools
- **Indexed Docs:** 155 sections (4 documents)

---

## 🔗 Related Projects

- **[n8n](https://n8n.io)** - Workflow automation (Tools = Nodes, Skills = Workflows)
- **[LangChain](https://langchain.com)** - LLM framework
- **[AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)** - Autonomous agents

### How Skill Bank Differs

| Feature | Skill Bank | n8n | LangChain |
|---------|------------|-----|-----------|
| **For** | AI Agents | Humans | Developers |
| **Discovery** | Semantic search | Manual browse | Hardcoded |
| **Context** | Rich (RAG + instructions) | UI-based | Code-based |
| **Learning** | Analytics + patterns | No | No |
| **Relationships** | Knowledge graph | No | No |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [SQLite](https://www.sqlite.org/) + [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [lowdb](https://github.com/typicode/lowdb)
- [Ollama](https://ollama.ai/) (local embeddings)
- [Vitest](https://vitest.dev/)

Inspired by:
- n8n's workflow approach
- LangChain's tool abstraction
- AutoGPT's autonomous capabilities

---

## 📬 Contact

- **Author:** Mauricio Perera
- **Repository:** [github.com/MauricioPerera/Skill-Bank](https://github.com/MauricioPerera/Skill-Bank)
- **Issues:** [github.com/MauricioPerera/Skill-Bank/issues](https://github.com/MauricioPerera/Skill-Bank/issues)

---

**⭐ If you find this project useful, please star it on GitHub!**

