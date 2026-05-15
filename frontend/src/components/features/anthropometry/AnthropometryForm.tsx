import React, { useState } from 'react';
import { Anthropometry } from '../../../types/patient';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ValidationAlert } from '../../ui/ValidationAlert';
import {
  calculateBMI, classifyBMI,
  calculateWHR, classifyWHR,
  type Gender,
} from '../../../utils/nutritionCalculations';

type AnthropometryInput = Omit<Anthropometry, 'id' | 'patientId' | 'createdAt'>;

interface AnthropometryFormProps {
  onSubmit: (data: AnthropometryInput) => Promise<void>;
  gender?: Gender;
}

const EMPTY: AnthropometryInput = {
  measurementDate: new Date().toISOString().split('T')[0],
  weight: 0,
  height: 0,
  bmi: 0,
  waistCircumference: undefined,
  hipCircumference: undefined,
  waistHipRatio: undefined,
  armCircumference: undefined,
  thighCircumference: undefined,
  calfCircumference: undefined,
  tricepsSkinfold: undefined,
  bicepsSkinfold: undefined,
  subscapularSkinfold: undefined,
  suprailiacSkinfold: undefined,
  bodyFatPercentage: undefined,
  muscleMass: undefined,
  boneMass: undefined,
  waterPercentage: undefined,
};

const SectionHeader: React.FC<{
  title: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ title, expanded, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex justify-between items-center py-3 px-4 bg-teal-50 hover:bg-teal-100 rounded-lg text-left font-semibold text-teal-800 transition-colors"
  >
    <span>{title}</span>
    <span className="text-xl">{expanded ? '▲' : '▼'}</span>
  </button>
);

