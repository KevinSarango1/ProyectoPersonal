import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

interface DietaryHabits {
  recordDate: string;
  breakfast: string;
  morningSnack: string;
  lunch: string;
  afternoonSnack: string;
  dinner: string;
  waterIntake: string;
  mealsPerDay: string;
  eatingOutFrequency: string;
  foodPreferences: string;
  foodAversions: string;
  cookingMethods: string;
  mealEnvironment: string;
  observations: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const EMPTY: DietaryHabits = {
  recordDate: TODAY,
  breakfast: '', morningSnack: '', lunch: '', afternoonSnack: '', dinner: '',
  waterIntake: '', mealsPerDay: '', eatingOutFrequency: '',
  foodPreferences: '', foodAversions: '', cookingMethods: '',
  mealEnvironment: '', observations: '',
};

const inputCls    = 'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none';
const inputErrCls = 'w-full bg-white border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition resize-none';
const labelCls    = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5';
const errMsg      = <p className="text-xs text-red-500 mt-1">Completa este campo</p>;

interface Props {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const DietaryHabitsForm: React.FC<Props> = ({ initialData, onSubmit }) => {
  const [form, setForm]               = useState<DietaryHabits>(EMPTY);
  const [loading, setLoading]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        recordDate:          initialData.recordDate || TODAY,
        breakfast:           initialData.breakfast || '',
        morningSnack:        initialData.morningSnack || '',
        lunch:               initialData.lunch || '',
        afternoonSnack:      initialData.afternoonSnack || '',
        dinner:              initialData.dinner || '',
        waterIntake:         initialData.waterIntake != null ? String(initialData.waterIntake) : '',
        mealsPerDay:         initialData.mealsPerDay != null ? String(initialData.mealsPerDay) : '',
        eatingOutFrequency:  initialData.eatingOutFrequency || '',
        foodPreferences:     initialData.foodPreferences || '',
        foodAversions:       initialData.foodAversions || '',
        cookingMethods:      initialData.cookingMethods || '',
        mealEnvironment:     initialData.mealEnvironment || '',
        observations:        initialData.observations || '',
      });
    }
  }, [initialData]);

  const set = (field: keyof DietaryHabits) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const inp = (name: string) => fieldErrors[name] ? inputErrCls : inputCls;

  const handleSave = () => {
    const errors: Record<string, boolean> = {};
    if (!form.recordDate)        errors.recordDate = true;
    if (!form.breakfast.trim())  errors.breakfast  = true;
    if (!form.lunch.trim())      errors.lunch      = true;
    if (!form.dinner.trim())     errors.dinner     = true;
    if (!form.mealsPerDay)       errors.mealsPerDay = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        waterIntake: form.waterIntake ? parseFloat(form.waterIntake) : null,
        mealsPerDay: form.mealsPerDay ? parseInt(form.mealsPerDay)   : null,
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Fecha */}
      <div className="max-w-xs">
        <label className={labelCls}>Fecha de Registro *</label>
        <input type="date" max={TODAY} className={inp('recordDate')}
          value={form.recordDate} onChange={set('recordDate')} />
        {fieldErrors.recordDate && errMsg}
      </div>

      {/* Comidas del día */}
      <div>
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">🍽</span>
          Hábito Alimentario Diario
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Desayuno habitual *</label>
            <textarea className={inp('breakfast')} rows={2} value={form.breakfast}
              onChange={set('breakfast')} placeholder="Ej: Pan integral, huevo revuelto, jugo de naranja" />
            {fieldErrors.breakfast && errMsg}
          </div>
          <div>
            <label className={labelCls}>Colación mañana</label>
            <textarea className={inputCls} rows={2} value={form.morningSnack}
              onChange={set('morningSnack')} placeholder="Ej: Fruta, yogur" />
          </div>
          <div>
            <label className={labelCls}>Almuerzo habitual *</label>
            <textarea className={inp('lunch')} rows={2} value={form.lunch}
              onChange={set('lunch')} placeholder="Ej: Arroz, pollo asado, ensalada, sopa" />
            {fieldErrors.lunch && errMsg}
          </div>
          <div>
            <label className={labelCls}>Colación tarde</label>
            <textarea className={inputCls} rows={2} value={form.afternoonSnack}
              onChange={set('afternoonSnack')} placeholder="Ej: Galletas, fruta, café" />
          </div>
          <div>
            <label className={labelCls}>Cena habitual *</label>
            <textarea className={inp('dinner')} rows={2} value={form.dinner}
              onChange={set('dinner')} placeholder="Ej: Sopa, pan, infusión" />
            {fieldErrors.dinner && errMsg}
          </div>
        </div>
      </div>

      {/* Datos cuantitativos */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Datos Generales</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Agua / día (L)</label>
            <input type="number" className={inputCls} min="0" max="10" step="0.5"
              value={form.waterIntake} onChange={set('waterIntake')} placeholder="Ej: 2" />
          </div>
          <div>
            <label className={labelCls}>N.° comidas / día *</label>
            <input type="number" className={inp('mealsPerDay')} min="1" max="8"
              value={form.mealsPerDay} onChange={set('mealsPerDay')} placeholder="Ej: 5" />
            {fieldErrors.mealsPerDay && errMsg}
          </div>
          <div>
            <label className={labelCls}>Come fuera de casa</label>
            <select className={inputCls} value={form.eatingOutFrequency} onChange={set('eatingOutFrequency')}>
              <option value="">Seleccionar</option>
              <option value="Nunca">Nunca</option>
              <option value="1-2 veces/semana">1-2 veces/semana</option>
              <option value="3-4 veces/semana">3-4 veces/semana</option>
              <option value="Todos los días">Todos los días</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Ambiente de comida</label>
            <select className={inputCls} value={form.mealEnvironment} onChange={set('mealEnvironment')}>
              <option value="">Seleccionar</option>
              <option value="En casa">En casa</option>
              <option value="Trabajo/Universidad">Trabajo/Universidad</option>
              <option value="Restaurante">Restaurante</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Preferencias y Restricciones</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Alimentos preferidos</label>
            <textarea className={inputCls} rows={2} value={form.foodPreferences}
              onChange={set('foodPreferences')} placeholder="Ej: Pollo, arroz, frutas tropicales" />
          </div>
          <div>
            <label className={labelCls}>Alimentos que rechaza / no tolera</label>
            <textarea className={inputCls} rows={2} value={form.foodAversions}
              onChange={set('foodAversions')} placeholder="Ej: Mariscos, leche entera, brócoli" />
          </div>
          <div>
            <label className={labelCls}>Métodos de cocción preferidos</label>
            <textarea className={inputCls} rows={2} value={form.cookingMethods}
              onChange={set('cookingMethods')} placeholder="Ej: Al vapor, a la plancha, hervido" />
          </div>
          <div>
            <label className={labelCls}>Observaciones adicionales</label>
            <textarea className={inputCls} rows={2} value={form.observations}
              onChange={set('observations')} placeholder="Ej: Ayuna en las mañanas, come tarde por trabajo..." />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full md:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Guardando...' : 'Guardar Hábitos Dietéticos'}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Guardar Hábitos Dietéticos"
        message="¿Confirmar el registro de los hábitos dietéticos del paciente?"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default DietaryHabitsForm;
