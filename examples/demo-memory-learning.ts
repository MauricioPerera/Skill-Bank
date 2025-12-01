/**
 * Demo: Memory & Learning in Action
 * 
 * Demonstrates how Skill Bank learns user preferences and applies them automatically
 */

import { skillExecutor } from '../src/skills/executor/skillExecutor.js';
import { upsertSkill } from '../src/skills/store/unifiedStore.js';
import {
  getPreferencesForUserAndSkill,
  getPreferenceStats
} from '../src/skills/store/preferenceStore.js';
import {
  getUserStats,
  getExecutionsByUserAndSkill
} from '../src/skills/store/executionStore.js';
import { embed } from '../src/embeddings/index.js';

console.log('='.repeat(80));
console.log('🧠 SKILL BANK - MEMORY & LEARNING DEMO');
console.log('='.repeat(80));
console.log();

async function runDemo() {
  // ============================================================================
  // STEP 1: Register demo skill
  // ============================================================================
  console.log('📝 STEP 1: Registering demo skill\n');

  const reportSkill = {
    id: 'generate_report',
    name: 'Generate Report',
    type: 'skill' as const,
    category: 'productivity',
    skillType: 'tool_based' as const,
    overview: 'Generates business reports with configurable format and recipients',
    instructions: 'Create a professional report with the specified format and send to recipients',
    usesTools: [],
    parameters: [
      { name: 'format', type: 'string', required: false, description: 'Report format (PDF, Excel, HTML)' },
      { name: 'recipients', type: 'string', required: false, description: 'Email recipients' },
      { name: 'dateRange', type: 'string', required: false, description: 'Date range for report' }
    ],
    outputs: [],
    examples: []
  };

  const skillEmbedding = await embed(reportSkill.name + ' ' + reportSkill.overview);
  upsertSkill(reportSkill, skillEmbedding);

  console.log(`✅ Registered: ${reportSkill.name}`);
  console.log();

  // ============================================================================
  // STEP 2: First execution (no preferences)
  // ============================================================================
  console.log('▶️  STEP 2: First execution - Learning begins\n');

  console.log('Executing with parameters: { format: "PDF", recipients: "team@company.com", dateRange: "last_month" }');

  const exec1 = await skillExecutor.execute(
    'generate_report',
    { format: 'PDF', recipients: 'team@company.com', dateRange: 'last_month' },
    {
      context: {
        userId: 'alice',
        sessionId: 'session_1',
        source: 'api'
      }
    }
  );

  console.log(`✅ Execution 1 completed (${exec1.metadata?.executionTime}ms)`);
  console.log();

  // ============================================================================
  // STEP 3: Execute 4 more times (reach learning threshold)
  // ============================================================================
  console.log('▶️  STEP 3: Execute 4 more times with consistent patterns\n');

  for (let i = 2; i <= 5; i++) {
    await skillExecutor.execute(
      'generate_report',
      { format: 'PDF', recipients: 'team@company.com', dateRange: 'last_month' },
      {
        context: {
          userId: 'alice',
          sessionId: `session_${i}`,
          source: 'api'
        }
      }
    );
    console.log(`  ✓ Execution ${i} completed`);
  }

  console.log();
  console.log('📊 After 5 executions - Pattern detected!\n');

  // Check learned preferences
  const alicePrefs = getPreferencesForUserAndSkill('alice', 'generate_report');

  console.log(`🎓 Learned ${alicePrefs.length} preferences for Alice:`);
  for (const pref of alicePrefs) {
    console.log(`   • ${pref.paramName}: "${pref.defaultValue}" (confidence: ${(pref.confidence * 100).toFixed(0)}%)`);
  }
  console.log();

  // ============================================================================
  // STEP 4: Execute with partial input (preferences applied)
  // ============================================================================
  console.log('▶️  STEP 4: Execute with partial input - Magic happens!\n');

  console.log('Executing with only { dateRange: "this_week" } - missing format and recipients');
  console.log();

  const exec6 = await skillExecutor.execute(
    'generate_report',
    { dateRange: 'this_week' }, // Only provide dateRange
    {
      context: {
        userId: 'alice',
        sessionId: 'session_6',
        source: 'api'
      }
    }
  );

  // Check logs for applied preferences
  const prefLog = exec6.logs?.find(log => log.message.includes('Applied') && log.message.includes('preferences'));
  
  if (prefLog) {
    console.log('✨ AUTO-FILLED PARAMETERS:');
    const applied = prefLog.context?.appliedPreferences || [];
    for (const pref of applied) {
      console.log(`   • ${pref.paramName}: "${pref.value}" (${(pref.confidence * 100).toFixed(0)}% confident)`);
    }
  }

  console.log();
  console.log('💡 System learned from Alice\'s behavior and filled in missing parameters!');
  console.log();

  // ============================================================================
  // STEP 5: Different user, different preferences
  // ============================================================================
  console.log('▶️  STEP 5: Different user - Different preferences\n');

  console.log('Bob prefers Excel reports...');
  console.log();

  for (let i = 1; i <= 5; i++) {
    await skillExecutor.execute(
      'generate_report',
      { format: 'Excel', recipients: 'managers@company.com', dateRange: 'last_quarter' },
      {
        context: {
          userId: 'bob',
          sessionId: `bob_session_${i}`,
          source: 'api'
        }
      }
    );
    console.log(`  ✓ Bob's execution ${i} completed`);
  }

  console.log();

  const bobPrefs = getPreferencesForUserAndSkill('bob', 'generate_report');

  console.log(`🎓 Learned ${bobPrefs.length} preferences for Bob:`);
  for (const pref of bobPrefs) {
    console.log(`   • ${pref.paramName}: "${pref.defaultValue}" (confidence: ${(pref.confidence * 100).toFixed(0)}%)`);
  }

  console.log();

  // ============================================================================
  // STEP 6: Compare user preferences
  // ============================================================================
  console.log('▶️  STEP 6: Comparing user preferences\n');

  const aliceFormat = alicePrefs.find(p => p.paramName === 'format');
  const bobFormat = bobPrefs.find(p => p.paramName === 'format');

  console.log('Format Preference Comparison:');
  console.log(`   Alice: ${aliceFormat?.defaultValue} (${(aliceFormat?.confidence || 0) * 100}% confident)`);
  console.log(`   Bob:   ${bobFormat?.defaultValue} (${(bobFormat?.confidence || 0) * 100}% confident)`);
  console.log();
  console.log('👥 Each user has personalized defaults!');
  console.log();

  // ============================================================================
  // STEP 7: Analytics
  // ============================================================================
  console.log('▶️  STEP 7: Memory & Learning Analytics\n');

  const aliceStats = getUserStats('alice');
  const bobStats = getUserStats('bob');
  const prefStats = getPreferenceStats();

  console.log('📊 Execution Statistics:');
  console.log(`   Alice: ${aliceStats.total} executions (${(aliceStats.successRate * 100).toFixed(0)}% success)`);
  console.log(`   Bob:   ${bobStats.total} executions (${(bobStats.successRate * 100).toFixed(0)}% success)`);
  console.log();

  console.log('🎓 Preference Statistics:');
  console.log(`   Total preferences: ${prefStats.totalPreferences}`);
  console.log(`   High confidence (>= 80%): ${prefStats.highConfidenceCount}`);
  console.log(`   Average confidence: ${(prefStats.avgConfidence * 100).toFixed(0)}%`);
  console.log();

  // ============================================================================
  // STEP 8: Execution history
  // ============================================================================
  console.log('▶️  STEP 8: Execution History\n');

  const aliceHistory = getExecutionsByUserAndSkill('alice', 'generate_report', 3);

  console.log('Alice\'s last 3 executions:');
  for (const exec of aliceHistory) {
    const params = Object.entries(exec.input).map(([k, v]) => `${k}=${v}`).join(', ');
    const date = new Date(exec.timestamp).toLocaleTimeString();
    console.log(`   [${date}] ${exec.skillId} { ${params} }`);
  }
  console.log();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🎉 DEMO COMPLETE - Memory & Learning in Action');
  console.log('='.repeat(80));
  console.log();
  console.log('Key Takeaways:');
  console.log('   ✅ System learns from user behavior automatically');
  console.log('   ✅ Preferences applied when parameters are missing');
  console.log('   ✅ Each user has personalized defaults');
  console.log('   ✅ Confidence scores reflect pattern strength');
  console.log('   ✅ Complete execution tracking & analytics');
  console.log();
  console.log('🚀 Ready for production use!');
  console.log();
}

runDemo().catch(console.error);

