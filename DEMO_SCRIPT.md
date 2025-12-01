# 🎬 Skill Bank - Live Demo Script (7-10 minutes)

> Professional demo script for presentations, meetups, calls, and video recordings

---

## 🎯 Demo Objectives

Show in 10 minutes:

1. **Semantic skill discovery** - no hardcoded lists
2. **RAG integration** - answers from real documents
3. **Memory & Learning** - remembers users and auto-fills parameters ⭐

**Perfect for:** Zoom calls, meetups, YouTube videos, conference talks

---

## 📋 Pre-Demo Checklist

Before sharing your screen:

```bash
# Pull latest
git pull origin main

# Install dependencies (if needed)
npm install

# Index demo documents (if not done)
npm run index:demo-docs

# Optional: Quick test
npm run test:skills
```

**Open tabs to have ready:**
- Terminal (for running demos)
- Browser: GitHub repo page
- Browser: Release v1.5.0 page
- Code editor (optional, to show architecture)

---

## 1️⃣ Introduction (1-2 minutes)

**You speaking, no code yet:**

> "Hi everyone, I'm going to show you **Skill Bank** - an open-source platform for dynamic capability discovery in AI agents.
> 
> Instead of hardcoding tools and workflows, Skill Bank uses:
> 
> - **Atomic Tools** (http_request, db_query, etc.)
> - **Rich Skills** with business context
> - **RAG** that provides real documents
> - **Memory & Learning** (v1.5) that remembers user preferences
> 
> Today I'll show you three things:
> 
> 1. Semantic skill discovery
> 2. A skill using RAG over real documents
> 3. How the system learns preferences and auto-fills parameters"

**Key points to emphasize:**
- ✅ Production-ready (128 tests passing)
- ✅ Open source (MIT License)
- ✅ Real RAG (not mock data)
- ✅ Memory & Learning (v1.5 feature)

---

## 2️⃣ Demo 1: Semantic Discovery (2 minutes)

**Share terminal and run:**

```bash
npm run demo:complete
```

**While it runs, narrate:**

> "This demo runs an end-to-end flow. Watch what happens..."

**Point out in the output:**

1. **User query:** "How do I cancel my subscription?"
2. **Skill selected:** `answer_from_terms_and_conditions`
3. **Document retrieved:** `terms_of_service.md`, section 3.1
4. **RAG context:** Actual text from the document

**Key phrases to use:**

> "Here's what's happening:
> 
> 1. System receives a natural language question
> 2. Semantic search finds the most relevant skill
> 3. This 'context-aware' skill calls the RAG engine
> 4. RAG searches real Terms of Service documents
> 5. Returns the exact section with the answer
> 6. Skill provides answer with source citations"

**Close this part with:**

> "This is all tested with 95 critical tests running in ~30 seconds.
> So we can keep adding features without fear of breaking things."

---

## 3️⃣ Demo 2: RAG Direct Access (1-2 minutes)

**Show how someone could use RAG directly:**

```bash
# Start server (if not running)
npm run server

# In another terminal or show curl
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{"query": "What personal data do you collect?", "k": 3}'
```

**Narrate:**

> "This endpoint goes directly to the RAG engine - no skills involved.
> 
> This is useful for:
> - Debugging RAG behavior
> - Comparing RAG-only vs Skills+RAG
> - Building custom integrations"

**Point out:**

- ✅ Sections from `privacy_policy.md`
- ✅ Relevance scores
- ✅ Section titles and hierarchy
- ✅ Source citations

---

## 4️⃣ Demo 3: Memory & Learning ⭐ THE STAR (3-4 minutes)

**This is the highlight. Take your time:**

```bash
npm run demo:memory
```

**Narrate as a story:**

### Part 1: Initial Learning Phase

> "Watch what happens here...
> 
> The system executes a skill called `generate_report` multiple times with different users: Alice and Bob."

**When you see executions 1-5:**

> "Each time, we're passing the same parameters:
> - format: 'PDF'
> - recipients: 'team@company.com'
> - dateRange: 'last_month'
> 
> The system is **observing** these patterns..."

### Part 2: Pattern Detection

**When you see "Learned 3 preferences for Alice":**

> "Here's where it gets interesting!
> 
> The system analyzed Alice's last 5+ executions and detected:
> - She **always** uses format='PDF' (100% confidence)
> - She **always** sends to 'team@company.com' (100% confidence)
> 
> With ≥70% confidence threshold and minimum 5 samples, these become **preferences**."

### Part 3: Auto-Fill Magic ✨

**When you see "AUTO-FILLED PARAMETERS":**

> "Now watch this magic moment...
> 
> In this execution, we only provide: `dateRange: 'this_week'`
> 
> We're **NOT** providing `format` or `recipients`.
> 
> But the system auto-fills them:
> - format='PDF' (learned from Alice)
> - recipients='team@company.com' (learned from Alice)
> 
> **Important:** If Alice explicitly passes a different format tomorrow, her input **always** wins. The system never overrides explicit values."

### Part 4: Per-User Personalization

**When you see Bob's preferences:**

> "And here's the beautiful part:
> 
> Bob has **different** preferences:
> - format='Excel' (he prefers spreadsheets)
> - recipients='managers@company.com' (different audience)
> 
> Same skill, **personalized behavior per user**, zero code changes."

**Close with impact:**

