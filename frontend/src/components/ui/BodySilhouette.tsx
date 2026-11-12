import React from 'react';
import { classifyBMI } from '../../utils/nutritionCalculations';

interface BodySilhouetteProps {
  bmi: number;
  weight: number;
  height: number; // cm
  gender?: 'M' | 'F' | 'O';
}

const COLOR_MAP: Record<string, { fill: string; glow: string; badge: string }> = {
  '—':               { fill: '#94a3b8', glow: '#94a3b844', badge: 'bg-slate-100 text-slate-500' },
  'Delgadez severa': { fill: '#1d4ed8', glow: '#1d4ed844', badge: 'bg-blue-100 text-blue-800' },
  'Delgadez moderada':{ fill: '#2563eb', glow: '#2563eb44', badge: 'bg-blue-100 text-blue-700' },
  'Delgadez leve':   { fill: '#3b82f6', glow: '#3b82f644', badge: 'bg-blue-50 text-blue-600' },
  'Normal':          { fill: '#16a34a', glow: '#16a34a44', badge: 'bg-green-50 text-green-700' },
  'Sobrepeso':       { fill: '#ca8a04', glow: '#ca8a0444', badge: 'bg-yellow-50 text-yellow-700' },
  'Obesidad I':      { fill: '#ea580c', glow: '#ea580c44', badge: 'bg-orange-50 text-orange-700' },
  'Obesidad II':     { fill: '#dc2626', glow: '#dc262644', badge: 'bg-red-50 text-red-700' },
  'Obesidad III':    { fill: '#991b1b', glow: '#991b1b44', badge: 'bg-red-100 text-red-800' },
};

export const BodySilhouette: React.FC<BodySilhouetteProps> = ({ bmi, weight, height, gender = 'M' }) => {
  const classification = classifyBMI(bmi);
  const colors = COLOR_MAP[classification.label] ?? COLOR_MAP['—'];

  const hM = height / 100;
  const minHealthy = Math.round(18.5 * hM * hM * 10) / 10;
  const maxHealthy = Math.round(24.9 * hM * hM * 10) / 10;

  // Silhouette path — neutral standing figure, proportioned for both genders
  const silhouettePath = gender === 'F'
    ? `M50,10 C57,10 63,16 63,24 C63,32 57,38 50,38 C43,38 37,32 37,24 C37,16 43,10 50,10 Z
       M38,40 C30,42 24,52 25,65 L29,100 C29,104 32,106 35,106 C38,106 40,104 41,101
       L44,80 L46,78 L46,130 L44,170 C44,175 47,178 50,178 C53,178 56,175 56,170
       L54,130 L54,78 L56,80 L59,101 C60,104 62,106 65,106 C68,106 71,104 71,100
       L75,65 C76,52 70,42 62,40 Z`
    : `M50,10 C57,10 63,16 63,24 C63,32 57,38 50,38 C43,38 37,32 37,24 C37,16 43,10 50,10 Z
       M36,40 C27,42 21,54 22,68 L26,100 C26,104 29,107 32,107 C35,107 38,104 38,101
       L42,80 L44,78 L44,130 L42,170 C42,175 45,178 50,178 C55,178 58,175 58,170
       L56,130 L56,78 L58,80 L62,101 C62,104 65,107 68,107 C71,107 74,104 74,100
       L78,68 C79,54 73,42 64,40 Z`;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest self-start">Composición corporal</p>

      {/* SVG figure */}
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 190 }}>
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: colors.glow }} />
        <svg viewBox="0 0 100 190" width={100} height={190} style={{ filter: 'drop-shadow(0 2px 8px ' + colors.glow + ')' }}>
          <path d={silhouettePath} fill={colors.fill} opacity={0.92} />
        </svg>
      </div>

      {/* Weight + BMI */}
      <div className="text-center">
        <p className="text-3xl font-bold text-slate-800 leading-none">
          {weight > 0 ? weight.toFixed(1) : '—'}
          <span className="text-base font-normal text-slate-400 ml-1">kg</span>
        </p>
        {bmi > 0 && (
          <p className="text-sm text-slate-500 mt-0.5">IMC {bmi}</p>
        )}
      </div>

      {/* Classification badge */}
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors.badge}`}>
        {classification.label}
      </span>

      {/* Healthy range */}
      {height > 0 && (
        <div className="w-full border-t border-slate-100 pt-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Peso saludable</p>
          <p className="text-sm font-semibold text-slate-600">
            {minHealthy} – {maxHealthy} <span className="font-normal text-slate-400">kg</span>
          </p>
        </div>
      )}
    </div>
  );
};
