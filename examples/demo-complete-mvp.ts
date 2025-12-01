#!/usr/bin/env node
/**
 * Demo Completo del MVP - Skill Bank con RAG Integration
 * 
 * Muestra el sistema completo funcionando end-to-end
 */

import { setDbPath } from '../src/skills/store/unifiedStore.js';
import { skillBank } from '../src/skills/skillBank.js';
import { getExecutionStats, getTopSkills, getRecentExecutions } from '../src/skills/store/executionStore.js';
import { indexMarkdownFile } from '../src/cli/indexFile.js';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { embed } from '../src/embeddings/index.js';
import { upsertTool, upsertSkill, addEdge } from '../src/skills/store/unifiedStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

// Usar DB de demo
setDbPath('skillbank-demo.db');

/**
 * Banner
 */
function showBanner() {
  console.log(`\n${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║        Skill Bank - Demo Completo del MVP                     ║${RESET}`);
  console.log(`${BOLD}${CYAN}║        RAG Integration + Execution Tracking + Analytics       ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);
}

/**
 * Paso 1: Setup - Indexar Documentos
 */
async function step1_IndexDocuments() {
  console.log(`\n${BOLD}${YELLOW}[PASO 1] Indexación de Documentos${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  const documents = [
    { path: 'data/docs/terms_of_service.md', id: 'terms_of_service' },
    { path: 'data/docs/privacy_policy.md', id: 'privacy_policy' },
    { path: 'data/docs/product_catalog.md', id: 'product_catalog' },
    { path: 'data/docs/api_documentation.md', id: 'api_documentation' }
  ];

  let indexed = 0;
  for (const doc of documents) {
    if (fs.existsSync(doc.path)) {
      try {
        await indexMarkdownFile(doc.path, doc.id);
        indexed++;
        console.log(`   ${GREEN}✓${RESET} Indexado: ${doc.id}`);
      } catch (error) {
        console.log(`   ${YELLOW}⚠${RESET} Ya indexado: ${doc.id}`);
      }
    }
  }

  console.log(`\n   ${BOLD}${indexed}/${documents.length} documentos listos${RESET}`);
}

/**
 * Paso 2: Registrar Tools y Skills
 */
async function step2_RegisterToolsAndSkills() {
  console.log(`\n${BOLD}${YELLOW}[PASO 2] Registro de Tools y Skills${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  // Cargar tools
  console.log(`${BLUE}📦 Registrando tools...${RESET}`);
  const toolsDir = path.join(__dirname, '../data/tools');
  const toolFiles = fs.readdirSync(toolsDir).filter(f => f.endsWith('.yaml'));

  for (const file of toolFiles) {
    const content = fs.readFileSync(path.join(toolsDir, file), 'utf-8');
    const tool = yaml.parse(content);
    const embedding = await embed(`${tool.name}\n${tool.description}`);
    upsertTool(tool, embedding);
    console.log(`   ${GREEN}✓${RESET} ${tool.name}`);
  }

  // Cargar skills
  console.log(`\n${BLUE}📚 Registrando skills...${RESET}`);
  const skillsDir = path.join(__dirname, '../data/skills');
  const skillFiles = fs.readdirSync(skillsDir).filter(f => f.endsWith('.yaml'));

  let contextAwareCount = 0;
  let toolBasedCount = 0;
  let instructionalCount = 0;
  let hybridCount = 0;

  for (const file of skillFiles) {
    const content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
    const skill = yaml.parse(content);
    const embeddingText = `${skill.name}\n${skill.overview}\n${skill.instructions.steps.join(' ')}`;
    const embedding = await embed(embeddingText);
    upsertSkill(skill, embedding);

    const icon = skill.skillType === 'context_aware' ? '📖' :
                  skill.skillType === 'tool_based' ? '🔧' :
                  skill.skillType === 'instructional' ? '🎓' : '🔀';

    console.log(`   ${GREEN}✓${RESET} ${icon} ${skill.name} ${DIM}(${skill.skillType})${RESET}`);

    // Contadores
    if (skill.skillType === 'context_aware') contextAwareCount++;
    else if (skill.skillType === 'tool_based') toolBasedCount++;
    else if (skill.skillType === 'instructional') instructionalCount++;
    else if (skill.skillType === 'hybrid') hybridCount++;
  }

  // Crear relaciones en el grafo
  console.log(`\n${BLUE}🔗 Creando relaciones en el grafo...${RESET}`);
  const edges = [
    { from: 'pdf_report_generator', to: 'data_fetcher', type: 'REQUIRES' },
    { from: 'stripe_api_handler', to: 'pdf_report_generator', type: 'PRODUCES_INPUT_FOR' },
    { from: 'email_sender', to: 'pdf_report_generator', type: 'COMPLEMENTS' }
  ];

  for (const edge of edges) {
    try {
      addEdge({
        fromId: edge.from,
        toId: edge.to,
        type: edge.type as any,
        weight: 0.9
      });
      console.log(`   ${GREEN}✓${RESET} ${edge.from} ${edge.type} ${edge.to}`);
    } catch {
      // Edge may already exist
    }
  }

  console.log(`\n   ${BOLD}Resumen:${RESET}`);
  console.log(`   • Tools: ${toolFiles.length}`);
  console.log(`   • Skills: ${skillFiles.length}`);
  console.log(`     - ${contextAwareCount} context-aware`);
  console.log(`     - ${toolBasedCount} tool-based`);
  console.log(`     - ${instructionalCount} instructional`);
  console.log(`     - ${hybridCount} hybrid`);
}

/**
 * Paso 3: Discovery - Buscar Skills Relevantes
 */
async function step3_DiscoveryDemo() {
  console.log(`\n${BOLD}${YELLOW}[PASO 3] Discovery - Búsqueda Semántica${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  const testQueries = [
    {
      query: '¿Cuál es la política de cancelación de suscripción?',
      expectedType: 'context_aware'
    },
    {
      query: 'Verificar pagos en Stripe y generar reporte',
      expectedType: 'tool_based'
    },
    {
      query: 'Crear notas estilo Cornell de una lectura',
      expectedType: 'instructional'
    }
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const { query, expectedType } = testQueries[i];

    console.log(`${CYAN}Query ${i + 1}:${RESET} "${query}"`);

    const discovery = await skillBank.discover({
      query,
      mode: 'skills',
      expandGraph: true,
      k: 3
    });

    if (discovery.skills.length > 0) {
      const topSkill = discovery.skills[0];
      const relevancePercent = (topSkill.relevance * 100).toFixed(1);
      const compatPercent = (topSkill.compatibility * 100).toFixed(0);

      console.log(`   ${GREEN}→${RESET} ${topSkill.skill.name}`);
      console.log(`      Type: ${topSkill.skill.skillType || 'undefined'}`);
      console.log(`      Relevance: ${relevancePercent}%`);
      console.log(`      Compatibility: ${compatPercent}%`);
      console.log(`      Source: ${topSkill.source}`);

      if (topSkill.skill.referencesDocuments) {
        console.log(`      Docs: ${topSkill.skill.referencesDocuments.slice(0, 2).join(', ')}`);
      }
    } else {
      console.log(`   ${YELLOW}⚠${RESET} No se encontraron skills relevantes`);
    }

    console.log('');
  }
}

/**
 * Paso 4: Execution - Ejecutar Skills
 */
async function step4_ExecutionDemo() {
  console.log(`\n${BOLD}${YELLOW}[PASO 4] Execution - Ejecutar Skills${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  const executions = [
    {
      query: '¿Puedo obtener un reembolso?',
      description: 'Context-aware skill con RAG'
    },
    {
      query: 'verificar pagos en stripe',
      description: 'Tool-based skill'
    },
    {
      query: 'crear resumen de documentación técnica',
      description: 'Hybrid skill'
    }
  ];

  for (let i = 0; i < executions.length; i++) {
    const { query, description } = executions[i];

    console.log(`${MAGENTA}Ejecución ${i + 1}:${RESET} ${description}`);
    console.log(`   Query: "${query}"`);

    // Discover
    const discovery = await skillBank.discover({
      query,
      mode: 'skills',
      expandGraph: true,
      k: 3
    });

    if (discovery.skills.length === 0) {
      console.log(`   ${YELLOW}⚠${RESET} No se encontraron skills\n`);
      continue;
    }

    const topSkill = discovery.skills[0];

    // Execute
    const startTime = Date.now();
    const execution = await skillBank.execute({
      targetId: topSkill.skill.id,
      targetType: 'skill',
      input: { query },
      options: { dryRun: false }
    });
    const duration = Date.now() - startTime;

    if (execution.success) {
      console.log(`   ${GREEN}✓${RESET} Ejecutado: ${topSkill.skill.name}`);
      console.log(`   Tiempo: ${duration}ms`);

      // Mostrar output si es context-aware
      if (execution.output?.context) {
        console.log(`   RAG Context: ${execution.output.context.length} secciones encontradas`);
      }
    } else {
      console.log(`   ${YELLOW}⚠${RESET} Ejecución falló: ${execution.error}`);
    }

    console.log('');
  }
}

/**
 * Paso 5: Analytics - Estadísticas
 */
async function step5_Analytics() {
  console.log(`\n${BOLD}${YELLOW}[PASO 5] Analytics - Estadísticas de Uso${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  try {
    const stats = getExecutionStats();

    console.log(`${CYAN}📊 Estadísticas Generales:${RESET}`);
    console.log(`   Total ejecuciones: ${stats.total}`);
    console.log(`   Tasa de éxito: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   Tiempo promedio: ${stats.averageExecutionTime.toFixed(0)}ms`);

    console.log(`\n${CYAN}📈 Por Tipo de Skill:${RESET}`);
    Object.entries(stats.byType).forEach(([type, count]) => {
      const percent = ((count as number / stats.total) * 100).toFixed(1);
      console.log(`   • ${type}: ${count} (${percent}%)`);
    });

    console.log(`\n${CYAN}🏆 Top 5 Skills Más Usadas:${RESET}`);
    const topSkills = getTopSkills(5);

    topSkills.forEach((skill, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`   ${icon} ${skill.skillId}`);
      console.log(`      Ejecuciones: ${skill.executions}`);
      console.log(`      Éxito: ${(skill.successRate * 100).toFixed(1)}%`);
      console.log(`      Tiempo avg: ${skill.avgExecutionTime.toFixed(0)}ms`);
    });

    console.log(`\n${CYAN}📜 Últimas 5 Ejecuciones:${RESET}`);
    const recent = getRecentExecutions(5);

    recent.forEach((exec, i) => {
      const status = exec.success ? `${GREEN}✓${RESET}` : `${YELLOW}✗${RESET}`;
      const time = new Date(exec.timestamp).toLocaleTimeString();
      console.log(`   ${status} ${time} - ${exec.skillId} (${exec.executionTime}ms)`);
    });

  } catch (error) {
    console.log(`   ${YELLOW}⚠${RESET} Analytics aún no disponibles (ejecuta más skills primero)`);
  }
}

/**
 * Paso 6: Comparison - Antes vs Después
 */
async function step6_Comparison() {
  console.log(`\n${BOLD}${YELLOW}[PASO 6] Comparación - Skill Bank vs Alternativas${RESET}`);
  console.log(`${'─'.repeat(70)}\n`);

  console.log(`${BOLD}Sin Skill Bank:${RESET}`);
  console.log(`   ❌ Agent con lista estática de 10 tools`);
  console.log(`   ❌ Sin contexto de cómo usarlas`);
  console.log(`   ❌ Sin conocimiento de dependencias`);
  console.log(`   ❌ No aprende de ejecuciones`);

  console.log(`\n${BOLD}${GREEN}Con Skill Bank:${RESET}`);
  console.log(`   ${GREEN}✓${RESET} Discovery dinámico (semantic search)`);
  console.log(`   ${GREEN}✓${RESET} 4 tipos de skills (tool/instructional/context/hybrid)`);
  console.log(`   ${GREEN}✓${RESET} RAG integration (context-aware skills)`);
  console.log(`   ${GREEN}✓${RESET} Graph de relaciones (ENABLES, USES, REQUIRES, etc)`);
  console.log(`   ${GREEN}✓${RESET} Execution tracking + Analytics`);
  console.log(`   ${GREEN}✓${RESET} Foundation para Memory & Learning`);

  console.log(`\n${BOLD}Ejemplo Concreto:${RESET}`);
  console.log(`   Query: "¿Cuál es la política de cancelación?"`);
  console.log(`   `);
  console.log(`   ${GREEN}→${RESET} Descubre: "Answer from Terms and Conditions"`);
  console.log(`   ${GREEN}→${RESET} Ejecuta: Consulta RAG con filtro por términos`);
  console.log(`   ${GREEN}→${RESET} Retorna: Contexto de 3-5 secciones relevantes`);
  console.log(`   ${GREEN}→${RESET} Tracking: Registra ejecución para analytics`);
  console.log(`   ${GREEN}→${RESET} Future: Aprenderá preferencias del usuario`);
}

/**
 * Main
 */
async function main() {
  showBanner();

  console.log(`${DIM}Este demo muestra el MVP completo del Skill Bank:${RESET}`);
  console.log(`${DIM}• Indexación de documentos (Fase 1)${RESET}`);
  console.log(`${DIM}• RAG Integration + Execution Tracking${RESET}`);
  console.log(`${DIM}• Discovery → Execute → Analytics${RESET}`);
  console.log(`${DIM}• Foundation para Memory & Learning (Fase 4)${RESET}\n`);

  try {
    await step1_IndexDocuments();
    await step2_RegisterToolsAndSkills();
    await step3_DiscoveryDemo();
    await step4_ExecutionDemo();
    await step5_Analytics();
    await step6_Comparison();

    console.log(`\n${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}${GREEN}║              ✅ Demo Completo Ejecutado                        ║${RESET}`);
    console.log(`${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

    console.log(`${BOLD}Próximos pasos:${RESET}`);
    console.log(`   1. Iniciar servidor: ${CYAN}npm run server${RESET}`);
    console.log(`   2. Probar API: ${CYAN}POST /api/skillbank/discover${RESET}`);
    console.log(`   3. Ver analytics: ${CYAN}GET /api/skillbank/analytics/stats${RESET}`);
    console.log(`   4. Leer docs: ${CYAN}PHASE1_COMPLETE.md, PHASE2_SUMMARY.md${RESET}\n`);

  } catch (error) {
    console.error(`\n${YELLOW}⚠ Error:${RESET}`, error);
    process.exit(1);
  }
}

main();

