<p align="center">
  <img src="LOGO-ITFUSION.png" alt="Itfusion SAS" width="220"/>
</p>

---

# Manual de Usuario — App Móvil
**Sistema SICOV Protegeme**
**Perfil:** Usuario de la aplicación móvil (conductor / inspector en campo)

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 19 de marzo de 2026 |
| **Elaborado por** | Edgar Mejia |
| **Empresa** | Itfusion SAS |

> © 2026 Itfusion SAS. Todos los derechos reservados.
> Queda prohibida la copia, reproducción, distribución o modificación de este documento sin autorización expresa de Itfusion SAS.

---

## ¿Qué puede hacer el Usuario Móvil?

La app móvil está diseñada para el trabajo en campo. Permite registrar **alistamientos pre-operacionales**, **mantenimientos correctivos** y consultar **mantenimientos preventivos** de los vehículos de la empresa. Los registros se sincronizan automáticamente con el sistema y con Supertransporte (SICOV).

---

## 1. Instalación e Inicio de Sesión

### Instalación
- Descargue e instale la aplicación **Protegeme** en su dispositivo Android desde el enlace o QR proporcionado por su empresa.

### Iniciar Sesión
1. Abra la aplicación.
2. Ingrese su **usuario** y **contraseña**.
3. Active la casilla **"Acepto la política de privacidad"**.
4. Toque **Iniciar Sesión**.

> Si el token de sesión ha expirado (lleva mucho tiempo sin usar la app), el sistema lo redirigirá automáticamente al inicio de sesión.

### Cerrar Sesión
- Abra el menú lateral deslizando desde la izquierda o tocando el ícono de menú (☰).
- Toque **Salir**.
- La sesión se cerrará completamente.

---

## 2. Menú Principal

Para navegar entre las secciones, abra el **menú lateral** tocando el ícono ☰ en la parte superior izquierda de cualquier pantalla. Encontrará:

| Opción | Descripción |
|--------|-------------|
| **Alistamientos vehículo** | Ver y crear alistamientos pre-operacionales. |
| **Mantenimientos correctivos** | Ver y crear reportes de mantenimiento por falla. |
| **Mantenimientos preventivos** | Consultar los mantenimientos preventivos programados. |
| **Salir** | Cerrar sesión. |

---

## 3. Alistamientos Pre-operacionales

El alistamiento es la inspección que se realiza al vehículo antes de iniciar la operación diaria. Es un requisito de Supertransporte.

### Ver el Listado de Alistamientos
1. En el menú lateral toque **Alistamientos vehículo**.
2. Verá la lista de alistamientos registrados con fecha, placa y estado.

### Crear un Nuevo Alistamiento
1. En la pantalla de alistamientos toque el botón **"+"** o **"Nuevo alistamiento"**.
2. Se abrirá el formulario de alistamiento.

#### Paso 1 — Ingrese la Placa del Vehículo
- Escriba la placa en el campo **Placa** y presione **Enter** o la lupa en el teclado.
- El sistema buscará el vehículo y **auto-completará** automáticamente:
  - Número de documento del conductor asignado.
  - Nombre del conductor asignado.
  - Tipo de documento, número y nombre del **inspector por defecto** de la empresa.
- También puede escanear la placa con la cámara tocando el ícono de **cámara** o **galería**.

#### Paso 2 — Seleccionar o Cambiar el Inspector Responsable
- Si necesita cambiar el inspector, use el selector **"Seleccionar inspector"** (aparece si su empresa tiene inspectores registrados).
- Al seleccionar un inspector de la lista, los campos de tipo de documento, número y nombre del responsable se actualizarán automáticamente.
- También puede editar manualmente el **Tipo de documento responsable**, **N° Documento responsable** y **Nombre responsable**.

#### Paso 3 — Complete los Datos del Conductor
- Verifique o complete el **N° Documento conductor** y **Nombre conductor**.

