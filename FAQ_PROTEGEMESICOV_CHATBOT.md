# Manual de Preguntas Frecuentes — ProtegeMeSICOV
## Base de conocimiento para chatbot de soporte

> **Formato:** Cada pregunta incluye variantes de formulacion y una respuesta directa.
> El chatbot debe emparejar la intencion del usuario con las variantes y responder con el bloque correspondiente.

---

## INDICE DE CATEGORIAS

1. [Que es ProtegeMeSICOV](#1-que-es-protegemesicov)
2. [Acceso y usuarios](#2-acceso-y-usuarios)
3. [Empresas y configuracion](#3-empresas-y-configuracion)
4. [Vehiculos](#4-vehiculos)
5. [Conductores](#5-conductores)
6. [Alistamientos](#6-alistamientos)
7. [Mantenimientos preventivos](#7-mantenimientos-preventivos)
8. [Mantenimientos correctivos](#8-mantenimientos-correctivos)
9. [Novedades (incidentes)](#9-novedades-incidentes)
10. [Autorizaciones de viaje NNA](#10-autorizaciones-de-viaje-nna)
11. [Integracion con SICOV / Supertransporte](#11-integracion-con-sicov--supertransporte)
12. [Catalogos de mantenimiento e inspeccion](#12-catalogos-de-mantenimiento-e-inspeccion)
13. [Dashboard y reportes](#13-dashboard-y-reportes)
14. [Roles y permisos](#14-roles-y-permisos)
15. [Errores comunes](#15-errores-comunes)

---

## 1. QUE ES PROTEGEMESICOV

---

**P: Que es ProtegeMeSICOV? / Para que sirve esta plataforma? / Que hace esta aplicacion?**

**Variantes:** "que es protegemesicov", "para que sirve el sistema", "como funciona la plataforma", "que puedo hacer aqui", "descripcion del sistema"

**R:**
ProtegeMeSICOV es una plataforma digital para empresas de transporte vigiladas por la Superintendencia de Transporte de Colombia (Supertransporte). Permite gestionar y reportar automaticamente:
- Alistamientos diarios de vehiculos (pre-operacional)
- Mantenimientos preventivos y correctivos
- Conductores y su informacion medica y de licencia
- Novedades o incidentes operativos
- Autorizaciones de viaje para Ninos, Ninas y Adolescentes (NNA)
- Sincronizacion automatica con el sistema SICOV de Supertransporte

---

**P: En que consiste SICOV? / Que es SICOV?**

**Variantes:** "que es sicov", "que significa sicov", "sicov supertransporte"

**R:**
SICOV (Sistema de Informacion de Control de Operaciones y Vigilancia) es la plataforma oficial de la Superintendencia de Transporte donde las empresas vigiladas deben registrar sus operaciones. ProtegeMeSICOV se integra directamente con SICOV para enviar alistamientos, mantenimientos y autorizaciones, evitando el ingreso manual de datos en el portal de Supertransporte.

---

**P: La plataforma tiene aplicacion movil? / Puedo usarla desde el celular?**

**Variantes:** "app movil", "aplicacion android", "aplicacion ios", "desde el telefono"

**R:**
Si. El sistema cuenta con dos interfaces:
- **App web** (navegador): para administradores y personal de oficina.
- **App movil** (Flutter): usada principalmente por conductores e inspectores para registrar alistamientos y mantenimientos directamente desde el campo.

---

## 2. ACCESO Y USUARIOS

---

**P: Como inicio sesion? / Como entro al sistema? / Donde pongo mi usuario y contrasena?**

**Variantes:** "iniciar sesion", "login", "como accedo", "entrar al sistema", "ingresar"

**R:**
Ingrese a la aplicacion web e introduzca su nombre de usuario (normalmente su correo electronico) y su contrasena en la pantalla de inicio de sesion. Si es la primera vez que accede, su administrador le debio haber proporcionado las credenciales. Si olvidó su contrasena, contacte al administrador de su empresa para que la reestablezca.

---

**P: Olvide mi contrasena / Como recupero mi contrasena? / No puedo entrar al sistema**

**Variantes:** "olvide contrasena", "recuperar contrasena", "cambiar contrasena", "reset password", "no recuerdo mi clave"

**R:**
El restablecimiento de contrasenas lo realiza el administrador de su empresa o el superadministrador de la plataforma. Comuniquese con su administrador para que le asigne una nueva contrasena temporal. Una vez que ingrese con esa contrasena, el sistema le pedira que la cambie en su proximo inicio de sesion (campo `must_change_password`).

Si usted es administrador y necesita cambiar su propia contrasena, puede hacerlo desde el menu **Cambiar contrasena** dentro de la aplicacion.

---

**P: Como creo un usuario nuevo? / Como agrego personal al sistema?**

**Variantes:** "crear usuario", "agregar usuario", "nuevo empleado", "registrar personal", "como doy acceso a otro"

**R:**
Solo los usuarios con rol **admin** o **superadmin** pueden crear usuarios. Pasos:
1. Dirijase al modulo **Personal** en el menu lateral.
2. Haga clic en **Nuevo**.
3. Complete los datos: nombre, apellido, nombre de usuario, correo, numero de documento y rol.
4. El nuevo usuario recibira sus credenciales y debera cambiar su contrasena al primer ingreso.

---

**P: Cuales son los roles disponibles? / Que puede hacer cada rol?**

**Variantes:** "roles del sistema", "tipos de usuario", "permisos", "diferencia entre admin y conductor"

**R:**
El sistema maneja los siguientes roles:

| Rol | Descripcion |
|---|---|
| `superadmin` | Administra todas las empresas de la plataforma. Solo Supertransporte/administrador global. |
| `admin` | Administra su propia empresa: usuarios, vehiculos, conductores, catálogos. |
| `operator` | Puede registrar alistamientos, mantenimientos y novedades. |
| `driver` | Conductor. Usa principalmente la app movil para alistamientos y mantenimientos. |
| `viewer` | Solo lectura. Puede consultar registros pero no crear ni editar. |

---

**P: Como desactivo un usuario? / Como bloqueo el acceso de un empleado?**

**Variantes:** "desactivar usuario", "bloquear acceso", "dar de baja empleado", "usuario inactivo"

**R:**
Desde el modulo **Personal**, busque al usuario y use el boton de activar/desactivar (toggle de estado). Un usuario inactivo no podra iniciar sesion en el sistema. Sus registros historicos se conservan.

---

## 3. EMPRESAS Y CONFIGURACION

---

**P: Como configuro los datos de mi empresa? / Donde edito el nombre o logo de la empresa?**

**Variantes:** "configurar empresa", "datos empresa", "logo empresa", "informacion empresa", "perfil empresa"

**R:**
Vaya a **Configuracion de empresa** (EnterpriseSettings) en el menu. Ahi puede actualizar:
- Nombre y descripcion
- Logo
- Numero de documento (NIT u otro) y tipo de documento
- Direccion, telefono y movil
- Nombre del mecanico responsable y su tipo/numero de documento
- Nombre del centro especializado y su tipo/numero de documento
- Consecutivos y formatos para las planillas PDF de alistamiento y mantenimiento

---

**P: Que es el vigiladoId? / Que es el token de vigilado?**

**Variantes:** "vigilado id", "token supertransporte", "credenciales sicov", "id empresa supertransporte"

**R:**
El `vigiladoId` es el identificador que Supertransporte asigna a su empresa en SICOV. El `vigiladoToken` es el token de autenticacion para la API de SICOV. Estos datos son necesarios para que el sistema envie automaticamente los alistamientos, mantenimientos y autorizaciones a Supertransporte. Si no los tiene, contacte directamente a Supertransporte para obtenerlos.

---

**P: Que tipo de paquete puedo tener? / Hay diferentes planes?**

**Variantes:** "paquete basico", "paquete enterprise", "planes de servicio", "tipo de suscripcion"

**R:**
La plataforma maneja dos tipos de paquete:
- **basic**: acceso a funcionalidades esenciales.
- **enterprise**: acceso completo a todas las funcionalidades avanzadas.

El tipo de paquete lo asigna el superadministrador de la plataforma al activar su empresa. Para mas informacion sobre planes y precios, contacte al equipo comercial.

---

**P: Como configuro el formato de los consecutivos de mis planillas?**

**Variantes:** "formato consecutivo", "numeracion planillas", "formato alistamiento", "EL consecutivo"

**R:**
En **Configuracion de empresa** puede definir los formatos de consecutivo. Ejemplos de formato:
- Alistamiento: `EL-{YYYY}-{0001}` genera consecutivos como `EL-2025-0001`.
- Mantenimiento: `EM-{YYYY}-{0001}` genera consecutivos como `EM-2025-0001`.

Donde `{YYYY}` es el ano y `{0001}` es el numero secuencial con ceros a la izquierda.

---

## 4. VEHICULOS

---

**P: Como registro un vehiculo? / Como agrego una placa al sistema?**

**Variantes:** "registrar vehiculo", "agregar vehiculo", "nueva placa", "ingresar vehiculo", "como creo un vehiculo"

**R:**
1. Vaya al modulo **Vehiculos** en el menu.
2. Haga clic en **Nuevo vehiculo**.
3. Complete los datos requeridos: placa, clase de vehiculo y nivel de servicio.
4. Opcionalmente complete: marca, linea, modelo, color, combustible, cilindraje, kilometraje.
5. Registre los documentos del vehiculo: SOAT, RTM (revision tecnico-mecanica), RCC, RCE, tecnomecanica, tarjeta de operacion.
6. Asigne un conductor principal.
7. El vehiculo quedara en estado **inactivo** hasta que el superadministrador lo active en SICOV.

---

**P: Que documentos del vehiculo debo registrar?**

**Variantes:** "documentos vehiculo", "soat rtm", "vencimiento documentos", "papeles vehiculo"

**R:**
El sistema soporta los siguientes documentos con numero y fechas de expedicion/vencimiento:
- **SOAT** (Seguro Obligatorio de Accidentes de Transito)
- **RTM** (Revision Tecnico-Mecanica)
- **RCC** (Responsabilidad Civil Contractual)
- **RCE** (Responsabilidad Civil Extracontractual)
- **Tecnomecanica**
- **Tarjeta de Operacion**

El dashboard le mostrara alertas cuando un documento este proximo a vencer (menos de 30 dias) o ya haya vencido.

---

**P: Como asigno un conductor a un vehiculo?**

**Variantes:** "asignar conductor", "conductor del vehiculo", "conductor principal", "cambiar conductor"

**R:**
En el formulario de edicion del vehiculo, encontrara los campos **Conductor** (principal) y **Conductor 2** (secundario). Seleccione al conductor de la lista de conductores registrados en su empresa. Tambien puede ingresar directamente el tipo y numero de documento si el conductor no esta en la lista.

---

**P: Que es el nivel de servicio del vehiculo?**

**Variantes:** "nivel de servicio", "nivelServicio", "que significa nivel servicio"

**R:**
El nivel de servicio es el codigo numerico que identifica el tipo de servicio de transporte que presta el vehiculo segun la clasificacion de Supertransporte (ej. servicio publico individual, colectivo, especial, etc.). Este dato es requerido por SICOV al registrar el vehiculo.

---

**P: Como desactivo un vehiculo? / Como doy de baja un vehiculo?**

**Variantes:** "desactivar vehiculo", "baja vehiculo", "vehiculo inactivo", "retirar vehiculo"

**R:**
En el listado de vehiculos, use el boton de activar/desactivar para cambiar el estado del vehiculo. Al desactivarlo puede registrar una nota de desactivacion con el motivo. El sistema registrara la fecha de ultima desactivacion. Los vehiculos inactivos no apareceran en la app movil para nuevos alistamientos.

---

**P: Que es sicov_sync_enabled en un vehiculo?**

**Variantes:** "sync sicov", "sincronizacion sicov", "deshabilitar envio supertransporte", "no enviar a sicov"

**R:**
El campo `sicov_sync_enabled` controla si los reportes de ese vehiculo (alistamientos, mantenimientos) se envian automaticamente a Supertransporte. Solo el superadministrador puede desactivar esta sincronizacion. Cuando esta en `false`, los registros se guardan localmente pero NO se transmiten a SICOV.

---

## 5. CONDUCTORES

---

**P: Como registro un conductor? / Como agrego un nuevo conductor?**

**Variantes:** "registrar conductor", "nuevo conductor", "agregar conductor", "crear conductor"

**R:**
1. Vaya al modulo **Conductores** en el menu.
2. Haga clic en **Nuevo conductor**.
3. Complete los datos del conductor principal: tipo de identificacion, numero, nombres y apellidos.
4. Si el vehiculo tiene dos conductores, complete tambien los datos del conductor secundario.
5. Registre la licencia de conduccion y su fecha de vencimiento.
6. Puede agregar informacion de pruebas de alcoholimetria y examenes medicos.

---

**P: Que es el idDespacho en los conductores?**

**Variantes:** "id despacho", "numero despacho", "despacho conductor"

**R:**
El `idDespacho` es el numero de despacho asignado por la empresa de transporte al conductor o al turno de operacion. Es el identificador que SICOV usa para asociar el conductor con sus viajes y registros operativos.

---

**P: Como registro la alcoholimetria de un conductor?**

**Variantes:** "prueba alcoholimetria", "examen alcohol", "test alcoholimetria", "registro alcohol"

**R:**
En el formulario del conductor puede registrar:
- **Conductor principal**: ID de prueba de alcoholimetria, resultado y fecha de la ultima prueba.
- **Conductor secundario**: los mismos campos con el sufijo "Secundario".

Estos datos se reportan a SICOV junto con el alistamiento o el despacho.

---

**P: Como registro el examen medico del conductor?**

**Variantes:** "examen medico conductor", "id examen medico", "estado medico conductor"

**R:**
En el formulario del conductor encontrara los campos:
- `idExamenMedico`: identificador del examen medico del conductor principal.
- `fechaUltimoExamenMedico`: fecha del ultimo examen.
- Equivalentes para el conductor secundario: `idExamenMedicoSecundario` y `fechaUltimoExamenMedicoSecundario`.

---

**P: Como registro la licencia de conduccion?**

**Variantes:** "licencia conduccion", "numero licencia", "vencimiento licencia", "carnet conductor"

**R:**
En el formulario del conductor registre el numero de licencia (`licenciaConduccion`) y la fecha de vencimiento (`licenciaVencimiento`). Tambien puede registrarlo desde el perfil de usuario en el modulo de usuarios. El sistema puede alertar cuando una licencia este proxima a vencer.

---

## 6. ALISTAMIENTOS

---

**P: Que es un alistamiento? / Para que sirve el alistamiento?**

**Variantes:** "que es alistamiento", "pre operacional", "inspeccion vehiculo", "chequeo antes de salir"

**R:**
El alistamiento (tambien llamado pre-operacional) es la inspeccion que se realiza al vehiculo antes de cada jornada o despacho. Es un requisito de Supertransporte que deben cumplir todas las empresas vigiladas. El alistamiento verifica el estado de componentes del vehiculo y queda registrado en SICOV con los codigos de actividades inspeccionadas segun la norma.

---

**P: Que se revisa en un alistamiento?**

**Variantes:** "items alistamiento", "que verifico", "que componentes reviso", "actividades alistamiento"

**R:**
Los items de alistamiento que usa su empresa estan configurados en el catalogo de **Items de Alistamiento**. Cada item corresponde a uno o varios codigos SICOV. Los codigos estandar de SICOV para alistamiento son:

| Codigo | Actividad |
|---|---|
| 1 | Fugas del motor |
| 2 | Tension correas |
| 3 | Ajuste de tapas |
| 4 | Niveles de aceite de motor, transmision, direccion y frenos |
| 5 | Nivel agua limpiaparabrisas |
| 6 | Aditivos de radiador |
| 7 | Filtros humedos y secos |
| 8 | Baterias: niveles de electrolito, ajuste de bordes y sulfatacion |
| 9 | Llantas: desgaste y presion de aire |
| 10 | Equipo de carretera |
| 11 | Botiquin |

---

**P: Como registro un alistamiento? / Como hago el pre-operacional?**

**Variantes:** "crear alistamiento", "registrar pre operacional", "como hago alistamiento", "nuevo alistamiento"

**R:**
El alistamiento normalmente lo realiza el conductor o inspector desde la **app movil**:
1. Seleccione el vehiculo por placa.
2. Marque los items de inspeccion que fueron revisados y aprobados.
3. Registre los datos del responsable y el conductor.
4. Firme digitalmente (firma del conductor e inspector si aplica).
5. Confirme el envio.

El sistema deduplicara automaticamente los codigos SICOV (si varios items apuntan al mismo codigo, se envia una sola vez) y los transmitira a Supertransporte.

---

**P: Puedo ver los alistamientos registrados desde la web?**

**Variantes:** "ver alistamientos web", "historial alistamientos", "consultar pre operacionales", "listado alistamientos"

**R:**
Si. Desde la aplicacion web, en el modulo de **Mantenimiento > Alistamientos**, puede consultar todos los alistamientos registrados por su empresa con filtros por placa, fecha y estado.

---

**P: Que pasa si un codigo SICOV aparece en varios items del alistamiento?**

**Variantes:** "codigos duplicados sicov", "mismo codigo dos items", "deduplicacion codigos"

**R:**
El sistema aplica deduplicacion automatica. Si varios items marcados en el alistamiento corresponden al mismo codigo SICOV, ese codigo se envia una unica vez a Supertransporte. Esto garantiza que el reporte sea correcto y no genere errores de duplicacion en SICOV.

---

**P: Que son los items de alistamiento de la empresa base?**

**Variantes:** "items base", "items globales", "empresa base alistamiento", "items que no puedo editar"

**R:**
Existe un conjunto de items de alistamiento globales (asociados a la empresa base del sistema) que son visibles en la app movil para todas las empresas. Estos items son de solo lectura y no pueden editarse desde su empresa. Son los items estandar definidos por la plataforma que aplican a todas las empresas. Adicionalmente, cada empresa puede crear sus propios items personalizados.

---

## 7. MANTENIMIENTOS PREVENTIVOS

---

**P: Que es un mantenimiento preventivo? / Como registro un mantenimiento preventivo?**

**Variantes:** "mantenimiento preventivo", "mantenimiento programado", "crear preventivo", "registrar mantenimiento preventivo"

**R:**
El mantenimiento preventivo es el mantenimiento planificado que se realiza al vehiculo segun un cronograma (por kilometraje, tiempo o calendario). Para registrar uno:
1. Vaya a **Mantenimiento > Preventivos**.
2. Haga clic en **Nuevo**.
3. Complete los datos: placa, fecha programada, hora, actividades realizadas, responsable y datos de la empresa.
4. Adjunte la foto de evidencia si tiene.
5. Guarde y el sistema lo enviara a SICOV.

El sistema calcula automaticamente la fecha de vencimiento del proximo mantenimiento (2 meses despues de la fecha programada por defecto).

---

**P: Puedo ver un calendario de mantenimientos preventivos?**

**Variantes:** "calendario mantenimientos", "programacion mantenimientos", "ver mantenimientos en calendario", "cuando toca el proximo mantenimiento"

**R:**
Si. En **Mantenimiento > Calendario de preventivos** puede visualizar todos los mantenimientos programados en formato de calendario, identificando facilmente los mantenimientos por fecha, vehiculo y estado (pendiente, ejecutado, vencido).

---

**P: Como adjunto evidencia fotografica a un mantenimiento?**

**Variantes:** "foto mantenimiento", "evidencia mantenimiento", "subir imagen", "adjuntar foto"

**R:**
Al crear o editar un mantenimiento preventivo, encontrara el campo **Foto de evidencia**. Seleccione la imagen desde su dispositivo. La plataforma almacena la imagen en el servidor de archivos (Oracle Storage o MinIO segun configuracion) y guarda la referencia en el registro del mantenimiento.

---

**P: Que es la fecha de vencimiento de un mantenimiento preventivo?**

**Variantes:** "vencimiento preventivo", "dueDate preventivo", "cuando vence el mantenimiento"

**R:**
La fecha de vencimiento (`dueDate`) es la fecha limite para realizar el proximo mantenimiento preventivo. El sistema la calcula automaticamente como 2 meses despues de la fecha programada del mantenimiento actual. Esto permite identificar vehiculos con mantenimiento vencido o proximo a vencer en el dashboard.

---

## 8. MANTENIMIENTOS CORRECTIVOS

---

**P: Que es un mantenimiento correctivo? / Como registro una reparacion?**

**Variantes:** "mantenimiento correctivo", "reparacion vehiculo", "averia vehiculo", "crear correctivo"

**R:**
El mantenimiento correctivo se registra cuando un vehiculo sufre una falla o averia que requiere reparacion no programada. Para registrarlo:
1. Vaya a **Mantenimiento > Correctivos**.
2. Haga clic en **Nuevo**.
3. Complete los datos: placa, descripcion de la falla, actividades realizadas, responsable y fechas.
4. Adjunte evidencia fotografica si aplica.
5. Guarde y el sistema reportara a SICOV.

---

**P: Cual es la diferencia entre mantenimiento preventivo y correctivo?**

**Variantes:** "diferencia preventivo correctivo", "preventivo vs correctivo", "cuando uso uno u otro"

**R:**
- **Preventivo**: mantenimiento planificado y programado en el tiempo. Busca evitar fallas. Se agenda con anticipacion.
- **Correctivo**: mantenimiento reactivo que surge cuando el vehiculo ya presenta una falla o averia. No estaba programado.

Ambos tipos se reportan a SICOV y quedan registrados en el historial del vehiculo.

---

**P: Como veo el detalle de un mantenimiento correctivo?**

**Variantes:** "ver detalle correctivo", "informacion mantenimiento correctivo", "consultar reparacion"

**R:**
En el listado de **Mantenimiento > Correctivos**, haga clic en el registro que desea consultar. Se abrira la vista de detalle con toda la informacion del mantenimiento, incluyendo el responsable, las actividades realizadas, las fechas y la foto de evidencia si fue registrada.

---

## 9. NOVEDADES (INCIDENTES)

---

**P: Que es una novedad? / Para que sirven las novedades?**

**Variantes:** "que es una novedad", "incidentes", "novedades sistema", "reporte de novedad"

**R:**
Las novedades o incidentes son eventos relevantes que ocurren durante la operacion del vehiculo o el despacho y que deben reportarse. Pueden ser de dos tipos:
- **Tipo 1**: novedad del vehiculo (accidente, desperfecto mecanico, etc.).
- **Tipo 2**: novedad del conductor (enfermedad, accidente personal, etc.).

---

**P: Como registro una novedad? / Como reporto un incidente?**

**Variantes:** "crear novedad", "registrar incidente", "nueva novedad", "reportar evento"

**R:**
1. Vaya al modulo **Novedades** en el menu.
2. Haga clic en **Nueva novedad**.
3. Seleccione el **ID de despacho** al que corresponde.
4. Seleccione el **tipo de novedad** (1 o 2).
5. Escriba la **descripcion** del evento (maximo 500 caracteres).
6. Agregue observaciones adicionales en **otros** si aplica.
7. Guarde el registro.

---

**P: Puedo filtrar las novedades por estado o despacho?**

**Variantes:** "filtrar novedades", "buscar novedades", "novedades por despacho", "novedades activas"

**R:**
Si. En el modulo de Novedades puede filtrar por:
- Texto libre (buscar en la descripcion)
- ID de despacho especifico
- Estado (activo/inactivo)
- Paginacion configurable (por defecto 10 registros por pagina)

---

**P: Como cierro o desactivo una novedad?**

**Variantes:** "cerrar novedad", "inactivar novedad", "marcar novedad resuelta", "estado novedad"

**R:**
En el listado de novedades, use el boton de **toggle de estado** (activar/desactivar) para cambiar el estado de la novedad. Una novedad inactiva indica que fue atendida o cerrada. El historial siempre se conserva.

---

## 10. AUTORIZACIONES DE VIAJE NNA

---

**P: Que es una autorizacion de viaje NNA?**

**Variantes:** "autorizacion nna", "autorizacion menor de edad", "autorizacion viaje nino", "que es nna"

**R:**
NNA significa Ninos, Ninas y Adolescentes. Las autorizaciones de viaje NNA son los permisos que los acudientes o responsables legales otorgan para que un menor de edad viaje en un vehiculo de transporte. Supertransporte exige el registro de estas autorizaciones en SICOV para el transporte especial que moviliza menores.

---

**P: Como registro una autorizacion de viaje NNA?**

**Variantes:** "crear autorizacion nna", "nueva autorizacion", "registrar permiso menor edad", "agregar autorizacion"

**R:**
1. Vaya a **Autorizaciones** en el menu.
2. Haga clic en **Nueva autorizacion**.
3. Complete los datos requeridos:
   - **ID Despacho** (numero de despacho del viaje)
   - **Placa** del vehiculo
   - **Fecha del viaje**, origen y destino
   - **Datos del NNA**: tipo de identificacion, numero, nombre y apellido
   - **Datos del Otorgante** (quien autoriza): identificacion, nombre, telefono, correo, direccion, sexo, genero y calidad en que actua
   - **Autorizado a viajar** (acompanante que viaja con el menor)
   - **Autorizado a recoger** (quien recibe al menor en el destino)
4. Adjunte los documentos en formato digital: copia de la autorizacion de viaje, documento de parentesco, documento de identidad del autorizado y constancia de entrega.
5. Haga clic en **Crear**.

---

**P: Cuales documentos son necesarios para una autorizacion NNA?**

**Variantes:** "documentos autorizacion nna", "que necesito para autorizar menor", "documentos permiso viaje"

**R:**
Los documentos requeridos son:
1. **Copia de autorizacion de viaje**: el documento firmado por el acudiente que autoriza el viaje.
2. **Documento de parentesco**: prueba del vinculo familiar entre el otorgante y el NNA.
3. **Documento de identidad del autorizado**: identificacion de quien viaja con o recoge al menor.
4. **Constancia de entrega**: documento que confirma la entrega del menor en el destino.

Cada documento se registra con nombre de archivo, nombre del documento y ruta de almacenamiento.

---

**P: Puedo editar una autorizacion despues de crearla?**

**Variantes:** "editar autorizacion", "modificar autorizacion nna", "corregir autorizacion"

**R:**
Si. En el listado de autorizaciones, haga clic en el icono de edicion (lapiz) de la autorizacion que desea modificar. Puede actualizar datos de fecha, origen, destino y datos del NNA. Los cambios se guardan y se sincronizan con SICOV.

---

**P: Como desactivo una autorizacion?**

**Variantes:** "cancelar autorizacion", "inactivar autorizacion nna", "revocar permiso viaje"

**R:**
En el listado de autorizaciones use el boton de toggle (activar/desactivar). Una autorizacion inactiva indica que fue cancelada o ya no aplica. El registro historico se mantiene.

---

## 11. INTEGRACION CON SICOV / SUPERTRANSPORTE

---

**P: El sistema envia automaticamente los datos a Supertransporte?**

**Variantes:** "envio automatico sicov", "reporte automatico supertransporte", "sincronizacion sicov", "debo enviar manualmente"

**R:**
Si, el sistema envia automaticamente los registros a SICOV. Cuando usted crea un alistamiento, un mantenimiento preventivo, un mantenimiento correctivo o una autorizacion NNA, el sistema los transmite en tiempo real a la API de Supertransporte usando las credenciales (`vigiladoId` y `vigiladoToken`) configuradas en su empresa. No necesita ingresar manualmente al portal de Supertransporte.

---

**P: Que pasa si la sincronizacion con SICOV falla?**

**Variantes:** "error sicov", "fallo envio supertransporte", "no se pudo enviar", "error sincronizacion"

**R:**
Si el envio a SICOV falla, el registro se guarda localmente en la plataforma y el sistema almacena la respuesta del error en el campo `externalData` del registro. Contacte al administrador de la plataforma para revisar el error e intentar el reenvio. En algunos casos el error puede deberse a credenciales vencidas o datos incorrectos segun las reglas de Supertransporte.

---

**P: Puedo ver el ID que Supertransporte asigna a mis registros?**

**Variantes:** "id externo supertransporte", "id sicov registro", "externalId", "identificador supertransporte"

**R:**
Si. Cada registro (alistamiento, mantenimiento, autorizacion) tiene un campo `externalId` que almacena el identificador asignado por SICOV al momento de la sincronizacion exitosa. Tambien se guarda la respuesta completa de SICOV en el campo `externalData` para trazabilidad.

---

**P: Como se cuantos codigos SICOV se enviaron en un alistamiento?**

**Variantes:** "codigos enviados sicov", "actividades alistamiento sicov", "que se reporto en el alistamiento"

**R:**
En el detalle de cada alistamiento puede ver el campo **actividades**, que contiene la lista de codigos SICOV que fueron enviados a Supertransporte. Recuerde que el sistema deduplica automaticamente los codigos, por lo que si varios items de inspeccion correspondian al mismo codigo, aparece una sola vez.

---

## 12. CATALOGOS DE MANTENIMIENTO E INSPECCION

---

**P: Puedo personalizar los items de inspeccion de mi empresa?**

**Variantes:** "personalizar items", "agregar items propios", "crear items inspeccion", "catalogo alistamiento empresa"

**R:**
Si. Desde **Mantenimiento > Items de Alistamiento** puede crear, editar y activar/desactivar los items de inspeccion especificos de su empresa. Para cada item puede definir:
- **Tipo de parte**: categoria del item (ej. Motor, Frenos, Neumaticos)
- **Dispositivo**: nombre del componente especifico
- **Clase de vehiculo**: a que clase aplica el item (o `GENERAL` para todos)
- **Orden**: posicion en la lista de inspeccion
- **Codigos SICOV**: uno o mas codigos del 1 al 11 que se reportan cuando este item es verificado
- **Obligatorio**: si el item es de revision obligatoria

---

**P: Puedo personalizar los tipos de mantenimiento?**

**Variantes:** "tipos mantenimiento", "catalogo mantenimiento", "partes mantenimiento", "items mantenimiento"

**R:**
Si. Desde **Mantenimiento > Tipos de Mantenimiento** puede gestionar el catalogo de partes o tipos de mantenimiento de su empresa. Para cada tipo puede definir:
- **Tipo de parte**: categoria (ej. Motor, Suspension, Electrico)
- **Dispositivo**: componente especifico
- **Clase de vehiculo**: a que clase aplica
- **Orden**: posicion en la lista

---

**P: Como activo o desactivo un item del catalogo?**

**Variantes:** "activar item", "desactivar item", "habilitar item", "toggle item catalogo"

**R:**
En el listado del catalogo (tanto de alistamiento como de mantenimiento), cada item tiene un boton de toggle que cambia su estado entre **Activo** e **Inactivo**. Los items inactivos no apareceran en la app movil al realizar un alistamiento o mantenimiento, pero se conservan en el sistema.

---

**P: Como se ordenan los items en la app movil?**

**Variantes:** "orden items movil", "como aparecen los items", "orden catalogo", "prioridad items"

**R:**
Los items se ordenan por: **tipo de parte** (alfabetico) > **orden** (numerico, menor primero) > **dispositivo** (alfabetico). Los items que no tienen numero de orden asignado aparecen antes que los que si tienen orden definido. Puede ajustar el campo **orden** de cada item para controlar la secuencia de aparicion.

---

## 13. DASHBOARD Y REPORTES

---

**P: Que informacion muestra el dashboard?**

**Variantes:** "que veo en el dashboard", "pantalla principal", "resumen sistema", "indicadores"

**R:**
El dashboard muestra un resumen ejecutivo de la operacion:
- **Novedades recientes** (incidentes abiertos)
- **Autorizaciones recientes** (autorizaciones activas)
- **Alistamientos activos** (total de alistamientos en estado activo)
- **Mantenimientos totales** (suma de preventivos y correctivos registrados)

Ademas puede visualizar el estado de vencimiento de los documentos de los vehiculos (SOAT, RTM, Tarjeta de Operacion) con indicadores de color: verde (vigente), amarillo (vence en menos de 30 dias), rojo (vencido).

---

**P: Puedo ver reportes de mantenimiento de un vehiculo especifico?**

**Variantes:** "historial vehiculo", "reporte por placa", "mantenimientos de un vehiculo", "ver historia vehiculo"

**R:**
Si. En los modulos de **Mantenimientos Preventivos** y **Mantenimientos Correctivos** puede filtrar por placa para ver el historial completo de un vehiculo especifico. Tambien puede acceder al modulo de **Resumen (Overview)** de mantenimientos para una vista consolidada.

---

**P: Hay un modulo de programa de mantenimiento?**

**Variantes:** "programa mantenimiento", "cronograma mantenimiento", "plan mantenimiento", "ProgramView"

**R:**
Si. En **Mantenimiento > Programa** puede visualizar el plan de mantenimiento preventivo de la flota, con las fechas programadas, ejecutadas y de vencimiento de cada vehiculo. Esto facilita la planeacion del mantenimiento y la asignacion de recursos.

---

## 14. ROLES Y PERMISOS

---

**P: Quien puede crear empresas en la plataforma?**

**Variantes:** "crear empresa", "registrar empresa", "nueva empresa plataforma", "quien crea empresas"

**R:**
Solo el **superadmin** puede crear y gestionar empresas en la plataforma. Los administradores de cada empresa (`admin`) gestionan sus propios usuarios, vehiculos y conductores, pero no pueden crear nuevas empresas.

---

**P: Un conductor puede ver los datos de otras empresas?**

**Variantes:** "aislamiento datos", "privacidad empresa", "conductor ve otras empresas", "datos de otra empresa"

**R:**
No. El sistema esta disenado con aislamiento total por empresa (multitenancy). Cada usuario, independientemente de su rol, solo tiene acceso a los datos de su propia empresa. Un conductor solo ve los vehiculos, alistamientos y registros de la empresa a la que pertenece.

---

**P: El rol viewer puede crear registros?**

**Variantes:** "viewer crear", "solo lectura", "permiso viewer", "que puede hacer un viewer"

**R:**
No. El rol `viewer` tiene permisos de **solo lectura**. Puede consultar todos los registros de su empresa (vehiculos, conductores, alistamientos, mantenimientos, autorizaciones, novedades) pero no puede crear, editar ni eliminar ningun registro.

---

**P: Quien puede activar o desactivar vehiculos en SICOV?**

**Variantes:** "activar vehiculo sicov", "quién activa vehiculos", "activacion sicov"

**R:**
La activacion de vehiculos en SICOV (habilitar el vehiculo para que opere y reporte) la realiza el **superadmin** de la plataforma. El administrador de la empresa puede registrar el vehiculo, pero la activacion final la controla el superadmin para garantizar que el vehiculo cumpla todos los requisitos antes de operar.

---

## 15. ERRORES COMUNES

---

**P: Me sale un error de "token expirado" / No puedo ingresar por token expirado**

**Variantes:** "token expirado", "sesion caducada", "jwt expired", "token invalido", "sesion cerrada"

**R:**
La sesion en el sistema tiene un tiempo de vida limitado por seguridad. Si ve un error de token expirado, cierre sesion y vuelva a ingresar con su usuario y contrasena. Si el problema persiste, limpie la cache del navegador o contacte al administrador.

---

**P: No puedo ver mis vehiculos en la app movil**

**Variantes:** "vehiculos no aparecen movil", "lista de vehiculos vacia movil", "no veo mis placas movil"

**R:**
Verifique lo siguiente:
1. El vehiculo debe estar en estado **activo** en el sistema.
2. El vehiculo debe estar habilitado para sincronizacion SICOV (`sicov_sync_enabled` = true).
3. Su usuario debe tener rol `driver` o `operator`.
4. Asegurese de tener conexion a internet activa en el dispositivo movil.

---

**P: El alistamiento se guardo pero no se envio a Supertransporte**

**Variantes:** "alistamiento no llego sicov", "alistamiento sin enviar", "error envio alistamiento", "no reporto supertransporte"

**R:**
Posibles causas:
1. Las credenciales SICOV de su empresa (`vigiladoId` o `vigiladoToken`) estan desactualizadas o son incorrectas.
2. El vehiculo tiene la sincronizacion SICOV deshabilitada (`sicov_sync_enabled = false`).
3. Hubo un error en la API de Supertransporte (puede ser un problema temporal del servicio externo).

Revise el campo `externalData` del alistamiento para ver el mensaje de error de SICOV. Contacte al administrador de la plataforma si el problema persiste.

---

**P: Cree una autorizacion NNA pero faltan campos obligatorios segun SICOV**

**Variantes:** "autorizacion incompleta sicov", "campos faltantes autorizacion", "error validacion autorizacion"

**R:**
SICOV requiere como minimo los siguientes datos en una autorizacion NNA:
- ID Despacho (numerico)
- Fecha de viaje
- Origen y destino
- Tipo de identificacion del NNA
- Numero de identificacion del NNA
- Nombre y apellido del NNA

Asegurese de que todos estos campos esten diligenciados antes de guardar. Los demas campos (otorgante, autorizado a viajar, autorizado a recoger, documentos) son opcionales pero recomendados.

---

**P: Como cambio mi contrasena desde la aplicacion?**

**Variantes:** "cambiar contrasena web", "actualizar clave", "donde cambio mi password", "nueva contrasena"

**R:**
1. Inicie sesion en la aplicacion web.
2. Vaya al modulo **Cambiar Contrasena** (disponible en el menu lateral o en su perfil).
3. Ingrese su contrasena actual y la nueva contrasena.
4. Confirme el cambio.

Si su cuenta tiene la bandera de cambio obligatorio, el sistema le pedira que lo haga antes de continuar usando la aplicacion.

---

**P: Como contacto al soporte tecnico?**

**Variantes:** "soporte tecnico", "reportar problema", "ayuda tecnica", "contacto soporte"

**R:**
Si tiene un problema tecnico que no esta cubierto en este manual:
1. Contacte al **administrador de su empresa** como primer punto de contacto.
2. Si el problema es de nivel de plataforma (error de SICOV, falla en el servidor, etc.), el administrador debe escalar al equipo tecnico de ProtegeMeSICOV.
3. Para problemas con sus credenciales SICOV o el ID de vigilado, contacte directamente a la **Superintendencia de Transporte**.

---

## APENDICE — GLOSARIO

| Termino | Definicion |
|---|---|
| SICOV | Sistema de Informacion y Control de Operaciones y Vigilancia de la Superintendencia de Transporte |
| Supertransporte | Superintendencia de Transporte de Colombia, ente regulador |
| Vigilado | Empresa de transporte sujeta a vigilancia y control de Supertransporte |
| VigiladoId | Identificador numerico asignado por Supertransporte a la empresa vigilada |
| VigiladoToken | Token de autenticacion para la API de SICOV |
| NNA | Ninos, Ninas y Adolescentes |
| Pre-operacional | Ver: Alistamiento |
| Alistamiento | Inspeccion diaria del vehiculo antes de salir a operar |
| RTM | Revision Tecnico-Mecanica |
| SOAT | Seguro Obligatorio de Accidentes de Transito |
| RCC | Responsabilidad Civil Contractual |
| RCE | Responsabilidad Civil Extracontractual |
| Despacho | Turno o salida operativa de un vehiculo con conductor asignado |
| idDespacho | Numero identificador del despacho en el sistema de la empresa |
| Toggle | Boton de activar/desactivar un registro |
| Multitenancy | Arquitectura en la que multiples empresas usan la misma plataforma con datos completamente separados |

---

*Documento generado para uso como base de conocimiento de chatbot. Version: Marzo 2026.*
