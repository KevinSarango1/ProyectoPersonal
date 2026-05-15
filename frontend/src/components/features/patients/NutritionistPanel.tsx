import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { patientService } from '../../../services/patientService';
import { useFoods } from '../../../hooks/useFoods';
import { Patient, PatientForm, Anthropometry, Food } from '../../../types/patient';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { SuccessAlert } from '../../ui/SuccessAlert';
import { ClinicalGauge } from '../../ui/ClinicalGauge';
import { ClinicalHistoryForm } from '../clinical/ClinicalHistoryForm';
import { BiometricsForm } from '../biometrics/BiometricsForm';
import { AnthropometryForm } from '../anthropometry/AnthropometryForm';
import { classifyBMI, classifyWHR, getAge, formatGender, type Gender } from '../../../utils/nutritionCalculations';
import { aiService } from '../../../services/aiService';

type AiMessage = { role: 'user' | 'ai'; text: string };

type MainView = 'patients' | 'foods';
type Tab = 'historia' | 'biometria' | 'antropometria';

const EMPTY_PATIENT: PatientForm = {
  firstName: '', lastName: '', email: '', password: '',
  phone: '', dateOfBirth: '', gender: 'M', address: '', occupation: '',
};
const EMPTY_FOOD = {
  name: '', description: '', grossWeight: '', netWeight: '',
  energyKcal: '', protein: '', fats: '', carbohydrates: '', fiber: '',
};

// ─── Small shared styles ──────────────────────────────────────────────────────
const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition';
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5';
const errCls   = 'text-xs text-red-600 mt-1';

