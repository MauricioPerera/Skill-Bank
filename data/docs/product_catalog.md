# Catálogo de Productos

## RAG Platform - Soluciones de Gestión de Conocimiento

Bienvenido a nuestro catálogo de productos. Ofrecemos tres planes diseñados para diferentes necesidades, desde equipos pequeños hasta empresas grandes.

---

## Plan Starter

### Descripción General

El plan perfecto para equipos pequeños y startups que comienzan con RAG (Retrieval-Augmented Generation) y gestión de conocimiento.

### Características Principales

#### Almacenamiento y Documentos
- **Almacenamiento:** 10 GB
- **Documentos:** Hasta 1,000 documentos
- **Formatos soportados:** Markdown, TXT, PDF (básico)
- **Tamaño máximo por documento:** 5 MB

#### Capacidades de Búsqueda
- **Consultas mensuales:** 1,000 queries
- **Vector search:** ✅ Incluido
- **Graph RAG:** ❌ No disponible
- **Hybrid search (BM25 + Vector):** ❌ No disponible
- **Matryoshka embeddings:** ✅ Incluido

#### Skill Bank
- **Tools disponibles:** 4 tools básicas (http_request, db_query, file_write, code_executor)
- **Skills incluidas:** 5 skills pre-configuradas
- **Skills personalizadas:** Hasta 10
- **Graph relationships:** Básico (3 tipos de edges)

#### Embeddings
- **Servicio:** Mock embeddings (testing) o Ollama (local)
- **Dimensiones:** 768
- **Modelos soportados:** nomic-embed-text, mxbai-embed-large

#### API y Integraciones
- **API REST:** ✅ Full access
- **Rate limiting:** 60 requests/minute
- **Webhooks:** 5 webhooks activos
- **Autenticación:** API key básica

#### Soporte
- **Documentación:** Completa
- **Soporte comunitario:** Discord, GitHub Discussions
- **Soporte técnico:** Email (respuesta en 48h)
- **SLA:** 99.5% uptime

### Precio

**$49 USD/mes**

- Facturación mensual
- Cancelación en cualquier momento
- Sin compromiso

### Casos de Uso Ideales

- 📚 Equipos de documentación técnica
- 🎓 Proyectos académicos
- 🚀 Startups en fase temprana
- 👨‍💻 Desarrolladores individuales

### Limitaciones

- No incluye embeddings de OpenAI (solo local con Ollama)
- Sin Graph RAG avanzado
- Sin sub-agents o delegación
- Sin memory & learning personalizado

---

## Plan Professional

### Descripción General

Para equipos en crecimiento que necesitan capacidades avanzadas de RAG, analytics detallados y mejor rendimiento.

### Características Principales

#### Almacenamiento y Documentos
- **Almacenamiento:** 100 GB
- **Documentos:** Hasta 50,000 documentos
- **Formatos soportados:** Markdown, TXT, PDF, DOCX, HTML
- **Tamaño máximo por documento:** 50 MB
- **OCR:** ✅ Para PDFs escaneados

#### Capacidades de Búsqueda
- **Consultas mensuales:** 50,000 queries
- **Vector search:** ✅ Optimizado
- **Graph RAG:** ✅ Incluido (multi-hop hasta 3 niveles)
- **Hybrid search (BM25 + Vector):** ✅ Incluido
- **Matryoshka embeddings:** ✅ Con optimización avanzada
- **Query caching:** ✅ LRU cache con TTL

#### Skill Bank
- **Tools disponibles:** 4 tools básicas + 10 tools avanzadas
- **Skills incluidas:** 20 skills pre-configuradas
- **Skills personalizadas:** Ilimitadas
- **Graph relationships:** Avanzado (7 tipos de edges)
- **Skill composition:** ✅ Combinar skills automáticamente
- **Context-aware skills:** ✅ Con RAG integration completa

#### Embeddings
- **Servicio:** Ollama (local) + OpenAI (cloud opcional)
- **Dimensiones:** 768-1536 (configurable)
- **Modelos soportados:** 
  - Ollama: nomic-embed-text, embeddinggemma, mxbai-embed-large
  - OpenAI: text-embedding-3-small, text-embedding-3-large
- **Batch processing:** ✅ Hasta 1000 documentos/batch

#### Knowledge Graph
- **Entidades:** Extracción automática de 7 tipos de entidades
- **Relaciones:** 6 tipos de edges
- **Visualización:** Exportar a D3.js, Cytoscape, Vis.js
- **REFERS_TO detection:** ✅ Automático desde markdown links

#### API y Integraciones
- **API REST:** ✅ Full access
- **Rate limiting:** 300 requests/minute
- **Webhooks:** 50 webhooks activos
- **Autenticación:** API key + OAuth 2.0
- **SDKs:** TypeScript, Python (en desarrollo)

