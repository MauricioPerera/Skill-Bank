# API Documentation

## RAG Platform REST API v1.0

Bienvenido a la documentación de la API REST de nuestra plataforma RAG. Esta API permite acceso programático a todas las funcionalidades del sistema.

**Base URL:** `https://api.example.com/v1`

**Documentación interactiva:** [Swagger UI](https://api.example.com/docs)

---

## Tabla de Contenidos

1. [Authentication](#1-authentication)
2. [Rate Limiting](#2-rate-limiting)
3. [Error Handling](#3-error-handling)
4. [Document Management](#4-document-management)
5. [RAG Queries](#5-rag-queries)
6. [Skill Bank](#6-skill-bank)
7. [Analytics](#7-analytics)
8. [Webhooks](#8-webhooks)

---

## 1. Authentication

### 1.1 OAuth 2.0 (Recomendado)

La API usa OAuth 2.0 con el flujo de Client Credentials para autenticación.

**Endpoint de token:**
```
POST https://api.example.com/oauth/token
```

**Request:**
```bash
curl -X POST https://api.example.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

**Usar el token:**
```bash
curl -X GET https://api.example.com/v1/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 1.2 API Keys (Simple)

Para desarrollo y testing, puede usar API keys.

**Obtener API key:**
1. Acceda al Dashboard
2. Vaya a Settings → API Keys
3. Cree una nueva API key

**Usar API key:**
```bash
curl -X GET https://api.example.com/v1/documents \
  -H "X-API-Key: YOUR_API_KEY"
```

### 1.3 Scopes y Permisos

| Scope | Descripción | Endpoints |
|-------|-------------|-----------|
| `read` | Lectura de documentos y queries | GET /documents, POST /query |
| `write` | Crear/modificar documentos | POST /documents, PUT /documents/:id |
| `delete` | Eliminar documentos | DELETE /documents/:id |
| `admin` | Acceso administrativo completo | Todos |

**Ejemplo de token con scopes:**
```json
{
  "access_token": "...",
  "scope": "read write",
  "expires_in": 3600
}
```

---

## 2. Rate Limiting

### 2.1 Límites por Plan

| Plan | Requests/minuto | Requests/día | Burst |
|------|-----------------|--------------|-------|
| **Starter** | 60 | 10,000 | 120 |
| **Professional** | 300 | 100,000 | 600 |
| **Enterprise** | Ilimitado | Ilimitado | N/A |

### 2.2 Headers de Rate Limit

Cada respuesta incluye headers de rate limiting:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1638360000
X-RateLimit-Retry-After: 30
```

### 2.3 Respuesta al Exceder Límite

**Status Code:** `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retryAfter": 30
  }
}
```

### 2.4 Mejores Prácticas

- **Cachear respuestas:** Evite requests duplicados
- **Usar webhooks:** En lugar de polling
- **Batch requests:** Agrupar múltiples operaciones
- **Exponential backoff:** Al recibir 429

**Ejemplo de backoff:**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 3. Error Handling

### 3.1 Códigos de Estado HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| **200** | OK | Request exitoso |
| **201** | Created | Recurso creado exitosamente |
| **400** | Bad Request | Request inválido (validación fallida) |
| **401** | Unauthorized | Autenticación requerida o fallida |
| **403** | Forbidden | Sin permisos para este recurso |
| **404** | Not Found | Recurso no encontrado |
| **409** | Conflict | Conflicto (ej: documento ya existe) |
| **422** | Unprocessable Entity | Validación de negocio fallida |
| **429** | Too Many Requests | Rate limit excedido |
| **500** | Internal Server Error | Error del servidor |
| **503** | Service Unavailable | Servicio temporalmente no disponible |

### 3.2 Formato de Errores

Todos los errores siguen este formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-12-01T10:30:00Z"
  }
}
```

### 3.3 Códigos de Error Comunes

| Code | HTTP Status | Descripción |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request malformado |
| `VALIDATION_ERROR` | 400 | Validación de campos fallida |
| `UNAUTHORIZED` | 401 | Token inválido o expirado |
| `FORBIDDEN` | 403 | Sin permisos |
| `NOT_FOUND` | 404 | Recurso no existe |
| `CONFLICT` | 409 | Recurso ya existe |
| `RATE_LIMIT_EXCEEDED` | 429 | Demasiados requests |
| `INTERNAL_ERROR` | 500 | Error interno |
| `SERVICE_UNAVAILABLE` | 503 | Servicio no disponible |

### 3.4 Ejemplo de Manejo de Errores

```javascript
try {
  const response = await fetch('https://api.example.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(document)
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (error.error.code) {
      case 'VALIDATION_ERROR':
        console.error('Validation failed:', error.error.details);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.error('Rate limited. Retry after:', error.error.retryAfter);
        break;
      default:
        console.error('Error:', error.error.message);
    }
    
    throw new Error(error.error.message);
  }

  return await response.json();
} catch (error) {
  console.error('Request failed:', error);
}
```

---

## 4. Document Management

### 4.1 Create Document

Crea e indexa un nuevo documento.

**Endpoint:**
```
POST /v1/documents
```

**Request:**
```json
{
  "docId": "getting-started",
  "title": "Getting Started Guide",
  "content": "# Getting Started\n\n## Installation\n\n...",
  "metadata": {
    "author": "John Doe",
    "tags": ["guide", "tutorial"],
    "category": "documentation"
  }
}
```

**Response:** `201 Created`
```json
{
  "document": {
    "docId": "getting-started",
    "title": "Getting Started Guide",
    "version": 1,
    "sectionsCount": 5,
    "createdAt": "2025-12-01T10:30:00Z",
    "metadata": {
      "author": "John Doe",
      "tags": ["guide", "tutorial"]
    }
  },
  "indexing": {
    "status": "queued",
    "estimatedTime": 30
  }
}
```

### 4.2 Get Document

Obtiene un documento por ID.

**Endpoint:**
```
GET /v1/documents/:docId
```

**Response:** `200 OK`
```json
{
  "document": {
    "docId": "getting-started",
    "title": "Getting Started Guide",
    "version": 2,
    "sectionsCount": 5,
    "createdAt": "2025-12-01T10:30:00Z",
    "updatedAt": "2025-12-01T11:00:00Z",
    "metadata": {
      "author": "John Doe",
      "tags": ["guide", "tutorial"]
    }
  }
}
```

### 4.3 Update Document

Actualiza un documento existente.

**Endpoint:**
```
PUT /v1/documents/:docId
```

**Request:**
```json
{
  "content": "# Updated Content\n\n...",
  "metadata": {
    "author": "Jane Smith",
    "tags": ["guide", "tutorial", "updated"]
  }
}
```

**Response:** `200 OK`

### 4.4 Delete Document

Elimina un documento y sus embeddings.

**Endpoint:**
```
DELETE /v1/documents/:docId
```

**Response:** `204 No Content`

### 4.5 List Documents

Lista todos los documentos con paginación.

**Endpoint:**
```
GET /v1/documents?page=1&limit=20&tags=tutorial
```

**Query Parameters:**
- `page` (number): Página actual (default: 1)
- `limit` (number): Items por página (default: 20, max: 100)
- `tags` (string): Filtrar por tags (comma-separated)
- `category` (string): Filtrar por categoría

**Response:** `200 OK`
```json
{
  "documents": [
    {
      "docId": "getting-started",
      "title": "Getting Started Guide",
      "sectionsCount": 5,
      "createdAt": "2025-12-01T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 5. RAG Queries

### 5.1 Smart Query (Graph-Aware RAG)

Ejecuta una query con graph expansion (recomendado).

**Endpoint:**
```
POST /v1/query/smart
```

**Request:**
```json
{
  "query": "What is deep learning?",
  "k": 5,
  "useGraph": true,
  "maxHops": 2,
  "maxNodes": 10,
  "edgeTypes": ["SAME_TOPIC", "PARENT_OF"],
  "minWeight": 0.75,
  "filters": {
    "docId": "ml-guide",
    "tags": ["tutorial"]
  }
}
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "nodeId": "sec-3-2",
      "docId": "ml-guide",
      "title": "Deep Learning Basics",
      "content": "Deep learning is a subset of machine learning...",
      "score": 0.95,
      "source": "vector",
      "hop": 0
    },
    {
      "nodeId": "sec-3-3",
      "docId": "ml-guide",
      "title": "Neural Networks",
      "content": "Neural networks are the foundation...",
      "score": 0.88,
      "source": "graph",
      "hop": 1,
      "path": ["sec-3-2", "sec-3-3"]
    }
  ],
  "metadata": {
    "totalResults": 8,
    "vectorResults": 5,
    "graphResults": 3,
    "executionTime": 45
  }
}
```

### 5.2 Classic Query (Vector-Only)

Búsqueda vectorial sin graph expansion.

**Endpoint:**
```
POST /v1/query/classic
```

**Request:**
```json
{
  "query": "machine learning algorithms",
  "k": 3,
  "filters": {
    "level": 2,
    "is_leaf": 1
  }
}
```

**Response:** Similar a smart query pero sin graph expansion.

---

## 6. Skill Bank

### 6.1 Discover Capabilities

Busca tools y skills relevantes.

**Endpoint:**
```
POST /v1/skillbank/discover
```

**Request:**
```json
{
  "query": "verificar pagos en stripe y generar reporte",
  "mode": "all",
  "expandGraph": true,
  "k": 5,
  "categories": ["api", "reports"]
}
```

**Response:** `200 OK`
```json
{
  "query": "verificar pagos en stripe y generar reporte",
  "tools": [
    {
      "tool": {
        "id": "http_request",
        "name": "HTTP Request",
        "category": "http"
      },
      "relevance": 0.85,
      "source": "vector"
    }
  ],
  "skills": [
    {
      "skill": {
        "id": "stripe_api_handler",
        "name": "Stripe API Handler",
        "skillType": "tool_based",
        "usesTools": ["http_request"]
      },
      "relevance": 0.94,
      "compatibility": 1.0,
      "source": "vector"
    },
    {
      "skill": {
        "id": "pdf_report_generator",
        "name": "PDF Report Generator"
      },
      "relevance": 0.88,
      "compatibility": 1.0,
      "source": "graph",
      "hopDistance": 1
    }
  ],
  "suggestedFlow": {
    "steps": [
      {
        "entityId": "stripe_api_handler",
        "entityType": "skill",
        "order": 0
      },
      {
        "entityId": "pdf_report_generator",
        "entityType": "skill",
        "order": 1
      }
    ],
    "confidence": 0.85
  }
}
```

### 6.2 Execute Skill

Ejecuta una skill con input específico.

**Endpoint:**
```
POST /v1/skillbank/execute
```

**Request:**
```json
{
  "targetId": "stripe_api_handler",
  "targetType": "skill",
  "input": {
    "action": "list_customers",
    "limit": 10
  },
  "options": {
    "timeout": 30000,
    "retries": 3,
    "dryRun": false
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "output": {
    "customers": [
      {
        "id": "cus_abc123",
        "email": "customer@example.com"
      }
    ],
    "count": 10
  },
  "toolsUsed": ["http_request"],
  "executionTime": 234,
  "logs": [
    {
      "level": "info",
      "message": "Executing http_request",
      "timestamp": "2025-12-01T10:30:00Z"
    }
  ]
}
```

---

## 7. Analytics

### 7.1 Get Execution Stats

Obtiene estadísticas de ejecución.

**Endpoint:**
```
GET /v1/skillbank/analytics/stats
```

**Response:** `200 OK`
```json
{
  "total": 1247,
  "bySkill": {
    "stripe_api_handler": 453,
    "pdf_report_generator": 312
  },
  "byType": {
    "tool_based": 765,
    "context_aware": 312,
    "instructional": 170
  },
  "successRate": 0.96,
  "averageExecutionTime": 234
}
```

### 7.2 Get Top Skills

Lista las skills más usadas.

**Endpoint:**
```
GET /v1/skillbank/analytics/top-skills?limit=10
```

**Response:** `200 OK`
```json
{
  "topSkills": [
    {
      "skillId": "stripe_api_handler",
      "executions": 453,
      "successRate": 0.98,
      "avgExecutionTime": 189
    }
  ]
}
```

---

## 8. Webhooks

### 8.1 Crear Webhook

**Endpoint:**
```
POST /v1/webhooks
```

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["document.indexed", "query.completed"],
  "secret": "your_webhook_secret"
}
```

**Response:** `201 Created`
```json
{
  "webhook": {
    "id": "wh_abc123",
    "url": "https://your-app.com/webhook",
    "events": ["document.indexed"],
    "secret": "wh_secret_xyz",
    "active": true,
    "createdAt": "2025-12-01T10:30:00Z"
  }
}
```

### 8.2 Eventos Disponibles

- `document.indexed` - Documento indexado
- `document.updated` - Documento actualizado
- `document.deleted` - Documento eliminado
- `query.completed` - Query completado
- `skill.executed` - Skill ejecutada

### 8.3 Payload de Webhook

```json
{
  "event": "document.indexed",
  "timestamp": "2025-12-01T10:30:00Z",
  "data": {
    "docId": "getting-started",
    "sectionsCount": 5
  },
  "signature": "sha256=abc123..."
}
```

---

## Soporte

**Documentación completa:** [https://docs.example.com](https://docs.example.com)

**Soporte técnico:** support@example.com

**Status page:** [https://status.example.com](https://status.example.com)

---

**Versión de API:** v1.0

**Última actualización:** 1 de diciembre de 2025

