# Graph-Aware RAG API Reference

Quick reference for using the graph-aware RAG endpoints.

## Endpoints Overview

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/query/smart` | POST | Graph-aware RAG (recommended) | ⭐ NEW |
| `/api/query/classic` | POST | Classic RAG (baseline) | ⭐ NEW |
| `/api/query/graph` | POST | Graph RAG (advanced config) | ✅ Available |
| `/api/query` | POST | Classic RAG (legacy) | ✅ Available |
| `/api/graph/build/same-topic` | POST | Build SAME_TOPIC edges | ✅ Available |
| `/api/graph/stats` | GET | Graph statistics | ✅ Available |
| `/api/graph/neighbors/:nodeId` | GET | Get node neighbors | ✅ Available |
| `/api/graph/expand` | POST | Expand from seeds | ✅ Available |

---

## Smart Query (Recommended) ⭐

**Endpoint:** `POST /api/query/smart`

The recommended way to query with graph-aware RAG. Uses sensible defaults for production.

### Request

```json
{
  "query": "What is deep learning?",
  "k": 3,
  "useGraph": true,
  "maxHops": 1,
  "maxNodes": 10,
  "edgeTypes": ["SAME_TOPIC", "PARENT_OF"],
  "minWeight": 0.75
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search query |
| `k` | number | 3 | Number of seeds from vector search |
| `useGraph` | boolean | true | Enable graph expansion |
| `maxHops` | number | 1 | Maximum graph hops (1-3) |
| `maxNodes` | number | 10 | Maximum total nodes |
| `edgeTypes` | string[] | ["SAME_TOPIC", "PARENT_OF", "CHILD_OF"] | Edge types to follow |
| `minWeight` | number | 0.75 | Minimum edge weight for SAME_TOPIC |

### Response

```json
{
  "query": "What is deep learning?",
  "answer": "Found 7 sections using graph expansion. See sources.",
  "sources": [
    {
      "nodeId": "ml-guide.md#deep-learning",
      "docId": "ml-guide",
      "score": 0.15,
      "context": "[Document: Machine Learning Guide]\n\n## Deep Learning...",
      "hopDistance": 0,
      "edgeType": null,
      "pathFromSeed": ["ml-guide.md#deep-learning"]
    },
    {
      "nodeId": "ai-history.md#neural-networks",
      "docId": "ai-history",
      "score": 0.87,
      "context": "[Document: Historia de la IA]\n\n## Neural Networks...",
      "hopDistance": 1,
      "edgeType": "SAME_TOPIC",
      "pathFromSeed": ["ml-guide.md#deep-learning", "ai-history.md#neural-networks"]
    }
  ],
  "graphExpansion": {
    "seedNodes": ["ml-guide.md#deep-learning", "ml-guide.md#neural-networks"],
    "expandedNodes": [
      {
        "node_id": "ml-guide.md#deep-learning",
        "hop": 0,
        "path": ["ml-guide.md#deep-learning"]
      },
      {
        "node_id": "ai-history.md#neural-networks",
        "hop": 1,
        "edge_type": "SAME_TOPIC",
        "weight": 0.87,
        "path": ["ml-guide.md#deep-learning", "ai-history.md#neural-networks"]
      }
    ],
    "totalNodesRetrieved": 7
  },
  "metadata": {
    "resultsCount": 7,
    "timestamp": "2024-12-01T10:30:00.000Z",
    "usedGraph": true
  }
}
```

### Example (curl)

```bash
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is deep learning?",
    "k": 3,
    "useGraph": true,
    "maxHops": 1
  }'
```

### Example (JavaScript)

```javascript
const response = await fetch('http://localhost:3000/api/query/smart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What is deep learning?',
    k: 3,
    useGraph: true,
    maxHops: 1,
    edgeTypes: ['SAME_TOPIC'],
    minWeight: 0.80
  })
});

const result = await response.json();
console.log(`Found ${result.sources.length} sections`);
console.log(`Seeds: ${result.graphExpansion.seedNodes.length}`);
console.log(`Expanded: ${result.graphExpansion.totalNodesRetrieved}`);
```

---

## Classic Query (Baseline)

**Endpoint:** `POST /api/query/classic`

Classic RAG without graph expansion. Use for comparison or when you don't need cross-document context.

### Request

```json
{
  "query": "What is deep learning?",
  "k": 3
}
```

### Response

Same format as `/api/query/smart` but:
- No `graphExpansion` field
- `metadata.usedGraph` = false
- Only seed nodes in `sources`

---

## Build SAME_TOPIC Edges

**Endpoint:** `POST /api/graph/build/same-topic`

Build SAME_TOPIC edges automatically based on embedding similarity.

### Request

```json
{
  "minSimilarity": 0.80,
  "maxConnections": 5,
  "crossDocOnly": true,
  "titleSimilarity": false
}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minSimilarity` | number | 0.80 | Minimum cosine similarity (0-1) |
| `maxConnections` | number | 5 | Max SAME_TOPIC edges per node |
| `crossDocOnly` | boolean | true | Only connect different documents |
| `titleSimilarity` | boolean | false | Consider title similarity |

### Response

```json
{
  "message": "SAME_TOPIC edges built successfully",
  "edgeCount": 8,
  "config": {
    "minSimilarity": 0.80,
    "maxConnections": 5,
    "crossDocOnly": true,
    "titleSimilarity": false
  }
}
```

### Example

```bash
# Build with default config
curl -X POST http://localhost:3000/api/graph/build/same-topic \
  -H "Content-Type: application/json" \
  -d '{}'

# Build with custom config
curl -X POST http://localhost:3000/api/graph/build/same-topic \
  -H "Content-Type: application/json" \
  -d '{
    "minSimilarity": 0.85,
    "maxConnections": 3,
    "crossDocOnly": true
  }'
```

**When to use:**
- After indexing new documents
- When you want stricter/looser connections
- To rebuild the graph with new settings

**Pro tip:** Higher `minSimilarity` = fewer but higher quality connections

---

## Graph Statistics

**Endpoint:** `GET /api/graph/stats`

Get statistics about the knowledge graph.

### Response

```json
{
  "totalEdges": 42,
  "edgesByType": {
    "SAME_TOPIC": 20,
    "PARENT_OF": 15,
    "CHILD_OF": 7
  },
  "totalNodes": 25,
  "avgDegree": 3.36
}
```

### Example

```bash
curl http://localhost:3000/api/graph/stats
```

---

## Get Neighbors

**Endpoint:** `GET /api/graph/neighbors/:nodeId`

Get all neighbors of a node (connected by edges).

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `types` | string | Comma-separated edge types (optional) |

### Response

```json
{
  "node_id": "ml-guide.md#deep-learning",
  "neighbors": [
    {
      "node_id": "ai-history.md#neural-networks",
      "edge_type": "SAME_TOPIC",
      "weight": 0.87,
      "direction": "outgoing"
    },
    {
      "node_id": "ml-guide.md#machine-learning",
      "edge_type": "PARENT_OF",
      "weight": null,
      "direction": "incoming"
    }
  ],
  "count": 2
}
```

### Examples

```bash
# All neighbors
curl http://localhost:3000/api/graph/neighbors/ml-guide.md

# Only SAME_TOPIC neighbors
curl "http://localhost:3000/api/graph/neighbors/ml-guide.md?types=SAME_TOPIC"

# Multiple types
curl "http://localhost:3000/api/graph/neighbors/ml-guide.md?types=SAME_TOPIC,PARENT_OF"
```

---

## Graph Expansion

**Endpoint:** `POST /api/graph/expand`

Expand from seed nodes using BFS graph traversal.

### Request

```json
{
  "seeds": ["ml-guide.md#deep-learning", "ai-history.md#introduction"],
  "config": {
    "maxHops": 2,
    "maxNodes": 20,
    "edgeTypes": ["SAME_TOPIC", "PARENT_OF"],
    "minWeight": 0.75
  }
}
```

### Response

```json
{
  "seeds": ["ml-guide.md#deep-learning", "ai-history.md#introduction"],
  "config": {
    "maxHops": 2,
    "maxNodes": 20,
    "edgeTypes": ["SAME_TOPIC", "PARENT_OF"],
    "minWeight": 0.75
  },
  "nodes": [
    {
      "node_id": "ml-guide.md#deep-learning",
      "hop": 0,
      "path": ["ml-guide.md#deep-learning"]
    },
    {
      "node_id": "ai-history.md#neural-networks",
      "hop": 1,
      "edge_type": "SAME_TOPIC",
      "weight": 0.87,
      "path": ["ml-guide.md#deep-learning", "ai-history.md#neural-networks"]
    }
  ],
  "count": 2
}
```

---

## Comparison: Classic vs Graph-Aware

### Classic RAG

```bash
curl -X POST http://localhost:3000/api/query/classic \
  -H "Content-Type: application/json" \
  -d '{"query": "deep learning", "k": 3}'
```

**Results:**
- 3 sections (seeds only)
- Limited to vector similarity
- No cross-document discovery

### Graph-Aware RAG

```bash
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "deep learning",
    "k": 3,
    "useGraph": true,
    "maxHops": 1
  }'
```

**Results:**
- 3-10 sections (seeds + expanded)
- Vector similarity + graph relationships
- Cross-document discovery
- Richer context

**Impact:**
- +30-100% more context
- Discovers related content in other documents
- Better for complex queries spanning multiple topics

---

## Best Practices

### 1. Build SAME_TOPIC Edges First

Before using graph-aware queries, build the graph:

```bash
curl -X POST http://localhost:3000/api/graph/build/same-topic \
  -H "Content-Type: application/json" \
  -d '{"minSimilarity": 0.80}'
```

### 2. Start with 1 Hop

Don't use too many hops initially:

```json
{
  "query": "...",
  "maxHops": 1,  // Start here
  "maxNodes": 10
}
```

More hops = more context but also more noise.

### 3. Adjust Thresholds

Tune `minSimilarity` based on your documents:

- **0.90+**: Very strict (only very similar content)
- **0.80**: Recommended (good balance)
- **0.70**: Loose (more connections, some noise)

### 4. Filter Edge Types

Use specific edge types for different use cases:

```json
// Semantic similarity only
{"edgeTypes": ["SAME_TOPIC"]}

// Hierarchical context only
{"edgeTypes": ["PARENT_OF", "CHILD_OF"]}

// Both
{"edgeTypes": ["SAME_TOPIC", "PARENT_OF", "CHILD_OF"]}
```

### 5. Monitor Graph Stats

Check graph health regularly:

```bash
curl http://localhost:3000/api/graph/stats
```

**Good graph:**
- Avg degree: 2-5 (not too sparse, not too dense)
- SAME_TOPIC edges: 20-50% of total
- Total nodes: 70-90% of indexed sections

### 6. Use Classic for Comparison

Always compare against baseline:

```bash
# Classic
curl -X POST .../api/query/classic -d '{"query":"X","k":3}'

# Graph-aware
curl -X POST .../api/query/smart -d '{"query":"X","k":3}'

# Compare result counts and quality
```

---

## Common Use Cases

### Use Case 1: Single Topic, Multiple Documents

**Scenario:** You have 3 docs about "machine learning" and want comprehensive context.

**Solution:**
```bash
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is regularization?",
    "k": 2,
    "useGraph": true,
    "maxHops": 1,
    "edgeTypes": ["SAME_TOPIC"],
    "minWeight": 0.80
  }'
```

**Result:** Finds "regularization" in all 3 docs via SAME_TOPIC edges.

### Use Case 2: Exploratory Research

**Scenario:** User asks broad question, you want diverse perspectives.

**Solution:**
```bash
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence applications",
    "k": 3,
    "useGraph": true,
    "maxHops": 2,
    "maxNodes": 15,
    "edgeTypes": ["SAME_TOPIC", "PARENT_OF"]
  }'
```

**Result:** Explores multiple documents, parent sections for context.

### Use Case 3: Focused Search

**Scenario:** User wants specific info, no need for graph.

**Solution:**
```bash
curl -X POST http://localhost:3000/api/query/classic \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gradient descent formula",
    "k": 1
  }'
```

**Result:** Fast, focused, no graph overhead.

### Use Case 4: Topic Discovery

**Scenario:** Find all related topics to a concept.

**Solution:**
```bash
# Step 1: Query to get seed
SEED=$(curl -s -X POST .../api/query/classic -d '{"query":"neural networks","k":1}' | jq -r '.sources[0].nodeId')

# Step 2: Get neighbors
curl "http://localhost:3000/api/graph/neighbors/$SEED?types=SAME_TOPIC"
```

**Result:** All topics related to "neural networks" across documents.

---

## Troubleshooting

### No Graph Edges Found

**Problem:** `/api/query/smart` returns same results as `/api/query/classic`

**Solution:**
```bash
# 1. Check graph stats
curl http://localhost:3000/api/graph/stats

# 2. If totalEdges = 0, build edges
curl -X POST http://localhost:3000/api/graph/build/same-topic \
  -H "Content-Type: application/json" \
  -d '{"minSimilarity": 0.75}'

# 3. Retry query
```

### Too Many Results

**Problem:** Graph expansion returns too much irrelevant content

**Solutions:**
```json
// Increase minWeight
{"minWeight": 0.85}

// Reduce maxNodes
{"maxNodes": 5}

// Reduce maxHops
{"maxHops": 1}

// Use stricter edge types
{"edgeTypes": ["SAME_TOPIC"]}
```

### Too Few Results

**Problem:** Graph expansion doesn't find enough content

**Solutions:**
```json
// Decrease minWeight
{"minWeight": 0.70}

// Increase maxNodes
{"maxNodes": 20}

// Increase maxHops
{"maxHops": 2}

// Add more edge types
{"edgeTypes": ["SAME_TOPIC", "PARENT_OF", "CHILD_OF"]}
```

### Slow Queries

**Problem:** Graph expansion takes too long

**Solutions:**
```json
// Reduce maxNodes
{"maxNodes": 10}

// Reduce maxHops
{"maxHops": 1}

// Rebuild graph with higher minSimilarity
POST /api/graph/build/same-topic
{"minSimilarity": 0.85, "maxConnections": 3}
```

---

## Performance Tips

### 1. Index in Batches

```bash
# Index all docs first
npx tsx src/cli/indexFile.ts --dir ./docs

# Then build graph once
npx tsx src/cli/buildGraph.ts same-topic
```

Don't build graph after each document.

### 2. Tune minSimilarity

Test different thresholds:

```bash
# Strict (fewer edges, higher quality)
curl ... -d '{"minSimilarity": 0.85}'

# Balanced (recommended)
curl ... -d '{"minSimilarity": 0.80}'

# Loose (more edges, some noise)
curl ... -d '{"minSimilarity": 0.75}'
```

### 3. Limit maxConnections

Prevent dense graph:

```bash
# Each node connects to max 3 similar nodes
curl ... -d '{"maxConnections": 3}'
```

### 4. Use Matryoshka

Smaller embeddings = faster similarity calculations:

```env
MATRYOSHKA_ENABLED=true
MATRYOSHKA_DIMENSIONS=384
```

Then rebuild:
```bash
rm rag.db
npx tsx src/cli/indexFile.ts --dir ./docs
npx tsx src/cli/buildGraph.ts same-topic
```

---

## CLI Workflow

### Complete Setup

```bash
# 1. Install and configure
npm install
echo "EMBEDDING_SERVICE=ollama" > .env
echo "OLLAMA_EMBEDDING_MODEL=embeddinggemma" >> .env

# 2. Index documents
npx tsx src/cli/indexFile.ts --dir ./docs

# 3. Build graph
npx tsx src/cli/buildGraph.ts same-topic

# 4. Check stats
npx tsx src/cli/buildGraph.ts stats

# 5. Start server
npm run server

# 6. Test
./examples/demo-graph-rag.sh
```

---

## Advanced: Custom Edge Types

Currently only SAME_TOPIC is auto-detected. For custom edges:

```typescript
import { upsertEdge } from './src/db/graphStore.js';

// Create custom edge
upsertEdge({
  from_node_id: 'doc1#section-a',
  to_node_id: 'doc2#section-b',
  type: 'REFERS_TO',
  weight: 1.0,
  metadata: { reason: 'Explicit reference in markdown' }
});
```

Phase 2.0 will add automatic REFERS_TO detection from markdown links.

---

## Resources

- **Design Document:** `docs/GRAPH_EVOLUTION.md`
- **Demo Script:** `examples/demo-graph-rag.sh`
- **CLI Tool:** `src/cli/buildGraph.ts`
- **Roadmap:** `ROADMAP.md` (Phase 1.5)

---

**Last Updated:** December 2024  
**Phase:** 1.5 (Complete) ✅  
**Next:** Phase 2.0 (REFERS_TO, visualization)

