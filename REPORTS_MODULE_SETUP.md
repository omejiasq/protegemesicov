# Configuración del Módulo Constructor de Reportes PESV

## Resumen
Se ha implementado un sistema avanzado de generación de reportes con detección automática de campos que permite a las empresas crear reportes personalizados sin conocimiento técnico.

## Características Principales

### ✅ **Detección Automática de Campos**
- Cuando se agregan nuevos campos a colecciones como `usuarios`, `vehiculos`, `alistamientos`, etc., están automáticamente disponibles
- No requiere configuración manual
- Usa reflexión de esquemas de Mongoose y análisis de documentos existentes

### ✅ **Constructor Visual**
- Interface drag-and-drop para seleccionar campos
- Constructor de filtros visual con operadores
- Soporte para agrupación y ordenamiento
- Vista previa en tiempo real

### ✅ **Exportación Profesional**
- Excel con branding empresarial (logos, colores, encabezados)
- CSV para análisis de datos
- Resúmenes estadísticos automáticos

### ✅ **Gestión de Plantillas**
- Guardar, editar, duplicar plantillas
- Categorización por tipo de reporte
- Compartir plantillas entre empresas
- Estadísticas de uso

## Pasos de Implementación

### 1. Ejecutar Migración de Base de Datos

```bash
# Conectar a MongoDB y ejecutar:
mongosh "mongodb://tu-conexion" < script_migration_reports.js
```

### 2. Agregar Permiso a Empresas

Como **superadmin**:
1. Ir a **Admin** → **Empresas**
2. Seleccionar empresa ESPECIAL o MIXTO
3. Ir a **Permisos de Menú**
4. Buscar **"Constructor de Reportes"** (`web_pesv_reports`)
5. Asignar a los usuarios deseados

### 3. Verificar Acceso

Los usuarios con permiso verán:
- Nueva opción **"Constructor de Reportes"** en menú PESV
- Badge **"AUTO"** indicando detección automática
- Ícono: `pi pi-chart-bar`

## Estructura del Sistema

### Backend (NestJS)
```
src/reports/
├── dto/report-template.dto.ts          # DTOs para validación
├── schemas/report-template.schema.ts   # Schema de plantillas
├── services/
│   ├── field-discovery.service.ts     # 🔍 Detección automática de campos
│   ├── report-template.service.ts     # CRUD de plantillas
│   └── excel-export.service.ts        # 📊 Exportación con branding
├── reports.controller.ts               # API endpoints
└── reports.module.ts                   # Módulo NestJS
```

### Frontend (Vue 3)
```
src/
├── views/reports/Reports.vue           # Interface principal
├── components/reports/QueryBuilder.vue # Constructor visual
└── api/reports.service.ts             # Cliente API
```

## API Endpoints

### Gestión de Plantillas
- `GET /reports/templates` - Listar plantillas
- `POST /reports/templates` - Crear plantilla
- `PUT /reports/templates/:id` - Actualizar plantilla
- `DELETE /reports/templates/:id` - Eliminar plantilla
- `POST /reports/templates/:id/duplicate` - Duplicar plantilla

### Generación y Exportación
- `POST /reports/templates/:id/generate` - Generar datos del reporte
- `POST /reports/templates/:id/export` - Descargar archivo Excel/CSV

### Descubrimiento de Campos
- `GET /reports/collections` - Listar colecciones disponibles
- `GET /reports/collections/:name/fields` - Campos de una colección
- `POST /reports/fields` - Campos de múltiples colecciones

## Configuración de Permisos

### Clave de Permiso
- **Clave**: `web_pesv_reports`
- **Etiqueta**: "Constructor de Reportes"
- **Categoría**: PESV
- **Ruta**: `/pesv/reports`

### Tipos de Empresa Elegibles
- ✅ **ESPECIAL**: Acceso completo
- ✅ **MIXTO**: Acceso completo
- ❌ **CARRETERA**: Sin acceso (no tiene módulos PESV)

### Niveles de Usuario
- **superadmin**: Acceso automático total
- **admin**: Acceso automático total
- **user**: Solo si tiene permiso asignado

## Ejemplo de Uso

### 1. Crear Plantilla de Reporte
1. Ir a **PESV** → **Constructor de Reportes**
2. Clic **"Nueva Plantilla"**
3. Seleccionar fuentes de datos (ej: `terminal_salidas`, `users`)
4. Arrastrar campos deseados
5. Configurar filtros y ordenamiento
6. Guardar plantilla

### 2. Generar Reporte
1. Seleccionar plantilla existente
2. Clic **"Generar Reporte"**
3. Configurar rango de fechas (opcional)
4. Elegir formato (Excel/CSV)
5. **"Generar y Descargar"**

### 3. Detección Automática
Cuando se agregan campos como:
```javascript
// Nuevo campo en schema de vehículos
@Prop({ type: String })
nuevoCampo?: string;
```

El campo aparece automáticamente en:
- Lista de campos disponibles
- Constructor visual
- Opciones de filtros
- Exportación Excel

## Consideraciones Técnicas

### Performance
- Límite de 1000 registros por defecto
- Paginación en frontend para grandes datasets
- Índices optimizados en MongoDB

### Seguridad
- Filtrado por `enterprise_id` automático
- Validación de esquemas con class-validator
- Escape de caracteres en Excel/CSV

### Escalabilidad
- Reflexión de esquemas cacheable
- Agregaciones MongoDB optimizadas
- Arquitectura modular extensible

## Troubleshooting

### Problema: No aparece nueva opción en menú
**Solución**:
1. Verificar que la empresa sea ESPECIAL o MIXTO
2. Revisar que el usuario tenga permiso `web_pesv_reports`
3. Refrescar página o cerrar/abrir sesión

### Problema: Campos no aparecen automáticamente
**Solución**:
1. Verificar que el schema esté registrado en MongoDB
2. Revisar logs del backend por errores de conexión
3. Ejecutar endpoint `/reports/collections` para debug

### Problema: Error al exportar Excel
**Solución**:
1. Verificar que exceljs esté instalado: `npm list exceljs`
2. Revisar logs de backend para errores de memoria
3. Reducir cantidad de registros en el reporte

## Próximas Mejoras

- [ ] Gráficos automáticos en Excel
- [ ] Programación de reportes automatizados
- [ ] Plantillas compartidas públicamente
- [ ] Exportación a PDF
- [ ] Dashboard de usage analytics
- [ ] API para integración externa

---

**Implementado**: Diciembre 2024
**Versión**: 1.0.0
**Compatibilidad**: NestJS 11+, Vue 3+, MongoDB 8+