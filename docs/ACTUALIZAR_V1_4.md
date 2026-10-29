# Actualizar a la versión 1.4

Incluye el protocolo editable, los porcentajes automáticos, los controles compartidos de análisis y la consulta rápida de permisos de la versión 1.3. Añade la estética geométrica de la referencia y retira «Resultados de la tarea por intento» del estudiantado.

## GitHub Pages

1. Extrae el paquete de actualización y copia su contenido dentro de la carpeta local de `30-segundos`, donde está `index.html`. Reemplaza los archivos incluidos.
2. Asegúrate de copiar también `assets/geometric.css` y `assets/geometria.png`: contienen el nuevo tema y el motivo de portada.
3. En GitHub Desktop, revisa los cambios, escribe «Actualizar estética y vista de estudiantes», pulsa **Commit to main** y después **Push origin**.

El paquete conserva la URL de Apps Script de tu repositorio. Se puede aplicar sobre la versión 1.2 o la 1.3.

## Apps Script

1. Desde la hoja, abre **Extensiones → Apps Script**.
2. Reemplaza el contenido de **Code.gs** y **Core.gs** por los archivos correspondientes de `apps-script/` incluidos en el paquete.
3. Guarda y abre **Implementar → Administrar implementaciones → Editar ✏️**.
4. Selecciona **Nueva versión** y pulsa **Implementar**. Conserva la implementación existente y su URL `/exec`.

Las cuentas docentes, SAS, los participantes y sus intentos se conservan. No hace falta volver a ejecutar el instalador de SAS.

## Comprobación

Recarga el sitio con Ctrl + F5. La portada debe mostrar la paleta marino, azul, coral, rosa y amarillo. En Interpretar, el estudiante ve la consigna, el enlace y el QR, sin el desglose de resultados de tarea. El docente conserva ese desglose en **Proyectar → Interpretar**.

Las preferencias siguen consultándose aproximadamente cada tres segundos, más el tiempo de respuesta de Google. Para activar todos los cambios debes actualizar tanto GitHub como los dos archivos de Apps Script.
