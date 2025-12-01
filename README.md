# Skill Bank

> Dynamic capability discovery for AI agents with built-in memory and learning  
> Tools + Skills + RAG + Memory + Execution Tracking, all in one coherent architecture.

[![CI](https://github.com/MauricioPerera/Skill-Bank/actions/workflows/ci.yml/badge.svg)](https://github.com/MauricioPerera/Skill-Bank/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-128%20passing-brightgreen)](https://github.com/MauricioPerera/Skill-Bank)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Release](https://img.shields.io/github/v/release/MauricioPerera/Skill-Bank)](https://github.com/MauricioPerera/Skill-Bank/releases)

---

## ✨ What is Skill Bank?

Skill Bank is a **capability discovery and execution system** designed for AI agents.

Instead of hard-coding tools and workflows, Skill Bank gives agents a **semantic, evolvable catalog of capabilities**:

- **Tools** = *atomic, generic actions* (HTTP, DB, file, code execution).
- **Skills** = *recipes and workflows* that describe **how** and **when** to use those tools.
- **RAG + Documents** = *context-aware skills* that answer questions based on real documents.
- **Memory & Learning** = *user preferences* that evolve with usage patterns. ⭐ NEW in v1.5
- **Execution Store** = *analytics & tracking* for what is being executed, how often, and with what results.

Think of it as a cross between:

- an automation platform (like n8n / Make),
- a semantic search engine,
- and a skill router for LLM-based agents.

But designed **for AI agents**, not humans clicking on UIs.

---

## 🔍 Core Ideas

### 1. Tools vs Skills (The "Golden Rule")

Skill Bank enforces a strict separation between:

- **Tools** → *Layer 1: Executable Capabilities*  
  - Atomic and generic (e.g. `http_request`, `db_query`, `file_write`, `code_executor`).
  - No domain-specific knowledge.
  - Maximal reusability.

- **Skills** → *Layer 2: Structured Knowledge and Recipes*  
  - Encode *how and when* to use tools.
  - Domain-specific logic, validations, best practices, and anti-patterns.
  - Rich descriptions → higher embedding diversity.

This "Golden Rule" prevents the classic anti-pattern:

> Creating dozens of near-identical tools (`create_user`, `read_user`, `update_user`, …)  
> which destroy vector diversity and confuse semantic retrieval.

Instead:

> **1 atomic tool → N specific skills → high vector diversity → better RAG.**

---

### 2. Layered Architecture

Skill Bank is architected in 6 conceptual layers:

1. **Tools** – Atomic, generic executable capabilities. ✅
2. **Skills** – Structured knowledge and workflows. ✅
3. **Credentials** – Secure, scoped access to external systems. *(planned Q2 2025)*
4. **Sub-Agents** – Specialized agents for domains/tasks. *(planned Q3 2025)*
5. **Documents (RAG)** – Knowledge base for context-aware skills. ✅
6. **Memory & Learning** – User-aware personalization and pattern learning. ✅ ⭐

Current implementation (`v1.5`):

- Layers **1, 2, 5, 6** fully implemented and tested.
- Execution Store with user tracking and analytics.
- 128 tests passing with quality gates enforced.

---

## 🚀 Features in v1.5

### Core Features

- ✅ **Semantic skill discovery**
  - Find the right skill from natural language queries.
  - Uses embeddings + RAG to match skills and documents.

- ✅ **Context-aware skills**
  - Skills that directly query a RAG index over real documents.
  - Example: answer from Terms of Service, Privacy Policy, API docs.

- ✅ **End-to-end RAG integration**
  - From documents → embeddings → semantic search → skill execution.

### Memory & Learning ⭐ NEW in v1.5

- ✅ **User preference learning**
  - System automatically learns user behavior patterns.
  - Detects consistent parameter usage (70% threshold).
  - Creates personalized defaults after 5 executions.

- ✅ **Auto-fill behavior**
  - Missing parameters filled with learned preferences.
  - Only applies preferences with high confidence (>= 70%).
  - Respects explicit user input (never overrides).

- ✅ **Per-user memory**
  - Each user has independent preference profiles.
  - Anonymous mode available (no learning).
  - Complete execution history tracking per user.

- ✅ **Transparency & analytics**
  - Confidence scores for all preferences.
  - Logs show which preferences were applied.
  - User statistics and pattern detection.

### Testing & Quality

- ✅ **Execution Store**
  - Track executions by user, skill, status, duration.
  - User-specific analytics and statistics.
  - Foundation for memory and learning.

- ✅ **Example documents**
  - `terms_of_service.md`
  - `privacy_policy.md`
  - `product_catalog.md`
  - `api_documentation.md`
  - 155 sections indexed for RAG.

- ✅ **Robust testing & quality gates**
  - 144 tests total (128 critical + 16 optional).
  - 100% critical tests passing.
  - Memory & Learning covered by 33 new tests.
  - RAG integration tests runnable via flag.

- ✅ **Open Source**
  - MIT License.
  - Full documentation of phases, quality gates, and architecture.

---

## 🏗️ Project Structure

Key files and directories:

```text
data/docs/
  ├─ terms_of_service.md
  ├─ privacy_policy.md
  ├─ product_catalog.md
  └─ api_documentation.md

examples/
  ├─ demo-complete-mvp.ts
  ├─ demo-memory-learning.ts        ⭐ NEW
  ├─ index-demo-docs.ts
  └─ validate-context-aware-skills.ts

src/skills/
  ├─ executor/
  │   ├─ skillExecutor.ts          (Memory integration)
  │   └─ ragIntegration.ts
  ├─ memory/                        ⭐ NEW
  │   ├─ patternLearning.ts
  │   └─ preferenceApplication.ts
  ├─ store/
  │   ├─ executionStore.ts         (User tracking)
  │   └─ preferenceStore.ts         ⭐ NEW
  ├─ types/
  │   └─ memory.ts                  ⭐ NEW
  └─ __tests__/
      ├─ executionStore.test.ts
      ├─ memoryAndLearning.test.ts  ⭐ NEW (24 tests)
      ├─ memoryIntegration.test.ts  ⭐ NEW (9 tests)
      ├─ ragIntegration.test.ts
      └─ integration.test.ts

README.md                           (this file)
RELEASE_NOTES_v1.0.md
PHASE4_SUMMARY.md                   ⭐ NEW
QUALITY_GATES.md
STABILIZATION_SUMMARY.md
```

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone https://github.com/MauricioPerera/Skill-Bank.git
cd Skill-Bank
npm install
```

### 2. Run the complete demo (MVP)

```bash
npm run demo:complete
```

This runs an end-to-end demonstration of:

* Skill discovery
* RAG-based context retrieval
* Skill execution with real documents

### 3. Run the Memory & Learning demo ⭐

```bash
npm run demo:memory
```

This demonstrates:

* Automatic preference learning
* Auto-fill behavior
* Per-user personalization
* Pattern detection and confidence scores

**Output:**
```
🎓 Learned 3 preferences for Alice:
   • format: "PDF" (confidence: 100%)
   • recipients: "team@company.com" (confidence: 100%)

✨ AUTO-FILLED PARAMETERS:
   • format: "PDF" (100% confident)

💡 System learned from Alice's behavior!
```

### 4. Index example documents

```bash
npm run index:demo-docs
```

This will:

* Chunk and embed 4 example documents.
* Store 155 sections and their embeddings.
* Make them available for context-aware skills.

### 5. Validate context-aware skills

```bash
npm run validate:context-aware
```

This runs 5 scenarios that validate:

* Semantic discovery of the right skill.
* Retrieval of the correct document + section.
* Correct context propagation into skill outputs.

---

## 🧪 Testing & Quality Gates

Skill Bank comes with a serious testing setup.

### Fast test suite (default)

```bash
npm run test:skills
```

* Runs **128 critical tests** in ~100 seconds.
* Covers:
  * Unified Store (DB + vector search)
  * Skill Bank core (discovery + execution)
  * E2E Integration
  * Execution Store (with user tracking)
  * Memory & Learning (33 tests) ⭐
  * Preference learning and application

These tests **must** all pass for any change to be considered valid.

### Optional RAG tests (slow, integration-heavy)

```bash
ENABLE_RAG_TESTS=true npm run test:skills
```

* Enables 16 additional RAG integration tests.
* Use these before releases or deep changes to RAG behavior.
* They involve heavier setup (documents, embeddings, etc.).

Quality gates are documented in `QUALITY_GATES.md`.

---

## 📚 Documentation

Main docs included in the repo:

* `README.md` *(this file)* – project overview.
* `RELEASE_NOTES_v1.0.md` – detailed release notes for v1.0.
* `PHASE1_COMPLETE.md` – real-doc validation report.
* `PHASE2_SUMMARY.md` – testing expansion report.
* `PHASE4_SUMMARY.md` – Memory & Learning implementation report. ⭐
* `STABILIZATION_SUMMARY.md` – test stabilization & quality gates.
* `QUALITY_GATES.md` – definition of critical vs optional tests.
* `QUICK_START_PHASE1.md` – quick start for document-based RAG demo.
* `PUBLISH_TO_GITHUB.md` – publishing notes.
* `LICENSE` – MIT.

---

## 🧠 Roadmap

Skill Bank is designed as a **multi-phase, multi-layer platform**.

### v1.0-1.5 – Foundation (current) ✅

* ✅ Tools + Skills core.
* ✅ RAG + documents.
* ✅ Execution Store with user tracking.
* ✅ Memory & Learning foundation.
* ✅ Testing + quality gates (128 tests).
* ✅ Example docs & demos.

### v2.x – Security & Credentials (Q2 2025)

* 🔒 Credentials store for external APIs.
* 🔐 Scoped access per-skill.
* 🧾 Full audit logging.

### v3.x – Sub-Agents & Specialization (Q3 2025)

* 🤖 Domain-specific sub-agents.
* 🧠 Parallel execution and delegation.
* 📈 Better scaling for complex workflows.

### v4.x – Advanced Learning (Q4 2025)

* 📊 Temporal pattern detection.
* 🪄 Collaborative filtering ("users like you prefer...").
* 💡 Proactive suggestions and explanations.
* 🎯 Multi-value preferences (top-N).

---

## 💡 Example Use Cases

### 1. Reducing User Friction

**Before:**
```typescript
// User must provide all parameters every time
execute('generate_report', {
  format: 'PDF',
  recipients: 'team@company.com',
  dateRange: 'last_month'
});
```

**After 5 executions with Skill Bank:**
```typescript
// System auto-fills learned preferences
execute('generate_report', {
  dateRange: 'last_month'  // Only new parameter needed
});
// Auto-filled: format='PDF', recipients='team@company.com'
```

**Result:** 60% fewer inputs required.

### 2. Per-User Personalization

```typescript
// Alice prefers PDF reports
// Bob prefers Excel reports
// System learns and applies automatically

// Alice's execution
execute('generate_report', {}, { userId: 'alice' })
// → format='PDF' (learned)

// Bob's execution
execute('generate_report', {}, { userId: 'bob' })
// → format='Excel' (learned)
```

### 3. Analytics & Insights

```typescript
getUserStats('alice');
// { total: 50, successRate: 0.94, avgExecutionTime: 230ms }

getPreferenceStats();
// { totalPreferences: 150, avgConfidence: 0.87 }
```

---

## 🤝 Contributing

Contributions are welcome!

Basic guidelines:

1. Fork the repository.
2. Create a feature branch.
3. Add or update tests for your changes.
4. Run `npm run test:skills` (critical tests must pass).
5. Submit a PR with a clear description.

### Development conventions:

* TypeScript, strict mode.
* ESM modules.
* Vitest for testing.
* 100% critical test pass rate.

### Adding a new skill:

1. Define the skill description and metadata.
2. Register it in the Skill Bank.
3. Add a test that:
   * discovers the skill from a natural language query, and/or
   * validates the execution behavior.

See `CONTRIBUTING.md` for more details *(coming soon)*.

---

## 📊 Project Stats

```
Code:           ~12,000 lines of TypeScript
Tests:          144 total (128 critical passing)
Test Runtime:   ~100s
Documentation:  17+ files (~12,000 lines)
Skills:         13 example skills
Tools:          4 atomic tools
Documents:      4 indexed (155 sections)
Memory Tests:   33 tests (100% passing)
```

---

## 🏆 What Makes Skill Bank Different?

| Feature | Skill Bank | Traditional Approaches |
|---------|------------|------------------------|
| **Discovery** | Semantic search | Manual lookup |
| **Memory** | Learns user patterns | Static configuration |
| **Context** | RAG-powered skills | Hardcoded responses |
| **Testing** | 128 critical tests | Minimal coverage |
| **Architecture** | 6-layer platform | Ad-hoc design |
| **Evolution** | Built-in learning | Manual updates |

---

## 📜 License

Skill Bank is released under the **MIT License**.

See the [`LICENSE`](./LICENSE) file for details.

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

- **Repository:** [github.com/MauricioPerera/Skill-Bank](https://github.com/MauricioPerera/Skill-Bank)
- **Issues:** [Report bugs or request features](https://github.com/MauricioPerera/Skill-Bank/issues)
- **Author:** Mauricio Perera

---

**⭐ If you find Skill Bank useful, please star it on GitHub!**

**Built with ❤️ for the AI agent community**
