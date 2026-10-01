import React, { useState, useEffect } from 'react';
import {
  Calendar, Candy, Heart, Activity, Dna, Droplets, Pill, Syringe,
  ClipboardList, ChevronUp, ChevronDown, Save, Plus, X,
  AlertTriangle, type LucideIcon,
} from 'lucide-react';
import { Biometrics } from '../../../types/patient';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

type BiometricsInput = Omit<Biometrics, 'id' | 'patientId' | 'createdAt'>;

interface ExtraField { label: string; value: string; }

interface BiometricsFormProps {
  onSubmit: (biometrics: BiometricsInput) => Promise<void>;
  initialData?: Partial<BiometricsInput>;
}

const EMPTY: BiometricsInput = {
  testDate: new Date().toISOString().split('T')[0],
  glucose: 0, hba1c: 0, insulin: 0, homaIndex: 0,
  totalCholesterol: 0, ldl: 0, hdl: 0, triglycerides: 0, vldl: 0,
  ast: 0, alt: 0, ggt: 0, bilirubin: 0,
  creatinine: 0, bun: 0, urea: 0, sodium: 0, potassium: 0, chloride: 0,
  totalProteins: 0, albumin: 0, prealbumin: 0,
  hemoglobin: 0, hematocrit: 0, wbc: 0, platelets: 0,
  vitaminB12: 0, vitaminD: 0, folacin: 0, iron: 0, ferritin: 0, zinc: 0, calcium: 0, magnesium: 0, phosphorus: 0,
};

const inputCls    = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white focus:border-teal-300 transition';
const inputErrCls = 'w-full bg-red-50 border border-red-400 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition';
const labelCls    = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';
const errMsg      = <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} />Completa este campo</p>;

const TODAY = new Date().toISOString().split('T')[0];

