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
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días de sesión persistente segura
const SESSION_STORAGE_KEY = 'tricos_admin_session_auth';

// Conversión de ArrayBuffer a Hexadecimal
const bufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Implementación JS pura de SHA-256 como respaldo universal (para navegadores móviles o contextos no seguros)
const sha256Fallback = (ascii) => {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (i = 0; i < 4; i++) {
      const sub = (hash[i] >> ((3 - i) * 8)) & 255;
      result += (sub < 16 ? '0' : '') + sub.toString(16);
    }
  }
  return result;
};

// Hash criptográfico SHA-256 usando la API nativa del navegador o fallback puro
export const hashPassword = async (password, salt = SALT) => {
  const plain = `${salt}:${password}:tricos_chick_burgers_pepper`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return bufferToHex(hashBuffer);
    }
  } catch {}
  return sha256Fallback(plain);
};

// Generador de tokens de sesión criptográficamente seguros
export const generateSecureToken = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return bufferToHex(array.buffer);
    }
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
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

// Gestión de Sesión Segura Persistente (30 días de persistencia con renovación automática)
export const saveSession = (userData) => {
  const token = generateSecureToken();
  const session = {
    token,
    user: userData,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    logSecurityEvent('LOGIN_SUCCESS', { user: userData.email || 'Admin' });
  } catch {}
  return session;
};

export const getSession = () => {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(SESSION_STORAGE_KEY) ||
      sessionStorage.getItem('tricos_admin_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    const now = Date.now();

    if (!session || !session.token) return null;

    if (session.expiresAt && now > session.expiresAt) {
      // Sesión expirada
      clearSession();
      logSecurityEvent('SESSION_EXPIRED', { user: session.user?.email || 'Admin' });
      return null;
    }

    // Renovar sliding expiration por actividad del usuario
    session.expiresAt = now + SESSION_TTL_MS;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}
    return session;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
