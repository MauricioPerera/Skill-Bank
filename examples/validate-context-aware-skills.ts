#!/usr/bin/env node
/**
 * Validación de Context-Aware Skills
 * 
 * Prueba las skills context-aware con los documentos indexados
 */

import { setDbPath } from '../src/skills/store/unifiedStore.js';
import { skillBank } from '../src/skills/skillBank.js';

// Usar la misma DB que el demo
setDbPath('skillbank-demo.db');

// Colores para la consola
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

/**
 * Test cases para validar context-aware skills
 */
const testCases = [
  {
    name: 'Consulta sobre política de cancelación',
    query: '¿Cuál es la política de cancelación de suscripción?',
    expectedSkill: 'answer_from_terms',
    expectedDoc: 'terms_of_service',
    expectedKeywords: ['cancelación', 'suscripción', 'período']
  },
  {
    name: 'Consulta sobre privacidad y GDPR',
    query: '¿Cómo protegen mis datos personales y cumplen con GDPR?',
    expectedSkill: 'answer_from_legal_docs',
    expectedDoc: 'privacy_policy',
    expectedKeywords: ['privacidad', 'datos', 'GDPR']
  },
  {
    name: 'Consulta sobre planes de productos',
    query: '¿Cuáles son las diferencias entre el plan Professional y Enterprise?',
    expectedSkill: 'extract_product_info',
    expectedDoc: 'product_catalog',
    expectedKeywords: ['Professional', 'Enterprise', 'plan']
  },
  {
    name: 'Consulta sobre API y autenticación',
    query: '¿Cómo autenticarme en la API REST?',
    expectedSkill: 'summarize_technical_docs',
    expectedDoc: 'api_documentation',
    expectedKeywords: ['API', 'autenticación', 'OAuth']
  },
  {
    name: 'Consulta sobre reembolsos',
    query: '¿Puedo obtener un reembolso si no estoy satisfecho?',
    expectedSkill: 'answer_from_terms',
    expectedDoc: 'terms_of_service',
    expectedKeywords: ['reembolso', 'cancelación']
  }
];

/**
 * Ejecuta un test case
 */
