#!/usr/bin/env node
/**
 * Script de Indexación Batch - Documentos de Demo
 * 
 * Indexa todos los documentos de ejemplo para demostrar
 * las context-aware skills del Skill Bank
 */

import { indexMarkdownFile } from '../src/cli/indexFile.js';

// Definición de documentos a indexar
const documents = [
  {
    path: 'data/docs/terms_of_service.md',
    id: 'terms_of_service',
    description: 'Términos de Servicio con políticas de cancelación y reembolsos'
  },
  {
    path: 'data/docs/privacy_policy.md',
    id: 'privacy_policy',
    description: 'Política de Privacidad con información sobre datos y GDPR'
  },
  {
    path: 'data/docs/product_catalog.md',
    id: 'product_catalog',
    description: 'Catálogo de Productos con planes Starter, Pro y Enterprise'
  },
  {
    path: 'data/docs/api_documentation.md',
    id: 'api_documentation',
    description: 'Documentación de API con autenticación, endpoints y ejemplos'
  }
];

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Indexación Batch - Documentos de Demo                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`📚 Documentos a indexar: ${documents.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: { doc: string; error: string }[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    console.log(`\n[${i + 1}/${documents.length}] 📄 ${doc.description}`);
    console.log(`────────────────────────────────────────────────────────────────`);
    
    try {
      await indexMarkdownFile(doc.path, doc.id);
      successCount++;
      console.log(`✅ Indexado exitosamente: ${doc.id}`);
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ doc: doc.id, error: errorMsg });
      console.error(`❌ Error indexando ${doc.id}: ${errorMsg}`);
    }
  }

  // Resumen final
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMEN DE INDEXACIÓN                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Estadísticas:`);
  console.log(`   Total documentos:  ${documents.length}`);
  console.log(`   ✅ Exitosos:       ${successCount}`);
  console.log(`   ❌ Errores:        ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errores encontrados:\n`);
    errors.forEach(({ doc, error }) => {
      console.log(`   • ${doc}: ${error}`);
    });
  }

  console.log('\n📝 Próximos pasos:');
  console.log('   1. Verificar documentos indexados: npm run server');
  console.log('   2. Probar context-aware skills: npm run demo:skillbank');
  console.log('   3. Consultar documentos vía API: POST /api/query/smart\n');

  // Exit code basado en resultados
  if (errorCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ¡Indexación completada exitosamente!\n');
    process.exit(0);
  }
}

// Ejecutar script
main().catch((error) => {
  console.error('\n💥 Error fatal durante la indexación:', error);
  process.exit(1);
});

