# Quick Start - Fase 1 Completada ✅

## Cómo Probar el Sistema

### Paso 1: Registrar Skills y Tools

```bash
npm run demo:skillbank
```

**Esto registra:**
- 4 tools: http_request, db_query, file_write, code_executor
- 13 skills (incluyendo 4 context-aware skills)
- Relaciones en el grafo

### Paso 2: Indexar Documentos

```bash
npm run index:demo-docs
```

**Esto indexa:**
- terms_of_service.md (39 secciones)
- privacy_policy.md (55 secciones)
- product_catalog.md (24 secciones)
- api_documentation.md (37 secciones)

**Total: 155 secciones** con embeddings listos para RAG

### Paso 3: Validar Context-Aware Skills

```bash
npm run validate:context-aware
```

**Esto prueba:**
- 5 test cases diferentes
- Discovery de skills relevantes
- Ejecución de skills
- Integración RAG

**Resultado esperado:** 5/5 tests exitosos ✅

---

## Probar Manualmente

### Opción 1: Script TypeScript

```typescript
// test-manual.ts
import { setDbPath } from './src/skills/store/unifiedStore.js';
import { skillBank } from './src/skills/skillBank.js';

setDbPath('skillbank-demo.db');

// 1. Discover
const discovery = await skillBank.discover({
  query: '¿Cuál es la política de cancelación?',
  mode: 'skills',
  expandGraph: true,
  k: 5
});

console.log('Skills encontradas:', discovery.skills.length);
console.log('Top skill:', discovery.skills[0]?.skill.name);

// 2. Execute
if (discovery.skills.length > 0) {
  const execution = await skillBank.execute({
    targetId: discovery.skills[0].skill.id,
    targetType: 'skill',
    input: { query: '¿Cuál es la política de cancelación?' }
  });
  
  console.log('Contexto RAG:', execution.output?.context?.length || 0, 'secciones');
}
```

**Ejecutar:**
```bash
npx tsx test-manual.ts
```

### Opción 2: API REST

**1. Iniciar servidor:**
```bash
npm run server
```

**2. Discover skills:**
```bash
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Cuál es la política de reembolsos?",
    "mode": "skills",
    "expandGraph": true,
    "k": 5
  }'
```

**Respuesta esperada:**
```json
{
  "query": "¿Cuál es la política de reembolsos?",
  "skills": [
    {
      "skill": {
        "id": "answer_from_terms",
        "name": "Answer from Terms and Conditions",
        "skillType": "context_aware"
      },
      "relevance": 0.56,
      "compatibility": 1.0,
      "source": "vector"
    }
  ]
}
```

**3. Execute skill:**
```bash
curl -X POST http://localhost:3000/api/skillbank/execute \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "answer_from_terms",
    "targetType": "skill",
    "input": {
      "query": "¿Cuál es la política de reembolsos?"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "output": {
    "skillType": "context_aware",
    "instructions": "...",
    "context": [
      {
        "nodeId": "32-poltica-de-reembolsos-86b53087",
        "docId": "terms_of_service",
        "score": 0.95,
        "context": "## Política de Reembolsos\n\n- **Reembolso completo**: Disponible dentro de los primeros 14 días...",
        "title": "Política de Reembolsos",
        "level": 2
      }
    ],
    "nativeCapabilities": ["text_analysis", "context_interpretation"],
    "bestPractices": "..."
  },
  "toolsUsed": [],
  "executionTime": 234,
  "logs": []
}
```

---

## Queries de Ejemplo

### Sobre Cancelación (Terms of Service)

```bash
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cómo cancelo mi suscripción?", "mode": "skills", "k": 3}'
```

**Skill esperada:** `answer_from_terms`  
**Documento:** `terms_of_service` → Sección 3.1

### Sobre Privacidad (Privacy Policy)

```bash
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Qué datos personales recopilan?", "mode": "skills", "k": 3}'
```

**Skill esperada:** `answer_from_legal_docs`  
**Documento:** `privacy_policy` → Sección 1.1

### Sobre Pricing (Product Catalog)

```bash
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cuánto cuesta el plan Professional?", "mode": "skills", "k": 3}'
```