interface MetricCardProps {
  label: string;
  value: string;
  classification: { label: string; colorClass: string; bgClass: string; borderClass: string };
  sub?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, classification, sub }) => (
  <div className={`flex-1 border-2 rounded-xl p-4 ${classification.bgClass} ${classification.borderClass}`}>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${classification.colorClass}`}>{value}</p>
    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${classification.bgClass} ${classification.colorClass} border ${classification.borderClass}`}>
      {classification.label}
    </span>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export const AnthropometryForm: React.FC<AnthropometryFormProps> = ({ onSubmit, gender = 'M' }) => {
  const [formData, setFormData] = useState<AnthropometryInput>(EMPTY);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    generales: true, circunferencias: true, pliegues: false, composicion: false,
  });

  const toggleSection = (s: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));

  // Live calculations
  const bmi = calculateBMI(formData.weight, formData.height);
  const bmiClass = classifyBMI(bmi);
  const whr = (formData.waistCircumference && formData.hipCircumference)
    ? calculateWHR(formData.waistCircumference, formData.hipCircumference)
    : 0;
  const whrClass = classifyWHR(whr, gender);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'measurementDate') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      const num = value === '' ? undefined : (parseFloat(value) || 0);
      setFormData(prev => ({ ...prev, [name]: num }));
    }
  };

  const val = (field: keyof AnthropometryInput): string => {
    const v = formData[field];
    return v === undefined || v === null ? '' : String(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!formData.measurementDate) errors.push('📅 Fecha de Medición');
    if (!formData.weight || formData.weight <= 0) errors.push('⚖️ Peso');
    if (!formData.height || formData.height <= 0) errors.push('📏 Talla');
    if (errors.length > 0) {
      setValidationError('Completa los campos requeridos:\n• ' + errors.join('\n• '));
      return;
    }
    setValidationError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        bmi: bmi || 0,
        waistHipRatio: whr || undefined,
      });
      setFormData(EMPTY);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ValidationAlert
        isOpen={validationError !== ''}
        message={validationError}
        onClose={() => setValidationError('')}
      />

      {/* Live IMC / ICC cards */}
      <div className="flex gap-4">
        <MetricCard
          label="IMC (kg/m²)"
          value={bmi > 0 ? bmi.toFixed(1) : '—'}
          classification={bmiClass}
          sub={formData.weight && formData.height ? `${formData.weight} kg / ${formData.height} cm` : undefined}
        />
        <MetricCard
          label="ICC (cintura/cadera)"
          value={whr > 0 ? whr.toFixed(2) : '—'}
          classification={whrClass}
          sub={
            formData.waistCircumference && formData.hipCircumference
              ? `${formData.waistCircumference} / ${formData.hipCircumference} cm`
              : 'Completa cintura y cadera'
          }
        />
      </div>

      {/* Sección I — Medidas Generales */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader
          title="I. Medidas Generales"
          expanded={expandedSections.generales}
          onToggle={() => toggleSection('generales')}
        />
        {expandedSections.generales && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Fecha de Medición *</label>
              <input type="date" name="measurementDate" value={formData.measurementDate} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Peso (kg) *</label>
              <input type="number" name="weight" value={val('weight')} onChange={handleChange}
                className={inputCls} placeholder="70.5" step="0.1" min="0" max="300" />
            </div>
            <div>
              <label className={labelCls}>Talla (cm) *</label>
              <input type="number" name="height" value={val('height')} onChange={handleChange}
                className={inputCls} placeholder="170" step="0.1" min="0" max="250" />
            </div>
          </div>
        )}
      </div>

      {/* Sección II — Circunferencias */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader
          title="II. Circunferencias (cm)"
          expanded={expandedSections.circunferencias}
          onToggle={() => toggleSection('circunferencias')}
        />
        {expandedSections.circunferencias && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'waistCircumference', label: 'Cintura' },
              { name: 'hipCircumference', label: 'Cadera' },
              { name: 'armCircumference', label: 'Brazo' },
              { name: 'thighCircumference', label: 'Muslo' },
              { name: 'calfCircumference', label: 'Pantorrilla' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className={labelCls}>{label} (cm)</label>
                <input type="number" name={name} value={val(name as keyof AnthropometryInput)}
                  onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección III — Pliegues Cutáneos */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader
          title="III. Pliegues Cutáneos (mm)"
          expanded={expandedSections.pliegues}
          onToggle={() => toggleSection('pliegues')}
        />
        {expandedSections.pliegues && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'tricepsSkinfold', label: 'Tríceps' },
              { name: 'bicepsSkinfold', label: 'Bíceps' },
              { name: 'subscapularSkinfold', label: 'Subescapular' },
              { name: 'suprailiacSkinfold', label: 'Suprailíaco' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className={labelCls}>{label} (mm)</label>
                <input type="number" name={name} value={val(name as keyof AnthropometryInput)}
                  onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección IV — Composición Corporal */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader
          title="IV. Composición Corporal"
          expanded={expandedSections.composicion}
          onToggle={() => toggleSection('composicion')}
        />
        {expandedSections.composicion && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>% Grasa Corporal</label>
              <input type="number" name="bodyFatPercentage" value={val('bodyFatPercentage')}
                onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" max="100" />
            </div>
            <div>
              <label className={labelCls}>Masa Muscular (kg)</label>
              <input type="number" name="muscleMass" value={val('muscleMass')}
                onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" />
            </div>
            <div>
              <label className={labelCls}>Masa Ósea (kg)</label>
              <input type="number" name="boneMass" value={val('boneMass')}
                onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" />
            </div>
            <div>
              <label className={labelCls}>% Agua Corporal</label>
              <input type="number" name="waterPercentage" value={val('waterPercentage')}
                onChange={handleChange} className={inputCls} placeholder="—" step="0.1" min="0" max="100" />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Registrar Medición'}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Guardar Antropometría"
        message={`IMC calculado: ${bmi > 0 ? bmi.toFixed(1) : '—'} (${bmiClass.label})${whr > 0 ? `\nICC: ${whr.toFixed(2)} (${whrClass.label})` : ''}\n\n¿Confirmar registro de medición?`}
        onConfirm={() => { handleConfirm(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </form>
  );
};
