# Validación de la entrega

## Resultado automatizado

**55 pruebas aprobadas** con Node.js. Sin dependencias externas para ejecutar los tests.

| Área | Comprobación |
| --- | --- |
| Estadística | Media, multimoda, extremos, recorrido, intervalo inclusivo, error absoluto y ausencia de datos |
| Identidad | Registro idempotente, token de participante y separación de sesiones |
| Docentes | Varios accesos, autenticación en servidor, sesión caducada/revocable y conflictos de edición |
| Google | Firma RSA real con una clave de prueba, rechazo de firma alterada, audiencia, correo, nonce y caducidad |
| Visibilidad | Tiempos personales ocultos; datos brutos, tabla y medidas habilitados por separado; alcance por grupo |
| Medición | Recolección y momento habilitados, cupo, reserva de intento y conservación del protocolo |
| Reenvío | Confirmación idempotente; una fila por intento pese a envíos repetidos |
| Revisión | Invalidación, conservación del tiempo original y auditoría de quien revisa |
| Tarea | Dos intentos por persona, bloqueo del tercero y vista reducida sin acceso a resultados colectivos |
| Análisis corregido | Preguntas aprobadas, media automática, totales, cálculos porcentuales y tablas separadas por selección |
| Proyección y gráficos | Cuatro momentos, permisos por intento, frecuencias cero, ejes y marcas SVG |
| Respuestas | Privacidad, actualización y conservación de preguntas con su versión |
| Capacidad lógica | Veinte identidades simuladas, dos intentos cada una: cuarenta mediciones sin duplicados |
| Interfaz | Generación de todas las vistas sin errores de ejecución y escape de nombres con HTML |
| Comunicación | Origen y nonce de respuestas verificados; no se cambia silenciosamente de modo real a demostración |

Los servicios Google se sustituyen por dobles de prueba en memoria. La verificación RSA usa un par de claves generado por Node; no autentica una cuenta real de Google durante las pruebas.

## Otras comprobaciones

- Sintaxis de los archivos JavaScript de la interfaz y los archivos de Apps Script.
- Igualdad exacta entre `assets/core.js` y `apps-script/Core.gs`.
- Existencia de las referencias de archivos locales de la interfaz.
- Etiquetas HTML de entrada y ausencia de IDs repetidos en las vistas generadas.
- Contrastes de los colores principales.
- QR de dos enlaces, uno con texto UTF-8, decodificados correctamente con un lector independiente (jsQR). El generador local es qrcode-generator 2.0.4; sus archivos originales y licencia se incluyen.
- Inspección en navegador de las tablas de trabajo por intento, guardado de respuestas, media automática, proyección de gráficos y filas cero, enlace de tarea y bloqueo después de dos mediciones. Las mediciones de prueba fueron ficticias y locales.
- La proyección funciona en vista amplia. La solicitud de pantalla completa fue rechazada por el navegador de prueba y se mostró el aviso previsto; esa capacidad depende del navegador final.

## Pendiente tras instalar

La revisión 1.3 se validó con pruebas automáticas y una demostración local. No se escribieron datos en la hoja real durante esas pruebas. Se verificaron los recorridos descritos en la demostración local con datos ficticios. No se ha realizado un ensayo de carga contra Google ni una revisión a todos los tamaños y dispositivos previstos. La guía incluye un piloto concreto para validar esos puntos.

El HTML de demostración es una copia autosuficiente de la interfaz con modo local activo. Sus cambios no se guardan en Google Sheets. El ZIP contiene el proyecto que debe instalarse para disponer de registros compartidos.

## Comprobación específica de la versión 1.3

- Porcentajes automáticos, ceros, datos incompletos, denominador de la selección y ausencia de división entre cero.
- Protocolo editable, alternativa de Autónomo y conservación de su texto en cada nuevo intento.
- Veinte consultas de configuración con caché caliente sin lecturas de hojas; invalidación inmediata al guardar preferencias y recuperación tras la expulsión de caché.
- Respuestas de red antiguas no revierten una configuración más reciente.
- La actualización de permisos funciona mientras hay campos activos y conserva tablas distintas por intento.
- Revisión de navegador: protocolo compartido, cambio de representación desde proyección, fórmula y porcentaje automáticos en la tabla del estudiante.

Estas pruebas no miden la latencia del servicio real de Google ni constituyen una prueba de carga de veinte navegadores. Para usar la optimización hay que actualizar también los dos archivos de Apps Script.

## Revisión de la versión 1.4

El desglose de la tarea no se renderiza para estudiantes ni se entrega en `homeAnalysis`, incluso con la opción heredada activada. Se verifica que los registros siguen disponibles para el docente. Se comprobaron los contrastes de la nueva paleta y las referencias locales de CSS, ilustración y favicon. Se inspeccionó la portada y la sección Interpretar en navegador con datos de demostración.
