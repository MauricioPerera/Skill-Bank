# REFERS_TO Edge Detection

**Status:** Phase 2.0 - Implemented ✅

## Overview

The REFERS_TO edge type captures **explicit references** between document sections through markdown links. This complements the automatic SAME_TOPIC detection by adding intentional, author-specified relationships.

### SAME_TOPIC vs REFERS_TO

| Feature | SAME_TOPIC | REFERS_TO |
|---------|------------|-----------|
| **Detection** | Automatic (embedding similarity) | Explicit (markdown links) |
| **Intent** | System discovers relationships | Author specifies relationships |
| **Bidirectional** | Yes (symmetric similarity) | No (directed reference) |
| **Strength** | Similarity score (0-1) | Binary (link exists or not) |
| **Use Case** | Discover related content | Follow author's references |

**Together:** SAME_TOPIC finds what's semantically similar, REFERS_TO follows what the author explicitly connected.

---

## Supported Link Formats

### 1. Markdown Links

Standard markdown link syntax:

```markdown
See [gradient descent](ml-basics#gradient-descent) for more details.

For background, read the [introduction](./intro.md).

Check out [Deep Learning](deep-learning.md#neural-networks).
```

**Pattern:** `[link text](target)`

### 2. Wiki Links

Wiki-style double bracket links:

```markdown
Learn about [[Machine Learning]] first.

See also [[Neural Networks#Backpropagation]].
```

**Pattern:** `[[page]]` or `[[page#section]]`

### 3. Internal Anchors

Links within the same document:

```markdown
As mentioned in [the introduction](#introduction), we will cover...

See [assumptions](#key-assumptions) above.
```

**Pattern:** `[text](#section-id)`

---

## Link Resolution

The system tries multiple strategies to resolve links:

### 1. Direct Resolution

```
Target: doc-id#section-id
Result: Exact match
```

### 2. Fuzzy Title Match

```
Target: [[Neural Networks]]
Process: Search all documents for title "Neural Networks"
Result: doc-id or doc-id#section-id
```

### 3. Relative Paths

```
Target: ./other-doc.md#section
Process: Remove ./ and .md, treat as doc-id#section-id
Result: other-doc#section
```

### 4. Anchor Only

```
Target: #section-id
Current: ml-guide
Result: ml-guide#section-id
```

---

## Configuration

```typescript
interface LinkDetectionConfig {
  detectMarkdownLinks: boolean;    // [text](url) - default: true
  detectWikiLinks: boolean;         // [[page]] - default: true
  crossDocumentOnly: boolean;       // Only cross-doc links - default: false
  createBidirectional: boolean;     // Create reverse edges - default: false
}
```

### Examples

**Detect all links:**
```typescript
{
  detectMarkdownLinks: true,
  detectWikiLinks: true,
  crossDocumentOnly: false,
  createBidirectional: false
}
```

**Only cross-document references:**
```typescript
{
  detectMarkdownLinks: true,
  detectWikiLinks: true,
  crossDocumentOnly: true,  // Skip same-document links
  createBidirectional: false
}
```

**Bidirectional edges:**
```typescript
{
  detectMarkdownLinks: true,
  detectWikiLinks: true,
  crossDocumentOnly: false,
  createBidirectional: true  // A→B and B→A
}
```

---

## CLI Usage

### Build REFERS_TO Edges

```bash
# Detect all links
npx tsx src/cli/buildGraph.ts refers-to

# Only cross-document links
npx tsx src/cli/buildGraph.ts refers-to --cross-doc-only

# Create bidirectional edges
npx tsx src/cli/buildGraph.ts refers-to --bidirectional

# Only markdown links (no wiki links)
npx tsx src/cli/buildGraph.ts refers-to --no-wiki

# Only wiki links (no markdown)
npx tsx src/cli/buildGraph.ts refers-to --no-markdown
```

### View Statistics

```bash
npx tsx src/cli/buildGraph.ts stats
```

Output:
```
📊 Overall:
   Total edges: 42
   Total nodes: 25
   Average degree: 3.36

📈 Edges by type:
   SAME_TOPIC: 20 (47.6%)
   REFERS_TO: 15 (35.7%)
   PARENT_OF: 7 (16.7%)
```

