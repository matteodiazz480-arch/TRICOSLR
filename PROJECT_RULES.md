# REGLAS Y CONDICIONES OBLIGATORIAS DEL PROYECTO (PROJECT_RULES.md)
**TRICO'S BURGERS & CHICKEN - LA RIOJA, ARGENTINA**

> **AVISO CRÍTICO PARA DESARROLLADORES E INTELIGENCIAS ARTIFICIALES:**  
> Este documento contiene los principios de diseño, reglas arquitectónicas, registro histórico de errores y procedimientos obligatorios que deben consultarse y respetarse **antes de realizar cualquier modificación, actualización o agregado de funcionalidad** en este repositorio. Ninguna modificación debe violar estas directivas.

---

## 1. LAS 15 CONDICIONES PERMANENTES DEL PROYECTO

1. **Diseño original:**  
   No modificar el estilo visual, la estructura, los colores cómic/cartoon (`#FFC93C` amarillo, `#FFFDF6` crema, `#FF4757` rojo, `#1E1B18` tinta cómic), las tipografías (`font-display`, `font-sub`), ni la distribución de las páginas, salvo indicación expresa del usuario o para resolver un problema de usabilidad documentado.
   
2. **Aprender de los errores:**  
   Registrar en este archivo cualquier error importante que haya ocurrido, identificar su causa raíz y documentar cómo se solucionó para impedir que vuelva a suceder.

3. **No romper funcionalidades:**  
   Antes de editar cualquier componente, función o almacén de datos (store), verificar mediante búsqueda global qué otras partes del sistema dependen de él.

4. **Base de datos (Firebase Firestore):**  
   No modificar estructuras, consultas, colecciones ni reglas de lectura/escritura sin verificar de antemano el impacto en tiempo real en todos los dispositivos. Toda nueva funcionalidad debe analizar si requiere una tabla/colección o documento específico en Firebase.

5. **Persistencia garantizada de datos:**  
   Toda información modificada por el cliente o por el administrador debe persistir en Firestore y mantenerse tras recargar la página (`F5`), cambiar de pestaña, cerrar sesión o volver a ingresar desde cualquier dispositivo.

6. **Verificar antes de eliminar:**  
   Queda estrictamente prohibido borrar archivos, componentes, funciones, tablas o colecciones sin comprobar previamente y de forma demostrable que no son requeridos por el sistema.

7. **Seguridad de accesos y credenciales:**  
   No exponer contraseñas maestras, tokens de autenticación ni llaves privadas. La sesión administrativa debe mantenerse segura y encriptada, con expiración renovable y protección anti-fuerza bruta.

8. **Orden y organización:**  
   Mantener un código limpio, legible y modular. No duplicar lógica en componentes dispersos. Todo almacenamiento de datos debe tener su store dedicado en `src/lib/`.

9. **Compatibilidad total (Mobile & Desktop):**  
   Toda funcionalidad debe responder con total fluidez tanto en dispositivos móviles (Android, iPhone, WebViews de Instagram/WhatsApp) como en navegadores de escritorio (Chrome, Safari, Firefox, Edge).

10. **Pruebas obligatorias antes del despliegue:**  
    Antes de dar por finalizada una tarea, debe compilarse el proyecto (`npm run build`), comprobar la ausencia de errores en consola y verificar que los flujos afectados respondan al 100%.

11. **Copias de seguridad previas (Backups):**  
    Antes de realizar cambios estructurales o eliminaciones masivas en la base de datos (por ejemplo, reinicios de balance o pedidos), se debe generar un archivo de backup verificable en la carpeta `backups/`.

12. **Cambios controlados y progresivos:**  
    Evitar refactorizaciones masivas no solicitadas. Trabajar por etapas delimitadas y verificar cada paso.

13. **No inventar soluciones temporales:**  
    Investigar a fondo la causa raíz de cualquier problema reportado antes de programar una solución. No colocar parches que oculten fallos de conectividad o de sincronización.

14. **Documentación activa:**  
    Mantener actualizado este archivo `PROJECT_RULES.md` cada vez que se detecte una nueva lección aprendida o un ajuste estructural.

15. **Prioridad a la estabilidad:**  
    La estabilidad operativa del negocio (toma de pedidos, stock de ingredientes, apertura de WhatsApp) siempre prevalece por sobre cualquier experimento estético o refactorización cosmética.