#### Paso 4 — Liste de Chequeo de Inspección
- La lista de ítems de inspección aparece agrupada por categorías (ej. Motor, Llantas, Seguridad, etc.).
- Para cada ítem seleccione el resultado en el desplegable: **OK**, **NC** (No Conforme) o **NA** (No Aplica), según los tipos de respuesta configurados por su empresa.
- Los ítems marcados como conformes (OK) generan las actividades que se reportan a Supertransporte.

#### Paso 5 — Detalle de Actividades
- En el campo **Detalle actividades** escriba observaciones adicionales sobre la inspección.

#### Paso 6 — Firmas
- **Firma del Conductor:** el conductor debe firmar en el recuadro con su dedo.
- **Firma del Responsable:** el inspector responsable debe firmar en su recuadro.
- Si necesita borrar y volver a firmar, toque **Limpiar**.

#### Paso 7 — Guardar
- Toque **Guardar alistamiento**.
- El sistema subirá las firmas y registrará el alistamiento.
- El alistamiento quedará en estado **Pendiente** hasta que el sistema lo sincronice con Supertransporte (se intenta automáticamente cada hora).

> **Importante:** Los alistamientos deben crearse y sincronizarse el **mismo día**. Si no se sincronizan durante el día de creación, quedarán como **Expirados** y no podrán enviarse a Supertransporte.

### Consejos para usar el formulario
- Puede usar el ícono del **micrófono** en los campos de texto para dictar la información por voz.
- El campo de placa también reconoce placas fotografiadas con la cámara.

---

## 4. Mantenimientos Correctivos

Son los reportes de fallas o daños que requieren reparación.

### Ver el Listado
1. En el menú lateral toque **Mantenimientos correctivos**.
2. Verá la lista de mantenimientos registrados con fecha, placa y tipo.

### Crear un Mantenimiento Correctivo
1. Toque el botón **"+"** o **"Nuevo mantenimiento"**.
2. Ingrese la placa del vehículo (el sistema auto-completará los datos del vehículo).
3. Describa la falla o daño encontrado.
4. Registre las acciones realizadas o por realizar.
5. Tome fotos de evidencia si es necesario.
6. Guarde el reporte.

---

## 5. Mantenimientos Preventivos

Son los mantenimientos programados según el plan de la empresa.

### Ver el Listado
1. En el menú lateral toque **Mantenimientos preventivos**.
2. Verá los mantenimientos preventivos asignados a los vehículos de la empresa.
3. Puede consultar el detalle de cada uno tocando sobre él.

> Los mantenimientos preventivos son programados desde la **plataforma web** por el administrador. Desde la app móvil solo se pueden consultar y registrar como ejecutados.

---

## 6. Preguntas Frecuentes

**¿Por qué al ingresar la placa no se auto-completan los datos?**
Verifique que la placa esté escrita correctamente (sin espacios ni caracteres especiales) y presione Enter. Si el vehículo no está registrado en el sistema, los datos no se cargarán.

**¿Qué pasa si no hay conexión a internet al crear un alistamiento?**
El formulario requiere conexión para consultar el vehículo y guardar el alistamiento. Asegúrese de tener conexión activa antes de iniciar el registro.

**¿Por qué no aparece el selector de inspector?**
El selector solo aparece si su empresa tiene usuarios con rol Inspector creados en el sistema. Comuníquese con el administrador.

**¿Puedo corregir un alistamiento ya guardado?**
No. Una vez guardado el alistamiento no puede modificarse. Si hubo un error, informe al administrador.

**La app me redirigió al inicio de sesión sin que yo lo pidiera, ¿qué pasó?**
Su sesión expiró por inactividad. Vuelva a iniciar sesión con su usuario y contraseña.

**¿Cómo sé si el alistamiento se reportó a Supertransporte?**
En el listado de alistamientos verá el estado: **Sincronizado** confirma que fue reportado exitosamente.

**¿Puedo crear un alistamiento para una placa que no está en el sistema?**
No. La placa debe estar previamente registrada por el administrador en la plataforma web.
