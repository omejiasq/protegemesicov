# Guía de Implementación de Auditoría

## ✅ Implementación Completada

Se ha implementado un sistema de auditoría automática para usuarios, conductores y vehículos que registra automáticamente qué usuario creó o actualizó cada documento.

## 🔧 Componentes Implementados

### 1. Campos de Auditoría en Esquemas

#### Usuario (api-auth/src/schemas/user.schema.ts)
```typescript
@Prop({ type: Types.ObjectId, ref: 'User', default: null })
createdBy?: Types.ObjectId | null;

@Prop({ type: Types.ObjectId, ref: 'User', default: null })
updatedBy?: Types.ObjectId | null;
```

#### Conductor (api-driver/src/schema/drivers.schema.ts)
```typescript
@Prop({ type: String }) createdBy?: string;
@Prop({ type: String }) updatedBy?: string;
```

#### Vehículo (api-vehicle/src/schema/vehicle.schema.ts)
```typescript
@Prop({ type: String }) createdBy?: string;
@Prop({ type: String }) updatedBy?: string;
```

### 2. Interceptor de Auditoría

Se creó un interceptor que automáticamente inyecta el ID del usuario actual en las operaciones de creación y actualización:

- `api-auth/src/libs/audit/audit.interceptor.ts`
- `api-driver/src/libs/audit/audit.interceptor.ts`
- `api-vehicle/src/libs/audit/audit.interceptor.ts`

### 3. Decorador @Audit

```typescript
@Audit('create') // Para operaciones de creación
@Audit('update') // Para operaciones de actualización
```

### 4. Controladores Actualizados

#### Users Controller (api-auth)
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `POST /users/staff` - Crear personal

#### Drivers Controller (api-driver)
- `POST /drivers/create` - Crear conductor
- `PUT /drivers/updateById/:id` - Actualizar conductor

#### Vehicles Controller (api-vehicle)
- `POST /vehicles` - Crear vehículo
- `PATCH /vehicles/:id` - Actualizar vehículo
- `PATCH /vehicles/by-plate/:placa/modelo` - Actualizar modelo
- `PATCH /vehicles/:id/partial` - Actualización parcial

## 🚀 Cómo Usar

### 1. Configurar el Interceptor en el Módulo

En cada módulo (users.module.ts, drivers.module.ts, vehicles.module.ts):

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './libs/audit/audit.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class YourModule {}
```

### 2. Usar en Controladores

```typescript
@UseInterceptors(AuditInterceptor)
@Audit('create')
@Post()
create(@Body() dto: CreateDto, @Req() req: any) {
  // El interceptor automáticamente agrega req.body.createdBy
  return this.service.create(dto);
}

@UseInterceptors(AuditInterceptor)
@Audit('update')
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateDto, @Req() req: any) {
  // El interceptor automáticamente agrega req.body.updatedBy
  return this.service.update(id, dto);
}
```

### 3. Implementar en Servicios

Los servicios deben usar los campos de auditoría del body:

```typescript
async create(dto: CreateDto): Promise<Document> {
  const doc = new this.model({
    ...dto,
    // createdBy ya viene en el dto gracias al interceptor
  });
  return doc.save();
}

async update(id: string, dto: UpdateDto): Promise<Document> {
  return this.model.findByIdAndUpdate(
    id,
    {
      ...dto,
      // updatedBy ya viene en el dto gracias al interceptor
    },
    { new: true }
  );
}
```

## 📊 Beneficios

1. **Trazabilidad Completa**: Cada documento tiene registro de quién lo creó y quién lo modificó por última vez
2. **Implementación Automática**: El interceptor se encarga automáticamente de la auditoría
3. **Consistencia**: Mismo patrón en todos los microservicios
4. **Timestamps**: Los esquemas ya incluyen `createdAt` y `updatedAt` automáticamente

## 🔍 Consultar Información de Auditoría

```javascript
// Buscar documentos con información del creador
const users = await UserModel.find().populate('createdBy', 'usuario.usuario usuario.nombre usuario.apellido');

// Buscar por quién creó un documento específico
const vehiclesByUser = await VehicleModel.find({ createdBy: userId });

// Obtener historial de cambios
const recentUpdates = await DriverModel
  .find({ updatedBy: { $exists: true } })
  .sort({ updatedAt: -1 })
  .populate('updatedBy');
```

## ⚠️ Notas Importantes

1. **Autenticación Requerida**: Los endpoints deben tener autenticación JWT para que funcione la auditoría
2. **Información del Usuario**: El interceptor busca el ID del usuario en `req.user.sub`, `req.user._id` o `req.user.userId`
3. **Compatibilidad**: Funciona con todos los métodos HTTP (POST, PUT, PATCH, etc.)
4. **Campos Opcionales**: Los campos de auditoría son opcionales para mantener compatibilidad con datos existentes

## 🎯 Próximos Pasos

1. Configurar los interceptores en los módulos principales
2. Probar la funcionalidad con Postman o tests automatizados
3. Verificar que los campos se están guardando correctamente en la base de datos
4. Implementar consultas que utilicen la información de auditoría en los reportes