---

## 2. HISTORIAL DE ERRORES IMPORTANTES Y LECCIONES APRENDIDAS

### Error 1: Pantalla en blanco en el Login de Administrador en móviles
- **Causa raíz:** `AdminLogin` estaba definido con `React.lazy()` dentro de un bloque `React.Suspense` sin un `ErrorBoundary`. En navegadores móviles (especialmente al reconectar o tras un despliegue con cambio de hash de Vite), la carga del chunk dinámico arrojaba un error de red no capturado, provocando que React desmontara toda la aplicación y dejara la pantalla blanca.
- **Solución implementada:** 
  1. Se importó `AdminLogin` de forma directa y estática en `src/App.jsx` (al pesar apenas 3.7 KB no requiere carga perezosa).
  2. Se envolvió la sección administrativa con un componente `AdminErrorBoundary` que captura cualquier contingencia y ofrece un botón de reintento automático.
  3. Se incluyó un temporizador de salvaguarda en `CircularTransition.jsx` para garantizar que la cortina de transición siempre se desmonte tras 2.4s.

### Error 2: Pérdida constante de la sesión de administrador
- **Causa raíz:** `security.js` almacenaba la sesión en `sessionStorage` con un tiempo de vida corto (30 minutos). En teléfonos celulares, cerrar el navegador o cambiar de aplicación destruye inmediatamente el `sessionStorage`.
- **Solución implementada:** Se implementó una sesión persistente segura en `localStorage` (clave `tricos_admin_session_auth`) con 30 días de vigencia renovables automáticamente por actividad (*sliding expiration*). Solo se elimina cuando el usuario pulsa explícitamente "Cerrar sesión".

### Error 3: No descuento de stock y pedidos que no llegaban al panel
- **Causa raíz:** En celulares, `openWhatsApp` abría la aplicación de WhatsApp inmediatamente mediante redirección de ventana (`window.location.href`), cortando abruptamente la ejecución de JavaScript y las escrituras asíncronas pendientes de Firestore antes de que pudieran completarse en la red.
- **Solución implementada:** Se añadió `await flushFirestoreWrites(1800)` y `Promise.allSettled` previo a la apertura de WhatsApp, garantizando que el pedido, el stock y las ganancias queden confirmadas por el servidor de Firestore antes de abrir el enlace.

### Error 4: Diferenciación de ingredientes Simple vs. Doble y Carne vs. Pollo
- **Causa raíz:** El sistema trataba todas las variantes de hamburguesas como multiplicadores lineales (duplicando todo indiscriminadamente) y no permitía distinguir recetas de medallón de carne vs. pechuga de pollo.
- **Solución implementada:** Se crearon las reglas de recetas granulares con `doubleRule: 'duplicate' | 'fixed' | 'none'` (para no duplicar ingredientes individuales como el huevo de la hamburguesa Gorilla) y `proteinScope: 'all' | 'carne' | 'pollo'` en `ingredientsStore.js` e `IngredientsSection.jsx`.

### Error 5: Traba en la selección de mapa en pedidos de delivery móvil
- **Causa raíz:** Si un cliente en su teléfono elegía "A Domicilio" y no seleccionaba manualmente el pin en el mapa, el validador abortaba el flujo y no permitía confirmar el pedido.
- **Solución implementada:** En `CartDrawer.jsx`, si el cliente no interactúa con el mapa interactivo pero ingresa datos, se aplica una ubicación de respaldo en La Rioja Capital de forma transparente, permitiendo que el pedido se envíe sin interrupciones.

### Error 6: Dificultad para deslizar productos en recetas y aspecto aplastado en computadoras/laptops
- **Causa raíz:** 
  1. El selector de productos tenía la clase `no-scrollbar` y no interceptaba el evento `wheel` vertical del ratón de PC para convertirlo en scroll horizontal. El usuario en computadoras de escritorio no podía acceder a los productos desbordados a la derecha.
  2. La grilla de recetas forzaba 3 columnas (`lg:grid-cols-3`) desde los 1024px de ancho. En laptops estándar (1366x768 o pantallas con escalado DPI), el ancho efectivo dejaba apenas ~290px por tarjeta, provocando que los números (`Simple 150 unidades`), badges y botones de duplicación se vieran comprimidos y aplastados.
