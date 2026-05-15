import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
    } catch {
      setError('Email o contraseña incorrectos. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — clinical dark ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between bg-slate-900 p-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-14">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight tracking-tight">NutriApp</p>
              <p className="text-slate-500 text-xs">Sistema de Gestión Nutricional</p>
            </div>
          </div>

          <h2 className="text-white text-3xl font-bold leading-snug mb-5">
            Nutrición clínica<br />de precisión
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Plataforma profesional para nutricionistas clínicos del Ecuador. Historia clínica estandarizada, evaluación antropométrica automatizada y planificación dietética por equivalentes SMAE.
          </p>

          {/* Divider */}
          <div className="my-8 border-t border-slate-800" />

          {/* Features */}
          <div className="space-y-4">
            {[
              { label: 'IMC & ICC calculados en tiempo real con clasificación OMS' },
              { label: 'Fórmulas TMB/GET validadas: Harris-Benedict, FAO/WHO/ONU' },
              { label: 'Base de datos SMAE adaptada al contexto ecuatoriano' },
              { label: 'Seguimiento longitudinal con historial de mediciones' },
            ].map(({ label }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span className="text-slate-400 text-sm leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs">
          Diseñado para profesionales de la salud · Ecuador
        </p>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">NutriApp</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-slate-900 text-2xl font-bold tracking-tight">Iniciar sesión</h1>
            <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales de acceso</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nutricionista@clinica.ec"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="w-1 h-full min-h-[16px] bg-red-500 rounded-full flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-slate-400 text-xs text-center mt-10">
            NutriApp — v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
