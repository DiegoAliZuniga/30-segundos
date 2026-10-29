# 30 segundos · Laboratorio estadístico

Aplicación en español para adaptar **How Long is 30 Seconds?** al ciclo de investigación estadística: preguntar, recolectar, analizar e interpretar.

La interfaz está preparada para GitHub Pages. El registro compartido y la autorización del panel docente se ejecutan en Google Apps Script, con Google Sheets como almacenamiento.

## Corrección centrada en el segundo día

La versión 1.4 aplica las últimas correcciones del día 2 del planeamiento adjunto: repaso de 15 minutos, investigación de 55 minutos y cierre/tarea de 15 minutos. Los cuatro momentos GAISE II pertenecen a la investigación. Consulta [el detalle de los ajustes](docs/AJUSTES_DIA_2.md).

## Qué incluye

- Dispositivos compartidos por turnos o participación individual, con sesiones y códigos de ingreso.
- Nombres privados para el equipo docente, género configurable y hasta ocho campos adicionales.
- Registro de respuestas en los cuatro momentos; edición de las preguntas desde el panel docente.
- Medición autónoma, en pareja, manteniendo y soltando un botón, o mediante un cronómetro externo.
- Fondos tranquilos o con cambios irregulares de colores y patrones, con condiciones guardadas por intento.
- Control de intentos, tiempo objetivo, límite de seguridad, redondeo, intervalo aceptable y devolución de resultados.
- Tabla construida por estudiantes con porcentajes automáticos, fórmula visible, fila Total y media automática; trabajo independiente para cada selección de intentos.
- Protocolo acordado editable por el docente o tomado de las instrucciones de Autónomo.
- Resultados y proyección comparten controles de intento y representación.
- Consulta ligera de permisos aproximadamente cada tres segundos, con caché que se actualiza al guardar preferencias.
- Gráficos SVG con ejes y marcas numéricas, incluyendo frecuencias cero; tablas y gráficos por primer intento, segundo intento o todos.
- Proyección docente de los cuatro momentos con habilitación progresiva de secciones y representaciones.
- Comparación por grupo, género, intento, procedencia, modalidad y fondo; comparación pareada de intentos 1 y 2.
- Tarea reducida al experimento, con dos intentos por persona nueva, enlace y QR local; desglose de tarea por intento exclusivo de la proyección docente.
- Identidad visual geométrica con la paleta aportada: azul marino, azul, coral, rosa y amarillo.
- Acceso de varios docentes por ID/clave y, tras configurar OAuth, por Google con verificación de firma y lista de cuentas autorizadas.
- Revisión de intentos sin borrar el tiempo original, auditoría, exportaciones CSV y respaldos JSON.
- Demostración local aislada del servicio real y cola local de mediciones pendientes de confirmación.

## Empieza aquí

Sigue **[docs/GUIA.md](docs/GUIA.md)** para crear el repositorio, instalar Apps Script y conectar la hoja proporcionada.

No necesitas instalar paquetes para publicar la interfaz: sube `index.html`, `config.js`, `assets/`, `docs/` y `.nojekyll` a la raíz del repositorio. El código de `apps-script/` debe instalarse en Google Apps Script.

Esta actualización conserva la URL del servicio del repositorio. Para activar las mejoras también debes actualizar `Code.gs` y `Core.gs` en Apps Script y publicar una nueva versión de su implementación existente. Consulta [la guía de actualización](docs/ACTUALIZAR_V1_4.md). La demostración sigue aislada de Google Sheets.

## Estructura

| Ruta | Función |
| --- | --- |
| `index.html` | Interfaz principal |
| `config.js` | URL pública del servicio, ID OAuth opcional e intervalo de actualización |
| `assets/styles.css` | Diseño adaptable, apariencias clara y oscura, accesibilidad |
| `assets/core.js` | Reglas, validaciones y cálculos estadísticos |
| `assets/charts.js` | Gráficos con ejes numéricos y accesibilidad |
| `assets/vendor/` | Generador QR y licencia MIT |
| `assets/api.js` | Comunicación con Apps Script y demostración local |
| `assets/app.js` | Flujo estudiantil, cronómetro y portal docente |
| `apps-script/Code.gs` | Autorización, sesiones y persistencia |
| `apps-script/Core.gs` | Copia de las reglas compartidas |
| `apps-script/Bridge.html` | Puente de comunicación con confirmaciones |
| `apps-script/appsscript.json` | Entorno V8 y permisos del proyecto |
| `docs/GUIA.md` | Instalación y manejo didáctico |
| `docs/DISENO.md` | Aplicación de apple-design-skill |
| `docs/VALIDACION.md` | Pruebas realizadas y piloto pendiente |
| `tests/` | Pruebas ejecutables con Node.js, sin dependencias externas |

## Comprobaciones

Con Node.js 20 o posterior:

```sh
npm test
npm run check
```

Las pruebas usan simulaciones de los servicios de Google y comprobaciones de generación de las vistas. No constituyen un ensayo real de veinte navegadores ni sustituyen el piloto con el despliegue de Apps Script y los dispositivos de la clase.

Si modificas `assets/core.js`, copia el mismo contenido a `apps-script/Core.gs` y actualiza el despliegue.

## Criterios estadísticos

Se guarda la duración original en milisegundos. Las tablas y medidas usan el redondeo elegido para el análisis; el redondeo del intento también queda registrado con su protocolo. El intervalo aceptable incluye ambos extremos. La moda se informa cuando hay repeticiones y admite empates. El porcentaje se refiere a mediciones válidas dentro del intervalo. La selección inicial del análisis es el primer intento.

Los nombres no se envían en los resultados colectivos para estudiantes. La exportación de datos anónimos elimina nombres, género, campos adicionales, fechas e identificadores originales; mantiene códigos de participante dentro del archivo, grupo y condiciones experimentales. Esto no garantiza que un grupo muy pequeño sea imposible de reconocer.

## Referencias técnicas y de diseño

- [apple-design-skill](https://github.com/dickwu/apple-design-skill).
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Aplicaciones web de Apps Script](https://developers.google.com/apps-script/guides/web).
- [Comunicación mediante google.script.run](https://developers.google.com/apps-script/guides/html/communication).
- [Verificación de credenciales Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Las preguntas y la organización didáctica adaptan la descripción proporcionada para esta actividad. No se reproduce material gráfico ni texto extenso de la actividad original.
