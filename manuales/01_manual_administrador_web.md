<p align="center">
  <img src="LOGO-ITFUSION.png" alt="Itfusion SAS" width="220"/>
</p>

---

# Manual de Usuario — Administrador Web
**Sistema SICOV Protegeme**
**Perfil:** Administrador (`admin`)

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 19 de marzo de 2026 |
| **Elaborado por** | Edgar Mejia |
| **Empresa** | Itfusion SAS |

> © 2026 Itfusion SAS. Todos los derechos reservados.
> Queda prohibida la copia, reproducción, distribución o modificación de este documento sin autorización expresa de Itfusion SAS.

---

## ¿Qué puede hacer el Administrador?

El Administrador tiene acceso completo al sistema web. Puede gestionar vehículos, conductores, personal, mantenimientos, alistamientos, configurar la empresa y consultar reportes. Es el perfil más completo dentro de una empresa.

---

## 1. Acceso al Sistema

### Iniciar Sesión
1. Ingrese a la plataforma web desde su navegador.
2. En la pantalla de inicio de sesión escriba su **usuario** y **contraseña**.
3. Active la casilla **"Acepto la política de privacidad"**.
4. Haga clic en **Iniciar Sesión**.

> Si es la primera vez que accede o el sistema le obliga a cambiar la contraseña, será redirigido automáticamente a la pantalla de cambio de contraseña antes de continuar.

### Cerrar Sesión
- En la barra lateral haga clic en su nombre de usuario o en el botón de salida.
- El sistema cerrará la sesión y lo redirigirá al inicio de sesión.

---

## 2. Panel Principal (Dashboard)

Al ingresar verá el **Panel Principal** con indicadores generales del estado de la flota:

- Resumen de alistamientos recientes.
- Alertas de documentos próximos a vencer.
- Estado de mantenimientos pendientes.
- Acceso rápido a las secciones principales.

---

## 3. Vehículos

### Ver listado de vehículos
- En el menú lateral vaya a **Configuración → Vehículos**.
- Verá la tabla con todos los vehículos registrados: placa, clase, marca, conductor asignado y estado.
- Puede usar el buscador para filtrar por placa o conductor.

### Crear un vehículo
1. Haga clic en **Nuevo Vehículo**.
2. Complete los datos obligatorios (la **Placa** es el único campo requerido; debe tener exactamente 6 caracteres).
3. Opcionalmente llene: clase, marca, línea, servicio, modelo, combustible, color, kilometraje, cilindraje, tipo de vehículo, modalidad, número interno, motor, chasis y capacidad.
4. Asigne un **Conductor Principal** y/o **Conductor Secundario** buscando por número de documento o nombre.
5. Complete la sección **Propietario** y la sección **Documentación** (RTM, SOAT, RCC, RCE, Tecnomecánica, Tarjeta de Operación) con sus números y fechas de vencimiento.
6. Haga clic en **Crear Vehículo**.

### Editar un vehículo
1. En el listado haga clic en el vehículo que desea editar.
2. Modifique los campos necesarios.
3. Haga clic en **Guardar Cambios**. Solo se envían al servidor los campos que hayan cambiado.

---

## 4. Conductores

### Ver listado de conductores
- Vaya a **Configuración → Conductores**.
- Verá nombre, documento, teléfono, correo, número de licencia y estado (activo/inactivo).

### Crear un conductor
1. Haga clic en **Nuevo Conductor**.
2. Complete: **Tipo de Documento** (obligatorio), **Número de Documento** (obligatorio), **Nombre** (obligatorio).
3. Opcionalmente: teléfono, correo, número y vencimiento de licencia de conducción.
4. Haga clic en **Crear Conductor**.

### Editar un conductor
1. En el listado haga clic en el conductor.
2. Modifique los datos necesarios y guarde.

### Activar / Desactivar un conductor
- En el listado use el interruptor de estado para activar o desactivar un conductor sin eliminarlo.

---

## 5. Personal (Staff / Inspectores)

### ¿Qué es el Personal?
Son los usuarios que acceden al sistema web. Existen tres roles:
- **Administrador:** acceso completo.
- **Inspector:** solo ve alistamientos.
- **Visualizador:** solo lectura del dashboard.

### Ver listado de personal
- Vaya a **Configuración → Usuarios**.
- Puede filtrar por rol, estado activo/inactivo o buscar por nombre/correo.

### Crear un usuario
1. Haga clic en **Nuevo Usuario**.
2. Complete: tipo y número de documento, nombre, usuario (para iniciar sesión), contraseña, rol.
3. Opcionalmente: teléfono y correo.
4. Haga clic en **Crear**.

### Editar un usuario
1. Haga clic en el usuario en el listado.
2. Modifique los datos (puede cambiar el rol, datos personales y contraseña).
3. Guarde los cambios.

### Activar / Desactivar un usuario
- Use el interruptor de estado en el listado.

