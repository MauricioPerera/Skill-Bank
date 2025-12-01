# 🎥 Skill Bank - Video Script (For Recording)

> Detailed script for recording a professional video demo

---

## 🎬 Scene 1: Hook (0:00 - 0:30)

**[Screen: GitHub repo page]**

**You:**
> "Most AI agents hardcode their tools and workflows. Add a new capability? Update the list. Change a parameter? Update every call. Users repeat the same inputs every time.
>
> What if your agent could discover capabilities dynamically, learn from documents, and remember what each user prefers?
>
> That's Skill Bank. Let me show you."

**[Transition: Switch to terminal]**

---

## 🎬 Scene 2: Semantic Discovery (0:30 - 2:30)

**[Screen: Terminal, ready to run command]**

**You:**
> "First, let's see semantic discovery in action."

**[Type and run]:**
```bash
npm run demo:complete
```

**[While output runs, narrate]:**

**You:**
> "The agent receives a question: 'How do I cancel my subscription?'
>
> Watch - it's doing semantic search across all available skills...
>
> [Point to output] Here - it found 'answer_from_terms_and_conditions'
>
> This is a context-aware skill, so it queries our RAG engine...
>
> [Point to RAG output] And RAG returns the actual Terms of Service document, section 3.1, with the cancellation policy.
>
> No hardcoded routing. No if-else chains. Just semantic matching and document retrieval."

**[Let output finish]**

**You:**
> "This works because we separate:
> - Tools: atomic capabilities
> - Skills: rich domain knowledge
> - Documents: RAG-indexed content
>
> The agent discovers what it needs, when it needs it."

---

## 🎬 Scene 3: The Magic - Memory & Learning (2:30 - 6:00)

**[Screen: Clear terminal]**

**You:**
> "Now here's where it gets really interesting. Let me show you the Memory & Learning system."

**[Type and run]:**
```bash
npm run demo:memory
```

**[As execution 1-5 run]:**

**You:**
> "Watch this. We're executing a report generation skill five times for a user named Alice.
>
> Each time, we're passing the same parameters:
> - format: PDF
> - recipients: team@company.com
> - dateRange: last_month
>
> The system is observing..."

**[When "Pattern detected!" appears]:**

**You:**
> "And here we go! After 5 executions, the system detected a pattern.
>
> [Read from screen] It learned 3 preferences for Alice:
> - format: PDF - 100% confidence
> - recipients: team@company.com - 100% confidence
> - dateRange: last_month - 100% confidence
>
> These are now Alice's **default preferences**."

**[When execution 6 runs with auto-fill]:**

**You:**
> "Now watch this magic moment...
>
> In this execution, we're **only** providing the date range.
>
> We're NOT providing format or recipients.
>
> [Point to AUTO-FILLED line] But look - the system auto-filled them:
> - format: PDF
> - recipients: team@company.com
>
> It learned from Alice's behavior and filled in the blanks."

**[When Bob's executions start]:**

**You:**
> "And here's the beautiful part. This is Bob, a different user.
>
> Bob prefers Excel reports... sent to managers...
>
> [Point to Bob's learned preferences] And the system learned **Bob's** preferences separately.
>
> Same skill. Personalized behavior per user. Zero code changes."

**[Pause for impact]**

**You:**
> "Let me repeat that: **60% fewer inputs** required after the learning phase.
>
> And if a user explicitly provides a value? That **always** wins. The system never overrides explicit input.
>
> This isn't LLM magic - it's explicit pattern detection, fully tested, completely transparent."

---

## 🎬 Scene 4: Architecture & Tech (6:00 - 7:30)

**[Screen: Switch to docs/ARCHITECTURE.md or draw on screen]**

**You:**
> "So how does this work? Skill Bank has a 6-layer architecture.
>
> [Show or point to layers]
>
> Layer 1: Tools - atomic capabilities like HTTP, DB, file operations
> Layer 2: Skills - recipes that use tools
> Layer 5: Documents - RAG-indexed knowledge base
> Layer 6: Memory & Learning - what you just saw
>
> Layers 3 and 4 - Credentials and Sub-Agents - are coming in v2.0 and v3.0."

**[Switch back to terminal or GitHub]**

**You:**
> "This is all:
> - Tested: 128 tests passing
> - Fast: tests run in about 100 seconds
> - Automated: CI/CD on every PR
> - Documented: 19+ documentation files
> - Open source: MIT License"

---

## 🎬 Scene 5: Call to Action (7:30 - 8:00)

**[Screen: GitHub repo page]**

**You:**
> "If you want to try it:
>
> The repo is github.com/MauricioPerera/Skill-Bank
>
> Clone it, run npm install, and try the demos.
>
> If you're building AI agents and want dynamic discovery, RAG integration, or user memory - give it a try.
>
> I'd love feedback, ideas, and contributions.
>
> Thanks for watching!"

**[End screen with text overlay]:**
```
🌟 Star on GitHub
📖 Read the Docs
🤝 Contribute

github.com/MauricioPerera/Skill-Bank
```

---

## 📝 Script Notes

### Pacing
- Total: 8 minutes
- Speak at ~120-130 words per minute
- Pause 2-3 seconds after key reveals
- Let demo output run (don't rush)

### Emphasis Points
1. "No hardcoded routing"
2. "60% fewer inputs"
3. "100% confidence"
4. "Same skill, personalized per user"
5. "Fully tested"

### Optional B-Roll
- Architecture diagram
- Test suite running
- CI/CD passing
- Code snippets (skill definitions)

---

## 🎨 Visual Enhancements

### Text Overlays (add in editing)
- "Semantic Discovery" @ 0:30
- "Pattern Detection" @ 3:00
- "Auto-Fill Magic ✨" @ 4:00
- "128 Tests Passing" @ 6:30

### Callout Boxes
- Highlight "100% confidence" in terminal
- Circle "AUTO-FILLED PARAMETERS"
- Underline key metrics

---

## 📊 YouTube Optimizations

### Title Options
1. "AI Agents That Learn: Skill Bank v1.5 Demo"
2. "Dynamic Tool Discovery + Memory for AI Agents"
3. "This AI Agent Remembers Your Preferences (Open Source)"

### Description Template
```
Skill Bank v1.5 - AI Agent Platform with Memory & Learning

In this demo, I show:
✅ Semantic skill discovery (no hardcoded lists)
✅ RAG integration with real documents
✅ Memory & Learning that reduces inputs by 60%

🌟 Star on GitHub: https://github.com/MauricioPerera/Skill-Bank
📖 Documentation: [link]
🚀 Release v1.5.0: [link]

Timestamps:
0:00 - Introduction
0:30 - Semantic Discovery Demo
2:30 - Memory & Learning (⭐ must see)
6:00 - Architecture Overview
7:30 - Get Started

Tech Stack: TypeScript, SQLite, RAG, Pattern Detection
Tests: 128 passing | Runtime: ~100s | License: MIT

#AI #MachineLearning #AgenticAI #RAG #OpenSource
```

### Tags
- AI agents
- Machine learning
- RAG
- Semantic search
- TypeScript
- Open source
- LLM
- Tool use
- Agent memory

---

**Ready to record!** 🎬

