import React from 'react';
import type { Gender } from '../../utils/nutritionCalculations';

interface Segment {
  from: number;
  to: number;
  bar: string;
  bg: string;
  fg: string;
  label: string;
}

const BMI_SEG: Segment[] = [
  { from: 14,   to: 16,   bar: '#1e40af', bg: '#dbeafe', fg: '#1e3a8a', label: 'Delgadez severa' },
  { from: 16,   to: 18.5, bar: '#3b82f6', bg: '#eff6ff', fg: '#1d4ed8', label: 'Delgadez' },
  { from: 18.5, to: 25,   bar: '#059669', bg: '#d1fae5', fg: '#065f46', label: 'Normal' },
  { from: 25,   to: 30,   bar: '#d97706', bg: '#fef3c7', fg: '#92400e', label: 'Sobrepeso' },
  { from: 30,   to: 35,   bar: '#ea580c', bg: '#ffedd5', fg: '#9a3412', label: 'Obesidad I' },
  { from: 35,   to: 40,   bar: '#dc2626', bg: '#fee2e2', fg: '#991b1b', label: 'Obesidad II' },
  { from: 40,   to: 46,   bar: '#7f1d1d', bg: '#fecaca', fg: '#7f1d1d', label: 'Obesidad III' },
];

const WHR_M: Segment[] = [
  { from: 0.60, to: 0.96, bar: '#059669', bg: '#d1fae5', fg: '#065f46', label: 'Riesgo bajo' },
  { from: 0.96, to: 1.00, bar: '#d97706', bg: '#fef3c7', fg: '#92400e', label: 'Riesgo moderado' },
  { from: 1.00, to: 1.30, bar: '#dc2626', bg: '#fee2e2', fg: '#991b1b', label: 'Riesgo alto' },
];

const WHR_F: Segment[] = [
  { from: 0.60, to: 0.81, bar: '#059669', bg: '#d1fae5', fg: '#065f46', label: 'Riesgo bajo' },
  { from: 0.81, to: 0.85, bar: '#d97706', bg: '#fef3c7', fg: '#92400e', label: 'Riesgo moderado' },
  { from: 0.85, to: 1.30, bar: '#dc2626', bg: '#fee2e2', fg: '#991b1b', label: 'Riesgo alto' },
];

interface Props {
  type: 'bmi' | 'whr';
  value: number;
  gender?: Gender;
}

export const ClinicalGauge: React.FC<Props> = ({ type, value, gender = 'M' }) => {
  const isBMI = type === 'bmi';
  const segs = isBMI ? BMI_SEG : (gender === 'M' ? WHR_M : WHR_F);
  const MIN = isBMI ? 14 : 0.6;
  const MAX = isBMI ? 46 : 1.3;

  const hasValue = value > 0;
  const pct = hasValue
    ? Math.max(0, Math.min(100, ((Math.max(MIN, Math.min(MAX, value)) - MIN) / (MAX - MIN)) * 100))
    : 0;

  const activeSeg = hasValue
    ? (segs.find(s => value >= s.from && value < s.to) ?? segs[segs.length - 1])
    : null;

  return (
    <div style={{ minWidth: 180 }}>
      {/* Label + value */}
      <div className="flex items-end justify-between mb-1">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
          {isBMI ? 'IMC' : 'ICC'}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#0f172a', lineHeight: 1 }}>
            {hasValue ? (isBMI ? value.toFixed(1) : value.toFixed(2)) : '—'}
          </span>
          {isBMI && <span style={{ fontSize: 11, color: '#94a3b8' }}>kg/m²</span>}
        </div>
      </div>

      {/* Classification badge */}
      <div style={{ marginBottom: 10, minHeight: 22 }}>
        {activeSeg ? (
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 10px', borderRadius: 99,
            backgroundColor: activeSeg.bg, color: activeSeg.fg,
          }}>
            {activeSeg.label}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>Sin datos</span>
        )}
      </div>

      {/* Gauge bar */}
      <div style={{ position: 'relative' }}>
        {/* Marker (downward triangle) */}
        {hasValue && (
          <div style={{
            position: 'absolute', bottom: '100%', marginBottom: 3,
            left: `${pct}%`, transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '6px solid #0f172a',
          }} />
        )}

        {/* Segmented bar */}
        <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden' }}>
          {segs.map((s, i) => (
            <div
              key={i}
              style={{
                width: `${((s.to - s.from) / (MAX - MIN)) * 100}%`,
                backgroundColor: s.bar,
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.25)' : undefined,
              }}
            />
          ))}
        </div>

        {/* Scale ticks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 9, color: '#cbd5e1' }}>{MIN}</span>
          {segs.slice(1).map(s => (
            <span key={s.from} style={{ fontSize: 9, color: '#cbd5e1' }}>{s.from}</span>
          ))}
          <span style={{ fontSize: 9, color: '#cbd5e1' }}>{MAX}+</span>
        </div>
      </div>
    </div>
  );
};