---

## API Usage

### Build REFERS_TO Edges

```bash
POST /api/graph/build/refers-to
Content-Type: application/json

{
  "detectMarkdownLinks": true,
  "detectWikiLinks": true,
  "crossDocumentOnly": false,
  "createBidirectional": false
}
```

**Response:**
```json
{
  "message": "REFERS_TO edges built successfully",
  "edgeCount": 15,
  "config": {
    "detectMarkdownLinks": true,
    "detectWikiLinks": true,
    "crossDocumentOnly": false,
    "createBidirectional": false
  }
}
```

### Get Link Statistics

```bash
GET /api/graph/link-stats
```

**Response:**
```json
{
  "totalDocuments": 5,
  "documentsWithLinks": 3,
  "totalLinks": 15,
  "linksByType": {
    "markdown": 12,
    "wiki": 3
  },
  "crossDocumentLinks": 8
}
```

---

## Use Cases

### 1. Documentation with Cross-References

**Scenario:** Technical documentation with many cross-references

```markdown
# API Reference

For authentication, see [Authentication Guide](auth.md).

Error codes are listed in [Error Reference](errors.md#http-codes).
```

**Result:** REFERS_TO edges create explicit navigation paths through documentation.

### 2. Tutorial Series

**Scenario:** Step-by-step tutorials that reference each other

```markdown
# Tutorial 3: Advanced Features

Prerequisites:
- [[Tutorial 1: Getting Started]]
- [[Tutorial 2: Basic Concepts]]

Next: [[Tutorial 4: Production Deployment]]
```

**Result:** Graph shows tutorial progression and dependencies.

### 3. Knowledge Base

**Scenario:** Wiki-style knowledge base with interconnected pages

```markdown
# Machine Learning

Related topics:
- [[Deep Learning]]
- [[Neural Networks]]
- [[Supervised Learning]]

See also: [[Statistics#Probability Theory]]
```

**Result:** Rich graph of related concepts.

### 4. Academic Papers

**Scenario:** Papers with citations and references

```markdown
# Research Paper

As shown by Smith et al. [[Related Work#Previous Studies]], ...

Our approach builds on [[Methods#Baseline Algorithm]].
```

**Result:** Citation network captured as graph edges.

---

## Graph Traversal with REFERS_TO

### Example: Following References

```javascript
// Get all documents referenced by ml-guide
const references = getOutgoingEdges('ml-guide', 'REFERS_TO');

// Get all documents that reference ml-guide
const citations = getIncomingEdges('ml-guide', 'REFERS_TO');

// Multi-hop: What do the referenced docs reference?
const secondOrder = expandGraph(['ml-guide'], {
  maxHops: 2,
  maxNodes: 20,
  edgeTypes: ['REFERS_TO']
});
```

### Combined with SAME_TOPIC

```javascript
// Follow author's references AND find similar content
const context = expandGraph(['ml-guide#deep-learning'], {
  maxHops: 1,
  maxNodes: 15,
  edgeTypes: ['REFERS_TO', 'SAME_TOPIC'],
  minWeight: 0.75
});
```

**Result:** Rich context combining:
- Explicit references (author intent)
- Semantic similarity (system discovery)

---

## Edge Metadata

Each REFERS_TO edge includes metadata:

```json
{
  "from_node_id": "ml-guide#introduction",
  "to_node_id": "ai-basics#supervised-learning",
  "type": "REFERS_TO",
  "metadata": {
    "linkText": "supervised learning",
    "linkType": "markdown",
    "originalTarget": "ai-basics.md#supervised-learning"
  }
}
```

**Fields:**
- `linkText`: The anchor text of the link
- `linkType`: "markdown" or "wiki"
- `originalTarget`: The original link target as written
- `bidirectional`: (optional) true if this is a reverse edge

---

## Best Practices

### 1. Use Consistent IDs

**Good:**
```markdown
# Document: ml-basics.md
## Gradient Descent

Link from another doc:
[gradient descent](ml-basics#gradient-descent)
```

**Bad:**
```markdown
Link target doesn't match section ID:
[gradient descent](ml-basics#GradientDescent)
```

### 2. Prefer Relative Links

**Good:**
```markdown
See [related page](./related.md)
```

