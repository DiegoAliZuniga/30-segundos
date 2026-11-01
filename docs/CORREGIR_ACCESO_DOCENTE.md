# Corregir el acceso docente de SAS

Esta corrección afecta dos lugares distintos: la página de GitHub Pages y la cuenta privada guardada en Google Apps Script. No borra resultados ni crea otra sesión SAS.

1. En el repositorio `DiegoAliZuniga/30-segundos`, sustituye **`assets/app.js`** por el archivo del mismo nombre incluido en el paquete público y confirma el cambio en la rama publicada. Espera a que GitHub Pages termine de actualizarse. Si conservas una pestaña antigua, recarga la página con Ctrl+F5.
2. Abre la hoja de cálculo de los resultados. En **Extensiones → Apps Script**, abre el archivo privado `Configurar_SAS.gs` del proyecto que sirve a esta misma página. Sustituye su contenido por la versión corregida entregada por separado. Guarda y ejecuta **`configurarSAS`** desde el selector del editor. La función actualiza únicamente el acceso de Diego; conserva la sesión, las otras cuentas docentes, los participantes y los datos. No hace falta crear un despliegue nuevo del servicio, porque esta operación actualiza las propiedades del mismo proyecto.
3. Entra al portal docente con el ID y la clave que ya habías indicado. Después de ejecutar el configurador, las sesiones docentes previamente abiertas caducan; vuelve a ingresar.

**Importante:** `Configurar_SAS.gs` es privado. No lo subas al repositorio público ni lo copies dentro de `assets`.

Si el portal dice **Conexión pendiente**, revisa el despliegue de Apps Script y `ALLOWED_ORIGINS`. Si dice **Acceso no autorizado** después de la corrección, confirma que ejecutaste el configurador en el mismo proyecto de Apps Script que usa la página publicada.
