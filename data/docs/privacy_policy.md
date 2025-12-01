# Política de Privacidad

## Introducción

Esta Política de Privacidad describe cómo recopilamos, usamos, protegemos y compartimos su información personal cuando utiliza nuestro servicio de gestión de conocimiento y análisis de documentos.

**Fecha de vigencia:** 1 de diciembre de 2025

## 1. Información que Recopilamos

### 1.1 Información de Cuenta

Cuando crea una cuenta, recopilamos:

- **Datos de identificación:** Nombre, apellido, email
- **Datos de autenticación:** Contraseña (encriptada), tokens de sesión
- **Datos de perfil:** Foto de perfil (opcional), zona horaria, preferencias de idioma
- **Datos de organización:** Nombre de empresa, rol, departamento

### 1.2 Información de Uso

Durante el uso del servicio, recopilamos:

- **Documentos cargados:** Contenido, metadata, embeddings generados
- **Queries y búsquedas:** Términos de búsqueda, filtros aplicados
- **Interacciones:** Clicks, navegación, tiempo de uso
- **API calls:** Endpoints accedidos, parámetros, respuestas
- **Skills ejecutadas:** ID de skill, input, output, tiempo de ejecución

### 1.3 Información Técnica

Recopilamos automáticamente:

- **Datos del dispositivo:** Sistema operativo, navegador, versión, idioma
- **Datos de red:** Dirección IP, ubicación geográfica aproximada
- **Logs del servidor:** Timestamps, códigos de respuesta, errores
- **Datos de rendimiento:** Tiempos de respuesta, latencias, métricas de uso

### 1.4 Información de Pago

Si realiza pagos, recopilamos:

- **Datos de facturación:** Nombre, dirección, información fiscal
- **Método de pago:** Últimos 4 dígitos de tarjeta (vía Stripe)
- **Historial de transacciones:** Fechas, montos, estado

**Nota:** No almacenamos información completa de tarjetas de crédito. Los pagos son procesados por Stripe.

### 1.5 Cookies y Tecnologías Similares

Utilizamos cookies para:

- **Autenticación:** Mantener sesiones activas
- **Preferencias:** Recordar configuraciones
- **Analytics:** Entender el uso del servicio
- **Seguridad:** Detectar actividad fraudulenta

Tipos de cookies:
- **Esenciales:** Necesarias para el funcionamiento (no se pueden desactivar)
- **Funcionales:** Mejoran la experiencia del usuario (opcionales)
- **Analytics:** Google Analytics, Mixpanel (opcionales)

## 2. Cómo Usamos su Información

### 2.1 Provisión del Servicio

Usamos sus datos para:

- **Autenticación:** Verificar su identidad y gestionar sesiones
- **Procesamiento de documentos:** Indexar, generar embeddings, realizar búsquedas
- **Ejecución de skills:** Procesar requests y retornar resultados
- **Almacenamiento:** Guardar sus documentos y configuraciones
- **Comunicaciones:** Enviar notificaciones del sistema

### 2.2 Mejora del Servicio

Analizamos datos agregados para:

- **Optimización:** Mejorar rendimiento y precisión de búsqueda
- **Desarrollo de features:** Identificar necesidades y prioridades
- **Detección de bugs:** Identificar y corregir errores
- **Entrenamiento de modelos:** Mejorar algoritmos de RAG (datos anonimizados)

### 2.3 Seguridad y Prevención de Fraude

Monitoreamos para:

- **Detectar accesos no autorizados:** Alertas de seguridad
- **Prevenir abuso:** Rate limiting, detección de patrones anómalos
- **Cumplir con obligaciones legales:** Responder a órdenes judiciales

### 2.4 Comunicaciones

Enviamos emails para:

- **Transaccionales:** Confirmaciones, facturas, reseteo de contraseña
- **Producto:** Nuevas funcionalidades, actualizaciones importantes
- **Marketing:** Newsletter, promociones (opt-in requerido)

Puede darse de baja de comunicaciones de marketing en cualquier momento.

## 3. Cómo Compartimos su Información

### 3.1 NO Vendemos sus Datos

Nunca vendemos ni alquilamos información personal a terceros.

### 3.2 Proveedores de Servicios

