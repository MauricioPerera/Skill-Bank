#!/bin/bash

# Demo: Graph-Aware RAG vs Classic RAG
# This script demonstrates the difference between classic RAG and graph-aware RAG

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║              Graph-Aware RAG Demo                                    ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

SERVER="http://localhost:3000"

# Check if server is running
echo "1️⃣  Checking server status..."
if ! curl -s $SERVER/health > /dev/null 2>&1; then
    echo "❌ Server is not running. Start it with: npm run server"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Check graph status
echo "2️⃣  Checking graph status..."
STATS=$(curl -s $SERVER/api/graph/stats)
TOTAL_EDGES=$(echo $STATS | jq -r '.totalEdges')
echo "   Graph edges: $TOTAL_EDGES"

if [ "$TOTAL_EDGES" == "0" ]; then
    echo ""
    echo "⚠️  No graph edges found. Building SAME_TOPIC edges..."
    curl -s -X POST $SERVER/api/graph/build/same-topic \
        -H "Content-Type: application/json" \
        -d '{"minSimilarity": 0.75, "maxConnections": 5}' | jq '.'
    echo "✅ Graph edges built"
fi
echo ""

# Test query
QUERY="Tell me about deep learning and neural networks"
echo "3️⃣  Test query: '$QUERY'"
echo ""

# Classic RAG (baseline)
echo "──────────────────────────────────────────────────────────────────────"
echo "📊 CLASSIC RAG (Baseline - No Graph)"
echo "──────────────────────────────────────────────────────────────────────"
echo ""

CLASSIC_RESULT=$(curl -s -X POST $SERVER/api/query/classic \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$QUERY\", \"k\": 3}")

echo "Results:"
echo $CLASSIC_RESULT | jq '{
    resultsCount: .metadata.resultsCount,
    usedGraph: .metadata.usedGraph,
    sources: .sources | map({
        nodeId,
        docId,
        score: (.score | tonumber | . * 1000 | round / 1000),
        contextPreview: .context[:150]
    })
}'

CLASSIC_COUNT=$(echo $CLASSIC_RESULT | jq -r '.metadata.resultsCount')
echo ""
echo "Classic RAG retrieved: $CLASSIC_COUNT sections"
echo ""

# Graph-Aware RAG
echo "──────────────────────────────────────────────────────────────────────"
echo "🎯 GRAPH-AWARE RAG (Hybrid: Vector + Graph)"
echo "──────────────────────────────────────────────────────────────────────"
echo ""

SMART_RESULT=$(curl -s -X POST $SERVER/api/query/smart \
    -H "Content-Type: application/json" \
    -d "{
        \"query\": \"$QUERY\",
        \"k\": 3,
        \"useGraph\": true,
        \"maxHops\": 1,
        \"maxNodes\": 10,
        \"edgeTypes\": [\"SAME_TOPIC\", \"PARENT_OF\"],
        \"minWeight\": 0.75
    }")

echo "Results:"
echo $SMART_RESULT | jq '{
    resultsCount: .metadata.resultsCount,
    usedGraph: .metadata.usedGraph,
    graphExpansion: .graphExpansion | if . then {
        seedCount: .seedNodes | length,
        expandedCount: .expandedNodes | length
    } else null end,
    sources: .sources | map({
        nodeId,
        docId,
        score: (.score | tonumber | . * 1000 | round / 1000),
        hopDistance,
        edgeType,
        contextPreview: .context[:150]
    })
}'

SMART_COUNT=$(echo $SMART_RESULT | jq -r '.metadata.resultsCount')
echo ""
echo "Graph-Aware RAG retrieved: $SMART_COUNT sections"
echo ""

# Comparison
echo "══════════════════════════════════════════════════════════════════════"
echo "📊 COMPARISON"
echo "══════════════════════════════════════════════════════════════════════"
echo ""
echo "Classic RAG:       $CLASSIC_COUNT sections (baseline)"
echo "Graph-Aware RAG:   $SMART_COUNT sections (vector + graph)"
echo ""

if [ "$SMART_COUNT" -gt "$CLASSIC_COUNT" ]; then
    DIFF=$((SMART_COUNT - CLASSIC_COUNT))
    PERCENT=$(echo "scale=0; ($DIFF * 100) / $CLASSIC_COUNT" | bc)
    echo "✅ Graph-aware RAG found $DIFF more sections (+$PERCENT%)"
    echo ""
    echo "Why? Graph expansion discovered:"
    echo "  • Cross-document connections (SAME_TOPIC)"
    echo "  • Parent sections (broader context)"
    echo "  • Related content from other documents"
else
    echo "ℹ️  Similar results (may need more graph edges)"
fi

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "✅ Demo Complete!"
echo ""
echo "💡 Tips:"
echo "   • More documents → More valuable graph connections"
echo "   • Build SAME_TOPIC edges: POST /api/graph/build/same-topic"
echo "   • View graph stats: GET /api/graph/stats"
echo "   • Adjust minWeight for stricter/looser connections"
echo ""
echo "📚 Try these queries:"
echo "   • 'What is supervised learning?'"
echo "   • 'History of artificial intelligence'"
echo "   • 'Explain neural network architectures'"
echo ""
echo "══════════════════════════════════════════════════════════════════════"

