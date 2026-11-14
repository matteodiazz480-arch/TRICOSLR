import { RESTAURANT_INFO } from '../data/products.js';

/**
 * Limpia y normaliza cualquier número telefónico eliminando caracteres especiales,
 * guiones, espacios y signos (+, -, (), etc.) para asegurar compatibilidad total con la API de WhatsApp.
 * Si el número es de La Rioja / Argentina y le falta el prefijo internacional (549), se lo añade automáticamente.
 */
export const cleanPhoneNumber = (phone) => {
  let digits = String(phone || RESTAURANT_INFO.phone || '').replace(/\D/g, '');
  if (!digits) return '5493804379754';

  // Si ingresan 0380...
  if (digits.startsWith('0380')) {
    digits = '549380' + digits.slice(4);
  } else if (digits.length === 10 && digits.startsWith('380')) {
    // Si ingresan 3804379754
    digits = '549' + digits;
  } else if (digits.startsWith('54') && !digits.startsWith('549') && digits.length === 12) {
    // Si ingresan 54380... (falta el 9 de celular para WhatsApp)
    digits = '549' + digits.slice(2);
  }

  return digits;
};

/**
 * Genera la URL oficial y universal de WhatsApp (api.whatsapp.com/send)
 * Garantiza que funcione en Android, iOS, tablets, emuladores y WhatsApp Web.
 */
export const buildWhatsAppUrl = (phone, text) => {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text || '');
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
};

/**
 * Detecta de forma fiable si el usuario se encuentra en un dispositivo móvil
 * (Android, iPhone, iPad, webviews de Instagram/Facebook, navegadores móviles).
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || navigator.vendor || window.opera
  );
};

/**
 * Abre WhatsApp de forma inmediata en el hilo de interacción del usuario
 * para evitar que los navegadores móviles bloqueen la redirección como un pop-up:
 * - En móviles: se asigna directamente a window.location.href, activando la app nativa de WhatsApp.
 * - En computadoras de escritorio: abre una nueva pestaña limpia (WhatsApp Web) sin bloquear la navegación.
 * Retorna siempre la URL generada como respaldo.
 */
export const openWhatsApp = (phone, text) => {
  const url = buildWhatsAppUrl(phone, text);
  if (typeof window === 'undefined') return url;

  try {
    if (isMobileDevice()) {
      window.location.href = url;
    } else {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = url;
      }
    }
  } catch (err) {
    console.warn('Aviso: Redirección automática de WhatsApp interceptada por el navegador:', err);
    try {
      window.location.href = url;
    } catch {}
  }

  return url;
};
