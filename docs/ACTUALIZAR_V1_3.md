# Actualizar a la versión 1.3

Esta versión modifica el protocolo compartido, los porcentajes automáticos, Resultados y la sincronización de permisos. Conserva el código SAS, las cuentas docentes y los datos que ya están en tu hoja.

## 1. GitHub Pages

Extrae el paquete de actualización. Copia su contenido dentro de la carpeta local del repositorio `30-segundos`, donde está `index.html`, reemplazando los archivos incluidos. El `config.js` mantiene la dirección de Apps Script del repositorio y agrega `controlPollSeconds: 3`.

En GitHub Desktop: revisa los cambios, escribe «Protocolo editable y análisis actualizado», pulsa **Commit to main** y después **Push origin**.

## 2. Apps Script

Desde la hoja de cálculo, abre **Extensiones → Apps Script**.

1. Sustituye el contenido de **Code.gs** por `apps-script/Code.gs` del paquete.
2. Sustituye el contenido de **Core.gs** por `apps-script/Core.gs` del paquete.
3. Guarda. Conserva Bridge.html, Configurar_SAS.gs, las propiedades del proyecto y la hoja existente. La actualización no requiere volver a inicializar las cuentas ni SAS.
4. Abre **Implementar → Administrar implementaciones → Editar ✏️**. Elige **Nueva versión** y pulsa **Implementar**. Esto conserva la URL `/exec` que ya está en `config.js`.

## 3. Comprobar

1. Recarga el sitio con Ctrl + F5 y entra al portal docente.
2. Abre SAS → Proyectar → Recolectar. Escribe y guarda el protocolo o pulsa «Usar instrucciones de Autónomo».
3. Desde otro dispositivo entra a SAS y comprueba el texto en Recolectar.
4. En Proyectar → Analizar, elige un intento y una representación. Pulsa «Mostrar esta selección a estudiantes». Comprueba el mismo contenido en Resultados de la sesión.
5. Completa una frecuencia absoluta: la operación y el porcentaje deben aparecer automáticamente.
6. Habilita una sección con la pestaña del estudiante visible. La consulta se hace aproximadamente cada tres segundos, a lo que se suma la respuesta de Google. Los resultados completos se consultan con menor frecuencia.

El cambio de interfaz se muestra al docente en cuanto el servidor confirma que guardó la preferencia; se ha eliminado una segunda consulta completa de datos en ese paso. La consulta de configuración usa caché y no entrega participantes, intentos ni respuestas privadas.