- **Solución implementada:** 
  1. Se implementó una barra de desplazamiento horizontal estilo cómic (`.cartoon-scrollbar-horizontal`) con track redondeado y thumb amarillo táctil situada en la base sin invadir los botones.
  2. Se configuró el evento `wheel` en el selector para transformar el giro vertical del ratón en desplazamiento horizontal suave.
  3. Se incorporaron flechas interactivas de navegación (`<` y `>`) para desplazar la lista con un solo clic.
  4. Se rediseñó la cuadrícula a 2 columnas amplias y confortables en laptops y PCs medianas (`grid-cols-1 md:grid-cols-2 2xl:grid-cols-3`), dando más de 480px de ancho a cada tarjeta, con cajas de Simple/Doble mucho más aireadas y tipografía nítida no aplastada.
  5. Se añadió `overflow-y-auto` a la barra lateral y `min-w-0` al contenedor principal para asegurar un comportamiento responsive perfecto en cualquier resolución y zoom.

### Error 7: Desborde de contenido y botones fuera del borde de las tarjetas e invasión visual de la barra de scroll en recetas
- **Causa raíz:** 
  1. En las tarjetas de ingredientes (`Stock de Insumos`), la fila inferior agrupaba en una única línea flex rígida el valor de stock (`35.400 g`), los botones de incremento (`-500` y `+500`), el botón de editar y el de eliminar. En tarjetas de ancho menor a 330px, los botones de editar y papelera se desbordaban físicamente más allá del borde redondeado de la tarjeta por falta de espacio horizontal y ausencia de `overflow-hidden`.
  2. En el selector de productos de recetas, la barra de scroll inferior amarilla generaba distracción visual, y el texto indicativo resultaba redundante una vez incorporadas las flechas de navegación táctiles y el scroll por rueda del ratón.
- **Solución implementada:** 
  1. Se reestructuraron las tarjetas de insumos: los botones de administración (`Editar` y `Eliminar`) se trasladaron a la cabecera superior junto al botón kill-switch (`Disponible / Agotado`), dejando la fila inferior exclusivamente para la cifra destacada de stock y los botones de ajuste rápido (`-` y `+`).
  2. Se configuró la grilla responsive a 2 columnas amplias en laptops y PCs estándar (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5`) y se blindó con `overflow-hidden` todas las tarjetas del sistema (insumos, recetas, productos de carta, resumen financiero, cupones, pedidos y carrito) con `min-w-0` en los contenedores de texto y precio.
  3. En el selector de productos, se ocultó la barra de desplazamiento visual (`no-scrollbar`) y se eliminó el texto secundario, manteniendo intactas y alineadas las flechas interactivas (`<` y `>`) y el soporte de scroll horizontal nativo con la rueda del ratón (`wheel`).

---

## 3. ARQUITECTURA DE DATOS EN FIREBASE FIRESTORE

| Colección / Documento | Propósito | Reglas de Escritura |
| :--- | :--- | :--- |
| `orders` | Registro individual de cada pedido para despacho y sorteo | `setDoc(doc(db, 'orders', id), newOrder)` |
| `finances` | Registro de movimientos contables (ingresos y gastos) | `setDoc` / `deleteDoc` |
| `promotions/inventory` | Stock en tiempo real de todos los insumos e ingredientes | Array de objetos `items` sincronizado |
| `promotions/recipes` | Diccionario de recetas base y sus proporciones granulares | Mapa `recipes[productId]` |
| `promotions/giveaway` | Configuración oficial del sorteo y premios | Objeto `{ active, prizes, nextDrawDate }` |
| `promotions/coupons` | Cupones de descuento activos | Array de objetos `coupons` |
| `promotions/*_sync` | Canales rápidos de pulsación en tiempo real para navegadores móviles | Snapshot listeners con deduplicación |

---

## 4. PROCEDIMIENTO ANTE REINICIOS O MODIFICACIONES DE DATOS
1. **Generar Backup:** Ejecutar un script para descargar la colección correspondiente en formato JSON a `backups/`.
2. **Confirmar eliminación limpia:** Validar que el conteo en Firestore sea exactamente 0 tras la operación.
3. **Actualizar estado local:** Despachar eventos `*_sync` y `BroadcastChannel` para que todas las pestañas abiertas actualicen la UI a $0 sin requerir recargar la página.