**Good:**
```markdown
See [section](#my-section)
```

**Avoid:**
```markdown
See [external](https://example.com/page)  # Won't resolve internally
```

### 3. Use Wiki Links for Titles

**Good:**
```markdown
Learn about [[Machine Learning]]  # Fuzzy title match
```

**Better:**
```markdown
[Machine Learning](ml-basics)  # Explicit doc ID
```

### 4. Document Cross-References

When creating a reference:
```markdown
<!-- Clear reference -->
For more details, see [Deep Learning Guide](deep-learning.md).

<!-- Vague reference -->
See here for more.  # Avoid
```

---

## Limitations

### 1. External Links

External URLs are not resolved:

```markdown
See [Wikipedia](https://en.wikipedia.org/wiki/Machine_learning)
```

**Status:** Ignored (no internal node to link to)

### 2. Ambiguous Titles

If multiple sections have the same title:

```markdown
[[Introduction]]  # Which introduction?
```

**Behavior:** First match is used. Be specific:
```markdown
[[ML Guide#Introduction]]  # Better
```

### 3. Broken Links

Links to non-existent nodes:

```markdown
[missing section](doc#nonexistent)
```

**Behavior:** Logged as warning, no edge created.

### 4. Dynamic Links

Links generated programmatically aren't detected:

```javascript
const link = generateLink(section);  // Not in markdown
```

**Workaround:** Use explicit markdown links.

---

## Debugging

### Check if links were detected

```bash
# View link statistics
curl http://localhost:3000/api/graph/link-stats

# View graph stats
npx tsx src/cli/buildGraph.ts stats
```

### Find links in a specific document

```bash
# Enable debug logging
DEBUG=linkDetector npx tsx src/cli/buildGraph.ts refers-to
```

### Verify edge creation

```bash
# Get outgoing links from a node
curl http://localhost:3000/api/graph/edges/ml-guide?direction=outgoing&type=REFERS_TO
```

---

## Performance

### Detection Speed

- **Markdown links:** ~1000 links/second
- **Wiki links:** ~500 links/second (requires fuzzy matching)
- **Cross-document:** Slightly slower (document lookup)

### Memory Usage

- Minimal (processes one document at a time)
- Edge metadata is small (~100 bytes per edge)

### Recommendations

- Run `refers-to` detection after all documents are indexed
- Re-run when documents are updated with new links
- Combine with `same-topic` for comprehensive graph:

```bash
npx tsx src/cli/buildGraph.ts same-topic
npx tsx src/cli/buildGraph.ts refers-to
```

---

## Integration with RAG

### Enhanced Context Retrieval

```javascript
// Query with both SAME_TOPIC and REFERS_TO
POST /api/query/smart
{
  "query": "What is backpropagation?",
  "k": 3,
  "useGraph": true,
  "edgeTypes": ["SAME_TOPIC", "REFERS_TO", "PARENT_OF"]
}
```

**Result:**
- Vector search finds "backpropagation" sections
- SAME_TOPIC finds semantically similar content
- REFERS_TO follows author's explicit references
- PARENT_OF adds hierarchical context

### Following Citation Chains

```javascript
// Multi-hop to follow references
POST /api/graph/expand
{
  "seeds": ["paper#introduction"],
  "config": {
    "maxHops": 3,
    "edgeTypes": ["REFERS_TO"]
  }
}
```

**Result:** Full citation network from the introduction section.

---

## Future Enhancements

### Planned (Phase 2.5)

- [ ] Automatic anchor generation from headings
- [ ] Link validation (detect broken links)
- [ ] Link suggestions (recommend links based on SAME_TOPIC)
- [ ] Bi-directional link UI (show backlinks)

### Research (Phase 3.0)

- [ ] External link tracking
- [ ] Link importance scoring
- [ ] Page rank on internal links
- [ ] Link prediction (ML-based)

---

## Examples

See working examples in:
- `examples/linked-docs/` - Sample documents with cross-references
- `examples/test-refers-to.sh` - Test script
- `docs/GRAPH_RAG_API.md` - API usage examples

---

**Last Updated:** December 2024  
**Phase:** 2.0 - Advanced Graph  
**Status:** Implemented ✅

