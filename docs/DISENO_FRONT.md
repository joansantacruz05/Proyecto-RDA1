# Sistema de Diseño y Experiencia de Usuario · LuxeStays Frontend

Documentación técnica y conceptual del frontend de **LuxeStays** (Ecuador Hospitality Platform), desarrollado en **React 19 + TypeScript + Vite** bajo los estándares de diseño moderno, accesibilidad WCAG 2.1 AA y el contrato oficial OpenAPI v2.2.0.

---

## 1. Concepto y Filosofía de Diseño

**LuxeStays** representa la hospitalidad ecuatoriana de nivel premium: una experiencia sobria, luminosa, confiable y profundamente conectada con la riqueza turística y patrimonial del Ecuador (desde las islas Galápagos y la costa del Pacífico hasta las alturas de la cordillera de los Andes y la Amazonía).

### Pilares Fundamentales
1. **Claridad y Confianza**: Precios transparentes con desglose tributario ecuatoriano completo (Subtotal, IVA 15% y Tasa municipal de turismo de USD 2.00 por noche y habitación). Sin cargos ocultos ni sorpresas en el checkout.
2. **Identidad Propia y Distinción**: Alejado de patrones genéricos de plantillas web. Se conserva el dorado emblemático de LuxeStays como acento de distinción, armonizado con tonos profundos de azul pacífico y azul medianoche.
3. **Cero Datos Simulados**: La interfaz es 100 % dinámica. Cada fotografía, tarifa, cupo y reseña proviene de los endpoints del backend NestJS.
4. **Respeto a la Accesibilidad (WCAG AA)**: Contraste mínimo de 4.5:1 en todos los textos sobre fondos claros y oscuros, navegación por teclado y respeto riguroso a `prefers-reduced-motion`.

---

## 2. Paleta Cromática y Tokens Semánticos