Compartimos datos con terceros que nos ayudan a operar el servicio:

| Proveedor | Servicio | Datos Compartidos | Ubicación |
|-----------|----------|-------------------|-----------|
| **AWS** | Hosting, storage | Todos los datos del usuario | EE.UU. |
| **Stripe** | Procesamiento de pagos | Datos de facturación | EE.UU. |
| **SendGrid** | Email transaccional | Email, nombre | EE.UU. |
| **OpenAI** | Embeddings (opcional) | Documentos para procesar | EE.UU. |
| **Google Analytics** | Analytics (opcional) | Datos de uso anonimizados | EE.UU. |

**Todos los proveedores están sujetos a acuerdos de confidencialidad.**

### 3.3 Requisitos Legales

Podemos divulgar información si es requerido por:

- Orden judicial o citación legal
- Investigación de actividades ilegales
- Protección de nuestros derechos o seguridad
- Cumplimiento de regulaciones

### 3.4 Transferencias Corporativas

En caso de fusión, adquisición o venta de activos, su información puede transferirse. Le notificaremos con 30 días de anticipación.

### 3.5 Con su Consentimiento

Compartimos información con terceros adicionales solo con su consentimiento explícito.

## 4. Seguridad de los Datos

### 4.1 Medidas Técnicas

Implementamos:

- **Encriptación en tránsito:** TLS 1.3 para todas las conexiones
- **Encriptación en reposo:** AES-256 para datos almacenados
- **Hashing de contraseñas:** bcrypt con salt
- **Autenticación multifactor:** Disponible para todos los usuarios
- **Firewalls y VPCs:** Aislamiento de red

### 4.2 Medidas Organizacionales

- **Acceso restringido:** Principio de mínimo privilegio
- **Auditorías de seguridad:** Revisiones trimestrales
- **Capacitación del personal:** Training de seguridad anual
- **Plan de respuesta a incidentes:** Protocolo documentado

### 4.3 Copias de Seguridad

- **Frecuencia:** Backups diarios automáticos
- **Retención:** 30 días de backups continuos
- **Encriptación:** Todos los backups están encriptados
- **Ubicación:** Múltiples zonas geográficas (AWS)

### 4.4 Monitoreo

- **Logs de acceso:** Registro de todas las acciones
- **Alertas automáticas:** Detección de anomalías
- **Revisión manual:** Análisis periódico de seguridad

**Nota:** Ningún sistema es 100% seguro. Nos esforzamos por proteger sus datos pero no podemos garantizar seguridad absoluta.

## 5. Sus Derechos

### 5.1 Acceso a sus Datos

Tiene derecho a:

- **Ver:** Acceder a todos sus datos personales
- **Exportar:** Descargar sus datos en formato JSON
- **Verificar:** Revisar qué información tenemos sobre usted

**Cómo ejercer:** Vaya a Configuración → Privacidad → Exportar Datos

### 5.2 Rectificación

Puede:

- **Actualizar:** Modificar información de perfil en cualquier momento
- **Corregir:** Solicitar corrección de datos inexactos
- **Completar:** Añadir información faltante

**Cómo ejercer:** Edite su perfil o contacte a privacy@example.com

### 5.3 Eliminación (Derecho al Olvido)

Puede solicitar:

- **Eliminación de cuenta:** Borrado permanente de todos sus datos
- **Eliminación selectiva:** Borrado de documentos o configuraciones específicas

**Proceso:**
1. Solicite eliminación desde Configuración → Cuenta
2. Periodo de retención de 30 días (para permitir recuperación)
3. Eliminación permanente después de 30 días

**Excepciones:** Podemos retener ciertos datos si es requerido legalmente (ej: registros de facturación para impuestos).

### 5.4 Portabilidad

Puede exportar sus datos en formatos legibles por máquina:

- **JSON:** Todos los datos estructurados
- **Markdown:** Documentos originales
- **CSV:** Historial de ejecuciones, analytics

### 5.5 Oposición y Restricción

Puede:

- **Oponerse:** Al procesamiento de datos para marketing
- **Restringir:** El uso de datos mientras resolvemos una disputa
- **Revocar consentimiento:** Para procesamiento opcional