---

## 6. Alistamientos

Los alistamientos son inspecciones pre-operacionales de los vehículos requeridas por Supertransporte.

### Ver listado de alistamientos
- Vaya a **Gestión → Alistamientos**.
- Verá todos los alistamientos registrados con fecha, placa, responsable y estado de sincronización SICOV.

### Estados de sincronización SICOV
| Estado | Descripción |
|--------|-------------|
| **Pendiente** | Creado, pendiente de envío a Supertransporte. |
| **Sincronizado** | Enviado correctamente a Supertransporte. |
| **Fallido** | El envío falló. Puede reintentarse. |
| **Expirado** | No fue enviado el mismo día de creación. Ya no puede sincronizarse. |
| **Demo** | Creado en modo demostración, no se envía a Supertransporte. |

### Sincronización manual
- Botón **"Sincronizar ahora"**: envía inmediatamente los alistamientos pendientes del día.
- Botón **"Expirar anteriores"**: marca como expirados los alistamientos de días anteriores que no fueron sincronizados.

### Exportar a Excel
- En el listado haga clic en el botón de exportación para descargar el historial en formato Excel.

---

## 7. Mantenimientos Correctivos

Son los mantenimientos realizados ante fallas o daños.

### Ver listado
- Vaya a **Gestión → Correctivos**.
- Puede filtrar por fecha, placa y estado.

### Ver detalle
- Haga clic en un mantenimiento para ver el informe completo con fotos, descripción y firma.

---

## 8. Mantenimientos Preventivos

Son los mantenimientos programados de acuerdo con el plan de la empresa.

### Ver listado
- Vaya a **Gestión → Preventivos**.

### Calendario de mantenimientos
- Vaya a **Gestión → Calendario** para ver los mantenimientos programados en vista de calendario mensual.

### Ver detalle
- Haga clic en un mantenimiento para ver el informe completo.

---

## 9. Catálogos de Mantenimiento

### Partes de Mantenimiento
- Vaya a **Gestión → Partes Mant.**
- Son los ítems que aparecen en los formularios de mantenimiento correctivo y preventivo de la app móvil.
- Puede crear, editar y activar/desactivar ítems.

### Partes de Alistamiento
- Vaya a **Gestión → Partes Alist.**
- Son los ítems de la lista de chequeo de alistamiento pre-operacional.
- Cada ítem puede tener asociados **Códigos SICOV** (1 al 11) que determinan qué actividades se reportan a Supertransporte.

### Proveedores
- Vaya a **Gestión → Proveedores**.
- Registre los proveedores de mantenimiento de su empresa.

### Tipos de Respuesta
- Vaya a **Gestión → Tipos Respuesta**.
- Configure las opciones de respuesta para los alistamientos (ej. OK, NC, NA).

---

## 10. Configuración de la Empresa

Vaya a **Configuración → Mi Empresa**.

### Logo
- Haga clic en **Seleccionar imagen** para cargar el logo de la empresa (PNG o JPG).
- Haga clic en **Guardar logo** para confirmar.

### Centro Especializado
- Ingrese el nombre y NIT del centro especializado de revisión técnico-mecánica.

### Ingeniero Mecánico
- Ingrese el tipo de documento, número y nombre del ingeniero mecánico responsable de los mantenimientos.

### Inspector por Defecto (Alistamientos)
- Busque y seleccione el inspector que aparecerá automáticamente en la app móvil al crear un alistamiento.
- La lista muestra solo usuarios con rol **Inspector** de su empresa.
- Si no hay inspectores creados, aparece un enlace para ir a crearlos en **Usuarios**.
- Haga clic en **Guardar Cambios** para aplicar la configuración.

---

## 11. Reportes — Auditoría SICOV

- Vaya a **Reportes → Auditoría SICOV**.
- Permite consultar el historial de sincronizaciones con Supertransporte: qué se envió, cuándo y con qué resultado.

---

## 12. Autorizaciones e Incidentes

- **Autorizaciones:** gestión de solicitudes de autorización relacionadas con la operación de vehículos.
- **Incidentes:** registro y seguimiento de incidentes viales reportados.

---

## 13. Preguntas Frecuentes

**¿Por qué un alistamiento queda como "Expirado"?**
Los alistamientos deben sincronizarse con Supertransporte el mismo día en que se crean. Si no se sincronizaron ese día, el sistema los marca automáticamente como expirados al día siguiente.

**¿Cómo agrego un inspector?**
Vaya a Configuración → Usuarios, cree un nuevo usuario y asígnele el rol **Inspector**.

**¿Puedo asignar el mismo conductor a varios vehículos?**
Sí. Un conductor puede estar asignado como principal o secundario en múltiples vehículos.

**¿Qué pasa si el sistema me obliga a cambiar la contraseña?**
Es una medida de seguridad. Ingrese la contraseña actual y la nueva contraseña dos veces para confirmar.
