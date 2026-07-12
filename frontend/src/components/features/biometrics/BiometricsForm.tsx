import React, { useState, useEffect } from 'react';
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

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition';
const inputErrCls = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white transition';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const errMsg = <p className="text-xs text-red-500 mt-1">Completa este campo</p>;

const TODAY = new Date().toISOString().split('T')[0];

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

  const addExtraField = () => setExtraFields(prev => [...prev, { label: '', value: '' }]);
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
      // Auto-expandir secciones con errores
      setExpandedSections(prev => ({
        ...prev,
        carbohidratos: prev.carbohidratos || !!(errors.glucose || errors.hba1c || errors.insulin || errors.homaIndex),
        lipidos:       prev.lipidos       || !!(errors.totalCholesterol || errors.ldl || errors.hdl || errors.triglycerides || errors.vldl),
        hepatica:      prev.hepatica      || !!(errors.ast || errors.alt || errors.ggt || errors.bilirubin),
        renal:         prev.renal         || !!(errors.creatinine || errors.bun || errors.urea || errors.sodium || errors.potassium || errors.chloride),
        proteinas:     prev.proteinas     || !!(errors.totalProteins || errors.albumin || errors.prealbumin),
        hemograma:     prev.hemograma     || !!(errors.hemoglobin || errors.hematocrit || errors.wbc || errors.platelets),
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

  const hasErr = (section: 'carbohidratos' | 'lipidos' | 'hepatica' | 'renal' | 'proteinas' | 'hemograma' | 'micronutrientes') => {
    const map = {
      carbohidratos:   ['glucose', 'hba1c', 'insulin', 'homaIndex'],
      lipidos:         ['totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'vldl'],
      hepatica:        ['ast', 'alt', 'ggt', 'bilirubin'],
      renal:           ['creatinine', 'bun', 'urea', 'sodium', 'potassium', 'chloride'],
      proteinas:       ['totalProteins', 'albumin', 'prealbumin'],
      hemograma:       ['hemoglobin', 'hematocrit', 'wbc', 'platelets'],
      micronutrientes: ['vitaminB12', 'vitaminD', 'folacin', 'iron', 'ferritin', 'zinc', 'calcium', 'magnesium', 'phosphorus'],
    };
    return map[section].some(f => fieldErrors[f]);
  };

  const inp = (name: string) => fieldErrors[name] ? inputErrCls : inputCls;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Fecha del examen */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="py-3 px-4 bg-slate-50">
          <span className="font-semibold text-slate-700 text-sm">📅 Fecha del Examen</span>
        </div>
        <div className="p-4">
          <input type="date" name="testDate" value={formData.testDate} onChange={handleChange}
            min={TODAY} max={TODAY} required className={inp('testDate')} />
          {fieldErrors.testDate && errMsg}
        </div>
      </div>

      {/* I. Metabolismo de Carbohidratos */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('carbohidratos')}
          className="w-full flex justify-between items-center py-3 px-4 bg-yellow-50 hover:bg-yellow-100 text-left font-semibold text-yellow-800 transition-colors">
          <span>🍬 I. Metabolismo de Carbohidratos {hasErr('carbohidratos') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.carbohidratos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.carbohidratos && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Glucosa (mg/dL)</label><input type="number" name="glucose" value={formData.glucose || ''} onChange={handleChange} step="0.1" min="0" className={inp('glucose')} />{fieldErrors.glucose && errMsg}</div>
            <div><label className={labelCls}>HbA1c (%)</label><input type="number" name="hba1c" value={formData.hba1c || ''} onChange={handleChange} step="0.1" min="0" className={inp('hba1c')} />{fieldErrors.hba1c && errMsg}</div>
            <div><label className={labelCls}>Insulina (mIU/L)</label><input type="number" name="insulin" value={formData.insulin || ''} onChange={handleChange} step="0.1" min="0" className={inp('insulin')} />{fieldErrors.insulin && errMsg}</div>
            <div><label className={labelCls}>Índice HOMA</label><input type="number" name="homaIndex" value={formData.homaIndex || ''} onChange={handleChange} step="0.01" min="0" className={inp('homaIndex')} />{fieldErrors.homaIndex && errMsg}</div>
          </div>
        )}
      </div>

      {/* II. Perfil Lipídico */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('lipidos')}
          className="w-full flex justify-between items-center py-3 px-4 bg-red-50 hover:bg-red-100 text-left font-semibold text-red-800 transition-colors">
          <span>❤️ II. Perfil Lipídico {hasErr('lipidos') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.lipidos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.lipidos && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Colesterol Total (mg/dL)</label><input type="number" name="totalCholesterol" value={formData.totalCholesterol || ''} onChange={handleChange} step="0.1" min="0" className={inp('totalCholesterol')} />{fieldErrors.totalCholesterol && errMsg}</div>
            <div><label className={labelCls}>LDL (mg/dL)</label><input type="number" name="ldl" value={formData.ldl || ''} onChange={handleChange} step="0.1" min="0" className={inp('ldl')} />{fieldErrors.ldl && errMsg}</div>
            <div><label className={labelCls}>HDL (mg/dL)</label><input type="number" name="hdl" value={formData.hdl || ''} onChange={handleChange} step="0.1" min="0" className={inp('hdl')} />{fieldErrors.hdl && errMsg}</div>
            <div><label className={labelCls}>Triglicéridos (mg/dL)</label><input type="number" name="triglycerides" value={formData.triglycerides || ''} onChange={handleChange} step="0.1" min="0" className={inp('triglycerides')} />{fieldErrors.triglycerides && errMsg}</div>
            <div><label className={labelCls}>VLDL (mg/dL)</label><input type="number" name="vldl" value={formData.vldl || ''} onChange={handleChange} step="0.1" min="0" className={inp('vldl')} />{fieldErrors.vldl && errMsg}</div>
          </div>
        )}
      </div>

      {/* III. Función Hepática */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('hepatica')}
          className="w-full flex justify-between items-center py-3 px-4 bg-orange-50 hover:bg-orange-100 text-left font-semibold text-orange-800 transition-colors">
          <span>🏥 III. Función Hepática {hasErr('hepatica') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.hepatica ? '▲' : '▼'}</span>
        </button>
        {expandedSections.hepatica && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>AST (U/L)</label><input type="number" name="ast" value={formData.ast || ''} onChange={handleChange} step="0.1" min="0" className={inp('ast')} />{fieldErrors.ast && errMsg}</div>
            <div><label className={labelCls}>ALT (U/L)</label><input type="number" name="alt" value={formData.alt || ''} onChange={handleChange} step="0.1" min="0" className={inp('alt')} />{fieldErrors.alt && errMsg}</div>
            <div><label className={labelCls}>GGT (U/L)</label><input type="number" name="ggt" value={formData.ggt || ''} onChange={handleChange} step="0.1" min="0" className={inp('ggt')} />{fieldErrors.ggt && errMsg}</div>
            <div><label className={labelCls}>Bilirrubina (mg/dL)</label><input type="number" name="bilirubin" value={formData.bilirubin || ''} onChange={handleChange} step="0.1" min="0" className={inp('bilirubin')} />{fieldErrors.bilirubin && errMsg}</div>
          </div>
        )}
      </div>

      {/* IV. Función Renal */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('renal')}
          className="w-full flex justify-between items-center py-3 px-4 bg-purple-50 hover:bg-purple-100 text-left font-semibold text-purple-800 transition-colors">
          <span>🧬 IV. Función Renal {hasErr('renal') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.renal ? '▲' : '▼'}</span>
        </button>
        {expandedSections.renal && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Creatinina (mg/dL)</label><input type="number" name="creatinine" value={formData.creatinine || ''} onChange={handleChange} step="0.1" min="0" className={inp('creatinine')} />{fieldErrors.creatinine && errMsg}</div>
            <div><label className={labelCls}>BUN (mg/dL)</label><input type="number" name="bun" value={formData.bun || ''} onChange={handleChange} step="0.1" min="0" className={inp('bun')} />{fieldErrors.bun && errMsg}</div>
            <div><label className={labelCls}>Urea (mg/dL)</label><input type="number" name="urea" value={formData.urea || ''} onChange={handleChange} step="0.1" min="0" className={inp('urea')} />{fieldErrors.urea && errMsg}</div>
            <div><label className={labelCls}>Sodio (mEq/L)</label><input type="number" name="sodium" value={formData.sodium || ''} onChange={handleChange} step="0.1" min="0" className={inp('sodium')} />{fieldErrors.sodium && errMsg}</div>
            <div><label className={labelCls}>Potasio (mEq/L)</label><input type="number" name="potassium" value={formData.potassium || ''} onChange={handleChange} step="0.1" min="0" className={inp('potassium')} />{fieldErrors.potassium && errMsg}</div>
            <div><label className={labelCls}>Cloro (mEq/L)</label><input type="number" name="chloride" value={formData.chloride || ''} onChange={handleChange} step="0.1" min="0" className={inp('chloride')} />{fieldErrors.chloride && errMsg}</div>
          </div>
        )}
      </div>

      {/* V. Proteínas Séricas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('proteinas')}
          className="w-full flex justify-between items-center py-3 px-4 bg-green-50 hover:bg-green-100 text-left font-semibold text-green-800 transition-colors">
          <span>🧬 V. Proteínas Séricas {hasErr('proteinas') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.proteinas ? '▲' : '▼'}</span>
        </button>
        {expandedSections.proteinas && (
          <div className="p-4 grid grid-cols-3 gap-4">
            <div><label className={labelCls}>Proteína Total (g/dL)</label><input type="number" name="totalProteins" value={formData.totalProteins || ''} onChange={handleChange} step="0.1" min="0" className={inp('totalProteins')} />{fieldErrors.totalProteins && errMsg}</div>
            <div><label className={labelCls}>Albúmina (g/dL)</label><input type="number" name="albumin" value={formData.albumin || ''} onChange={handleChange} step="0.1" min="0" className={inp('albumin')} />{fieldErrors.albumin && errMsg}</div>
            <div><label className={labelCls}>Prealbúmina (mg/dL)</label><input type="number" name="prealbumin" value={formData.prealbumin || ''} onChange={handleChange} step="0.1" min="0" className={inp('prealbumin')} />{fieldErrors.prealbumin && errMsg}</div>
          </div>
        )}
      </div>

      {/* VI. Hemograma */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('hemograma')}
          className="w-full flex justify-between items-center py-3 px-4 bg-pink-50 hover:bg-pink-100 text-left font-semibold text-pink-800 transition-colors">
          <span>🔴 VI. Hemograma {hasErr('hemograma') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.hemograma ? '▲' : '▼'}</span>
        </button>
        {expandedSections.hemograma && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Hemoglobina (g/dL)</label><input type="number" name="hemoglobin" value={formData.hemoglobin || ''} onChange={handleChange} step="0.1" min="0" className={inp('hemoglobin')} />{fieldErrors.hemoglobin && errMsg}</div>
            <div><label className={labelCls}>Hematocrito (%)</label><input type="number" name="hematocrit" value={formData.hematocrit || ''} onChange={handleChange} step="0.1" min="0" className={inp('hematocrit')} />{fieldErrors.hematocrit && errMsg}</div>
            <div><label className={labelCls}>Glóbulos Blancos (x10³/μL)</label><input type="number" name="wbc" value={formData.wbc || ''} onChange={handleChange} step="0.1" min="0" className={inp('wbc')} />{fieldErrors.wbc && errMsg}</div>
            <div><label className={labelCls}>Plaquetas (x10³/μL)</label><input type="number" name="platelets" value={formData.platelets || ''} onChange={handleChange} step="0.1" min="0" className={inp('platelets')} />{fieldErrors.platelets && errMsg}</div>
          </div>
        )}
      </div>

      {/* VII. Micronutrientes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('micronutrientes')}
          className="w-full flex justify-between items-center py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-left font-semibold text-indigo-800 transition-colors">
          <span>💊 VII. Micronutrientes {hasErr('micronutrientes') && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.micronutrientes ? '▲' : '▼'}</span>
        </button>
        {expandedSections.micronutrientes && (
          <div className="p-4 grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Vitamina B12 (pg/mL)</label><input type="number" name="vitaminB12" value={formData.vitaminB12 || ''} onChange={handleChange} step="0.1" min="0" className={inp('vitaminB12')} />{fieldErrors.vitaminB12 && errMsg}</div>
            <div><label className={labelCls}>Vitamina D (ng/mL)</label><input type="number" name="vitaminD" value={formData.vitaminD || ''} onChange={handleChange} step="0.1" min="0" className={inp('vitaminD')} />{fieldErrors.vitaminD && errMsg}</div>
            <div><label className={labelCls}>Ácido Fólico (ng/mL)</label><input type="number" name="folacin" value={formData.folacin || ''} onChange={handleChange} step="0.1" min="0" className={inp('folacin')} />{fieldErrors.folacin && errMsg}</div>
            <div><label className={labelCls}>Hierro (μg/dL)</label><input type="number" name="iron" value={formData.iron || ''} onChange={handleChange} step="0.1" min="0" className={inp('iron')} />{fieldErrors.iron && errMsg}</div>
            <div><label className={labelCls}>Ferritina (ng/mL)</label><input type="number" name="ferritin" value={formData.ferritin || ''} onChange={handleChange} step="0.1" min="0" className={inp('ferritin')} />{fieldErrors.ferritin && errMsg}</div>
            <div><label className={labelCls}>Zinc (μg/dL)</label><input type="number" name="zinc" value={formData.zinc || ''} onChange={handleChange} step="0.1" min="0" className={inp('zinc')} />{fieldErrors.zinc && errMsg}</div>
            <div><label className={labelCls}>Calcio (mg/dL)</label><input type="number" name="calcium" value={formData.calcium || ''} onChange={handleChange} step="0.1" min="0" className={inp('calcium')} />{fieldErrors.calcium && errMsg}</div>
            <div><label className={labelCls}>Magnesio (mg/dL)</label><input type="number" name="magnesium" value={formData.magnesium || ''} onChange={handleChange} step="0.1" min="0" className={inp('magnesium')} />{fieldErrors.magnesium && errMsg}</div>
            <div><label className={labelCls}>Fósforo (mg/dL)</label><input type="number" name="phosphorus" value={formData.phosphorus || ''} onChange={handleChange} step="0.1" min="0" className={inp('phosphorus')} />{fieldErrors.phosphorus && errMsg}</div>
          </div>
        )}
      </div>

      {/* VIII. Otros */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('otros')}
          className="w-full flex justify-between items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 text-left font-semibold text-slate-700 transition-colors">
          <span>📋 VIII. Otros</span>
          <span className="text-lg">{expandedSections.otros ? '▲' : '▼'}</span>
        </button>
        {expandedSections.otros && (
          <div className="p-4 space-y-3">
            {extraFields.map((field, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" placeholder="Campo" value={field.label}
                  onChange={e => updateExtraField(i, 'label', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition" />
                <input type="text" placeholder="Valor" value={field.value}
                  onChange={e => updateExtraField(i, 'value', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition" />
                <button type="button" onClick={() => removeExtraField(i)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addExtraField}
              className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 text-sm rounded-lg transition-colors">
              + Agregar campo
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {loading ? 'Guardando...' : '✅ Guardar Datos Bioquímicos'}
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