// ─── AnthroRow (history table) ────────────────────────────────────────────────
const AnthroRow: React.FC<{ record: Anthropometry; gender: Gender }> = ({ record, gender }) => {
  const bmi = classifyBMI(record.bmi);
  const whr = record.waistHipRatio ? classifyWHR(record.waistHipRatio, gender) : null;
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-2.5 px-4 text-sm text-slate-500 tabular-nums">{record.measurementDate}</td>
      <td className="py-2.5 px-4 text-sm font-medium text-slate-700 tabular-nums">{record.weight} kg</td>
      <td className="py-2.5 px-4 text-sm text-slate-600 tabular-nums">{record.height} cm</td>
      <td className="py-2.5 px-4">
        <span className="text-sm font-bold tabular-nums text-slate-900">{record.bmi.toFixed(1)}</span>
        <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${bmi.bgClass} ${bmi.colorClass}`}>{bmi.label}</span>
      </td>
      <td className="py-2.5 px-4">
        {record.waistHipRatio && whr
          ? <>
              <span className="text-sm font-bold tabular-nums text-slate-900">{record.waistHipRatio.toFixed(2)}</span>
              <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${whr.bgClass} ${whr.colorClass}`}>{whr.label}</span>
            </>
          : <span className="text-slate-300 text-sm">—</span>}
      </td>
      <td className="py-2.5 px-4 text-sm text-slate-500 tabular-nums">
        {record.bodyFatPercentage != null ? `${record.bodyFatPercentage}%` : '—'}
      </td>
    </tr>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const NutritionistPanel: React.FC = () => {
  const { user, logout } = useAuth();

  const [mainView, setMainView] = useState<MainView>('patients');

  // Patients
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [selected, setSelected]   = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('historia');
  const [search, setSearch]       = useState('');
  const [loadingPts, setLoadingPts] = useState(true);

  const [showPatientForm, setShowPatientForm]         = useState(false);
  const [editingPatientId, setEditingPatientId]       = useState<string | null>(null);
  const [patientForm, setPatientForm]                 = useState<PatientForm>(EMPTY_PATIENT);
  const [patientErrors, setPatientErrors]             = useState<Record<string, string>>({});
  const [patientFormLoading, setPatientFormLoading]   = useState(false);
  const [deletePatient, setDeletePatient]             = useState<{ open: boolean; patient: Patient | null }>({ open: false, patient: null });

  // Foods
  const { foods, loading: loadingFoods, fetchAll: fetchFoods, create: createFood, update: updateFood, remove: removeFood } = useFoods();
  const [foodSearch, setFoodSearch]           = useState('');
  const [showFoodForm, setShowFoodForm]       = useState(false);
  const [editingFoodId, setEditingFoodId]     = useState<string | null>(null);
  const [foodForm, setFoodForm]               = useState(EMPTY_FOOD);
  const [foodErrors, setFoodErrors]           = useState<Record<string, string>>({});
  const [foodFormLoading, setFoodFormLoading] = useState(false);
  const [deleteFood, setDeleteFood]           = useState<{ open: boolean; food: Food | null }>({ open: false, food: null });

  // AI panel
  const [aiOpen, setAiOpen]       = useState(false);
  const [aiInput, setAiInput]     = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'ai', text: 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones nutricionales, analizar alimentos y sugerir planes alimenticios personalizados.' },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Shared
  const [successAlert, setSuccessAlert] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const showSuccess = (msg: string) => setSuccessAlert({ isOpen: true, message: msg });

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setLoadingPts(true);
    try { setPatients(await patientService.getAll()); }
    finally { setLoadingPts(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);
  useEffect(() => { if (mainView === 'foods') fetchFoods(); }, [mainView, fetchFoods]);

  const selectPatient = async (id: string) => {
    setSelected(await patientService.getById(id));
    setActiveTab('historia');
    setShowPatientForm(false);
  };

  const reloadSelected = async () => {
    if (selected) setSelected(await patientService.getById(selected.id));
  };

  // ── Patient CRUD ──────────────────────────────────────────────────────────
  const openCreatePatient = () => { setEditingPatientId(null); setPatientForm(EMPTY_PATIENT); setPatientErrors({}); setShowPatientForm(true); setSelected(null); };
  const openEditPatient   = (p: Patient) => {
    setEditingPatientId(p.id);
    setPatientForm({ firstName: p.firstName, lastName: p.lastName, email: p.email, password: '', phone: p.phone || '', dateOfBirth: p.dateOfBirth, gender: p.gender, address: p.address || '', occupation: p.occupation || '' });
    setPatientErrors({});
    setShowPatientForm(true);
  };

  const validatePatient = () => {
    const e: Record<string, string> = {};
    if (!patientForm.firstName.trim()) e.firstName = 'Requerido';
    if (!patientForm.lastName.trim())  e.lastName  = 'Requerido';
    if (!patientForm.email.trim())     e.email     = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientForm.email)) e.email = 'Email inválido';
    if (!editingPatientId && !patientForm.password.trim()) e.password = 'Requerido';
    if (!patientForm.dateOfBirth) e.dateOfBirth = 'Requerido';
    if (patientForm.phone && !/^09\d{8}$/.test(patientForm.phone)) e.phone = 'Formato: 09XXXXXXXX';
    setPatientErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSavePatient = async () => {
    if (!validatePatient()) return;
    setPatientFormLoading(true);
    try {
      if (editingPatientId) {
        await patientService.update(editingPatientId, patientForm);
        showSuccess('Paciente actualizado');
        if (selected?.id === editingPatientId) await reloadSelected();
      } else {
        await patientService.create(patientForm);
        showSuccess('Paciente registrado');
      }
      await loadPatients();
      setShowPatientForm(false);
    } catch (err: any) {
      setPatientErrors({ email: err?.response?.data?.message || 'Error al guardar' });
    } finally {
      setPatientFormLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!deletePatient.patient) return;
    await patientService.delete(deletePatient.patient.id);
    if (selected?.id === deletePatient.patient.id) setSelected(null);
    await loadPatients();
    setDeletePatient({ open: false, patient: null });
    showSuccess('Paciente eliminado');
  };

  // ── Clinical data ─────────────────────────────────────────────────────────
  const handleSaveClinicalHistory = async (data: any) => { await patientService.updateClinicalHistory(selected!.id, data); await reloadSelected(); showSuccess('Historia clínica guardada'); };
  const handleAddBiometrics       = async (data: any) => { await patientService.addBiometrics(selected!.id, data);       await reloadSelected(); showSuccess('Biometría registrada'); };
  const handleAddAnthropometry    = async (data: any) => { await patientService.addAnthropometry(selected!.id, data);    await reloadSelected(); showSuccess('Medición registrada'); };

  // ── Food CRUD ─────────────────────────────────────────────────────────────
  const openCreateFood = () => { setEditingFoodId(null); setFoodForm(EMPTY_FOOD); setFoodErrors({}); setShowFoodForm(true); };
  const openEditFood   = (f: Food) => {
    setEditingFoodId(f.id);
    setFoodForm({ name: f.name, description: f.description || '', grossWeight: String(f.grossWeight), netWeight: String(f.netWeight), energyKcal: String(f.energyKcal), protein: String(f.protein), fats: String(f.fats), carbohydrates: String(f.carbohydrates), fiber: String(f.fiber) });
    setFoodErrors({});
    setShowFoodForm(true);
  };

  const validateFood = () => {
    const e: Record<string, string> = {};
    if (!foodForm.name.trim()) e.name = 'Requerido';
    if (!foodForm.energyKcal || isNaN(Number(foodForm.energyKcal))) e.energyKcal = 'Número requerido';
    if (!foodForm.netWeight   || isNaN(Number(foodForm.netWeight)))  e.netWeight  = 'Número requerido';
    setFoodErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveFood = async () => {
    if (!validateFood()) return;
    setFoodFormLoading(true);
    const kcal = parseFloat(foodForm.energyKcal) || 0;
    const payload = {
      name: foodForm.name.trim(), description: foodForm.description.trim() || undefined,
      grossWeight: parseFloat(foodForm.grossWeight) || parseFloat(foodForm.netWeight) || 0,
      netWeight: parseFloat(foodForm.netWeight) || 0, energyKcal: kcal,
      energyKj: Math.round(kcal * 4.184 * 10) / 10,
      protein: parseFloat(foodForm.protein) || 0, fats: parseFloat(foodForm.fats) || 0,
      carbohydrates: parseFloat(foodForm.carbohydrates) || 0, fiber: parseFloat(foodForm.fiber) || 0,
    };
    try {
      editingFoodId ? await updateFood(editingFoodId, payload) : await createFood(payload);
      showSuccess(editingFoodId ? 'Alimento actualizado' : 'Alimento registrado');
      setShowFoodForm(false);
    } catch (err: any) {
      setFoodErrors({ name: err?.response?.data?.message || 'Error al guardar' });
    } finally { setFoodFormLoading(false); }
  };

  const handleDeleteFood = async () => {
    if (!deleteFood.food) return;
    await removeFood(deleteFood.food.id);
    setDeleteFood({ open: false, food: null });
    showSuccess('Alimento eliminado');
  };

  // ── AI chat ───────────────────────────────────────────────────────────────
  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: 'user', text }]);
    setAiInput('');
    setAiLoading(true);
    try {
      const { reply } = await aiService.chat(text);
      setAiMessages(prev => [...prev, { role: 'ai', text: reply ?? 'Sin respuesta.' }]);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || '';
      const msg = status === 429
        ? 'Cuota de OpenAI agotada. Agrega créditos en platform.openai.com/settings/billing.'
        : status === 401
        ? 'API key de OpenAI inválida. Verifica la variable OPENAI_API_KEY en el backend.'
        : serverMsg || 'Error al conectar con la IA. Verifica que el servidor esté corriendo.';
      setAiMessages(prev => [...prev, { role: 'ai', text: msg }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const latestAnthro    = selected?.anthropometry?.[0];
  const filteredPatients = patients.filter(p => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase()));
  const filteredFoods    = foods.filter(f => `${f.name} ${f.description || ''}`.toLowerCase().includes(foodSearch.toLowerCase()));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50" style={{ paddingBottom: aiOpen ? 320 : 48 }}>
      <SuccessAlert isOpen={successAlert.isOpen} title="Listo" message={successAlert.message} onClose={() => setSuccessAlert({ isOpen: false, message: '' })} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 px-5 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg style={{ width: 15, height: 15 }} className="text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight tracking-tight">NutriApp</p>
              <p className="text-slate-500 text-[10px]">{user?.fullName}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex gap-0.5 bg-slate-800 rounded-lg p-1">
            {([
              { key: 'patients', label: 'Pacientes' },
              { key: 'foods',    label: 'Alimentos' },
            ] as { key: MainView; label: string }[]).map(v => (
              <button
                key={v.key}
                onClick={() => { setMainView(v.key); setSelected(null); setShowPatientForm(false); }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${mainView === v.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {v.label}
              </button>
            ))}
          </nav>
        </div>

        <button onClick={logout} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
          Salir
        </button>
      </header>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PATIENTS VIEW                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {mainView === 'patients' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar — same bg as content, separated by border only */}
          <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-slate-200 space-y-2">
              <button
                onClick={openCreatePatient}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                + Nuevo Paciente
              </button>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingPts ? (
                <p className="p-4 text-xs text-slate-400">Cargando...</p>
              ) : filteredPatients.length === 0 ? (
                <p className="p-4 text-xs text-slate-400">Sin pacientes</p>
              ) : filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors ${selected?.id === p.id
                    ? 'bg-white border-l-2 border-l-emerald-600 pl-3.5'
                    : 'hover:bg-white pl-4'}`}
                >
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{p.firstName} {p.lastName}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{getAge(p.dateOfBirth)} años · {formatGender(p.gender as Gender)}</p>
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">

            {/* Patient form */}
            {showPatientForm && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-base font-bold text-slate-900">{editingPatientId ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
                  <button onClick={() => setShowPatientForm(false)} className="text-slate-300 hover:text-slate-600 text-xl leading-none transition-colors">×</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { field: 'firstName', label: 'Nombre *', type: 'text', ph: 'Juan' },
                    { field: 'lastName',  label: 'Apellido *', type: 'text', ph: 'Pérez' },
                    { field: 'email',     label: 'Email *', type: 'email', ph: 'juan@email.com' },
                    { field: 'password',  label: editingPatientId ? 'Nueva contraseña (vacío = mantener)' : 'Contraseña *', type: 'password', ph: '••••••' },
                    { field: 'dateOfBirth', label: 'Fecha de Nacimiento *', type: 'date', ph: '' },
                    { field: 'phone',     label: 'Teléfono', type: 'tel', ph: '09XXXXXXXX' },
                    { field: 'occupation', label: 'Ocupación', type: 'text', ph: 'Profesión' },
                  ].map(({ field, label, type, ph }) => (
                    <div key={field}>
                      <label className={labelCls}>{label}</label>
                      <input className={inputCls} type={type} value={(patientForm as any)[field]}
                        onChange={e => setPatientForm(p => ({ ...p, [field]: e.target.value }))} placeholder={ph} />
                      {patientErrors[field] && <p className={errCls}>{patientErrors[field]}</p>}
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}>Género *</label>
                    <select className={inputCls} value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value as any }))}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Dirección</label>
                    <input className={inputCls} value={patientForm.address} onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))} placeholder="Dirección completa" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSavePatient} disabled={patientFormLoading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                    {patientFormLoading ? 'Guardando...' : editingPatientId ? 'Actualizar' : 'Registrar Paciente'}
                  </button>
                  <button onClick={() => setShowPatientForm(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!selected && !showPatientForm && (
              <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-600">Selecciona un paciente</h2>
                <p className="text-slate-400 text-sm mt-1">Elige un paciente de la lista para ver su ficha clínica</p>
              </div>
            )}

            {/* Patient detail */}
            {selected && !showPatientForm && (
              <div className="space-y-4">

                {/* Back button */}
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-medium transition-colors group"
                >
                  <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Volver a pacientes
                </button>

                {/* Patient header card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex flex-wrap gap-6 justify-between">

                    {/* Info */}
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 leading-tight">{selected.firstName} {selected.lastName}</h2>
                      <p className="text-slate-500 text-sm mt-0.5">
                        {getAge(selected.dateOfBirth)} años · {formatGender(selected.gender as Gender)} · {selected.email}
                      </p>
                      {selected.occupation && <p className="text-slate-400 text-xs mt-0.5">{selected.occupation}</p>}
                      {latestAnthro && (
                        <p className="text-slate-300 text-xs mt-1.5">
                          Última medición: {latestAnthro.measurementDate} — {latestAnthro.weight} kg / {latestAnthro.height} cm
                        </p>
                      )}
                    </div>

                    {/* Clinical gauges — the signature element */}
                    <div className="flex gap-8 flex-wrap">
                      <ClinicalGauge
                        type="bmi"
                        value={latestAnthro?.bmi ?? 0}
                      />
                      <ClinicalGauge
                        type="whr"
                        value={latestAnthro?.waistHipRatio ?? 0}
                        gender={selected.gender as Gender}
                      />
                      {latestAnthro?.bodyFatPercentage != null && (
                        <div style={{ minWidth: 90 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>% Grasa</p>
                          <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{latestAnthro.bodyFatPercentage}<span style={{ fontSize: 14, color: '#94a3b8', marginLeft: 2 }}>%</span></p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 items-start self-start ml-auto">
                      <button onClick={() => openEditPatient(selected)}
                        className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => setDeletePatient({ open: true, patient: selected })}
                        className="px-3.5 py-1.5 text-xs font-semibold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-slate-100">
                    {([
                      { key: 'historia',      label: 'Historia Clínica' },
                      { key: 'biometria',     label: 'Biometría' },
                      { key: 'antropometria', label: 'Antropometría' },
                    ] as { key: Tab; label: string }[]).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
                          activeTab === tab.key
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === 'historia' && (
                      <ClinicalHistoryForm onSubmit={handleSaveClinicalHistory} initialData={selected.clinicalHistory} />
                    )}

                    {activeTab === 'biometria' && (
                      <div className="space-y-6">
                        <BiometricsForm onSubmit={handleAddBiometrics} />
                        {selected.biometrics && selected.biometrics.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Historial</p>
                            <div className="overflow-x-auto border border-slate-100 rounded-lg">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Fecha', 'Glucosa', 'HbA1c', 'Colesterol', 'Triglicéridos'].map(h => (
                                      <th key={h} className="py-2.5 px-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {selected.biometrics.map(b => (
                                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-2.5 px-4 text-slate-500 tabular-nums text-sm">{b.testDate}</td>
                                      <td className="py-2.5 px-4 text-slate-700 tabular-nums text-sm">{b.glucose ?? '—'}</td>
                                      <td className="py-2.5 px-4 text-slate-700 tabular-nums text-sm">{b.hba1c ?? '—'}</td>
                                      <td className="py-2.5 px-4 text-slate-700 tabular-nums text-sm">{b.totalCholesterol ?? '—'}</td>
                                      <td className="py-2.5 px-4 text-slate-700 tabular-nums text-sm">{b.triglycerides ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'antropometria' && (
                      <div className="space-y-6">
                        <AnthropometryForm onSubmit={handleAddAnthropometry} gender={selected.gender as Gender} />
                        {selected.anthropometry && selected.anthropometry.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Historial</p>
                            <div className="overflow-x-auto border border-slate-100 rounded-lg">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Fecha', 'Peso', 'Talla', 'IMC', 'ICC', '% Grasa'].map(h => (
                                      <th key={h} className="py-2.5 px-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {selected.anthropometry.map(a => <AnthroRow key={a.id} record={a} gender={selected.gender as Gender} />)}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </main>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* FOODS VIEW                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {mainView === 'foods' && (
        <div className="flex-1 p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Base de Datos de Alimentos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Sistema SMAE — Equivalentes nutricionales</p>
            </div>
            <div className="flex gap-2 items-center">
              <input type="text" value={foodSearch} onChange={e => setFoodSearch(e.target.value)} placeholder="Buscar alimento..."
                className="bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52" />
              <button onClick={openCreateFood} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                + Nuevo Alimento
              </button>
            </div>
          </div>

          {/* Food form */}
          {showFoodForm && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">{editingFoodId ? 'Editar Alimento' : 'Nuevo Alimento'}</h3>
                <button onClick={() => setShowFoodForm(false)} className="text-slate-300 hover:text-slate-600 text-xl transition-colors">×</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input className={inputCls} value={foodForm.name} onChange={e => setFoodForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Arroz cocido" />
                  {foodErrors.name && <p className={errCls}>{foodErrors.name}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Grupo SMAE</label>
                  <input className={inputCls} value={foodForm.description} onChange={e => setFoodForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Cereales, Aceites S/P, Lácteos..." />
                </div>
                {[
                  { field: 'grossWeight',   label: 'Peso bruto (g)',   ph: '0' },
                  { field: 'netWeight',     label: 'Peso neto (g) *',  ph: '0' },
                  { field: 'energyKcal',    label: 'Energía (Kcal) *', ph: '0' },
                  { field: 'protein',       label: 'Proteína (g)',     ph: '0' },
                  { field: 'fats',          label: 'Lípidos (g)',      ph: '0' },
                  { field: 'carbohydrates', label: 'HCO (g)',          ph: '0' },
                  { field: 'fiber',         label: 'Fibra (g)',        ph: '0' },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" className={inputCls} value={(foodForm as any)[field]}
                      onChange={e => setFoodForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph} min="0" step="0.1" />
                    {foodErrors[field] && <p className={errCls}>{foodErrors[field]}</p>}
                  </div>
                ))}
                <div className="flex items-end pb-1">
                  <p className="text-xs text-slate-400">kJ = Kcal × 4.184<br />(calculado al guardar)</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSaveFood} disabled={foodFormLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {foodFormLoading ? 'Guardando...' : editingFoodId ? 'Actualizar' : 'Registrar Alimento'}
                </button>
                <button onClick={() => setShowFoodForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {/* SMAE table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-700 text-white text-xs">
                    {[
                      { label: 'ALIMENTO',        cls: 'text-left min-w-[200px] px-4 py-3' },
                      { label: 'Peso neto (g)',    cls: 'text-right min-w-[90px] px-3 py-3' },
                      { label: 'Kcal',            cls: 'text-right min-w-[70px] px-3 py-3' },
                      { label: 'kJ',              cls: 'text-right min-w-[70px] px-3 py-3' },
                      { label: 'Prot (g)',         cls: 'text-right min-w-[75px] px-3 py-3' },
                      { label: 'Líp (g)',          cls: 'text-right min-w-[70px] px-3 py-3' },
                      { label: 'HCO (g)',          cls: 'text-right min-w-[75px] px-3 py-3' },
                      { label: 'Fibra (g)',        cls: 'text-right min-w-[75px] px-3 py-3' },
                    ].map(h => <th key={h.label} className={h.cls}>{h.label}</th>)}
                    <th className="text-left min-w-[120px] px-3 py-3 bg-yellow-600">GRUPO</th>
                    <th className="text-center min-w-[90px] px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFoods ? (
                    <tr><td colSpan={10} className="py-10 text-center text-slate-400 text-sm">Cargando alimentos...</td></tr>
                  ) : filteredFoods.length === 0 ? (
                    <tr><td colSpan={10} className="py-14 text-center">
                      <p className="text-slate-400 text-sm font-medium">No hay alimentos registrados</p>
                      <p className="text-slate-300 text-xs mt-1">Haz clic en "+ Nuevo Alimento" para comenzar</p>
                    </td></tr>
                  ) : filteredFoods.map((f, i) => (
                    <tr key={f.id} className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="py-2.5 px-4 font-medium text-slate-800 text-sm">{f.name}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.netWeight}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums text-sm">{f.energyKcal}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums text-sm">{f.energyKj}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.protein}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.fats}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.carbohydrates}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.fiber}</td>
                      <td className="py-2.5 px-3 bg-yellow-50">
                        {f.description
                          ? <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">{f.description}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => openEditFood(f)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-2 transition-colors">Editar</button>
                        <button onClick={() => setDeleteFood({ open: true, food: f })} className="text-red-400 hover:text-red-600 text-xs font-semibold transition-colors">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredFoods.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-400">{filteredFoods.length} alimento{filteredFoods.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* AI PANEL — fixed bottom                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          aiOpen ? 'h-80' : 'h-12'
        }`}
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}
      >

        {/* Toggle bar */}
        <button
          onClick={() => setAiOpen(o => !o)}
          className="w-full h-12 flex items-center justify-between px-5 transition-colors"
          style={{ background: 'linear-gradient(90deg, #4c1d95, #3730a3)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-violet-400/30 flex items-center justify-center">
              <span style={{ fontSize: 11 }}>🤖</span>
            </div>

            <span className="text-white text-xs font-semibold">
              Asistente Nutricional IA
            </span>

            <span className="text-violet-300 text-[10px] bg-violet-800/50 px-2 py-0.5 rounded-full">
              OpenAI Integrado
            </span>
          </div>

          <svg
            className={`w-4 h-4 text-violet-300 transition-transform ${
              aiOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* Chat area */}
        {aiOpen && (
          <div
            className="bg-white flex flex-col"
            style={{ height: 'calc(100% - 48px)' }}
          >

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50">
              {aiMessages.map((msg, i) => (
                msg.role === 'ai' ? (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div
                      className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                      IA
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-4 py-2.5 max-w-lg">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5 items-start justify-end">
                    <div
                      className="text-white rounded-xl rounded-tr-sm px-4 py-2.5 max-w-sm text-sm"
                      style={{ background: '#4c1d95' }}
                    >
                      {msg.text}
                    </div>
                    <div className="w-6 h-6 rounded-md bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      Ntr
                    </div>
                  </div>
                )
              ))}
              {aiLoading && (
                <div className="flex gap-2.5 items-start">
                  <div
                    className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    IA
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-4 py-2.5">
                    <span className="text-sm text-slate-400">Generando respuesta...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 px-5 py-3 bg-white flex gap-2.5 items-center">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                placeholder="Escribe una consulta nutricional..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                disabled={aiLoading}
              />
              <button
                onClick={sendAiMessage}
                disabled={aiLoading || !aiInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white rounded-full hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: '#4c1d95' }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog isOpen={deletePatient.open} title="Eliminar Paciente"
        message={`¿Eliminar a ${deletePatient.patient?.firstName} ${deletePatient.patient?.lastName}? Se borrarán todos sus registros clínicos. Esta acción no se puede deshacer.`}
        onConfirm={() => { handleDeletePatient(); }} onCancel={() => setDeletePatient({ open: false, patient: null })} variant="danger" />
      <ConfirmDialog isOpen={deleteFood.open} title="Eliminar Alimento"
        message={`¿Eliminar "${deleteFood.food?.name}" de la base de datos de alimentos?`}
        onConfirm={() => { handleDeleteFood(); }} onCancel={() => setDeleteFood({ open: false, food: null })} variant="danger" />
    </div>
  );
};

export default NutritionistPanel;
