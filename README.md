# 🍔 TRICO'S - Web Cartoon para Local de Comidas

Página web interactiva con diseño y estética **Cartoon / Cómic Neo-Brutalista** (bordes marcados, sombras planas duras, tipografías gruesas y animaciones fluidas) para local gastronómico, con catálogo, carrito interactivo y checkout con pedido automatizado a WhatsApp.

---

## 🎨 Características de Diseño & UI/UX

1. **Separadores SVG con Puntas Redondeadas (Scalloped / Rounded Mountains)**:
   - Las transiciones entre Hero, Menú, Promociones, Reseñas y Footer no son rectas.
   - Componentes SVG `ScallopedMountainDivider` y `ScallopedWaveDivider` que generan cumbres redondeadas estilo colinas cartoon, con bordes gruesos de tinta cómic (`#1E1B18`) y sombras planas de desplazamiento.
2. **Estilo Visual Cartoon & Taste UI**:
   - **Tipografía:** *Lilita One* (títulos de cómic), *Fredoka* (subtítulos y botones amigables) y *Plus Jakarta Sans* (textos legibles).
   - **Bordes y Sombras:** Contornos marcados (`border-3` y `border-4`) con sombras duras (`shadow-cartoon: 4px 4px 0px #1E1B18`).
   - **Feedback Físico Arcade:** Al hacer clic o presionar en cualquier botón, este se hunde (`active:translate-x-1 active:translate-y-1 active:shadow-none`).
3. **Motion Design & Fluid UI**:
   - Mascota animada flotante con respiración cómic (`animate-bob`).
   - Badges con movimiento de atención (`animate-wiggle`).
   - Botón de carrito con rebote elástico (*squash & stretch*) al sumar productos.
   - Cinta de cómic rotativa (*marquee*).
   - Lluvia de confeti (*canvas-confetti*) al confirmar pedido.
4. **Mobile-First & 100% Responsive**:
   - Barra de carrito flotante en móviles.
   - Drawer deslizable optimizado para pantallas táctiles.
   - Navegación fluida por categorías.
5. **Imágenes en `/assets`**:
   - Hace referencia directa a la carpeta `/assets` donde se encuentran el logo (`logo.svg`), el personaje (`personaje.svg`) y las fotografías de los productos (`_MG_9374.jpg`, `_MG_9375.jpg`, `_MG_9396.jpg`, `_MG_9453.jpg`, `_MG_9465.jpg`).

---

## 🚀 Funcionalidad Principal

### 1. Carta de Comidas
- Filtros por categoría: Todos, Burgers, Sandwiches & Lomitos, Papas & Snacks, Bebidas, Postres.
- Buscador reactivo en tiempo real.
- Tarjetas cartoon con foto local, precio, descripción, badges de popularidad y botón "+ Agregar" con micro-animación de confirmación ("¡Listo! ✓").

### 2. Carrito de Compras
- Menú lateral (Drawer) interactivo con backdrop-blur.
- Selector de modalidad: **🛵 Envío a Domicilio** o **🛍️ Retiro en Local**.
- Cálculo automático de subtotal, costo de envío (gratis superando un monto mínimo) y cupón de descuento (`TRICO10` o `CARTOON`).
- Persistencia automática del carrito en `localStorage`.

### 3. Checkout y Pedido por WhatsApp
- Formulario amigable para ingresar: Nombre, Teléfono WhatsApp, Dirección (si es delivery), Forma de pago (Efectivo / Transferencia / Tarjeta) y aclaraciones para la cocina.
- Generador automático de mensaje de WhatsApp con formato prolijo, emojis, desglose de items, subtotales y total exacto.
- Al confirmar, abre directamente WhatsApp con el mensaje cargado y muestra una pantalla cartoon de festejo con confeti.

---

## 🛠️ Comandos de Ejecución

### Iniciar servidor de desarrollo:
```bash
npm run dev
```
Luego abrir la URL que muestra la terminal (por defecto `http://localhost:3000`).

### Compilar para producción:
```bash
npm run build
```

---

## ⚙️ Configuración Personalizada

En [src/data/products.js](file:///b:/Workspace/TRICOSLR/src/data/products.js) podés configurar fácilmente:
- **Número de WhatsApp de recepción:** Cambiar `phone: "5493804000000"` por tu número con código de país.
- **Costos y envíos gratis:** Modificar `deliveryCost` y `freeDeliveryThreshold`.
- **Productos:** Modificar o agregar productos con sus fotos de `/assets/`, precios y descripciones.