#### Analytics y Monitoring
- **Execution tracking:** ✅ Completo
- **Dashboard de analytics:** ✅ Incluido
- **Top skills metrics:** ✅ Incluido
- **Success rate tracking:** ✅ Incluido
- **Query patterns analysis:** ✅ Incluido
- **Cost monitoring:** ✅ Para embeddings de OpenAI

#### Soporte
- **Documentación:** Completa + Guías avanzadas
- **Soporte comunitario:** Discord, GitHub Discussions
- **Soporte técnico:** Email + Chat (respuesta en 12h)
- **SLA:** 99.9% uptime
- **Onboarding call:** 1 sesión de 1 hora

### Precio

**$299 USD/mes**

- Facturación mensual o anual (20% descuento anual)
- 14 días de prueba gratuita
- Cancelación en cualquier momento

**O**

**$2,990 USD/año** (ahorra $598)

### Casos de Uso Ideales

- 🏢 Equipos medianos (10-50 personas)
- 📊 Analytics avanzados
- 🤖 Desarrollo de agentes AI
- 📈 Productos basados en RAG
- 🔬 Investigación y desarrollo

### Mejoras vs Starter

| Feature | Starter | Professional |
|---------|---------|--------------|
| Almacenamiento | 10 GB | 100 GB (10x) |
| Consultas/mes | 1,000 | 50,000 (50x) |
| Graph RAG | ❌ | ✅ |
| OpenAI embeddings | ❌ | ✅ |
| Analytics dashboard | ❌ | ✅ |
| Hybrid search | ❌ | ✅ |
| Skills personalizadas | 10 | Ilimitadas |
| Soporte | 48h | 12h |

---

## Plan Enterprise

### Descripción General

Solución completa para grandes organizaciones que requieren máxima performance, seguridad, personalización y soporte dedicado.

### Características Principales

#### Almacenamiento y Documentos
- **Almacenamiento:** 1 TB+ (personalizable)
- **Documentos:** Ilimitados
- **Formatos soportados:** Todos los formatos + custom parsers
- **Tamaño máximo por documento:** 500 MB
- **OCR:** ✅ Avanzado con múltiples idiomas
- **Custom data connectors:** ✅ Integración con sistemas internos

#### Capacidades de Búsqueda
- **Consultas mensuales:** Ilimitadas
- **Vector search:** ✅ Optimizado con hardware dedicado
- **Graph RAG:** ✅ Multi-hop ilimitado
- **Hybrid search:** ✅ Con reranking personalizado
- **Matryoshka embeddings:** ✅ Optimización custom
- **Query caching:** ✅ Redis dedicado
- **Cross-lingual search:** ✅ Búsqueda multiidioma

#### Skill Bank - Completo
- **Tools disponibles:** Todas + custom tools
- **Skills incluidas:** 100+ skills enterprise-grade
- **Skills personalizadas:** Ilimitadas
- **Graph relationships:** Completo (todos los tipos)
- **Skill composition:** ✅ Avanzado con validation
- **Context-aware skills:** ✅ Con multi-document context

#### Credentials & Security 🔐
- **Credentials vault:** ✅ Incluido
- **Encrypted storage:** ✅ AES-256
- **Scoped access:** ✅ Por skill/agent
- **Audit trail:** ✅ Completo con compliance reports
- **Rotation policies:** ✅ Automático

#### Sub-Agents 🤖 (Roadmap Q3 2025)
- **Specialized agents:** ✅ Analytics, Payment, Support agents
- **Delegation:** ✅ Task delegation automática
- **Parallel execution:** ✅ Multiple agents simultáneamente
- **Custom agents:** Desarrollar agentes específicos de dominio

#### Memory & Learning ⭐ (Roadmap Q4 2025)
- **User identity:** ✅ Tracking por usuario
- **Conversational memory:** ✅ Contexto persistente
- **Execution history:** ✅ Historial completo
- **User preferences:** ✅ Aprendizaje automático
- **Pattern detection:** ✅ Optimización continua
- **Personalization:** ✅ Por usuario y organización

#### Embeddings
- **Servicio:** Cualquier combinación
- **Dimensiones:** Configurables (64-3072)
- **Modelos soportados:** Todos + fine-tuned models propios
- **Batch processing:** Ilimitado
- **Custom models:** ✅ Entrenamiento de modelos propios

#### Knowledge Graph Avanzado
- **Entidades:** Custom entity types
- **Relaciones:** Custom edge types
- **Visualización:** Dashboard interactivo personalizado
- **Graph algorithms:** PageRank, Community detection, etc.
- **Temporal graphs:** ✅ Evolución del grafo en el tiempo

#### API y Integraciones
- **API REST:** ✅ Full access sin rate limits
- **GraphQL API:** ✅ Incluido
- **Webhooks:** Ilimitados
- **Autenticación:** API key + OAuth 2.0 + SAML/SSO
- **SDKs:** TypeScript, Python, Java, Go
- **Custom integrations:** ✅ Desarrollo a medida

