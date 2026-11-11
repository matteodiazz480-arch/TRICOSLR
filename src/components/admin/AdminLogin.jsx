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
    <div className="min-h-screen bg-[#F8F9FA] text-cartoon-ink flex flex-col justify-center items-center px-4 py-8 select-none relative">
      {/* Botón sutil para volver a la tienda */}
      <button
        onClick={onBackToSite}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-gray-500 hover:text-cartoon-ink text-xs sm:text-sm py-2 px-3 flex items-center gap-2 cursor-pointer transition-colors font-sub font-bold rounded-xl hover:bg-gray-100"
      >
        <Icon name="arrow_back" size={16} />
        <span>Volver a la Tienda</span>
      </button>

      {/* Tarjeta de Login en Estilo Blanco */}
      <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-cartoon-ink shadow-cartoon-lg p-6 sm:p-8 animate-modalIn">
        
        {/* Cabecera con Logo Oficial Circular Nítido */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white border-2 border-cartoon-ink shadow-cartoon-sm p-1 flex items-center justify-center">
            <img
              src="/assets/logo.svg?v=4"
              alt="Logo TRICO'S"
              className="w-full h-full object-contain block"
            />
          </div>
          <h1 className="font-display text-3xl text-cartoon-ink tracking-wide">
            PANEL ADMIN
          </h1>
          <p className="font-sub text-xs sm:text-sm text-gray-500 mt-1 font-semibold">
            Gastos, ganancias y stock
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-cartoon-red/10 border-2 border-cartoon-red text-cartoon-red text-xs font-sub font-bold p-3 rounded-xl flex items-center gap-2">
            <Icon name="error" size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-sub font-bold text-xs text-gray-700 mb-1.5">
              Contraseña de acceso:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={rateLimit.locked || loading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border-2 border-gray-200 font-sub text-sm text-cartoon-ink placeholder-gray-400 focus:outline-none focus:border-cartoon-yellow focus:bg-white shadow-inner transition-colors"
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
            className={`w-full py-3 rounded-2xl font-display text-sm border-2 border-cartoon-ink shadow-cartoon transition-all flex items-center justify-center gap-2 cursor-pointer ${
              rateLimit.locked || loading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border-gray-300'
                : 'bg-cartoon-yellow hover:bg-cartoon-yellow-dark text-cartoon-ink active:translate-x-[2px] active:translate-y-[2px]'
            }`}
          >
            {loading ? (
              <span>Verificando…</span>
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
