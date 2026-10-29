# Puesta en marcha y uso en clase

## Actualización: segundo día corregido

La versión 1.2 aplica las últimas correcciones del día 2: preguntas previas revisadas, construcción de la tabla antes de las preguntas de análisis, media automática, cálculo porcentual con espacios, totales y gráficos con ejes numéricos. La tarea permite dos intentos por persona nueva y muestra únicamente el experimento. El docente dispone de proyección para los cuatro momentos y control de acceso progresivo.

El botón **Preparar tarea del día 2** abre esa modalidad y oculta los tiempos personales y las representaciones generales de Analizar. Los resultados de la tarea se conservan en **Interpretar**, para participantes del aula, con botones de primer intento, segundo intento y todos. Las personas que entran por el enlace de tarea solo reciben sus propios intentos. Las preferencias se pueden revisar en **Configurar**.

La identificación de personas repetidas entre dispositivos se apoya en la confirmación de no haber participado antes; no usa reconocimiento automático.

## 1. Explorar la demostración

Abre el HTML de demostración que acompaña al paquete. Ya contiene doce participantes ficticios, con dos intentos cada uno.

1. Usa el código **DEMO30** para entrar como participante. Registra un nombre de prueba.
2. Visita los cuatro momentos desde el menú.
3. Abre **Portal docente → Entrar como docente de demostración**.
4. Abre la sesión de exploración y prueba **Configurar**: cambia intentos, fondos, modalidades, representaciones visibles y campos de registro.
5. En **Resultados** puedes revisar intentos y descargar datos. En **Respuestas** puedes consultar el trabajo registrado.
6. Abre **Proyectar**: recorre los cuatro momentos y, en Analizar, alterna intentos y representaciones.
7. En Interpretar, prepara la tarea y prueba su enlace. En la demostración el QR solo reproduce la dirección donde abriste el HTML; para compartir entre dispositivos usa el sitio publicado y conectado.

La demostración guarda datos solo en ese navegador. No sincroniza distintos dispositivos ni escribe en la hoja. Un navegador o visor que no permita almacenamiento local puede impedir esta exploración; en ese caso usa el sitio publicado en GitHub Pages. En la interfaz desplegada puedes abrir la misma demostración mediante **Explorar la demostración**.

## 2. Crear el repositorio y publicar GitHub Pages

Se sugiere el nombre `30-segundos`.

1. En GitHub, crea un repositorio nuevo. Para el flujo de GitHub Free, usa un repositorio público.
2. Extrae el ZIP. Entra en la carpeta `treinta-segundos`; sube su contenido a la raíz del repositorio, no la carpeta contenedora.
3. Comprueba que `index.html` esté en la raíz, junto a `config.js` y `assets/`.
4. Abre **Settings → Pages** y selecciona **Deploy from a branch**.
5. Selecciona la rama `main`, carpeta **/(root)**, y guarda.
6. Espera a que GitHub muestre la dirección publicada. Será aproximadamente `https://TU_USUARIO.github.io/30-segundos/`.

El repositorio puede incluir `apps-script/` y `tests/`: no contienen credenciales reales. Las claves docentes nunca deben añadirse al repositorio ni a `config.js`.