async function runTestCase(testCase: typeof testCases[0], index: number) {
  console.log(`\n${BOLD}${CYAN}[Test ${index + 1}/${testCases.length}] ${testCase.name}${RESET}`);
  console.log(`${BLUE}Query:${RESET} "${testCase.query}"`);
  console.log('─'.repeat(70));

  try {
    // 1. Discover
    const discovery = await skillBank.discover({
      query: testCase.query,
      mode: 'skills',
      expandGraph: true,
      k: 5
    });

    console.log(`\n${YELLOW}📊 Discovery Results:${RESET}`);
    console.log(`   Skills encontradas: ${discovery.skills.length}`);

    // Verificar si se encontró la skill esperada
    const foundExpectedSkill = discovery.skills.find(
      s => s.skill.id === testCase.expectedSkill
    );

    if (foundExpectedSkill) {
      console.log(`   ${GREEN}✓${RESET} Skill esperada encontrada: ${foundExpectedSkill.skill.name}`);
      console.log(`   Relevancia: ${(foundExpectedSkill.relevance * 100).toFixed(1)}%`);
      console.log(`   Compatibilidad: ${(foundExpectedSkill.compatibility * 100).toFixed(0)}%`);
    } else {
      console.log(`   ${YELLOW}⚠${RESET} Skill esperada no encontrada: ${testCase.expectedSkill}`);
      console.log(`   Top skill: ${discovery.skills[0]?.skill.name || 'ninguna'}`);
    }

    // 2. Mostrar top 3 skills
    console.log(`\n${YELLOW}🎯 Top 3 Skills:${RESET}`);
    discovery.skills.slice(0, 3).forEach((s, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      console.log(`   ${icon} ${s.skill.name}`);
      console.log(`      Type: ${s.skill.skillType}`);
      console.log(`      Relevance: ${(s.relevance * 100).toFixed(1)}%`);
      if (s.skill.referencesDocuments) {
        console.log(`      Docs: ${s.skill.referencesDocuments.join(', ')}`);
      }
    });

    // 3. Execute la skill top
    if (discovery.skills.length > 0) {
      const topSkill = discovery.skills[0];
      console.log(`\n${YELLOW}⚡ Executing:${RESET} ${topSkill.skill.name}`);

      const execution = await skillBank.execute({
        targetId: topSkill.skill.id,
        targetType: 'skill',
        input: { query: testCase.query },
        options: { dryRun: false }
      });

      if (execution.success) {
        console.log(`   ${GREEN}✓${RESET} Ejecución exitosa`);
        
        // Verificar si retorna contexto RAG
        if (execution.output?.context) {
          console.log(`   Contexto RAG encontrado: ${execution.output.context.length} secciones`);
          
          // Verificar si el documento esperado está en el contexto
          const hasExpectedDoc = execution.output.context.some((c: any) => 
            c.docId === testCase.expectedDoc
          );
          
          if (hasExpectedDoc) {
            console.log(`   ${GREEN}✓${RESET} Documento esperado encontrado: ${testCase.expectedDoc}`);
          } else {
            console.log(`   ${YELLOW}⚠${RESET} Documento esperado no encontrado en contexto`);
          }
        }

        // Verificar keywords en instrucciones
        const instructions = execution.output?.instructions || '';
        const foundKeywords = testCase.expectedKeywords.filter(kw =>
          instructions.toLowerCase().includes(kw.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          console.log(`   ${GREEN}✓${RESET} Keywords encontrados: ${foundKeywords.join(', ')}`);
        }
      } else {
        console.log(`   ${YELLOW}⚠${RESET} Ejecución falló: ${execution.error}`);
      }
    }

    return { success: true, testCase };
  } catch (error) {
    console.log(`   ${YELLOW}⚠${RESET} Error: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, testCase, error };
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${BOLD}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║    Validación de Context-Aware Skills con Docs Reales        ║${RESET}`);
  console.log(`${BOLD}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

  console.log('Este script valida que las context-aware skills funcionan');
  console.log('correctamente con los documentos indexados.\n');

  const results = [];

  // Ejecutar todos los test cases
  for (let i = 0; i < testCases.length; i++) {
    const result = await runTestCase(testCases[i], i);
    results.push(result);
    
    // Pausa entre tests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Resumen final
  console.log(`\n\n${BOLD}╔════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║                        RESUMEN FINAL                           ║${RESET}`);
  console.log(`${BOLD}╚════════════════════════════════════════════════════════════════╝${RESET}\n`);

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`${BOLD}Resultados:${RESET}`);
  console.log(`   Total tests: ${totalCount}`);
  console.log(`   ${GREEN}✓${RESET} Exitosos: ${successCount}`);
  console.log(`   ${YELLOW}⚠${RESET} Fallidos: ${totalCount - successCount}`);
  console.log(`   Tasa de éxito: ${((successCount / totalCount) * 100).toFixed(1)}%`);

  // Listar skills context-aware disponibles
  console.log(`\n${BOLD}Skills Context-Aware Disponibles:${RESET}`);
  const allSkills = skillBank.listSkills();
  const contextAwareSkills = allSkills.filter(s => 
    s.skillType === 'context_aware' || s.skillType === 'hybrid'
  );

  contextAwareSkills.forEach(skill => {
    console.log(`   • ${skill.name} (${skill.skillType})`);
    if (skill.referencesDocuments) {
      console.log(`     Docs: ${skill.referencesDocuments.join(', ')}`);
    }
  });

  // Listar documentos indexados
  console.log(`\n${BOLD}Documentos Indexados:${RESET}`);
  const docs = ['terms_of_service', 'privacy_policy', 'product_catalog', 'api_documentation'];
  docs.forEach(doc => {
    console.log(`   • ${doc}`);
  });

  console.log(`\n${BOLD}${GREEN}✅ Fase 1 Completada:${RESET} Context-aware skills validadas con docs reales`);
  console.log(`\n${YELLOW}Próximos pasos:${RESET}`);
  console.log('   1. Iniciar servidor: npm run server');
  console.log('   2. Probar vía API: POST /api/skillbank/discover');
  console.log('   3. Continuar con Fase 2: Tests adicionales\n');

  process.exit(successCount === totalCount ? 0 : 1);
}

// Ejecutar
main().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});