### 5.6 Quejas

Si no está satisfecho con cómo manejamos sus datos, puede:

1. Contactarnos directamente: privacy@example.com
2. Presentar una queja ante la autoridad de protección de datos de su país

## 6. Retención de Datos

### 6.1 Mientras la Cuenta está Activa

Retenemos datos mientras su cuenta esté activa o según sea necesario para proporcionar el servicio.

### 6.2 Después de la Cancelación

| Tipo de Dato | Período de Retención | Razón |
|--------------|---------------------|-------|
| Documentos y configuraciones | 30 días | Permitir reactivación |
| Datos de cuenta | 90 días | Obligaciones legales |
| Logs de sistema | 1 año | Seguridad y auditoría |
| Facturas | 7 años | Requisitos fiscales |
| Datos anonimizados | Indefinido | Analytics y mejora del servicio |

### 6.3 Eliminación Segura

Cuando eliminamos datos:

- **Sobrescritura:** Múltiples pasadas de sobrescritura
- **Desmagnetización:** Para medios físicos
- **Certificados:** Disponibles bajo solicitud

## 7. Privacidad de Menores

### 7.1 Restricción de Edad

Nuestro servicio NO está dirigido a menores de 16 años. No recopilamos intencionalmente información de menores.

### 7.2 Verificación

No verificamos activamente la edad de los usuarios. Los padres/tutores deben supervisar el uso de internet de menores.

### 7.3 Si Descubrimos Datos de Menores

Si nos enteramos de que hemos recopilado datos de un menor sin consentimiento parental:

1. Eliminaremos los datos inmediatamente
2. Cerraremos la cuenta
3. Notificaremos al padre/tutor si es posible

## 8. Transferencias Internacionales

### 8.1 Ubicación de Datos

Sus datos se almacenan principalmente en:

- **Primario:** AWS US-East-1 (Virginia, EE.UU.)
- **Backup:** AWS EU-West-1 (Irlanda, UE)

### 8.2 Mecanismos de Transferencia

Para transferencias fuera de la UE/EEA, utilizamos:

- **Cláusulas Contractuales Estándar (SCC)** de la Comisión Europea
- **Certificación Privacy Shield** (cuando aplicable)
- **Evaluaciones de Adecuación** del país destino

### 8.3 Protecciones Adicionales

Implementamos garantías adicionales para proteger datos transferidos internacionalmente.

## 9. Cambios a esta Política

### 9.1 Notificación de Cambios

Le notificaremos de cambios materiales mediante:

- Email a su dirección registrada (30 días antes)
- Notificación prominente en el servicio
- Registro de cambios en nuestra página de privacidad

### 9.2 Cambios Menores

Para cambios menores (correcciones tipográficas, aclaraciones), actualizaremos la fecha de "Última actualización".

### 9.3 Su Consentimiento

El uso continuado del servicio después de cambios constituye aceptación de la política actualizada.

## 10. Cookies y Tracking

### 10.1 Gestión de Cookies

Puede gestionar cookies mediante:

- **Configuración del navegador:** Bloquear todas las cookies
- **Nuestro panel de preferencias:** Elegir qué categorías permitir
- **Extensiones de privacidad:** AdBlock, Privacy Badger, etc.

### 10.2 Consecuencias de Deshabilitar Cookies

Si deshabilita cookies esenciales, algunas funcionalidades no estarán disponibles:

- Login persistente
- Recordar preferencias
- Sesiones seguras

### 10.3 Do Not Track

Respetamos las señales de "Do Not Track" (DNT) del navegador para cookies opcionales.

## 11. Contacto

### 11.1 Oficial de Privacidad

Para preguntas sobre esta política:

**Email:** privacy@example.com  
**Teléfono:** +1 (555) 123-4567  
**Dirección:** 123 Tech Street, San Francisco, CA 94102

### 11.2 Representante en la UE

Para residentes de la UE:

**Email:** eu-privacy@example.com  
**Dirección:** EU Privacy Representative, Dublin, Ireland

### 11.3 Tiempo de Respuesta

Respondemos a solicitudes de privacidad dentro de 30 días.

---

**Última actualización:** 1 de diciembre de 2025

**Versión:** 2.0

