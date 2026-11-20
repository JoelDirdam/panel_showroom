# Design System — COSDI

> Fuente de verdad visual. Si una vista no sigue esto, está mal, aunque "se vea bien".
> Actualiza este archivo cuando cambie el diseño, y hazlo en la misma tarea que cambia el código.
> Stack: Vue 3 + Vite + Tailwind v4 sobre TailAdmin Vue Pro. Pinia, vue-router, FullCalendar, ApexCharts, lucide.

## 1. Paleta
Valores aprobados en la Fase 0 del rediseño. Viven como tokens en `@theme` de `apps/web/src/assets/main.css`; en los `.vue` usa las clases (`bg-brand-500`, `text-gray-600`…), nunca el hex.
- Primario (marca): índigo `brand-500` `#3D46E0` / hover `brand-600` `#2F36B8`
- Fondo general: `gray-50` `#F6F4F0` (gris cálido, no blanco puro)
- Superficie / tarjetas: blanco con borde `gray-200` y sombra `shadow-card`
- Texto principal: `gray-900` `#1F1D2B` | Texto secundario: `gray-600` `#57525F`
- Éxito: `success-600` `#0F7A4A` | Error: `error-600` `#A52B22` | Aviso: `warning-600` `#A15C00`
- WhatsApp: escala `wa-*` (`wa-600` `#0F7A4A`), solo para acciones y estados de WhatsApp.

## 2. Tipografía
- Texto: Inter Variable (`font-sans`). Títulos: Outfit Variable (`font-display`). Solo estas dos familias.
- H1 página: 24–28px / semibold | H2 sección: 18px / semibold | Cuerpo: 14–16px | Ayuda: 12–13px en `gray-600`.
- Números en tablas y contadores: `tabular-nums`.

## 3. Espaciado y forma
- Escala de 8px: 8 / 16 / 24 / 32
- Radio: tarjetas 16px (`--radius-card`), inputs y botones 10px (`--radius-control`), modales 20px.
- Sombra tarjetas: `shadow-card` (una sola, suave). `shadow-pop` solo para menús, toasts y modales.

## 4. Componentes base
Reutiliza los de TailAdmin Vue Pro y los compartidos del proyecto. No dupliques un componente por vista.
- Button: Primary, Secondary, Danger, Ghost. Alturas: 40px escritorio, 44px mínimo en táctil.
- Input / Select / Textarea: label arriba, borde, focus con anillo del color primario, error en rojo junto al campo.
- Card: fondo blanco, borde, radio 12px, padding 16-24px.
- Badge: Activo / Inactivo / Confirmada / Recordatorio enviado, con color y texto, no solo color.
- Table: encabezado en gris claro, filas con hover, acciones a la derecha. En móvil: tarjetas.
- Modal, Toast, Empty State: un solo estilo para todo el sistema.
- Íconos: solo lucide. Calendario: FullCalendar con el tema COSDI. Gráficas: ApexCharts con la paleta COSDI.

## 5. Patrones por vista
- Panel: sidebar de TailAdmin a la izquierda en escritorio, hamburguesa en móvil. Título + subtítulo + acción principal arriba.
- Formularios: 1 columna en móvil, máximo 2-3 columnas en escritorio, siempre con labels.
- Horarios: un día por tarjeta, toggle Abierto/Cerrado, campos Apertura y Cierre con label.
- Landing: hero, Qué es, Funciones, Cómo funciona, Planes ($349 MXN/mes), FAQ, CTA final. Banner de cookies fijo abajo, compacto, sin tapar CTAs.

## 6. Responsive
Mobile-first. Breakpoints: 390px / 768px / 1440px. Sin scroll horizontal.