El sistema de color se estructura a través de variables CSS nativas en [`frontend/src/styles/tokens.css`](file:///d:/SEBASTIAN/INTEGRACION_DE_SISTEMAS/Proyecto%20RDA1/frontend/src/styles/tokens.css), permitiendo una tematización modular y soporte de modo oscuro por inversión de contraste en `:root`.

| Rol Semántico | Token CSS | Valor Hex | Uso en la Interfaz |
| :--- | :--- | :---: | :--- |
| **Tinta Principal** | `--color-midnight-blue` | `#0F1E33` | Títulos principales, nombres de hoteles y texto de alta jerarquía. |
| **Color Primario** | `--color-pacific-blue` | `#14406B` | Botones principales, enlaces activos, iconos de navegación y cabeceras. |
| **Acento y CTA** | `--color-gold` | `#C9A227` | Botones de conversión ("Reservar", "Continuar al Pago"), estrellas de calificación y badges destacados. Cumple contraste AA sobre fondo blanco y texto oscuro. |
| **Fondo General** | `--color-background` | `#F5F6F8` | Lienzo de la aplicación, descansando la vista del usuario y destacando las tarjetas. |
| **Superficie / Card** | `--color-surface` | `#FFFFFF` | Contenedores de alojamientos, modales y formularios. |
| **Bordes y Divisores** | `--color-border` | `#DDE2EA` | Líneas finas divisorias y contornos de inputs y tarjetas. |
| **Éxito (Success)** | `--color-success` | `#1F7A4D` | Reservas confirmadas, check-in completado, contrato firmado y reembolsos del 100%. |
| **Aviso (Warning)** | `--color-warning` | `#9A6700` | Alertas de tarifa por vencer, pocos cupos disponibles y reembolsos del 50%. |
| **Error / Peligro** | `--color-error` | `#B42318` | Cancelaciones, cupo agotado (`OUT_OF_STOCK`), campos inválidos y reembolsos del 0%. |

---

## 3. Sistema Tipográfico y Justificación

Se seleccionaron un máximo de **dos familias tipográficas complementarias**, garantizando elegancia en los nombres de propiedad y máxima legibilidad en los datos de reserva:

### 3.1. Tipografía Display / Titulares: *Playfair Display*
* **Uso**: Títulos principales (`h1`, `h2`), nombres de alojamientos y encabezados de secciones destacadas.
* **Justificación**: Es una tipografía con serifa moderna de alto contraste en trazos, evocando la tradición de los grandes hoteles boutique y haciendas coloniales de Ecuador (Quito Colonial, Cuenca, Galápagos). Aporta carácter, elegancia y exclusividad sin perder legibilidad.
* **Configuración CSS**: `--font-heading: 'Playfair Display', Georgia, serif;`

### 3.2. Tipografía de Interfaz y Lectura: *Inter*
* **Uso**: Texto corrido, etiquetas de formulario, botones, precios, tablas impositivas y componentes interactivos.
* **Justificación**: Considerada el estándar de oro en tipografías de interfaz por sus proporciones humanistas, signos diacríticos completos para el idioma español (`á`, `é`, `í`, `ó`, `ú`, `ñ`, `ü`) y números tabulares claros para evitar saltos en tablas de facturación y temporizadores.
* **Configuración CSS**: `--font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

---

## 4. Geometría, Espaciado y Formas

* **Radio Base Único**: Todos los elementos se rigen por un múltiplo de **8 px**:
  * Botones y campos de texto: `var(--radius-md) = 8px`.
  * Tarjetas y paneles: `var(--radius-lg) = 12px` / `var(--radius-xl) = 16px`.
  * Pastillas y avatares: `var(--radius-full) = 9999px`.
* **Elevación y Sombras**:
  * Sombras sumamente suaves y difusas para evitar el efecto de "bloques toscos":
    * `--shadow-sm: 0 1px 3px rgba(15, 30, 51, 0.06);`
    * `--shadow-md: 0 4px 12px rgba(15, 30, 51, 0.08);`
    * `--shadow-lg: 0 10px 24px rgba(15, 30, 51, 0.12);`
* **Espaciado Modular**: Escala basada en 4 px y 8 px (`var(--spacing-1)` a `var(--spacing-16)`), manteniendo ritmo vertical consistente entre dispositivos móviles y escritorios.

---

## 5. Principios de Movimiento y Accesibilidad

1. **Duración de Animaciones**: Todas las transiciones están calibradas entre **150 ms** (microinteracciones de botones) y **250 ms** (apertura de modales y visor de galería).
2. **Preferencia de Movimiento Reducido**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
3. **Validación Amigable**:
   * Los campos de texto **no muestran errores prematuramente** mientras el usuario apenas hace foco en blanco.
   * La validación ocurre al perder el foco (`onBlur`) o al pulsar el botón de envío.
   * Ningún botón de confirmación permanece bloqueado sin retroalimentación: si un usuario presiona "Continuar al Pago", la interfaz lista claramente qué campos faltan y transfiere el foco al primer campo con error.

---

## 6. Tratamiento de Imágenes y Fallbacks

* Las fotos de portada y galerías se cargan desde las URLs absolutas devueltas por la API (`imagenesUrls` e `imagenUrl`).
* Se utiliza `loading="lazy"` y relación de aspecto fija (`aspect-ratio: 16/10` o `4/3`) para evitar saltos de diseño (*Cumulative Layout Shift*).
* Si una imagen no carga o viene nula, se genera en tiempo de ejecución un marcador sobrio por CSS con degradado azul pacífico y la inicial del nombre del alojamiento, asegurando que la estética nunca se degrade. Prohibido el uso de fotos de stock desconectadas del negocio.

---

## 7. Arquitectura CSS

* **100 % CSS Modules**: Cero estilos en línea (`style={{...}}`) en componentes de producción para facilitar mantenimiento y evitar fugas de especificidad.
* **Tokens Globales**: Definidos en `:root` y consumidos en los módulos (`tokens.css`).
* **Diseño Mobile-First**: Estructurado pensando primero en pantallas de 360 px (ancho de smartphone moderno) con tarjetas compactas, y adaptado mediante *media queries* hacia escritorios de alta resolución.