> "This is Layer 6 of the architecture: Memory & Learning.
> 
> It's not LLM magic - it's:
> - ✅ Explicit logic
> - ✅ Fully testable (33 tests for this feature)
> - ✅ Transparent (confidence scores, logs)
> - ✅ Privacy-aware (anonymous mode available)
> 
> **Result:** 60% fewer inputs required after learning phase."

---

## 5️⃣ Closing (1-2 minutes)

**Bring it back to architecture:**

> "So in summary, Skill Bank today implements 4 of the 6 layers I designed:
> 
> ✅ **Layer 1: Tools** - Atomic capabilities
> ✅ **Layer 2: Skills** - Domain knowledge
> ✅ **Layer 5: Documents** - RAG integration
> ✅ **Layer 6: Memory & Learning** - User preferences ⭐
> 
> Coming later:
> 🔐 **Layer 3: Credentials** (v2.0, Q2 2025)
> 🤖 **Layer 4: Sub-Agents** (v3.0, Q3 2025)"

**Show the numbers:**

> "All of this with:
> - 128 critical tests passing (100%)
> - ~100s test runtime
> - CI/CD on GitHub Actions
> - Complete documentation
> - MIT License (free for everyone)"

**Final CTA:**

> "If you want to try it or see the code:
> 
> 👉 https://github.com/MauricioPerera/Skill-Bank
> 
> Feedback, ideas, and PRs are very welcome!
> 
> The goal is for this to be **infrastructure** for AI agents, not just a demo project."

**Optional Q&A hints:**
- "How does it compare to LangChain?" → *Skill Bank focuses on discovery + learning, not execution*
- "Can I use my own LLM?" → *Yes, embedding layer is pluggable (Ollama, OpenAI, etc.)*
- "What about security?" → *v2.0 will add credentials vault and scoped access*

---

## 📊 Demo Flow Timing

| Section | Duration | Purpose |
|---------|----------|---------|
| Introduction | 1-2 min | Set context |
| Demo 1: Discovery | 2 min | Show semantic search |
| Demo 2: RAG | 1-2 min | Show document retrieval |
| Demo 3: Memory ⭐ | 3-4 min | **Show the magic** |
| Closing | 1-2 min | Architecture + CTA |
| **Total** | **8-11 min** | Flexible timing |

---

## 🎥 Video Recording Tips

If recording for YouTube/social:

### Pre-Recording
- ✅ Clean terminal (clear history)
- ✅ Increase font size (16-18pt minimum)
- ✅ Use a clean theme (high contrast)
- ✅ Close unnecessary windows/notifications
- ✅ Test audio/screen recording

### During Recording
- ✅ Speak clearly and not too fast
- ✅ Pause after key moments (let output settle)
- ✅ Use mouse/pointer to highlight important lines
- ✅ Zoom in on complex output if needed

### Editing
- Add timestamps in description:
  ```
  0:00 - Introduction
  1:30 - Semantic Discovery Demo
  3:30 - RAG Direct Access
  4:30 - Memory & Learning (⭐ must see)
  8:00 - Architecture & Closing
  ```
- Add captions for key terms (Tools, Skills, RAG, Memory)
- Consider B-roll of architecture diagram

---

## 💡 Alternative Formats

### Short Version (3-5 minutes)
Skip Demo 2 (RAG direct), focus on:
- Quick intro (1 min)
- Demo 1: Discovery (1 min)
- Demo 3: Memory & Learning (2 min)
- Quick close (30 sec)

### Deep Dive (20-30 minutes)
Add:
- Show the code (skill definitions, RAG config)
- Walk through test suite
- Explain architecture layers in detail
- Live Q&A

### Twitter/LinkedIn Teaser (60-90 seconds)
Just the magic moment:
- "Watch this AI agent learn and auto-fill parameters..."
- Show just the Memory & Learning output
- End with: "See full demo: [link]"

---

## 🎬 Sample Opening Lines

**For technical audience:**
> "Today I'm showing Skill Bank - a meta-tool system for AI agents. Think of it as dynamic discovery + RAG + memory, with a focus on testability and production-readiness."

**For business audience:**
> "Skill Bank solves a key problem: AI agents need to discover what they can do, learn from documents, and remember user preferences - all without hardcoded lists that break when you add new capabilities."

**For meetup/casual:**
> "Hey everyone! I built this system for AI agents that learns from usage. After 5 tries, it figures out what you like and auto-fills 60% of parameters. Let me show you..."

---

## 📚 Resources to Have Ready

**Links to share:**
- Repo: https://github.com/MauricioPerera/Skill-Bank
- Release: https://github.com/MauricioPerera/Skill-Bank/releases/tag/v1.5.0
- Docs: https://github.com/MauricioPerera/Skill-Bank#readme

**Visuals (optional):**
- Architecture diagram (from `docs/ARCHITECTURE.md`)
- Test output screenshot
- CI/CD badge

---

## 🎯 Success Metrics

After the demo, track:
- ⭐ GitHub stars
- 👁️ Video views (if recorded)
- 💬 Comments/questions
- 🔀 Forks
- 📢 Social media engagement

---

**Ready to showcase!** 🚀

**Questions before going live?**
- Check `ANNOUNCEMENT.md` for social media templates
- See `CONTRIBUTING.md` if people ask how to contribute
- Read `PHASE4_SUMMARY.md` for technical deep-dive answers

