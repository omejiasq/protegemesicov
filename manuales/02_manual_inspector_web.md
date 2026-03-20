<p align="center">
  <img src="LOGO-ITFUSION.png" alt="Itfusion SAS" width="220"/>
</p>

---

# Manual de Usuario — Inspector Web
**Sistema SICOV Protegeme**
**Perfil:** Inspector (`operator`)

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 19 de marzo de 2026 |
| **Elaborado por** | Edgar Mejia |
| **Empresa** | Itfusion SAS |

> © 2026 Itfusion SAS. Todos los derechos reservados.
> Queda prohibida la copia, reproducción, distribución o modificación de este documento sin autorización expresa de Itfusion SAS.

---

## ¿Qué puede hacer el Inspector Web?

El Inspector tiene acceso al sistema web pero con una vista reducida. Su función principal es consultar y hacer seguimiento a los **alistamientos** registrados desde la app móvil. No tiene acceso a la configuración de vehículos, conductores, personal ni reportes administrativos.

---

## 1. Acceso al Sistema

### Iniciar Sesión
1. Ingrese a la plataforma web desde su navegador.
2. Escriba su **usuario** y **contraseña** (proporcionados por el administrador).
3. Active la casilla **"Acepto la política de privacidad"**.
4. Haga clic en **Iniciar Sesión**.

> Si es la primera vez que ingresa y el administrador activó el cambio obligatorio de contraseña, deberá crear una nueva contraseña antes de continuar.

### Cerrar Sesión
- Haga clic en el botón de salida en la barra lateral o en su nombre de usuario.

---

## 2. Panel Principal (Dashboard)

Al ingresar verá un resumen general del estado de la operación. Desde aquí puede navegar directamente a los alistamientos.

---

## 3. Alistamientos

Esta es la sección principal del Inspector. Aquí puede consultar todos los alistamientos pre-operacionales registrados por los operadores desde la app móvil.

### Acceder a los Alistamientos
- En el menú lateral haga clic en **Gestión → Alistamientos**.

### ¿Qué información verá?

En la tabla de alistamientos encontrará:

| Columna | Descripción |
|---------|-------------|
| **Fecha** | Fecha y hora en que se creó el alistamiento. |
| **Placa** | Placa del vehículo inspeccionado. |
| **Responsable** | Nombre del inspector que realizó la inspección en campo. |
| **N° Documento** | Documento de identidad del responsable. |
| **Estado SICOV** | Estado de sincronización con Supertransporte. |

### Estados de Sincronización SICOV

| Estado | Significado |
|--------|-------------|
| **Pendiente** | Registrado, aún no enviado a Supertransporte. |
| **Sincronizado** | Enviado correctamente a Supertransporte. |
| **Fallido** | El envío falló por un error técnico. |
| **Expirado** | No se envió el mismo día de creación; ya no puede sincronizarse. |
| **Demo** | Creado en modo prueba, no se reporta a Supertransporte. |

### Filtrar Alistamientos
- Puede buscar por placa, fecha o estado usando los filtros disponibles en la parte superior de la tabla.

### Ver el Detalle de un Alistamiento
- Haga clic sobre cualquier fila de la tabla para ver el detalle completo:
  - Datos del vehículo y conductor.
  - Resultado de cada ítem de la lista de chequeo.
  - Firma del conductor y del responsable.
  - Actividades reportadas a Supertransporte.

### Exportar a Excel
- Use el botón de exportación para descargar el listado en formato Excel.

---

## 4. Preguntas Frecuentes

**¿Por qué no veo la sección de Vehículos o Conductores?**
El perfil Inspector está diseñado solo para consultar alistamientos. Para acceder a otras funciones su cuenta debe tener rol Administrador.

**¿Puedo crear alistamientos desde la web?**
No. Los alistamientos se crean exclusivamente desde la **app móvil**. Desde la web solo se pueden consultar.

**¿Qué significa que un alistamiento esté "Expirado"?**
Los alistamientos deben sincronizarse con Supertransporte el mismo día en que se crean. Si no se completó la sincronización ese día, el sistema los marca como expirados automáticamente.

**¿Qué hago si un alistamiento aparece como "Fallido"?**
Informe al administrador para que ejecute la sincronización manual desde el botón **"Sincronizar ahora"**.

**No puedo iniciar sesión, ¿qué hago?**
Verifique que su usuario y contraseña sean correctos. Si el problema persiste, comuníquese con el administrador de su empresa para que revise el estado de su cuenta.
