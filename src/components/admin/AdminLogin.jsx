import React, { useState, useEffect } from 'react';
import { Icon } from '../Icon';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  hashPassword,
  saveSession,
} from '../../lib/security';

const DEFAULT_MASTER_PASSWORD = 'tricos2026';

export const AdminLogin = ({ onLoginSuccess, onBackToSite }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState(checkRateLimit());

  useEffect(() => {
    if (!rateLimit.locked) return;
    const interval = setInterval(() => {
      const updated = checkRateLimit();
      setRateLimit(updated);
      if (!updated.locked) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimit.locked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const currentLimit = checkRateLimit();
    if (currentLimit.locked) {
      setError(`Demasiados intentos. Esperá ${currentLimit.remainingSeconds}s.`);
      setRateLimit(currentLimit);
      return;
    }

    if (!password.trim()) {
      setError('Ingresá tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      let loggedIn = false;
      let userData = { email: 'admin@tricos.com', role: 'admin' };

      // Verificar clave guardada o clave por defecto
      const savedCustomHash = localStorage.getItem('tricos_admin_custom_pwd_hash');
      const inputHash = await hashPassword(password);
      const expectedDefaultHash = await hashPassword(DEFAULT_MASTER_PASSWORD);

      const isValid = savedCustomHash ? inputHash === savedCustomHash : inputHash === expectedDefaultHash;

      if (isValid) {
        loggedIn = true;
      }

      if (loggedIn) {
        resetRateLimit();
        const session = saveSession(userData);
        onLoginSuccess(session);
      } else {
        const fail = recordFailedAttempt();
        setRateLimit(fail);
        if (fail.locked) {
          setError(`Acceso bloqueado por ${fail.remainingSeconds}s.`);
        } else {
          setError('Contraseña incorrecta.');
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF6] md:bg-[#F8F9FA] text-cartoon-ink flex flex-col justify-center items-center px-4 py-8 select-none relative">
      <button
        type="button"
        onClick={onBackToSite}
        className="btn-cartoon-white absolute top-4 left-4 sm:top-6 sm:left-6 text-xs sm:text-sm py-2 px-3 flex items-center gap-2 cursor-pointer"
      >
        <Icon name="arrow_back" size={16} />
        <span>Volver a la Tienda</span>
      </button>

      <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon p-6 sm:p-8 animate-modalIn">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white border-2 border-cartoon-ink shadow-cartoon-xs p-1.5 flex items-center justify-center">
            <img
              src="/assets/logo.svg?v=4"
              alt="Logo TRICO'S"
              className="w-full h-full object-contain block"
            />
          </div>
          <h1 className="font-display text-2xl text-cartoon-ink tracking-tight">
            Panel de Administración
          </h1>
          <p className="font-sub font-semibold text-xs text-gray-500 mt-1">
            Gestión de carta, ingredientes, pedidos y sorteo
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-cartoon-red text-white text-xs font-sub font-bold p-3 rounded-2xl border-2 border-cartoon-ink shadow-cartoon-xs flex items-center gap-2">
            <Icon name="error" size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-sub font-bold text-xs text-cartoon-ink mb-1.5">
              Contraseña de acceso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={rateLimit.locked || loading}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border-2 border-cartoon-ink/30 font-sub text-sm text-cartoon-ink placeholder-gray-400 focus:outline-none focus:border-cartoon-ink transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cartoon-ink cursor-pointer"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={rateLimit.locked || loading}
            className={`btn-cartoon-primary w-full py-3 text-sm flex items-center justify-center gap-2 shadow-cartoon-xs ${
              rateLimit.locked || loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <Icon name="login" size={18} />
                <span>Ingresar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
