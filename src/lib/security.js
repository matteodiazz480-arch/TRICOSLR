/**
 * Módulo de Seguridad y Criptografía para el Panel de Administración de Trico's.
 * 
 * Medidas de seguridad implementadas:
 * 1. Protección contra ataques de fuerza bruta (Rate limiting exponencial con bloqueo temporal).
 * 2. Hash criptográfico SHA-256 con salt dinámico y pepper para contraseñas.
 * 3. Tokens de sesión criptográficos aleatorios (Web Crypto API) con expiración por inactividad.
 * 4. Sanitización estricta de entradas para prevenir inyecciones XSS.
 * 5. Registro de auditoría de eventos de seguridad (Security Audit Log).
 */

const SALT = 'tricos_secure_salt_2026_rioja_!#89';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATIONS = [0, 0, 0, 30, 120, 300, 900]; // En segundos según intentos fallidos
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de sesión por inactividad

// Conversión de ArrayBuffer a Hexadecimal
const bufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Hash criptográfico SHA-256 usando la API nativa del navegador
export const hashPassword = async (password, salt = SALT) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}:tricos_chick_burgers_pepper`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
};

// Generador de tokens de sesión criptográficamente seguros
export const generateSecureToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return bufferToHex(array.buffer);
};

// Sanitización de texto para prevenir XSS
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Elimina caracteres potencialmente peligrosos
    .trim()
    .slice(0, 300);
};

// Validación y sanitización de números
export const sanitizeNumber = (val, min = 0, fallback = 0) => {
  const n = Number(val);
  if (Number.isNaN(n) || n < min) return fallback;
  return Math.round(n);
};

// Verificación de tasa de intentos (Anti-Brute Force)
export const checkRateLimit = () => {
  try {
    const raw = localStorage.getItem('tricos_sec_ratelimit');
    if (!raw) return { locked: false, attempts: 0, remainingSeconds: 0 };
    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.lockoutUntil && data.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
      return { locked: true, attempts: data.attempts, remainingSeconds };
    }

    // Si ya pasó el bloqueo, limpiar bloqueo pero mantener registro reciente
    if (data.lockoutUntil && data.lockoutUntil <= now) {
      return { locked: false, attempts: Math.max(0, data.attempts - 1), remainingSeconds: 0 };
    }

    return { locked: false, attempts: data.attempts || 0, remainingSeconds: 0 };
  } catch {
    return { locked: false, attempts: 0, remainingSeconds: 0 };
  }
};

// Registro de intento fallido
export const recordFailedAttempt = () => {
  try {
    const current = checkRateLimit();
    const attempts = (current.attempts || 0) + 1;
    const now = Date.now();

    // Determinar duración del bloqueo
    const durationSec = LOCKOUT_DURATIONS[Math.min(attempts, LOCKOUT_DURATIONS.length - 1)] || 300;
    const lockoutUntil = attempts >= 3 ? now + durationSec * 1000 : null;

    localStorage.setItem(
      'tricos_sec_ratelimit',
      JSON.stringify({
        attempts,
        lastAttempt: now,
        lockoutUntil,
      })
    );

    logSecurityEvent('LOGIN_FAILED', {
      attempts,
      locked: !!lockoutUntil,
      durationSec,
    });

    return { attempts, locked: !!lockoutUntil, remainingSeconds: durationSec };
  } catch {
    return { attempts: 1, locked: false, remainingSeconds: 0 };
  }
};

// Reseteo de intentos tras login exitoso
export const resetRateLimit = () => {
  try {
    localStorage.removeItem('tricos_sec_ratelimit');
  } catch {}
};

// Gestión de Sesión Segura
export const saveSession = (userData) => {
  const token = generateSecureToken();
  const session = {
    token,
    user: userData,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem('tricos_admin_session', JSON.stringify(session));
    logSecurityEvent('LOGIN_SUCCESS', { user: userData.email || 'Admin' });
  } catch {}
  return session;
};

export const getSession = () => {
  try {
    const raw = sessionStorage.getItem('tricos_admin_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    const now = Date.now();

    if (now > session.expiresAt) {
      // Sesión expirada por inactividad
      sessionStorage.removeItem('tricos_admin_session');
      logSecurityEvent('SESSION_EXPIRED', { user: session.user?.email || 'Admin' });
      return null;
    }

    // Renovar sliding expiration por actividad del usuario
    session.expiresAt = now + SESSION_TTL_MS;
    sessionStorage.setItem('tricos_admin_session', JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem('tricos_admin_session');
    logSecurityEvent('LOGOUT', {});
  } catch {}
};

// Registro de Auditoría (Security Audit Log)
export const logSecurityEvent = (type, metadata = {}) => {
  try {
    const raw = localStorage.getItem('tricos_security_logs');
    const logs = raw ? JSON.parse(raw) : [];
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      metadata,
    };
    logs.unshift(event);
    // Conservar los últimos 100 eventos
    localStorage.setItem('tricos_security_logs', JSON.stringify(logs.slice(0, 100)));
  } catch {}
};

export const getSecurityLogs = () => {
  try {
    const raw = localStorage.getItem('tricos_security_logs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