**Skill esperada:** `extract_product_info`  
**Documento:** `product_catalog` → Plan Professional

### Sobre API (API Documentation)

```bash
curl -X POST http://localhost:3000/api/skillbank/discover \
  -H "Content-Type: application/json" \
  -d '{"query": "¿Cómo funciona la autenticación OAuth?", "mode": "skills", "k": 3}'
```

**Skill esperada:** `summarize_technical_docs`  
**Documento:** `api_documentation` → Sección 1.1

---

## Verificar Documentos Indexados

### Via API

```bash
curl -X GET http://localhost:3000/api/docs
```

**Respuesta:**
```json
{
  "documents": [
    {
      "docId": "terms_of_service",
      "title": "Términos de Servicio",
      "sectionsCount": 39,
      "createdAt": "2025-12-01T10:30:00Z"
    },
    {
      "docId": "privacy_policy",
      "title": "Política de Privacidad",
      "sectionsCount": 55
    },
    {
      "docId": "product_catalog",
      "title": "Catálogo de Productos",
      "sectionsCount": 24
    },
    {
      "docId": "api_documentation",
      "title": "API Documentation",
      "sectionsCount": 37
    }
  ]
}
```

### Via Query RAG Directo

```bash
curl -X POST http://localhost:3000/api/query/smart \
  -H "Content-Type: application/json" \
  -d '{
    "query": "política de cancelación",
    "k": 3,
    "useGraph": true,
    "maxHops": 1
  }'
```

---

## Estructura de Archivos Creados

```
data/docs/                          ← Documentos de ejemplo
├── terms_of_service.md            ✅ 39 secciones
├── privacy_policy.md              ✅ 55 secciones
├── product_catalog.md             ✅ 24 secciones
└── api_documentation.md           ✅ 37 secciones

examples/
├── index-demo-docs.ts             ✅ Script de indexación batch
└── validate-context-aware-skills.ts  ✅ Script de validación

skillbank-demo.db                  ✅ Base de datos de skills/tools
documents.json                     ✅ Store JSON de documentos
rag.db                             ✅ Vector store con embeddings
```

---

## Comandos Útiles

```bash
# Setup completo desde cero
npm run demo:skillbank        # Registrar skills/tools
npm run index:demo-docs       # Indexar documentos
npm run validate:context-aware # Validar todo

# Development
npm run server               # Servidor API
npm run dev                  # Servidor con watch mode
npm test                     # Todos los tests
npm run test:skills          # Solo tests de Skill Bank

# Indexación individual
npx tsx src/cli/indexFile.ts data/docs/terms_of_service.md

# Graph building (después de indexar)
npx tsx src/cli/buildGraph.ts same-topic
```

---

## Troubleshooting

### "Skills encontradas: 0"

**Solución:** Ejecutar primero `npm run demo:skillbank` para registrar skills.

### "No se encuentra el documento"

**Solución:** Ejecutar `npm run index:demo-docs` para indexar documentos.

### "Module not found"

**Solución:**
```bash
npm install
npx tsx src/cli/buildGraph.ts same-topic  # Rebuild graph
```

### "Port 3000 already in use"

**Solución:**
```bash
# Cambiar puerto en .env
echo "API_PORT=3001" >> .env
```

---

## Próximos Pasos

### Fase 2: Tests Adicionales

- [ ] Crear tests unitarios para RAG Integration
- [ ] Tests para Execution Store
- [ ] Integration test E2E completo

### Fase 3: Demo E2E

- [ ] Demo interactivo completo
- [ ] Visualización de resultados

### Fase 4: Memory & Learning Foundation

- [ ] User tracking en Execution Store
- [ ] API extensions para analytics por usuario

---

## Soporte

**Documentación completa:**
- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md) - Reporte completo de Fase 1
- [SKILLBANK.md](SKILLBANK.md) - Overview del Skill Bank
- [README.md](README.md) - Documentación general

**Issues conocidos:**
- Test de performance ocasionalmente falla (no crítico)
- Los IDs de skills pueden diferir de los esperados en validación

---

**✅ Sistema funcionando end-to-end**

**Última actualización:** 1 de diciembre de 2025