// ── Shared section header ──────────────────────────────────────────────────
const SectionBtn = ({
  label, icon: Icon, colorCls, hasError, expanded, onToggle,
}: {
  label: string; icon: LucideIcon; colorCls: string;
  hasError?: boolean; expanded: boolean; onToggle: () => void;
}) => (
  <button type="button" onClick={onToggle}
    className={`w-full flex items-center gap-2.5 py-3 px-4 text-left font-semibold text-sm transition-colors ${colorCls}`}>
    <Icon size={15} className="shrink-0" />
    <span className="flex-1">{label}</span>
    {hasError && <span className="text-xs text-red-500 font-normal flex items-center gap-1"><AlertTriangle size={11} />incompleto</span>}
    {expanded ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
  </button>
);

// Defined outside the parent to keep a stable component reference across renders.
const NumField = ({
  name, label, step = '0.1', value, hasError, onChange,
}: {
  name: string; label: string; step?: string;
  value: number | string; hasError: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input type="number" name={name} value={value || ''} onChange={onChange}
      step={step} min="0" placeholder="—"
      className={hasError ? inputErrCls : inputCls} />
    {hasError && errMsg}
  </div>
);

export const BiometricsForm: React.FC<BiometricsFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState<BiometricsInput>(
    initialData ? { ...EMPTY, ...initialData, testDate: TODAY } : EMPTY
  );

  useEffect(() => {
    setFormData(initialData ? { ...EMPTY, ...initialData, testDate: TODAY } : EMPTY);
    setFieldErrors({});
    setExtraFields([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    carbohidratos: false, lipidos: false, hepatica: false,
    renal: false, proteinas: false, hemograma: false, micronutrientes: false, otros: false,
  });
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);

  const toggleSection = (s: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'testDate') {
      setFormData(prev => ({ ...prev, testDate: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const n = (field: keyof BiometricsInput) => (formData[field] as number) || 0;

  const addExtraField    = () => setExtraFields(prev => [...prev, { label: '', value: '' }]);
  const removeExtraField = (i: number) => setExtraFields(prev => prev.filter((_, idx) => idx !== i));
  const updateExtraField = (i: number, key: keyof ExtraField, val: string) =>
    setExtraFields(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!formData.testDate?.trim()) errors.testDate = true;
    if (n('glucose') <= 0)          errors.glucose = true;
    if (n('hba1c') <= 0)            errors.hba1c = true;
    if (n('insulin') <= 0)          errors.insulin = true;
    if (n('homaIndex') <= 0)        errors.homaIndex = true;
    if (n('totalCholesterol') <= 0) errors.totalCholesterol = true;
    if (n('ldl') <= 0)              errors.ldl = true;
    if (n('hdl') <= 0)              errors.hdl = true;
    if (n('triglycerides') <= 0)    errors.triglycerides = true;
    if (n('vldl') <= 0)             errors.vldl = true;
    if (n('ast') <= 0)              errors.ast = true;
    if (n('alt') <= 0)              errors.alt = true;
    if (n('ggt') <= 0)              errors.ggt = true;
    if (n('bilirubin') <= 0)        errors.bilirubin = true;
    if (n('creatinine') <= 0)       errors.creatinine = true;
    if (n('bun') <= 0)              errors.bun = true;
    if (n('urea') <= 0)             errors.urea = true;
    if (n('sodium') <= 0)           errors.sodium = true;
    if (n('potassium') <= 0)        errors.potassium = true;
    if (n('chloride') <= 0)         errors.chloride = true;
    if (n('totalProteins') <= 0)    errors.totalProteins = true;
    if (n('albumin') <= 0)          errors.albumin = true;
    if (n('prealbumin') <= 0)       errors.prealbumin = true;
    if (n('hemoglobin') <= 0)       errors.hemoglobin = true;
    if (n('hematocrit') <= 0)       errors.hematocrit = true;
    if (n('wbc') <= 0)              errors.wbc = true;
    if (n('platelets') <= 0)        errors.platelets = true;
    if (n('vitaminB12') <= 0)       errors.vitaminB12 = true;
    if (n('vitaminD') <= 0)         errors.vitaminD = true;
    if (n('folacin') <= 0)          errors.folacin = true;
    if (n('iron') <= 0)             errors.iron = true;
    if (n('ferritin') <= 0)         errors.ferritin = true;
    if (n('zinc') <= 0)             errors.zinc = true;
    if (n('calcium') <= 0)          errors.calcium = true;
    if (n('magnesium') <= 0)        errors.magnesium = true;
    if (n('phosphorus') <= 0)       errors.phosphorus = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setExpandedSections(prev => ({
        ...prev,
        carbohidratos:   prev.carbohidratos   || !!(errors.glucose || errors.hba1c || errors.insulin || errors.homaIndex),
        lipidos:         prev.lipidos         || !!(errors.totalCholesterol || errors.ldl || errors.hdl || errors.triglycerides || errors.vldl),
        hepatica:        prev.hepatica        || !!(errors.ast || errors.alt || errors.ggt || errors.bilirubin),
        renal:           prev.renal           || !!(errors.creatinine || errors.bun || errors.urea || errors.sodium || errors.potassium || errors.chloride),
        proteinas:       prev.proteinas       || !!(errors.totalProteins || errors.albumin || errors.prealbumin),
        hemograma:       prev.hemograma       || !!(errors.hemoglobin || errors.hematocrit || errors.wbc || errors.platelets),
        micronutrientes: prev.micronutrientes || !!(errors.vitaminB12 || errors.vitaminD || errors.folacin || errors.iron || errors.ferritin || errors.zinc || errors.calcium || errors.magnesium || errors.phosphorus),
      }));
      return;
    }
    setFieldErrors({});
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      const payload: BiometricsInput = extraFields.length > 0
        ? { ...formData, others: JSON.stringify(extraFields) }
        : formData;
      await onSubmit(payload);
      setFormData(EMPTY);
      setExtraFields([]);
      setFieldErrors({});
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const sectionErr = {
    carbohidratos:   ['glucose','hba1c','insulin','homaIndex'],
    lipidos:         ['totalCholesterol','ldl','hdl','triglycerides','vldl'],
    hepatica:        ['ast','alt','ggt','bilirubin'],
    renal:           ['creatinine','bun','urea','sodium','potassium','chloride'],
    proteinas:       ['totalProteins','albumin','prealbumin'],
    hemograma:       ['hemoglobin','hematocrit','wbc','platelets'],
    micronutrientes: ['vitaminB12','vitaminD','folacin','iron','ferritin','zinc','calcium','magnesium','phosphorus'],
  };
  const hasErr = (s: keyof typeof sectionErr) => sectionErr[s].some(f => fieldErrors[f]);
  const inp = (name: string) => fieldErrors[name] ? inputErrCls : inputCls;

  const num = (name: keyof BiometricsInput, label: string, step = '0.1') => (
    <NumField key={name} name={String(name)} label={label} step={step}
      value={formData[name] as number}
      hasError={!!fieldErrors[String(name)]}
      onChange={handleChange} />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Fecha del examen */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="py-3 px-4 bg-slate-50 flex items-center gap-2">
          <Calendar size={14} className="text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-700 text-sm">Fecha del Examen</span>
        </div>
        <div className="p-4">
          <input type="date" name="testDate" value={formData.testDate} onChange={handleChange}
            min={TODAY} max={TODAY} required className={inp('testDate')} />
          {fieldErrors.testDate && errMsg}
        </div>
      </div>

      {/* I. Metabolismo de Carbohidratos */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="I. Metabolismo de Carbohidratos" icon={Candy}
          colorCls="bg-yellow-50 hover:bg-yellow-100 text-yellow-800"
          hasError={hasErr('carbohidratos')} expanded={expandedSections.carbohidratos}
          onToggle={() => toggleSection('carbohidratos')} />
        {expandedSections.carbohidratos && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('glucose',   'Glucosa (mg/dL)')}
            {num('hba1c',     'HbA1c (%)')}
            {num('insulin',   'Insulina (mIU/L)')}
            {num('homaIndex', 'Índice HOMA', '0.01')}
          </div>
        )}
      </div>

      {/* II. Perfil Lipídico */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="II. Perfil Lipídico" icon={Heart}
          colorCls="bg-red-50 hover:bg-red-100 text-red-800"
          hasError={hasErr('lipidos')} expanded={expandedSections.lipidos}
          onToggle={() => toggleSection('lipidos')} />
        {expandedSections.lipidos && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('totalCholesterol', 'Colesterol Total (mg/dL)')}
            {num('ldl',              'LDL (mg/dL)')}
            {num('hdl',              'HDL (mg/dL)')}
            {num('triglycerides',    'Triglicéridos (mg/dL)')}
            {num('vldl',             'VLDL (mg/dL)')}
          </div>
        )}
      </div>

      {/* III. Función Hepática */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="III. Función Hepática" icon={Activity}
          colorCls="bg-orange-50 hover:bg-orange-100 text-orange-800"
          hasError={hasErr('hepatica')} expanded={expandedSections.hepatica}
          onToggle={() => toggleSection('hepatica')} />
        {expandedSections.hepatica && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('ast',       'AST (U/L)')}
            {num('alt',       'ALT (U/L)')}
            {num('ggt',       'GGT (U/L)')}
            {num('bilirubin', 'Bilirrubina (mg/dL)')}
          </div>
        )}
      </div>

      {/* IV. Función Renal */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="IV. Función Renal" icon={Dna}
          colorCls="bg-purple-50 hover:bg-purple-100 text-purple-800"
          hasError={hasErr('renal')} expanded={expandedSections.renal}
          onToggle={() => toggleSection('renal')} />
        {expandedSections.renal && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('creatinine', 'Creatinina (mg/dL)')}
            {num('bun',        'BUN (mg/dL)')}
            {num('urea',       'Urea (mg/dL)')}
            {num('sodium',     'Sodio (mEq/L)')}
            {num('potassium',  'Potasio (mEq/L)')}
            {num('chloride',   'Cloro (mEq/L)')}
          </div>
        )}
      </div>

      {/* V. Proteínas Séricas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="V. Proteínas Séricas" icon={Syringe}
          colorCls="bg-green-50 hover:bg-green-100 text-green-800"
          hasError={hasErr('proteinas')} expanded={expandedSections.proteinas}
          onToggle={() => toggleSection('proteinas')} />
        {expandedSections.proteinas && (
          <div className="p-4 grid grid-cols-3 gap-4">
            {num('totalProteins', 'Proteína Total (g/dL)')}
            {num('albumin',       'Albúmina (g/dL)')}
            {num('prealbumin',    'Prealbúmina (mg/dL)')}
          </div>
        )}
      </div>

      {/* VI. Hemograma */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="VI. Hemograma" icon={Droplets}
          colorCls="bg-pink-50 hover:bg-pink-100 text-pink-800"
          hasError={hasErr('hemograma')} expanded={expandedSections.hemograma}
          onToggle={() => toggleSection('hemograma')} />
        {expandedSections.hemograma && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('hemoglobin',  'Hemoglobina (g/dL)')}
            {num('hematocrit',  'Hematocrito (%)')}
            {num('wbc',         'Glóbulos Blancos (×10³/μL)')}
            {num('platelets',   'Plaquetas (×10³/μL)')}
          </div>
        )}
      </div>

      {/* VII. Micronutrientes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="VII. Micronutrientes" icon={Pill}
          colorCls="bg-indigo-50 hover:bg-indigo-100 text-indigo-800"
          hasError={hasErr('micronutrientes')} expanded={expandedSections.micronutrientes}
          onToggle={() => toggleSection('micronutrientes')} />
        {expandedSections.micronutrientes && (
          <div className="p-4 grid grid-cols-2 gap-4">
            {num('vitaminB12', 'Vitamina B12 (pg/mL)')}
            {num('vitaminD',   'Vitamina D (ng/mL)')}
            {num('folacin',    'Ácido Fólico (ng/mL)')}
            {num('iron',       'Hierro (μg/dL)')}
            {num('ferritin',   'Ferritina (ng/mL)')}
            {num('zinc',       'Zinc (μg/dL)')}
            {num('calcium',    'Calcio (mg/dL)')}
            {num('magnesium',  'Magnesio (mg/dL)')}
            {num('phosphorus', 'Fósforo (mg/dL)')}
          </div>
        )}
      </div>

      {/* VIII. Otros */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionBtn label="VIII. Otros / Adicionales" icon={ClipboardList}
          colorCls="bg-slate-50 hover:bg-slate-100 text-slate-700"
          expanded={expandedSections.otros} onToggle={() => toggleSection('otros')} />
        {expandedSections.otros && (
          <div className="p-4 space-y-3">
            {extraFields.map((field, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="Campo" value={field.label}
                  onChange={e => updateExtraField(i, 'label', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:bg-white transition" />
                <input type="text" placeholder="Valor" value={field.value}
                  onChange={e => updateExtraField(i, 'value', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:bg-white transition" />
                <button type="button" onClick={() => removeExtraField(i)}
                  className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addExtraField}
              className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <Plus size={13} /> Agregar campo
            </button>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
        <Save size={16} />
        {loading ? 'Guardando...' : 'Guardar Datos Bioquímicos'}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Estás seguro/a?"
        message="¿Deseas guardar estos datos bioquímicos?"
        confirmText="Guardar"
        cancelText="Cancelar"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </form>
  );
};
