# Criterios de diseño aplicados

Se utilizó [apple-design-skill](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md) como referencia solicitada. Esta es una aplicación web: se aplican sus principios y fundamentos de accesibilidad, color, tipografía, estructura y redacción; no se fuerza una navegación nativa de iOS o macOS.

Referencias consultadas en el repositorio: `hig-lookup.md`, `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `writing.md`, `entering-data.md`, `settings.md` y `charting-data.md`.

## Propósito

Cada vista ayuda a realizar una parte de la investigación. La medición ocupa una superficie propia, sin reloj, cuenta regresiva, progreso circular ni animación periódica que pueda ayudar a contar. La interfaz usa tipografía de sistema, navegación sencilla y un acento azul para acciones. El símbolo circular del laboratorio se mantiene estático.

## Colores y contraste

Contrastes calculados con luminancia relativa sRGB:

| Uso | Texto / fondo | Contraste |
| --- | --- | --- |
| Contenido claro | `#172033` / `#ffffff` | 16,27:1 |
| Texto secundario claro | `#596579` / `#ffffff` | 5,90:1 |
| Acción principal clara | blanco / `#174ec7` | 7,12:1 |
| Contenido oscuro | `#f0f3fa` / `#1e2430` | 14,00:1 |
| Texto secundario oscuro | `#b1bdd0` / `#1e2430` | 8,19:1 |
| Acción principal oscura | `#111f3c` / `#a8c2ff` | 9,20:1 |
| Medición sobre fondo suave | `#172033` / `#e7edf8` | 13,84:1 |

El modo claro u oscuro sigue la preferencia del sistema. Los estados tienen texto, además de color. Los fondos experimentales usan tonos suaves y patrones estáticos que cambian a intervalos irregulares; no contienen destellos rápidos.

## Tipografía y estructura

Base de 17 px, controles normalmente de al menos 46 px de altura y control de medición de 70 px. Los botones de revisión de tablas son secundarios y menores que el control principal. La navegación lateral se transforma en una fila de cuatro momentos en pantallas estrechas. Los formularios pasan de dos o tres columnas a una columna.

Las tablas conservan sus columnas y permiten desplazamiento horizontal. Los gráficos usan ejes numéricos con marcas: tiempo en segundos y frecuencia absoluta. Las barras guardan la distancia proporcional entre valores; los puntos sobre el eje horizontal señalan frecuencia cero. La tabla correspondiente conserva la alternativa textual.

La proyección ocupa el ancho disponible y mantiene controles visibles para cambiar de momento, intento y representación. La tarea reduce la navegación al experimento para personas nuevas. El QR se presenta negro sobre blanco, con margen de lectura y enlace visible.

## Accesibilidad y control

- Navegación por teclado, foco visible y enlace para saltar al contenido.
- Campos con etiquetas; botones que describen su acción.
- Gráficos con una descripción textual de valores y frecuencias.
- Preferencias de movimiento reducido y mayor contraste.
- Modal de medición con cancelación y manejo de Escape; modalidad de mantener y soltar mediante espacio o Enter.
- El tiempo medido se guarda separado del redondeo para el análisis.
- Los resultados ocultos no se entregan al navegador del estudiante mediante los endpoints de resultados o reintento.

Las decisiones sobre el símbolo circular, el acento azul y los fondos suaves son criterio de diseño para esta actividad, no reglas obligatorias de Apple.

## Límite de la revisión

Se verificaron valores de contraste, reglas responsive, sintaxis y generación de las vistas. Se inspeccionó la demostración en un navegador real para los cambios del segundo día. No se realizó una prueba con lector de pantalla ni con todos los tamaños y dispositivos previstos. El piloto descrito en la guía debe comprobar la presentación final en los dispositivos de la clase.