#### Infrastructure
- **Deployment:** Cloud, On-premise, o Hybrid
- **Dedicated instances:** ✅ Recursos dedicados
- **Custom domains:** ✅ your-company.rag-platform.com
- **VPC peering:** ✅ Para conexión segura
- **Disaster recovery:** ✅ Multi-region failover

#### Analytics y Monitoring
- **Todo del plan Professional +**
- **Custom dashboards:** ✅ Grafana/Kibana integration
- **Real-time monitoring:** ✅ Con alertas
- **Usage forecasting:** ✅ Predicción de costos
- **Compliance reports:** ✅ GDPR, SOC 2, HIPAA
- **Data retention policies:** ✅ Personalizables

#### Soporte
- **Documentación:** Completa + Documentación personalizada
- **Soporte técnico:** 24/7 con SLA garantizado
- **Respuesta:** Critical issues en 1h, otros en 4h
- **SLA:** 99.99% uptime con compensación
- **Onboarding:** Programa completo de 4 semanas
- **Training:** Sesiones de training para el equipo
- **Account manager:** Dedicated account manager
- **Quarterly reviews:** Business reviews trimestrales

### Precio

**Personalizado** (desde $2,500 USD/mes)

- Facturación anual
- Contrato mínimo de 1 año
- Pricing basado en:
  - Número de usuarios
  - Volumen de documentos
  - Consultas mensuales
  - Features específicas requeridas
  - Deployment type (cloud vs on-premise)

**Contactar ventas:** sales@example.com

### Casos de Uso Ideales

- 🏦 Instituciones financieras
- 🏥 Healthcare y pharma
- 🏛️ Gobierno y sector público
- 🏢 Grandes corporaciones (500+ empleados)
- 🔬 Research institutions
- 📚 Content platforms masivos

### Mejoras vs Professional

| Feature | Professional | Enterprise |
|---------|--------------|------------|
| Almacenamiento | 100 GB | 1 TB+ |
| Consultas/mes | 50,000 | Ilimitadas |
| Credentials vault | ❌ | ✅ |
| Sub-agents | ❌ | ✅ (Q3 2025) |
| Memory & Learning | ❌ | ✅ (Q4 2025) |
| On-premise deployment | ❌ | ✅ |
| Soporte | 12h | 24/7 (1h critical) |
| Account manager | ❌ | ✅ |
| Custom development | ❌ | ✅ |

---

## Comparación Rápida

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Precio/mes** | $49 | $299 | Personalizado ($2,500+) |
| **Almacenamiento** | 10 GB | 100 GB | 1 TB+ |
| **Consultas/mes** | 1,000 | 50,000 | Ilimitadas |
| **Graph RAG** | ❌ | ✅ | ✅ |
| **OpenAI embeddings** | ❌ | ✅ | ✅ |
| **Skills personalizadas** | 10 | Ilimitadas | Ilimitadas |
| **Credentials vault** | ❌ | ❌ | ✅ |
| **Sub-agents** | ❌ | ❌ | ✅ |
| **Memory & Learning** | ❌ | ❌ | ✅ |
| **Soporte** | 48h | 12h | 24/7 (1h) |
| **SLA** | 99.5% | 99.9% | 99.99% |

---

## Preguntas Frecuentes

### ¿Puedo cambiar de plan?

Sí, puede actualizar o degradar su plan en cualquier momento. Los cambios se aplican al inicio del próximo ciclo de facturación.

### ¿Hay período de prueba?

- **Starter:** 7 días de prueba gratuita
- **Professional:** 14 días de prueba gratuita
- **Enterprise:** Demo personalizada + POC de 30 días

### ¿Qué sucede si excedo mis límites?

Los overages se facturan automáticamente:

- **Consultas adicionales:** $0.01 por consulta (paquetes de 1,000)
- **Almacenamiento adicional:** $5 por GB adicional/mes
- **Embeddings OpenAI:** Según pricing de OpenAI ($0.02/1M tokens)

### ¿Ofrecen descuentos?

- **Anual:** 20% de descuento en planes Starter y Professional
- **Educación:** 50% de descuento para instituciones académicas
- **Non-profit:** 40% de descuento para organizaciones sin fines de lucro
- **Startups:** 30% de descuento para startups aceleradas

### ¿Puedo usar Ollama en todos los planes?

Sí, Ollama (embeddings locales) está disponible en todos los planes sin costo adicional.

### ¿Qué métodos de pago aceptan?

- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- Transferencia bancaria (Enterprise)
- Purchase orders (Enterprise)

---

## Contacto

### Ventas
**Email:** sales@example.com  
**Teléfono:** +1 (555) 123-4567

### Soporte Técnico
**Email:** support@example.com  
**Chat:** Disponible en el dashboard

### Demos
Solicite una demo personalizada: [Book a demo](https://example.com/demo)

---

**Última actualización:** 1 de diciembre de 2025

**Todos los precios en USD. IVA no incluido donde aplique.**

