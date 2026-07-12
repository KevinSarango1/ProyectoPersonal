import React, { useState, useEffect } from 'react';
import { ClinicalHistory } from '../../../types/patient';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

interface ClinicalHistoryFormProps {
  onSubmit: (history: Partial<ClinicalHistory>) => Promise<void>;
  initialData?: Partial<ClinicalHistory>;
}

interface CustomField   { label: string; value: string; }
interface CustomSection { title: string; fields: CustomField[]; }

const inputCls    = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white transition';
const inputErrCls = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white transition';
const labelCls    = 'block text-xs font-medium text-gray-600 mb-1';
const errMsg      = <p className="text-xs text-red-500 mt-1">Completa este campo</p>;

const TODAY = new Date().toISOString().split('T')[0];

function parseObservations(obs?: string): CustomSection[] {
  if (!obs) return [];
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) {
      return parsed.map((s: any) => ({
        title: s.title || '',
        fields: Array.isArray(s.fields)
          ? s.fields
          : s.content ? [{ label: '', value: s.content }] : [],
      }));
    }
    return [{ title: 'Observaciones', fields: [{ label: '', value: obs }] }];
  } catch {
    return [{ title: 'Observaciones', fields: [{ label: '', value: obs }] }];
  }
}

export const ClinicalHistoryForm: React.FC<ClinicalHistoryFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || TODAY,
    medicalHistory:      initialData?.medicalHistory || '',
    surgicalHistory:     initialData?.surgicalHistory || '',
    familyHistory:       initialData?.familyHistory || '',
    currentComplaints:   initialData?.currentComplaints || '',
    pastDiseases:        initialData?.pastDiseases || '',
    dietaryHabits:       initialData?.dietaryHabits || '',
    physicalActivity:    initialData?.physicalActivity || '',
    alcoholConsumption:  initialData?.alcoholConsumption || '',
    tobaccoUse:          initialData?.tobaccoUse || '',
    medications:         initialData?.currentMedications?.join(', ') || '',
    allergies:           initialData?.allergies?.join(', ') || '',
    foodIntolerances:    initialData?.foodIntolerances?.join(', ') || '',
    nutritionalObjective: initialData?.nutritionalObjective || '',
    dietaryRestrictions:  initialData?.dietaryRestrictions || '',
  });

  const [customSections, setCustomSections] = useState<CustomSection[]>(
    () => parseObservations(initialData?.observations)
  );
  const [fieldErrors, setFieldErrors]     = useState<Record<string, boolean>>({});

  // Sincroniza cuando se guarda en el mismo paciente (initialData cambia sin cambio de key)
  useEffect(() => {
    setFormData({
      date: initialData?.date || TODAY,
      medicalHistory:      initialData?.medicalHistory || '',
      surgicalHistory:     initialData?.surgicalHistory || '',
      familyHistory:       initialData?.familyHistory || '',
      currentComplaints:   initialData?.currentComplaints || '',
      pastDiseases:        initialData?.pastDiseases || '',
      dietaryHabits:       initialData?.dietaryHabits || '',
      physicalActivity:    initialData?.physicalActivity || '',
      alcoholConsumption:  initialData?.alcoholConsumption || '',
      tobaccoUse:          initialData?.tobaccoUse || '',
      medications:         initialData?.currentMedications?.join(', ') || '',
      allergies:           initialData?.allergies?.join(', ') || '',
      foodIntolerances:    initialData?.foodIntolerances?.join(', ') || '',
      nutritionalObjective: initialData?.nutritionalObjective || '',
      dietaryRestrictions:  initialData?.dietaryRestrictions || '',
    });
    setCustomSections(parseObservations(initialData?.observations));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    antecedentes: false, motivo: false, habitos: false,
    medicamentos: false, objetivo: false, otros: false,
  });

  const addSection    = () => setCustomSections(prev => [...prev, { title: '', fields: [] }]);
  const removeSection = (i: number) => setCustomSections(prev => prev.filter((_, idx) => idx !== i));
  const updateSectionTitle = (i: number, val: string) =>
    setCustomSections(prev => prev.map((s, idx) => idx === i ? { ...s, title: val } : s));
  const addField = (si: number) =>
    setCustomSections(prev => prev.map((s, idx) => idx === si
      ? { ...s, fields: [...s.fields, { label: '', value: '' }] } : s));
  const removeField = (si: number, fi: number) =>
    setCustomSections(prev => prev.map((s, idx) => idx === si
      ? { ...s, fields: s.fields.filter((_, fidx) => fidx !== fi) } : s));
  const updateField = (si: number, fi: number, key: keyof CustomField, val: string) =>
    setCustomSections(prev => prev.map((s, idx) => idx === si
      ? { ...s, fields: s.fields.map((f, fidx) => fidx === fi ? { ...f, [key]: val } : f) } : s));

  const toggleSection = (section: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!formData.date?.trim())                 errors.date = true;
    if (!formData.medicalHistory?.trim())       errors.medicalHistory = true;
    if (!formData.surgicalHistory?.trim())      errors.surgicalHistory = true;
    if (!formData.familyHistory?.trim())        errors.familyHistory = true;
    if (!formData.pastDiseases?.trim())         errors.pastDiseases = true;
    if (!formData.currentComplaints?.trim())    errors.currentComplaints = true;
    if (!formData.dietaryHabits?.trim())        errors.dietaryHabits = true;
    if (!formData.physicalActivity?.trim())     errors.physicalActivity = true;
    if (!formData.alcoholConsumption?.trim())   errors.alcoholConsumption = true;
    if (!formData.tobaccoUse?.trim())           errors.tobaccoUse = true;
    if (!formData.medications?.trim())          errors.medications = true;
    if (!formData.allergies?.trim())            errors.allergies = true;
    if (!formData.foodIntolerances?.trim())     errors.foodIntolerances = true;
    if (!formData.nutritionalObjective?.trim()) errors.nutritionalObjective = true;
    if (!formData.dietaryRestrictions?.trim())  errors.dietaryRestrictions = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setExpandedSections(prev => ({
        ...prev,
        antecedentes: prev.antecedentes || !!(errors.medicalHistory || errors.surgicalHistory || errors.familyHistory || errors.pastDiseases),
        motivo:       prev.motivo       || !!errors.currentComplaints,
        habitos:      prev.habitos      || !!(errors.dietaryHabits || errors.physicalActivity || errors.alcoholConsumption || errors.tobaccoUse),
        medicamentos: prev.medicamentos || !!(errors.medications || errors.allergies || errors.foodIntolerances),
        objetivo:     prev.objetivo     || !!(errors.nutritionalObjective || errors.dietaryRestrictions),
      }));
      return;
    }
    setFieldErrors({});
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        date: formData.date,
        medicalHistory: formData.medicalHistory,
        surgicalHistory: formData.surgicalHistory,
        familyHistory: formData.familyHistory,
        currentComplaints: formData.currentComplaints,
        pastDiseases: formData.pastDiseases,
        dietaryHabits: formData.dietaryHabits,
        physicalActivity: formData.physicalActivity,
        alcoholConsumption: formData.alcoholConsumption,
        tobaccoUse: formData.tobaccoUse,
        currentMedications: formData.medications.split(',').map(m => m.trim()).filter(Boolean),
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(Boolean),
        foodIntolerances: formData.foodIntolerances.split(',').map(f => f.trim()).filter(Boolean),
        nutritionalObjective: formData.nutritionalObjective,
        dietaryRestrictions: formData.dietaryRestrictions,
        observations: customSections.length > 0 ? JSON.stringify(customSections) : undefined,
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const hasErr = (fields: string[]) => fields.some(f => fieldErrors[f]);
  const inp = (name: string) => fieldErrors[name] ? inputErrCls : inputCls;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Fecha de consulta */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="py-3 px-4 bg-slate-50 flex items-center gap-2">
          <span className="font-semibold text-slate-700 text-sm">📅 Fecha de Consulta</span>
          {initialData?.updatedAt && (
            <span className="ml-auto text-xs text-slate-400">
              Actualizado: {new Date(initialData.updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <div className="p-4">
          <input type="date" name="date" value={formData.date} onChange={handleChange}
            max={TODAY} required className={inp('date')} />
          {fieldErrors.date && errMsg}
        </div>
      </div>

      {/* I. ANTECEDENTES */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('antecedentes')}
          className="w-full flex justify-between items-center py-3 px-4 bg-blue-50 hover:bg-blue-100 text-left font-semibold text-blue-800 transition-colors">
          <span>🏥 I. ANTECEDENTES {hasErr(['medicalHistory','surgicalHistory','familyHistory','pastDiseases']) && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.antecedentes ? '▲' : '▼'}</span>
        </button>
        {expandedSections.antecedentes && (
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Antecedentes Médicos</label>
              <textarea name="medicalHistory" placeholder="Enfermedades crónicas, diabetes, hipertensión, etc." value={formData.medicalHistory} onChange={handleChange} rows={3} className={inp('medicalHistory')} />
              {fieldErrors.medicalHistory && errMsg}
            </div>
            <div>
              <label className={labelCls}>Antecedentes Quirúrgicos</label>
              <textarea name="surgicalHistory" placeholder="Cirugías realizadas y fechas" value={formData.surgicalHistory} onChange={handleChange} rows={2} className={inp('surgicalHistory')} />
              {fieldErrors.surgicalHistory && errMsg}
            </div>
            <div>
              <label className={labelCls}>Antecedentes Familiares</label>
              <textarea name="familyHistory" placeholder="Enfermedades en la familia (diabetes, obesidad, cardiopatía, etc.)" value={formData.familyHistory} onChange={handleChange} rows={2} className={inp('familyHistory')} />
              {fieldErrors.familyHistory && errMsg}
            </div>
            <div>
              <label className={labelCls}>Enfermedades Pasadas</label>
              <textarea name="pastDiseases" placeholder="Enfermedades previas ya superadas" value={formData.pastDiseases} onChange={handleChange} rows={2} className={inp('pastDiseases')} />
              {fieldErrors.pastDiseases && errMsg}
            </div>
          </div>
        )}
      </div>

      {/* II. MOTIVO DE CONSULTA */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('motivo')}
          className="w-full flex justify-between items-center py-3 px-4 bg-green-50 hover:bg-green-100 text-left font-semibold text-green-800 transition-colors">
          <span>🎯 II. MOTIVO DE CONSULTA {hasErr(['currentComplaints']) && <span className="ml-2 text-xs text-red-500 font-normal">● campo incompleto</span>}</span>
          <span className="text-lg">{expandedSections.motivo ? '▲' : '▼'}</span>
        </button>
        {expandedSections.motivo && (
          <div className="p-4">
            <label className={labelCls}>Razón principal de la consulta nutricional</label>
            <textarea name="currentComplaints" placeholder="Motivo por el que acude a la consulta nutricional" value={formData.currentComplaints} onChange={handleChange} rows={3} className={inp('currentComplaints')} />
            {fieldErrors.currentComplaints && errMsg}
          </div>
        )}
      </div>

      {/* III. HÁBITOS */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('habitos')}
          className="w-full flex justify-between items-center py-3 px-4 bg-yellow-50 hover:bg-yellow-100 text-left font-semibold text-yellow-800 transition-colors">
          <span>🥗 III. HÁBITOS {hasErr(['dietaryHabits','physicalActivity','alcoholConsumption','tobaccoUse']) && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.habitos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.habitos && (
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Hábitos Dietéticos</label>
              <textarea name="dietaryHabits" placeholder="Descripción de su alimentación actual, frecuencia de comidas, etc." value={formData.dietaryHabits} onChange={handleChange} rows={3} className={inp('dietaryHabits')} />
              {fieldErrors.dietaryHabits && errMsg}
            </div>
            <div>
              <label className={labelCls}>Actividad Física</label>
              <textarea name="physicalActivity" placeholder="Tipo, frecuencia y duración del ejercicio" value={formData.physicalActivity} onChange={handleChange} rows={2} className={inp('physicalActivity')} />
              {fieldErrors.physicalActivity && errMsg}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>🍷 Alcohol</label>
                <input type="text" name="alcoholConsumption" placeholder="Nunca / Ocasional / Frecuente" value={formData.alcoholConsumption} onChange={handleChange} className={inp('alcoholConsumption')} />
                {fieldErrors.alcoholConsumption && errMsg}
              </div>
              <div>
                <label className={labelCls}>🚭 Tabaco</label>
                <input type="text" name="tobaccoUse" placeholder="No fuma / Fuma / Ex-fumador" value={formData.tobaccoUse} onChange={handleChange} className={inp('tobaccoUse')} />
                {fieldErrors.tobaccoUse && errMsg}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IV. MEDICAMENTOS Y ALERGIAS */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('medicamentos')}
          className="w-full flex justify-between items-center py-3 px-4 bg-red-50 hover:bg-red-100 text-left font-semibold text-red-800 transition-colors">
          <span>💊 IV. MEDICAMENTOS Y ALERGIAS {hasErr(['medications','allergies','foodIntolerances']) && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.medicamentos ? '▲' : '▼'}</span>
        </button>
        {expandedSections.medicamentos && (
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>💉 Medicamentos Actuales</label>
              <textarea name="medications" placeholder="Nombre del fármaco, dosis, frecuencia (separados por comas)" value={formData.medications} onChange={handleChange} rows={2} className={inp('medications')} />
              {fieldErrors.medications && errMsg}
            </div>
            <div>
              <label className={labelCls}>⚠️ Alergias Medicamentosas</label>
              <input type="text" name="allergies" placeholder="Alergias a medicamentos (separadas por comas)" value={formData.allergies} onChange={handleChange} className={inp('allergies')} />
              {fieldErrors.allergies && errMsg}
            </div>
            <div>
              <label className={labelCls}>🍽️ Intolerancias Alimentarias</label>
              <input type="text" name="foodIntolerances" placeholder="Alimentos que no tolera (lactosa, gluten, etc.)" value={formData.foodIntolerances} onChange={handleChange} className={inp('foodIntolerances')} />
              {fieldErrors.foodIntolerances && errMsg}
            </div>
          </div>
        )}
      </div>

      {/* V. OBJETIVO NUTRICIONAL */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('objetivo')}
          className="w-full flex justify-between items-center py-3 px-4 bg-purple-50 hover:bg-purple-100 text-left font-semibold text-purple-800 transition-colors">
          <span>🎯 V. OBJETIVO NUTRICIONAL {hasErr(['nutritionalObjective','dietaryRestrictions']) && <span className="ml-2 text-xs text-red-500 font-normal">● campos incompletos</span>}</span>
          <span className="text-lg">{expandedSections.objetivo ? '▲' : '▼'}</span>
        </button>
        {expandedSections.objetivo && (
          <div className="p-4 space-y-4">
            <div>
              <label className={labelCls}>Objetivo Principal</label>
              <textarea name="nutritionalObjective" placeholder="¿Qué espera lograr con la asesoría nutricional?" value={formData.nutritionalObjective} onChange={handleChange} rows={2} className={inp('nutritionalObjective')} />
              {fieldErrors.nutritionalObjective && errMsg}
            </div>
            <div>
              <label className={labelCls}>🚫 Restricciones Dietéticas</label>
              <textarea name="dietaryRestrictions" placeholder="Razones religiosas, culturales, preferencias personales, etc." value={formData.dietaryRestrictions} onChange={handleChange} rows={2} className={inp('dietaryRestrictions')} />
              {fieldErrors.dietaryRestrictions && errMsg}
            </div>
          </div>
        )}
      </div>

      {/* VI. OTROS / OBSERVACIONES */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => toggleSection('otros')}
          className="w-full flex justify-between items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 text-left font-semibold text-slate-700 transition-colors">
          <span>📝 VI. OTROS / OBSERVACIONES</span>
          <span className="text-lg">{expandedSections.otros ? '▲' : '▼'}</span>
        </button>
        {expandedSections.otros && (
          <div className="p-4 space-y-3">
            {customSections.map((sec, si) => (
              <div key={si} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2.5 border-b border-slate-200">
                  <input type="text" value={sec.title} placeholder="Título de la sección"
                    onChange={e => updateSectionTitle(si, e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 placeholder-slate-400 focus:outline-none" />
                  <button type="button" onClick={() => removeSection(si)}
                    className="text-slate-400 hover:text-red-500 transition-colors text-xl leading-none px-1">×</button>
                </div>
                <div className="p-3 space-y-2">
                  {sec.fields.map((field, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input type="text" value={field.label} placeholder="Campo"
                        onChange={e => updateField(si, fi, 'label', e.target.value)}
                        className="w-1/3 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent transition" />
                      <input type="text" value={field.value} placeholder="Valor"
                        onChange={e => updateField(si, fi, 'value', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-teal-400 focus:border-transparent transition" />
                      <button type="button" onClick={() => removeField(si, fi)}
                        className="text-slate-300 hover:text-red-400 transition-colors text-xl leading-none shrink-0">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addField(si)}
                    className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-semibold transition-colors mt-1">
                    <span className="text-base leading-none font-bold">+</span> Agregar campo
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSection}
              className="w-full border-2 border-dashed border-slate-300 hover:border-teal-400 text-slate-400 hover:text-teal-600 rounded-xl py-2.5 text-sm font-medium transition-colors">
              + Agregar nueva sección
            </button>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
        {loading ? 'Guardando...' : '✅ Guardar Historia Clínica'}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Estás seguro/a?"
        message="¿Deseas guardar los datos de la historia clínica?"
        confirmText="Guardar"
        cancelText="Cancelar"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </form>
  );
};