Documentación: [Inicio rápido de GitHub Pages](https://docs.github.com/en/pages/quickstart).

## 3. Instalar el servicio en la hoja

Hoja de destino:

[Abrir la hoja proporcionada](https://docs.google.com/spreadsheets/d/1g6cQuJ0M47_wlQfWcrt2S22w1Mp2RdPAB6xp2j8un9U/edit).

Desde la cuenta que tiene permiso de edición:

1. Abre la hoja y selecciona **Extensiones → Apps Script**.
2. Copia el contenido de `apps-script/Code.gs` al archivo `Code.gs` del proyecto.
3. Crea un archivo de script llamado **Core** y pega `apps-script/Core.gs`.
4. Crea un archivo HTML llamado **Bridge** y pega `apps-script/Bridge.html`.
5. En la configuración del proyecto, habilita la visualización del manifiesto `appsscript.json`. Sustituye su contenido por el del archivo entregado. El entorno debe ser **V8**.

El ID de tu hoja ya está incorporado en el servicio. Si deseas probar primero en otra hoja, establece la propiedad `SPREADSHEET_ID` con el ID de esa hoja; no hace falta cambiar el código.

### Propiedades del proyecto

En **Configuración del proyecto → Propiedades de la secuencia de comandos**, crea:

| Propiedad | Valor |
| --- | --- |
| `ALLOWED_ORIGINS` | `https://TU_USUARIO.github.io` |
| `BOOTSTRAP_TEACHERS` | Un arreglo JSON con las cuentas docentes descritas abajo |
| `GOOGLE_CLIENT_ID` | Opcional: el ID OAuth del paso 5 |
| `SPREADSHEET_ID` | Opcional: otro ID de hoja para el piloto |

En `ALLOWED_ORIGINS` se escribe el **origen**, sin `/30-segundos/` y sin barra al final. Si tienes un dominio propio, usa su origen exacto. Para permitir varios orígenes, sepáralos por comas. La configuración entregada acepta orígenes HTTPS.

Ejemplo de formato para `BOOTSTRAP_TEACHERS` — sustituye todos los valores ilustrativos antes de ejecutarlo:

```json
[
  {
    "id": "docente1",
    "name": "Nombre del primer docente",
    "email": "docente1@ucr.ac.cr",
    "key": "REEMPLAZAR_POR_UNA_CLAVE_PRIVADA_LARGA"
  },
  {
    "id": "docente2",
    "name": "Nombre del segundo docente",
    "email": "docente2@ucr.ac.cr",
    "key": "REEMPLAZAR_POR_OTRA_CLAVE_PRIVADA_LARGA"
  }
]
```

Cada ID debe ser distinto, con 2 a 40 caracteres entre letras minúsculas, números, guion o guion bajo. La clave debe tener al menos 12 caracteres; usa una frase larga y distinta para cada docente. Si solo quieres comenzar por clave, puedes dejar `email` vacío.

Después de guardar las propiedades:

1. En el editor, selecciona la función **setupFromProperties_** y pulsa **Ejecutar**.
2. Autoriza el acceso a la hoja y las solicitudes externas que usa el acceso Google.
3. Revisa que se creen las cinco pestañas `TS_…` indicadas en la siguiente sección.
4. El inicializador guarda hashes con sal individual de las claves y elimina `BOOTSTRAP_TEACHERS`. No imprime las claves. `AUTH_VERSION` y `TEACHERS_JSON` se crean automáticamente.

### Pestañas creadas

| Pestaña | Contenido |
| --- | --- |
| `TS_Sesiones` | Códigos, títulos, configuración y versión de cada sesión |
| `TS_Participantes` | Código interno, nombre, género, grupo, procedencia y campos adicionales |
| `TS_Intentos` | Duración original, redondeo inicial, modalidad, fondo, protocolo, estado y fechas |
| `TS_Respuestas` | Momento, preguntas, respuestas, tabla propuesta, medidas y versión |
| `TS_Auditoria` | Docente, acción, sesión y motivo de revisión |

El servicio crea estas pestañas y conserva las demás. Si ya existe una pestaña `TS_…` con columnas diferentes, se detiene sin borrarla. Cada fila contiene columnas de consulta y `record_json`, que es la representación que lee la aplicación. Usa el portal docente para cambiar preferencias o revisar intentos; editar solo una celda de consulta no cambia el registro de la aplicación.

La hoja no necesita acceso público para estudiantes. El servicio se ejecuta con la cuenta propietaria y cada estudiante recibe únicamente los datos autorizados para su sesión y participante.

## 4. Publicar Apps Script y conectar la interfaz

1. En Apps Script, selecciona **Implementar → Nueva implementación → Aplicación web**.
2. Elige **Ejecutar como: Yo**, usando una cuenta con permiso de edición de la hoja.
3. En acceso, permite **Cualquier persona**, si tu cuenta lo ofrece. Esto hace accesible el servicio; las acciones docentes siguen exigiendo autenticación y los estudiantes usan sus credenciales de participante.
4. Implementa y copia la URL terminada en **/exec**. No uses la dirección `/dev`.
5. En el repositorio, edita `config.js`:

```js
window.THIRTY_CONFIG = {
  appsScriptUrl: 'https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec',
  googleClientId: '',
  pollSeconds: 20,
  demoEnabled: true
};
```

6. Guarda el cambio y espera a que GitHub Pages publique la actualización.
7. Abre el sitio. El estado debe indicar **Conectado**.
8. Entra al portal docente con el ID y la clave que configuraste. Crea una sesión.
9. En otro navegador o dispositivo, entra con su código y registra una persona de prueba.

La conexión usa un marco de Apps Script y `google.script.run`, con validación del origen y del canal de mensajes. Cada escritura devuelve confirmación. No se usan envíos opacos con `fetch(..., {mode: 'no-cors'})`.

Si una cuenta institucional no permite aplicaciones web accesibles para cualquier persona, ese despliegue no servirá para estudiantes sin cuentas autorizadas. Usa una cuenta y permisos institucionalmente adecuados que admitan el acceso previsto, o adapta el despliegue con la administración antes de la clase.

Documentación: [Aplicaciones web](https://developers.google.com/apps-script/guides/web) y [comunicación con el servidor](https://developers.google.com/apps-script/guides/html/communication).

## 5. Activar el acceso Google — opcional

El acceso por ID/clave ya funciona sin este paso. Para disponer de ambas opciones:

1. En Google Cloud, crea o usa un proyecto y configura su pantalla de consentimiento OAuth.
2. Crea una credencial OAuth de tipo **Aplicación web**.
3. En **Orígenes de JavaScript autorizados**, agrega el origen exacto de GitHub Pages: `https://TU_USUARIO.github.io`.
4. Si el proyecto está en modo de prueba y requiere usuarios de prueba, agrega las cuentas docentes que participarán.
5. Copia el **ID de cliente**; no necesitas poner un secreto OAuth en la interfaz.
6. Guarda el mismo ID en la propiedad `GOOGLE_CLIENT_ID` de Apps Script y en `googleClientId` de `config.js`.
7. Comprueba que cada correo esté incluido en la lista docente creada por el inicializador.

El servicio verifica la firma RS256 del token con las claves públicas de Google, su audiencia, emisor, caducidad, correo verificado y nonce. Las claves públicas se guardan temporalmente según su vigencia. No se usa el endpoint de depuración `tokeninfo`.

La asociación inicial por correo admite Gmail y cuentas Google Workspace, como una cuenta institucional que Google gestione. Para una cuenta Google cuyo correo pertenezca a un proveedor externo, configura el campo opcional `googleSub` con el identificador estable de la cuenta, validado por quien administra el sistema. Evita asociar esa identidad solo por un correo externo.

Documentación: [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

### Agregar o cambiar docentes

Vuelve a crear `BOOTSTRAP_TEACHERS` con la lista completa de docentes que tendrán acceso y ejecuta `setupFromProperties_`. Para un docente que ya existe, puedes omitir `key` y conservar su clave actual. Para cambiarla, incluye la nueva clave. Los IDs omitidos de la lista pierden acceso; la ejecución también invalida las sesiones docentes anteriores. Todos los docentes autorizados administran las sesiones de esta hoja: no hay una separación de permisos por sección.

## 6. Recorrido sugerido para la clase

### Preguntar

Crea la sesión y déjala en el momento 1. Se presentan estas preguntas, en orden:

1. Escribe una pregunta que podamos investigar con las estimaciones.
2. ¿Obtendremos todos el mismo tiempo? Predice algunos resultados y explica.
3. Antes de medir, ¿qué significa estimar bien? Propón un intervalo aceptable.
4. ¿Crees que lograrás estimar 30 segundos dentro del intervalo? Explica tu predicción.
5. ¿Qué debemos controlar para que las mediciones sean comparables? Escribe el protocolo.

No se adelanta el aviso del intervalo 25–35 s. Después de acordar el criterio con el grupo, registra sus límites en Configurar antes de medir, para que el protocolo y los cálculos correspondan a lo acordado. Cada participante puede escribir sus respuestas. En dispositivos compartidos, alternen mediante **Cambiar participante**.

### Recolectar

Habilita el momento 2 y abre la recolección. Empieza con un intento, modalidad en pareja o autónoma, fondo tranquilo y resultados ocultos. Cada intento se prepara con una conexión confirmada; el cronómetro se inicia al presionar el control, no durante la comunicación de red.

Para explorar otra condición, habilita más intentos y cambia el fondo o la modalidad. Si vas a comparar condiciones, planifica antes qué grupos o intentos recibirán cada condición. Cambiar preferencias no asigna aleatoriamente las condiciones ni convierte por sí mismo la actividad en un experimento causal.

Los fondos cambiantes usan intervalos aleatorios de al menos 1,5 segundos. No garantizan que alguien deje de contar mentalmente. La preferencia del dispositivo de reducir movimiento puede sustituir el fondo por uno tranquilo; se registran tanto el fondo solicitado como el efectivo. Puedes usar **Pantalla completa** cuando el navegador lo permita; igualmente deben controlarse los relojes externos y quienes observan.

En el aula, los intentos interrumpidos o cancelados no consumen el cupo de intentos válidos, pero permanecen documentados. En la tarea corregida, una medición interrumpida también consume el intento: no se ofrece práctica adicional a la misma persona. Una reserva cancelada antes de medir no lo consume. El docente puede revisar casos técnicos o modificar el cupo desde Configurar.

### Analizar

Cierra la recolección y habilita el momento 3. Muestra primero **Datos brutos**. El estudiante completa **Construye tu tabla y tus medidas** antes de las preguntas de **Tu análisis**.

La tabla tiene frecuencia absoluta, espacios para el cálculo `(fa ÷ N) × 100`, frecuencia porcentual y una fila **Total** que suma lo escrito. La media se calcula automáticamente con los datos autorizados de la selección actual; si el docente desactiva esa referencia, se calcula con la tabla propuesta. Las demás medidas mantienen espacios de respuesta. **Dibujar mi gráfico** usa la tabla propuesta y muestra ejes con sus marcas numéricas. Los datos originales no se sustituyen por las respuestas del estudiante.

Los botones **1.er intento**, **2.º intento** y **Todos los intentos** permiten cambiar la selección. Cada selección conserva su propia tabla y sus medidas propuestas. Usa **Guardar respuestas** para enviarlas al docente. Todos los intentos reúne mediciones repetidas: no equivale al número de personas.

Después habilita **Tabla de frecuencias**, **Gráfico de barras** y **Medidas y comparaciones** desde Configurar, o usa los controles de Proyectar. Puedes incluir valores intermedios con frecuencia cero. La ampliación abarca el rango de los intentos autorizados y no cambia los totales ni las medidas; con más de 1000 filas posibles se muestran los valores observados y se recomienda un redondeo mayor.

**Comparar mis medidas** aparece cuando las medidas de referencia están visibles. La comparación pareada de los intentos 1 y 2 usa personas con ambos intentos válidos y muestra el cambio en el error absoluto respecto al objetivo de cada intento. Una tabla o un gráfico también revela tiempos: oculta esas representaciones si todavía habrá intentos sin retroalimentación.

### Interpretar

Habilita el momento 4. Pide una conclusión con evidencia y argumentos sobre generalización, variabilidad y limitaciones. Una media igual al objetivo puede coexistir con errores grandes; el panel muestra también el error absoluto medio para discutirlo.

## 7. Ampliar la muestra con la tarea

1. Conserva la misma sesión. En Interpretar o en el resumen docente, pulsa **Preparar tarea del día 2**. Habilita el momento 4, abre la recolección, permite tarea y fija dos intentos por persona nueva, sin nombres ni campos adicionales, con tiempos ocultos. Revisa cualquier preferencia particular que quieras conservar después de usar ese botón.
2. Si deseas separar los registros, agrega un grupo pertinente antes de las inscripciones nuevas.
3. Abre **Mostrar QR para la tarea** o usa **Copiar enlace para la tarea**. El enlace lleva el código de sesión y abre directamente el registro de la tarea; no contiene credenciales de participante. El QR se genera en el navegador, sin enviar el enlace a un servicio externo. Para usarlo en otros dispositivos, ábrelo desde la dirección publicada de GitHub Pages.
4. Cada persona nueva se registra por separado y confirma voluntariedad y primera participación. El género queda opcional. Al entrar, solo ve **Recolectar**, el experimento y sus intentos; no ve los otros momentos ni los resultados colectivos. Después de sus dos intentos, el botón para medir queda deshabilitado y se ofrece **Registrar otra persona**.
5. En **Interpretar → Tarea: ampliar la investigación**, el grupo del aula puede consultar tabla y gráfico de la tarea con los botones **1.er intento**, **2.º intento** y **Todos los intentos**, cuando el docente tenga habilitada esa información. En Configurar, usa **Mostrar tablas y gráficos de la tarea en Interpretar** e **Intentos visibles para estudiantes**.
6. En el portal docente y la proyección también están disponibles esas selecciones. La comparación del grupo inicial frente a la muestra ampliada usa el primer intento de cada persona, para no contar a alguien dos veces. Todos los intentos suma mediciones, no personas.

Registrar varias mediciones bajo una sola identidad aumenta intentos, no personas. La muestra ampliada no se vuelve representativa de toda la población por aumentar su tamaño; también importa cómo se seleccionaron las personas.

### Proyectar y acompañar al grupo

Entra a **Portal docente → Abrir sesión → Proyectar**, o pulsa **Proyectar en clase** en el resumen.

1. Usa los cuatro botones superiores para guiar Preguntar, Recolectar, Analizar e Interpretar. Cambiar la sección proyectada no modifica por sí solo lo habilitado en los dispositivos del grupo.
2. Pulsa **Habilitar [momento] para estudiantes** para permitir el acceso hasta ese momento. Puedes regresar a un momento anterior para restringir los posteriores. Las preferencias se aplican en la siguiente actualización de cada dispositivo, aproximadamente cada 20–24 segundos.
3. En Recolectar, abre o cierra la recepción de intentos.
4. En Analizar, elige **1.er intento**, **2.º intento** o **Todos los intentos**, y después **Datos brutos**, **Tabla de frecuencias**, **Gráfico** o **Medidas**. El botón de frecuencias cero incluye o excluye los valores intermedios sin observaciones.
5. **Mostrar esta selección a estudiantes** habilita la representación proyectada y esa selección de intentos. Las otras representaciones conservan su configuración; usa Configurar para ocultarlas o habilitar varias a la vez.
6. En Interpretar puedes proyectar el QR, los resultados de tarea por intento y la comparación de la muestra ampliada.
7. Usa **Pantalla completa** si el navegador lo permite, o proyecta directamente la vista amplia. **Salir de proyección** vuelve al portal.

La proyección no muestra los nombres. El portal **Resultados** conserva las revisiones privadas y las exportaciones; **Respuestas** muestra las tablas y medidas construidas por cada participante.

## 8. Datos pendientes, revisión y respaldos

Si se pierde conexión después de medir, el tiempo se guarda como pendiente en ese navegador. **Reintentar envío** reutiliza el mismo ID: el servicio confirma el registro sin duplicarlo. Mantén ese navegador y perfil; otro dispositivo no posee esa cola local. Si el servicio rechaza un intento que ya se canceló o caducó, solicita revisión docente: no se convierte silenciosamente en un resultado válido.

Las respuestas escritas tienen un borrador local y un botón **Guardar respuestas**. Solo las respuestas cuya escritura se confirma quedan disponibles para el docente. Los borradores locales se conservan al cambiar de momento, pero no se envían automáticamente.

En **Resultados** puedes marcar un intento como inválido o devolverlo a válido, con motivo obligatorio. La duración original se conserva y la acción queda registrada. La revisión puede dejar más intentos válidos que el cupo vigente; comprueba ese caso antes de comparar personas.

Las exportaciones de intentos y el respaldo JSON pueden contener nombres y respuestas. **Datos anónimos** elimina esos datos directos y conserva códigos de participante nuevos dentro del archivo. No hay importación automática de un respaldo JSON: el respaldo sirve para conservar y revisar la información.

## 9. Piloto antes de la actividad

Haz este ensayo con la hoja de prueba o una sesión claramente identificada:

1. Usa dos dispositivos distintos. Comprueba que ambos entren en la misma sesión.
2. Registra personas diferentes y un nombre repetido; verifica que los códigos internos sean distintos.
3. Guarda respuestas, mide un intento por dispositivo y revisa las filas nuevas en la hoja.
4. Comprueba que los resultados permanezcan ocultos y que aparezcan al cambiar las preferencias.
5. Revisa tabla, gráfico, media automática y totales con datos conocidos. Cambia entre primer, segundo y todos los intentos; incluye filas con frecuencia cero y comprueba que las tablas propuestas no se mezclen.
6. Cambia participantes en un dispositivo compartido y vuelve a entrar con un enlace personal desde el otro.
7. Durante un intento, cambia de pestaña; comprueba que quede interrumpido.
8. Después de preparar un intento, desconecta la red y mide. Reconecta y reintenta el envío; debe haber una sola fila del intento.
9. Abre dos accesos docentes e intenta guardar preferencias de la misma versión; el segundo cambio debe pedir actualización.
10. Escanea el QR desde otro dispositivo, registra una persona nueva y verifica que solo aparezca Recolectar y que no permita un tercer intento. Prueba la habilitación de momentos desde Proyectar.
11. Prueba los dispositivos previstos en orientación vertical y horizontal, navegación por teclado, texto ampliado y preferencia de reducir movimiento.

Se revisó en un navegador la demostración: guardado y cambio entre tablas de intentos, media automática, proyección de tablas y gráficos, enlace/QR, registro de la tarea y bloqueo después de dos intentos. No se ha hecho el piloto con tu cuenta, tu hoja ni los dispositivos de la clase. Las pruebas automáticas incluidas cubren la lógica, cálculos, firmas, permisos, reenvíos y generación de las vistas.

## 10. Si algo no funciona

| Síntoma | Revisión |
| --- | --- |
| Estado «Sin configurar» | Pega la URL `/exec` en `config.js` y espera la publicación de Pages |
| No conecta con Apps Script | Revisa `ALLOWED_ORIGINS`, permisos de despliegue, URL y bloqueos del navegador |
| El servicio pide iniciar sesión Google a estudiantes | El despliegue no permite el acceso anónimo previsto |
| Error de columnas en una pestaña `TS_…` | Conserva una copia y revisa los encabezados; el servicio no los migra ni borra |
| No aparece el botón Google | Configura el ID OAuth público y su propiedad del servidor |
| Google indica origen no autorizado | Agrega el origen exacto de GitHub Pages en la credencial OAuth |
| Docente no puede ingresar por Google | Revisa correo, tipo de cuenta y lista autorizada; prueba primero ID/clave |
| Sesión docente caducada | Vuelve a ingresar; el acceso dura hasta dos horas y puede caducar antes si se vacía la caché |
| Persona sin intentos disponibles | Revisa cupo, intentos válidos y posibles reservas pendientes |
| Diferentes condiciones en una tabla | Filtra modalidad/fondo/procedencia y revisa la versión y el objetivo de cada intento |

Las actualizaciones de datos ocurren aproximadamente cada 20–24 segundos con la pestaña visible. No son transmisión instantánea. Google Apps Script tiene cuotas; el ensayo con veinte participantes es una simulación de la lógica, no una prueba de capacidad de su infraestructura.

Cuando cambies archivos del servicio, guarda una nueva versión en **Administrar implementaciones** y actualiza la implementación existente. Cuando cambies archivos de la interfaz, espera la publicación de GitHub Pages y recarga el sitio.
