/**
 * Monitoring & Metrics Routes
 * 
 * Endpoints for system monitoring, metrics, and health checks.
 */

import { Router, Request, Response } from 'express';
import { getGraphStats } from '../../db/graphStore.js';
import { getRateLimitStats } from '../../middleware/rateLimit.js';
import { getAuthStatus } from '../../middleware/auth.js';
import { getAllCacheStats, clearAllCaches } from '../../cache/queryCache.js';
import { getBM25Index } from '../../search/bm25.js';

const router = Router();

// Store request metrics
interface RequestMetrics {
  totalRequests: number;
  requestsByEndpoint: Map<string, number>;
  requestsByStatus: Map<number, number>;
  latencies: number[];
  errors: Array<{ timestamp: number; endpoint: string; error: string }>;
  startTime: number;
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  requestsByEndpoint: new Map(),
  requestsByStatus: new Map(),
  latencies: [],
  errors: [],
  startTime: Date.now()
};

/**
 * Record a request (call from middleware)
 */
export function recordRequest(endpoint: string, status: number, latencyMs: number, error?: string): void {
  metrics.totalRequests++;
  
  // By endpoint
  const endpointCount = metrics.requestsByEndpoint.get(endpoint) || 0;
  metrics.requestsByEndpoint.set(endpoint, endpointCount + 1);
  
  // By status
  const statusCount = metrics.requestsByStatus.get(status) || 0;
  metrics.requestsByStatus.set(status, statusCount + 1);
  
  // Latency (keep last 1000)
  metrics.latencies.push(latencyMs);
  if (metrics.latencies.length > 1000) {
    metrics.latencies.shift();
  }
  
  // Errors (keep last 100)
  if (error) {
    metrics.errors.push({
      timestamp: Date.now(),
      endpoint,
      error
    });
    if (metrics.errors.length > 100) {
      metrics.errors.shift();
    }
  }
}

/**
 * GET /api/monitoring/metrics
 * Get system metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  const latencies = metrics.latencies;
  const avgLatency = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;
  const p95Latency = latencies.length > 0
    ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
    : 0;
  const p99Latency = latencies.length > 0
    ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)]
    : 0;

  res.json({
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    requests: {
      total: metrics.totalRequests,
      byEndpoint: Object.fromEntries(metrics.requestsByEndpoint),
      byStatus: Object.fromEntries(metrics.requestsByStatus)
    },
    latency: {
      avg: Math.round(avgLatency),
      p95: Math.round(p95Latency),
      p99: Math.round(p99Latency),
      samples: latencies.length
    },
    errors: {
      count: metrics.errors.length,
      recent: metrics.errors.slice(-10)
    }
  });
});

/**
 * GET /api/monitoring/health
 * Detailed health check
 */
router.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, { status: 'ok' | 'degraded' | 'error'; details?: any }> = {};
  
  // Check graph store
  try {
    const graphStats = getGraphStats();
    checks.graphStore = { 
      status: 'ok', 
      details: { edges: graphStats.totalEdges, nodes: graphStats.totalNodes }
    };
  } catch (error: any) {
    checks.graphStore = { status: 'error', details: error.message };
  }
  
  // Check BM25 index
  try {
    const bm25Stats = getBM25Index().getStats();
    checks.bm25Index = { 
      status: 'ok', 
      details: bm25Stats 
    };
  } catch (error: any) {
    checks.bm25Index = { status: 'error', details: error.message };
  }
  
  // Check cache
  try {
    const cacheStats = getAllCacheStats();
    checks.cache = { 
      status: 'ok', 
      details: cacheStats 
    };
  } catch (error: any) {
    checks.cache = { status: 'error', details: error.message };
  }
  
  // Check memory
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  checks.memory = {
    status: heapPercent > 90 ? 'degraded' : 'ok',
    details: {
      heapUsedMB,
      heapTotalMB,
      heapPercent: Math.round(heapPercent)
    }
  };
  
  // Overall status
  const statuses = Object.values(checks).map(c => c.status);
  const overallStatus = statuses.includes('error') ? 'error' :
                        statuses.includes('degraded') ? 'degraded' : 'ok';
  
  const statusCode = overallStatus === 'ok' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  });
});

/**
 * GET /api/monitoring/cache
 * Get cache statistics
 */
router.get('/cache', (req: Request, res: Response) => {
  res.json(getAllCacheStats());
});

/**
 * POST /api/monitoring/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', (req: Request, res: Response) => {
  clearAllCaches();
  res.json({ success: true, message: 'All caches cleared' });
});

/**
 * GET /api/monitoring/system
 * Get system information
 */
router.get('/system', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    process: {
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    auth: getAuthStatus(),
    rateLimit: getRateLimitStats()
  });
});

/**
 * GET /api/monitoring/dashboard
 * Get all dashboard data in one call
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const latencies = metrics.latencies;
  const avgLatency = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;
  
  let graphStats;
  try {
    graphStats = getGraphStats();
  } catch {
    graphStats = { totalEdges: 0, totalNodes: 0 };
  }
  
  res.json({
    overview: {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      totalRequests: metrics.totalRequests,
      avgLatencyMs: Math.round(avgLatency)
    },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    graph: graphStats,
    cache: getAllCacheStats(),
    rateLimit: getRateLimitStats(),
    auth: getAuthStatus(),
    recentErrors: metrics.errors.slice(-5)
  });
});

export default router;

