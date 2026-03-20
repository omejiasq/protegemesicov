<p align="center">
  <img src="LOGO-ITFUSION.png" alt="Itfusion SAS" width="220"/>
</p>

---

# Manual de Usuario — Superusuario
**Sistema SICOV Protegeme**
**Perfil:** Superadministrador (`superadmin`)

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 19 de marzo de 2026 |
| **Elaborado por** | Edgar Mejia |
| **Empresa** | Itfusion SAS |

> © 2026 Itfusion SAS. Todos los derechos reservados.
> Queda prohibida la copia, reproducción, distribución o modificación de este documento sin autorización expresa de Itfusion SAS.

---

## ¿Qué puede hacer el Superusuario?

El Superusuario tiene el nivel de acceso más alto del sistema. Además de todas las funciones del Administrador, puede **crear, configurar, activar y desactivar empresas** que usan la plataforma. Es el perfil de soporte técnico y gestión de clientes de Protegeme.

---

## 1. Acceso al Sistema

### Iniciar Sesión
1. Ingrese a la plataforma web desde su navegador.
2. Escriba su **usuario** y **contraseña** de superusuario.
3. Active la casilla **"Acepto la política de privacidad"**.
4. Haga clic en **Iniciar Sesión**.

> El Superusuario puede ver en el menú lateral una sección exclusiva llamada **Administración** que no aparece para ningún otro perfil.

---

## 2. Funciones Exclusivas del Superusuario

### Acceder a la Gestión de Empresas
- En el menú lateral haga clic en **Administración → Empresas**.
- Verá el listado completo de todas las empresas registradas en el sistema.

---

## 3. Gestión de Empresas

### Ver el Listado de Empresas
- La tabla muestra: nombre de la empresa, NIT, estado (activo/inactivo) y fecha de creación.
- Puede buscar una empresa por nombre o NIT.

### Crear una Nueva Empresa
1. Haga clic en **Nueva Empresa**.
2. Complete los datos:
   - **Nombre** (obligatorio): razón social de la empresa.
   - **NIT**: número de identificación tributaria.
   - **Dirección**, **teléfono**, **número móvil**.
   - **Tipo de paquete**: Basic, Enterprise o Test.
   - **Cantidad máxima de usuarios**.
   - **ID Vigilado** y **Token Vigilado**: credenciales de integración con Supertransporte (SICOV). Estos valores los entrega Supertransporte a cada empresa vigilada.
   - **Formato de consecutivo**: configuración del formato de los documentos generados.
3. Haga clic en **Crear Empresa**.

### Crear el Usuario Administrador de una Empresa
Una vez creada la empresa, debe crear el usuario administrador que la gestionará:
1. En el listado de empresas haga clic en la empresa.
2. Busque la opción **Crear usuario administrador**.
3. Complete los datos del usuario: nombre, usuario, contraseña y correo.
4. El nuevo administrador podrá iniciar sesión y gestionar su empresa de forma independiente.

### Editar una Empresa
1. Haga clic en la empresa en el listado.
2. Modifique los campos necesarios (nombre, NIT, paquete, credenciales SICOV, formatos, etc.).
3. Guarde los cambios.

> **Nota sobre el ID Vigilado:** Si no se especifica un ID Vigilado al crear la empresa, el sistema lo calcula automáticamente a partir del NIT. Si el NIT de la empresa es el mismo que su ID Vigilado en Supertransporte, no es necesario llenarlo manualmente.

### Activar o Desactivar una Empresa
1. En el listado de empresas busque la empresa.
2. Use el botón de **Activar** o **Desactivar**.
3. Al desactivar, debe ingresar el **motivo de desactivación** (ej. "Contrato vencido", "Mora en pagos").
4. Una empresa desactivada no puede operar en el sistema: sus usuarios no podrán iniciar sesión.
5. Al activar nuevamente, el sistema registra la fecha de reactivación.

---

## 4. Funciones Heredadas del Administrador

El Superusuario también puede realizar todas las acciones de un Administrador dentro de cualquier empresa. Consulte el **Manual del Administrador Web** para el detalle de:

- Gestión de vehículos.
- Gestión de conductores.
- Gestión de personal (staff).
- Alistamientos y sincronización SICOV.
- Mantenimientos correctivos y preventivos.
- Catálogos (partes, proveedores, tipos de respuesta).
- Configuración de la empresa (logo, mecánico, inspector por defecto).
- Reportes de auditoría SICOV.

---

## 5. Configuración de Credenciales SICOV (Integración con Supertransporte)

Esta es una de las configuraciones más críticas. Sin estas credenciales, los alistamientos no pueden reportarse a Supertransporte.

### Campos requeridos por empresa
| Campo | Descripción |
|-------|-------------|
| **vigiladoId** | Número de identificación de la empresa ante Supertransporte. Normalmente es el NIT sin dígito de verificación. |
| **vigiladoToken** | Token de autenticación otorgado por Supertransporte a la empresa para el envío de datos SICOV. |

### ¿Cómo obtener estas credenciales?
Las credenciales son proporcionadas por **Supertransporte** directamente a cada empresa vigilada. El superusuario debe solicitarlas a la empresa cliente y registrarlas en el sistema.

### ¿Qué pasa si las credenciales son incorrectas?
Los alistamientos quedarán en estado **Fallido** después de intentar sincronizarse. Revise las credenciales y corrija los valores en la edición de la empresa.

---

## 6. Tipos de Paquetes

Al crear o editar una empresa puede asignar un tipo de paquete:

| Paquete | Descripción |
|---------|-------------|
| **Basic** | Acceso estándar con funciones básicas. |
| **Enterprise** | Acceso completo con todas las funciones avanzadas. |
| **Test** | Modo de prueba. Los alistamientos se marcan como "Demo" y no se reportan a Supertransporte. |

---

## 7. Preguntas Frecuentes

**¿Cuántas empresas puede gestionar el Superusuario?**
No hay límite. El Superusuario puede crear y gestionar todas las empresas que sean necesarias.

**¿Puede el Superusuario acceder a los datos de todas las empresas?**
Sí. El Superusuario tiene visibilidad total sobre todas las empresas y sus datos.

**¿Qué pasa si desactivo una empresa por error?**
Puede reactivarla inmediatamente usando el botón de Activar. El sistema registra tanto la fecha de desactivación como la de reactivación.

**¿Los administradores de cada empresa pueden ver datos de otras empresas?**
No. Cada administrador solo puede ver y gestionar los datos de su propia empresa. La separación de datos entre empresas es automática y está garantizada por el sistema.

**¿Cómo sé si una empresa está teniendo problemas con la sincronización SICOV?**
Puede revisar el reporte de Auditoría SICOV de la empresa o verificar si tiene alistamientos acumulados en estado Fallido o Expirado.

**¿Puede el Superusuario iniciar sesión en la app móvil?**
Sí, con las mismas credenciales, pero la app móvil no tiene funcionalidades exclusivas para el superusuario. Su uso principal es la plataforma web.

**¿Cómo cambio las credenciales SICOV de una empresa?**
Vaya a **Administración → Empresas**, seleccione la empresa, edite los campos **vigiladoId** y **vigiladoToken** y guarde.
