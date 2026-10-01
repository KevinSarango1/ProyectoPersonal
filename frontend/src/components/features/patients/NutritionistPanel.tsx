import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Send, Paperclip, X, Trash2, Pencil, Info,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ClipboardList, Activity, Ruler, UtensilsCrossed, ChefHat,
  Calculator, AlertTriangle, TrendingDown, TrendingUp, Minus,
  LogOut, Plus, AlertCircle, GripVertical,
} from 'lucide-react';
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
import DietaryHabitsForm from '../dietary/DietaryHabitsForm';
import { classifyBMI, classifyWHR, getAge, formatGender, type Gender } from '../../../utils/nutritionCalculations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService } from '../../../services/aiService';

type AiMessage = { role: 'user' | 'ai'; text: string; fileName?: string };

type MainView = 'patients' | 'foods';
type Tab = 'historia' | 'biometria' | 'antropometria' | 'habitos' | 'menu';

// Strip LaTeX notation and replace with Unicode equivalents so ReactMarkdown renders cleanly.
function cleanAiText(text: string): string {
  const replaceLatexSymbols = (s: string) =>
    s.replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷')
     .replace(/\\approx/g, '≈').replace(/\\geq/g, '≥').replace(/\\leq/g, '≤')
     .replace(/\\neq/g, '≠').replace(/\\to/g, '→').replace(/\\pm/g, '±')
     .replace(/\\mathbf\{([^}]+)\}/g, '**$1**')
     .replace(/\\text\{([^}]+)\}/g, '$1')
     .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1')
     .replace(/\\_/g, '_').replace(/\\\^/g, '^').replace(/\\/g, '');

  return text
    // Block LaTeX $$...$$ → clean and wrap in code block look
    .replace(/\$\$([^$]+)\$\$/gs, (_m, eq) => `\`${replaceLatexSymbols(eq.trim())}\``)
    // Inline LaTeX $...$ → clean
    .replace(/\$([^$\n]+)\$/g, (_m, eq) => replaceLatexSymbols(eq));
}

const ACTIVITY_LABELS: Record<string, string> = {
  '1.2': 'Sedentario',
  '1.375': 'Ligeramente activo',
  '1.55': 'Moderadamente activo',
  '1.725': 'Muy activo',
  '1.9': 'Extra activo',
};

// Convert decimal to readable fraction string: 0.333... → "1/3", 1.5 → "1 1/2"
function toFraction(n: number): string {
  const FRACS: [number, string][] = [
    [1/8,'1/8'],[1/6,'1/6'],[1/5,'1/5'],[1/4,'1/4'],
    [1/3,'1/3'],[3/8,'3/8'],[2/5,'2/5'],[1/2,'1/2'],
    [3/5,'3/5'],[5/8,'5/8'],[2/3,'2/3'],[3/4,'3/4'],
    [4/5,'4/5'],[5/6,'5/6'],[7/8,'7/8'],
  ];
  const whole = Math.floor(n);
  const frac  = n - whole;
  if (frac < 0.005) return String(whole || (Number.isInteger(n) ? n : n.toFixed(1)));
  const match = FRACS.find(([v]) => Math.abs(frac - v) < 0.015);
  const fracStr = match ? match[1] : (frac * 100).toFixed(0) + '%';
  return whole > 0 ? `${whole} ${fracStr}` : fracStr;
}

function harrisBenedictCalc(weight: number, height: number, age: number, gender: string, factor: number) {
  const bmr = gender === 'F'
    ? 655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age)
    : 66.47 + (13.75 * weight) + (5.003 * height) - (6.755 * age);
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * factor), formula: gender === 'F' ? 'Mujeres' : 'Hombres' };
}

function buildHBMessage(patient: Patient, factor: number): string {
  const anthro = patient.anthropometry?.[0];
  if (!anthro) return 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones nutricionales, analizar alimentos y también puedes subir documentos PDF para que los analice.';
  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
  const { bmr, tdee, formula } = harrisBenedictCalc(anthro.weight, anthro.height, age, patient.gender, factor);
  const label = ACTIVITY_LABELS[String(factor)] ?? 'Sedentario';
  return `📊 **Harris-Benedict (${formula})**\n\n**${patient.firstName} ${patient.lastName}** · ${age} años · ${anthro.weight} kg / ${anthro.height} cm\n\n**TMB:** ${bmr} kcal/día\n**Factor:** ×${factor} (${label})\n**GET:** ${tdee} kcal/día\n\n¿En qué puedo ayudarte con este paciente?`;
}

const EMPTY_PATIENT: PatientForm = {
  firstName: '', lastName: '', dateOfBirth: '', gender: 'M', occupation: '',
};
const EMPTY_FOOD = {
  name: '', description: '', grossWeight: '', netWeight: '',
  energyKcal: '', protein: '', fats: '', carbohydrates: '', fiber: '',
  grupoSmae: '', subgrupoSmae: '', porcionSugerida: '', unidadPorcion: '',
  indiceGlucemico: '', cargaGlucemica: '',
};

// ─── Small shared styles ──────────────────────────────────────────────────────
const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition';
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5';
const errCls   = 'text-xs text-red-600 mt-1';

// ─── Construir contexto clínico completo del paciente para el LLM ────────────
function buildPatientContext(patient: any, dietaryHabits?: any): string {
  const lines: string[] = [];
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  lines.push(`PACIENTE: ${patient.firstName} ${patient.lastName}`);
  if (age) lines.push(`Edad: ${age} años | Sexo: ${patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}`);
  if (patient.occupation) lines.push(`Ocupación: ${patient.occupation}`);

  // ── Antropometría ──────────────────────────────────────────────────────────
  const anthro = patient.anthropometry?.[0];
  if (anthro) {
    lines.push(`\nANTROPOMETRÍA (${anthro.measurementDate}):`);
    lines.push(`  Peso: ${anthro.weight} kg | Talla: ${anthro.height} cm | IMC: ${anthro.bmi} kg/m²`);
    if (anthro.waistCircumference) lines.push(`  Cintura: ${anthro.waistCircumference} cm | Cadera: ${anthro.hipCircumference ?? '—'} cm`);
    if (anthro.waistHipRatio)      lines.push(`  ICC: ${anthro.waistHipRatio}`);
    if (anthro.bodyFatPercentage)  lines.push(`  % Grasa: ${anthro.bodyFatPercentage}% | Masa muscular: ${anthro.muscleMass ?? '—'} kg`);
    if (anthro.waterPercentage)    lines.push(`  % Agua: ${anthro.waterPercentage}%`);
  }

  // ── Bioquímica completa ────────────────────────────────────────────────────
  const bio = patient.biometrics?.[0];
  if (bio) {
    lines.push(`\nBIOQUÍMICA (${bio.testDate}):`);
    if (bio.glucose)         lines.push(`  Glucosa: ${bio.glucose} mg/dL | HbA1c: ${bio.hba1c ?? '—'}% | Insulina: ${bio.insulin ?? '—'} mIU/L | HOMA: ${bio.homaIndex ?? '—'}`);
    if (bio.totalCholesterol)lines.push(`  Colesterol: ${bio.totalCholesterol} mg/dL | LDL: ${bio.ldl ?? '—'} | HDL: ${bio.hdl ?? '—'} | TG: ${bio.triglycerides ?? '—'} | VLDL: ${bio.vldl ?? '—'}`);
    if (bio.ast)             lines.push(`  Hepático: AST ${bio.ast} | ALT ${bio.alt ?? '—'} | GGT ${bio.ggt ?? '—'} | Bilirrubina ${bio.bilirubin ?? '—'} mg/dL`);
    if (bio.creatinine)      lines.push(`  Renal: Creatinina ${bio.creatinine} | BUN ${bio.bun ?? '—'} | Urea ${bio.urea ?? '—'} | Na ${bio.sodium ?? '—'} | K ${bio.potassium ?? '—'}`);
    if (bio.totalProteins)   lines.push(`  Proteínas: Total ${bio.totalProteins} g/dL | Albúmina ${bio.albumin ?? '—'} | Prealbúmina ${bio.prealbumin ?? '—'}`);
    if (bio.hemoglobin)      lines.push(`  Hemograma: Hb ${bio.hemoglobin} g/dL | Hto ${bio.hematocrit ?? '—'}% | Leuc ${bio.wbc ?? '—'} | Plaq ${bio.platelets ?? '—'}`);
    if (bio.vitaminD)        lines.push(`  Micronutrientes: Vit D ${bio.vitaminD} | B12 ${bio.vitaminB12 ?? '—'} | Hierro ${bio.iron ?? '—'} | Ferritina ${bio.ferritin ?? '—'} | Zinc ${bio.zinc ?? '—'}`);
    if (bio.calcium)         lines.push(`  Minerales: Ca ${bio.calcium} | Mg ${bio.magnesium ?? '—'} | P ${bio.phosphorus ?? '—'} mg/dL`);
  }

  // ── Historia clínica ───────────────────────────────────────────────────────
  const ch = patient.clinicalHistory;
  if (ch) {
    lines.push(`\nHISTORIA CLÍNICA:`);
    if (ch.nutritionalObjective) lines.push(`  Objetivo: ${ch.nutritionalObjective}`);
    if (ch.pastDiseases)         lines.push(`  Antecedentes patológicos: ${ch.pastDiseases}`);
    if (ch.medicalHistory)       lines.push(`  Historia médica: ${ch.medicalHistory}`);
    if (ch.familyHistory)        lines.push(`  Antecedentes familiares: ${ch.familyHistory}`);
    if (ch.currentComplaints)    lines.push(`  Motivo consulta: ${ch.currentComplaints}`);
    if (ch.physicalActivity)     lines.push(`  Actividad física: ${ch.physicalActivity}`);
    if (ch.allergies?.length)    lines.push(`  Alergias: ${ch.allergies.join(', ')}`);
    if (ch.foodIntolerances?.length) lines.push(`  Intolerancias: ${ch.foodIntolerances.join(', ')}`);
    if (ch.currentMedications?.length) lines.push(`  Medicación: ${ch.currentMedications.join(', ')}`);
    if (ch.dietaryRestrictions)  lines.push(`  Restricciones dietéticas: ${ch.dietaryRestrictions}`);
    if (ch.alcoholConsumption)   lines.push(`  Alcohol: ${ch.alcoholConsumption}`);
    if (ch.tobaccoUse)           lines.push(`  Tabaco: ${ch.tobaccoUse}`);
    if (ch.observations)         lines.push(`  Observaciones: ${ch.observations}`);
  }

  // ── Hábitos dietéticos ─────────────────────────────────────────────────────
  const dh = dietaryHabits ?? patient.dietaryHabits;
  if (dh) {
    lines.push(`\nHÁBITOS DIETÉTICOS (${dh.recordDate ?? '—'}):`);
    if (dh.breakfast)           lines.push(`  Desayuno: ${dh.breakfast}`);
    if (dh.morningSnack)        lines.push(`  Colación AM: ${dh.morningSnack}`);
    if (dh.lunch)               lines.push(`  Almuerzo: ${dh.lunch}`);
    if (dh.afternoonSnack)      lines.push(`  Colación PM: ${dh.afternoonSnack}`);
    if (dh.dinner)              lines.push(`  Cena: ${dh.dinner}`);
    if (dh.mealsPerDay)         lines.push(`  Comidas/día: ${dh.mealsPerDay} | Agua: ${dh.waterIntake ?? '—'} L`);
    if (dh.eatingOutFrequency)  lines.push(`  Come fuera: ${dh.eatingOutFrequency}`);
    if (dh.foodPreferences)     lines.push(`  Preferencias: ${dh.foodPreferences}`);
    if (dh.foodAversions)       lines.push(`  Rechaza/no tolera: ${dh.foodAversions}`);
    if (dh.cookingMethods)      lines.push(`  Métodos cocción: ${dh.cookingMethods}`);
    if (dh.observations)        lines.push(`  Observaciones: ${dh.observations}`);
  }

  return lines.join('\n');
}

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
  const [infoFood,   setInfoFood]             = useState<Food | null>(null);
  // Table sort, filter, pagination
  type SortField = 'name' | 'netWeight' | 'energyKcal' | 'protein' | 'fats' | 'carbohydrates' | 'fiber' | 'grupoSmae';
  const [sortField, setSortField]   = useState<SortField>('name');
  const [sortDir,   setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [foodPage, setFoodPage]     = useState(1);
  const PAGE_SIZE = 100;

  // Hábitos dietéticos
  const [dietaryHabits, setDietaryHabits] = useState<any>(null);

  // Menú — calculadora de macros
  const [menuCalories, setMenuCalories]       = useState<number>(2000);
  const [menuProteinPct, setMenuProteinPct]   = useState<number>(20);
  const [menuCarbsPct, setMenuCarbsPct]       = useState<number>(50);
  const [menuFatPct, setMenuFatPct]           = useState<number>(30);
  const [activityFactor, setActivityFactor]   = useState<number>(1.2);
  const [menuGoal, setMenuGoal]               = useState<'disminuir' | 'mantener' | 'ganar'>('mantener');
  const [menuGoalPct, setMenuGoalPct]         = useState<number>(15);

  // AI panel
  const [aiInput, setAiInput]       = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'ai', text: 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones, analizar alimentos y también puedes subir documentos PDF para que los analice.' },
  ]);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiFile, setAiFile]         = useState<File | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const messagesEndRef              = useRef<HTMLDivElement>(null);

  // Resizable chat panel
  const [chatWidth, setChatWidth]   = useState(320);
  const chatDrag = useRef({ active: false, startX: 0, startW: 320 });

  // Shared
  const [successAlert, setSuccessAlert] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [errorAlert,   setErrorAlert]   = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const showSuccess = (msg: string) => setSuccessAlert({ isOpen: true, message: msg });
  const showError   = (msg: string) => setErrorAlert({ isOpen: true, message: msg });

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setLoadingPts(true);
    try { setPatients(await patientService.getAll()); }
    finally { setLoadingPts(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);
  useEffect(() => { if (mainView === 'foods') fetchFoods(); }, [mainView, fetchFoods]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!chatDrag.current.active) return;
      const delta = chatDrag.current.startX - e.clientX;
      setChatWidth(Math.min(700, Math.max(260, chatDrag.current.startW + delta)));
    };
    const onUp = () => { chatDrag.current.active = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const selectPatient = async (id: string) => {
    const patientData = await patientService.getById(id);
    setSelected(patientData);
    setActiveTab('historia');
    setShowPatientForm(false);
    // Auto-calcular GET con Harris-Benedict si hay datos antropométricos; si no, resetear
    const anthro = patientData.anthropometry?.[0];
    if (anthro) {
      const age = Math.floor((Date.now() - new Date(patientData.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
      const { tdee } = harrisBenedictCalc(anthro.weight, anthro.height, age, patientData.gender, activityFactor);
      setMenuCalories(tdee);
    } else {
      setMenuCalories(0);
    }
    // Cargar hábitos dietéticos
    try { setDietaryHabits(await patientService.getDietaryHabits(id)); } catch { /* sin datos aún */ }
    // Cargar historial de chat del paciente
    try {
      const history = await aiService.getChatHistory(id);
      if (history.length > 0) {
        setAiMessages(history.map(m => ({ role: m.role as 'user' | 'ai', text: m.content, fileName: m.fileName })));
      } else {
        setAiMessages([{ role: 'ai', text: buildHBMessage(patientData, activityFactor) }]);
      }
    } catch { /* sin historial */ }
  };

  const reloadSelected = async () => {
    if (selected) setSelected(await patientService.getById(selected.id));
  };

  // ── Patient CRUD ──────────────────────────────────────────────────────────
  const openCreatePatient = () => { setEditingPatientId(null); setPatientForm(EMPTY_PATIENT); setPatientErrors({}); setShowPatientForm(true); setSelected(null); };
  const openEditPatient   = (p: Patient) => {
    setEditingPatientId(p.id);
    setPatientForm({ firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, gender: p.gender, occupation: p.occupation || '' });
    setPatientErrors({});
    setShowPatientForm(true);
  };

  const validatePatient = () => {
    const e: Record<string, string> = {};
    if (!patientForm.firstName.trim()) e.firstName   = 'Requerido';
    if (!patientForm.lastName.trim())  e.lastName    = 'Requerido';
    if (!patientForm.dateOfBirth)      e.dateOfBirth = 'Requerido';
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
      setPatientErrors({ firstName: err?.response?.data?.message || 'Error al guardar' });
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
  const handleSaveClinicalHistory = async (data: any) => {
    try { await patientService.updateClinicalHistory(selected!.id, data); await reloadSelected(); showSuccess('Historia clínica guardada'); }
    catch (e: any) { showError(e?.response?.data?.message || 'Error al guardar historia clínica'); }
  };
  const handleAddBiometrics = async (data: any) => {
    try { await patientService.addBiometrics(selected!.id, data); await reloadSelected(); showSuccess('Biometría registrada'); }
    catch (e: any) { showError(e?.response?.data?.message || 'Error al registrar biometría'); }
  };
  const handleAddAnthropometry = async (data: any) => {
    try { await patientService.addAnthropometry(selected!.id, data); await reloadSelected(); showSuccess('Medición registrada'); }
    catch (e: any) { showError(e?.response?.data?.message || 'Error al registrar medición'); }
  };
  const handleSaveDietaryHabits = async (data: any) => {
    try { const saved = await patientService.saveDietaryHabits(selected!.id, data); setDietaryHabits(saved); showSuccess('Hábitos dietéticos guardados'); }
    catch (e: any) { showError(e?.response?.data?.message || 'Error al guardar hábitos dietéticos'); }
  };

  // ── Food CRUD ─────────────────────────────────────────────────────────────
  const openCreateFood = () => { setEditingFoodId(null); setFoodForm(EMPTY_FOOD); setFoodErrors({}); setShowFoodForm(true); };
  const openEditFood   = (f: Food) => {
    setEditingFoodId(f.id);
    setFoodForm({
      name: f.name, description: f.description || '',
      grossWeight: String(f.grossWeight), netWeight: String(f.netWeight),
      energyKcal: String(f.energyKcal), protein: String(f.protein),
      fats: String(f.fats), carbohydrates: String(f.carbohydrates), fiber: String(f.fiber),
      grupoSmae: f.grupoSmae || '', subgrupoSmae: f.subgrupoSmae || '',
      porcionSugerida: f.porcionSugerida != null ? String(f.porcionSugerida) : '',
      unidadPorcion: f.unidadPorcion || '',
      indiceGlucemico: f.indiceGlucemico != null ? String(f.indiceGlucemico) : '',
      cargaGlucemica: f.cargaGlucemica != null ? String(f.cargaGlucemica) : '',
    });
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
    const payload: any = {
      name: foodForm.name.trim(), description: foodForm.description.trim() || undefined,
      grossWeight: parseFloat(foodForm.grossWeight) || parseFloat(foodForm.netWeight) || 0,
      netWeight: parseFloat(foodForm.netWeight) || 0, energyKcal: kcal,
      energyKj: Math.round(kcal * 4.184 * 10) / 10,
      protein: parseFloat(foodForm.protein) || 0, fats: parseFloat(foodForm.fats) || 0,
      carbohydrates: parseFloat(foodForm.carbohydrates) || 0, fiber: parseFloat(foodForm.fiber) || 0,
      grupoSmae:      foodForm.grupoSmae.trim()      || null,
      subgrupoSmae:   foodForm.subgrupoSmae.trim()   || null,
      porcionSugerida: foodForm.porcionSugerida !== '' ? parseFloat(foodForm.porcionSugerida) : null,
      unidadPorcion:  foodForm.unidadPorcion.trim()  || null,
      indiceGlucemico: foodForm.indiceGlucemico !== '' ? parseFloat(foodForm.indiceGlucemico) : null,
      cargaGlucemica:  foodForm.cargaGlucemica  !== '' ? parseFloat(foodForm.cargaGlucemica)  : null,
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
    if ((!text && !aiFile) || aiLoading) return;

    const userText = aiFile
      ? `📎 ${aiFile.name}${text ? `\n${text}` : ''}`
      : text;

    setAiMessages(prev => [...prev, { role: 'user', text: userText, fileName: aiFile?.name }]);
    setAiInput('');
    const fileToSend = aiFile;
    setAiFile(null);
    setAiLoading(true);

    try {
      let reply: string;
      const pid = selected?.id ?? null;

      let patientContext: string | undefined;
      if (selected) {
        patientContext = buildPatientContext(selected, dietaryHabits);
      } else {
        // Contexto global: resumen clínico de todos los pacientes
        const patientSummaries = patients.length > 0
          ? patients.map((p: any) => buildPatientContext(p)).join('\n\n---\n\n')
          : 'Sin pacientes registrados aún.';
        patientContext = `NUTRICIONISTA: ${user?.fullName ?? ''}\nTotal de pacientes: ${patients.length}\n\n${patientSummaries}`;
      }

      if (fileToSend) {
        const res = await aiService.chatWithFile(text, fileToSend, pid);
        reply = res.reply ?? 'Sin respuesta.';
      } else {
        const res = await aiService.chat(text, pid, patientContext);
        reply = res.reply ?? 'Sin respuesta.';
      }

      setAiMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al conectar con la IA.';
      setAiMessages(prev => [...prev, { role: 'ai', text: msg }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const latestAnthro     = selected?.anthropometry?.[0];
  const filteredPatients = patients.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()));

  // SMAE group list for the filter combo
  const smaeGroups = Array.from(new Set(foods.map(f => f.grupoSmae).filter(Boolean))).sort() as string[];

  // Foods: search + group filter + sort + paginate
  const baseFiltered = foods.filter(f => {
    const matchSearch = !foodSearch.trim() || f.name.toLowerCase().includes(foodSearch.toLowerCase());
    const matchGrupo  = !filterGrupo || f.grupoSmae === filterGrupo;
    return matchSearch && matchGrupo;
  });
  const sortedFoods = [...baseFiltered].sort((a, b) => {
    const va = (a as any)[sortField] ?? '';
    const vb = (b as any)[sortField] ?? '';
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const totalPages    = Math.ceil(sortedFoods.length / PAGE_SIZE);
  const pagedFoods    = sortedFoods.slice((foodPage - 1) * PAGE_SIZE, foodPage * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (field === sortField) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortField(field); setSortDir('asc'); }
    setFoodPage(1);
  };
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline-block opacity-30 ml-1" size={11} />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline-block ml-1" size={11} />
      : <ChevronDown className="inline-block ml-1" size={11} />;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <SuccessAlert isOpen={successAlert.isOpen} title="Listo" message={successAlert.message} onClose={() => setSuccessAlert({ isOpen: false, message: '' })} />
      {errorAlert.isOpen && (
        <div className="fixed top-6 right-6 z-50 bg-red-50 border border-red-300 rounded-2xl p-4 shadow-xl max-w-sm flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-900 text-sm">Error</p>
            <p className="text-red-700 text-xs mt-0.5">{errorAlert.message}</p>
          </div>
          <button onClick={() => setErrorAlert({ isOpen: false, message: '' })} className="text-red-400 hover:text-red-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

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

        <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
          <LogOut size={13} />
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
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                Nuevo Paciente
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
                    { field: 'firstName',   label: 'Nombre *',               type: 'text', ph: 'Juan' },
                    { field: 'lastName',   label: 'Apellido *',             type: 'text', ph: 'Pérez' },
                    { field: 'dateOfBirth', label: 'Fecha de Nacimiento *', type: 'date', ph: '' },
                    { field: 'occupation', label: 'Ocupación',              type: 'text', ph: 'Profesión' },
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
                        {getAge(selected.dateOfBirth)} años · {formatGender(selected.gender as Gender)}
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
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setDeletePatient({ open: true, patient: selected })}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex border-b border-slate-100 overflow-x-auto">
                    {([
                      { key: 'historia',      label: 'Historia Clínica',    icon: ClipboardList },
                      { key: 'biometria',     label: 'Biometría',           icon: Activity      },
                      { key: 'antropometria', label: 'Antropometría',       icon: Ruler         },
                      { key: 'habitos',       label: 'Hábitos Dietéticos',  icon: UtensilsCrossed },
                      { key: 'menu',          label: 'Menú',                icon: ChefHat       },
                    ] as { key: Tab; label: string; icon: React.FC<{ size?: number; className?: string }> }[]).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 ${
                          activeTab === tab.key
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <tab.icon size={15} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === 'historia' && (
                      <ClinicalHistoryForm key={selected.id} onSubmit={handleSaveClinicalHistory} initialData={selected.clinicalHistory} />
                    )}

                    {activeTab === 'biometria' && (
                      <div className="space-y-6">
                        <BiometricsForm onSubmit={handleAddBiometrics} initialData={selected.biometrics?.[0]} />
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

                    {activeTab === 'habitos' && (
                      <DietaryHabitsForm
                        initialData={dietaryHabits}
                        onSubmit={handleSaveDietaryHabits}
                      />
                    )}

                    {activeTab === 'menu' && (() => {
                      const adjustedCalories = menuGoal === 'mantener'
                        ? menuCalories
                        : menuGoal === 'disminuir'
                        ? Math.round(menuCalories * (1 - menuGoalPct / 100))
                        : Math.round(menuCalories * (1 + menuGoalPct / 100));
                      const proteinG = Math.round((adjustedCalories * menuProteinPct / 100) / 4);
                      const carbsG   = Math.round((adjustedCalories * menuCarbsPct  / 100) / 4);
                      const fatG     = Math.round((adjustedCalories * menuFatPct    / 100) / 9);
                      const totalPct = menuProteinPct + menuCarbsPct + menuFatPct;
                      // Harris-Benedict
                      const anthroHB = selected?.anthropometry?.[0];
                      const ageHB    = selected ? Math.floor((Date.now() - new Date(selected.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
                      const hb       = anthroHB && selected ? harrisBenedictCalc(anthroHB.weight, anthroHB.height, ageHB, selected.gender, activityFactor) : null;
                      // SVG donut
                      const r = 52; const cxy = 68;
                      const circ = 2 * Math.PI * r;
                      const Q    = circ / 4;
                      const pD   = (menuProteinPct / 100) * circ;
                      const cD   = (menuCarbsPct   / 100) * circ;
                      const fD   = (menuFatPct     / 100) * circ;
                      const activityOptions = [
                        { value: 1.2,   label: '×1.2 — Sedentario' },
                        { value: 1.375, label: '×1.375 — Ligeramente activo' },
                        { value: 1.55,  label: '×1.55 — Moderadamente activo' },
                        { value: 1.725, label: '×1.725 — Muy activo' },
                        { value: 1.9,   label: '×1.9 — Extra activo' },
                      ];
                      return (
                        <div className="space-y-4">

                          {/* Harris-Benedict */}
                          {hb && (
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Calculator size={15} className="text-violet-500 shrink-0" />
                                <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wide">Harris-Benedict — {hb.formula}</h3>
                              </div>
                              <div className="flex gap-6 mb-3">
                                <div>
                                  <p className="text-[10px] text-violet-500 uppercase font-bold tracking-wide">TMB</p>
                                  <p className="text-xl font-bold text-violet-900">{hb.bmr} <span className="text-xs font-normal text-violet-500">kcal/día</span></p>
                                </div>
                                <div className="border-l border-violet-200 pl-4">
                                  <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wide">GET</p>
                                  <p className="text-xl font-bold text-indigo-900">{hb.tdee} <span className="text-xs font-normal text-indigo-500">kcal/día</span></p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] text-violet-600 font-bold uppercase tracking-wide whitespace-nowrap">Factor actividad:</label>
                                <select
                                  value={activityFactor}
                                  onChange={e => {
                                    const f = Number(e.target.value);
                                    setActivityFactor(f);
                                    setMenuCalories(Math.round(hb.bmr * f));
                                  }}
                                  className="flex-1 text-xs bg-white border border-violet-200 rounded-lg px-2 py-1 text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                >
                                  {activityOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Objetivo nutricional */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <p className={labelCls}>Objetivo</p>
                            <div className="flex gap-1.5 mb-3">
                              {(['disminuir', 'mantener', 'ganar'] as const).map(g => (
                                <button key={g} type="button" onClick={() => setMenuGoal(g)}
                                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                                    menuGoal === g
                                      ? g === 'disminuir' ? 'bg-red-500 text-white'
                                        : g === 'mantener' ? 'bg-emerald-600 text-white'
                                        : 'bg-blue-500 text-white'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}>
                                  {g === 'disminuir'
                                    ? <><TrendingDown size={12} className="inline mr-1" />Bajar peso</>
                                    : g === 'mantener'
                                    ? <><Minus size={12} className="inline mr-1" />Mantener</>
                                    : <><TrendingUp size={12} className="inline mr-1" />Subir peso</>}
                                </button>
                              ))}
                            </div>
                            {menuGoal !== 'mantener' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{menuGoal === 'disminuir' ? 'Déficit:' : 'Superávit:'}</span>
                                <input type="number" value={menuGoalPct}
                                  onChange={e => setMenuGoalPct(Math.min(50, Math.max(1, Number(e.target.value))))}
                                  min={1} max={50}
                                  className="w-14 text-sm text-center border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                <span className="text-xs text-slate-500">%</span>
                                <span className="ml-auto text-sm font-bold text-slate-800">
                                  {adjustedCalories} <span className="text-xs font-normal text-slate-400">kcal/día</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Sin antropometría — aviso */}
                          {!hb && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-amber-800">Sin datos de antropometría</p>
                                <p className="text-xs text-amber-700 mt-0.5">Registre el peso y la talla del paciente en la pestaña <strong>Antropometría</strong> para calcular automáticamente TMB y GET. Por ahora puede ingresar las calorías manualmente.</p>
                              </div>
                            </div>
                          )}

                          {/* Macro Calculator */}
                          <div className="bg-white border border-slate-200 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4">Distribución de Macronutrientes</h3>
                            <div className="flex gap-5 items-start mb-4">
                              {/* Inputs */}
                              <div className="flex-1 space-y-3 min-w-0">
                                <div>
                                  <label className={labelCls}>Calorías diarias (kcal)</label>
                                  <input type="number" className={inputCls} value={menuCalories || ''} placeholder="Ej: 2000" min={0} max={5000}
                                    onChange={e => setMenuCalories(Number(e.target.value))} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Prot. %</label>
                                    <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={menuProteinPct} min={0} max={100}
                                      onChange={e => setMenuProteinPct(Number(e.target.value))} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">HCO %</label>
                                    <input type="number" className="w-full bg-white border border-yellow-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" value={menuCarbsPct} min={0} max={100}
                                      onChange={e => setMenuCarbsPct(Number(e.target.value))} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Gras. %</label>
                                    <input type="number" className="w-full bg-white border border-orange-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={menuFatPct} min={0} max={100}
                                      onChange={e => setMenuFatPct(Number(e.target.value))} />
                                  </div>
                                </div>
                                <p className={`text-xs font-bold ${totalPct === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  Total: {totalPct}% {totalPct !== 100 ? '⚠ debe sumar 100' : '✓'}
                                </p>
                              </div>
                              {/* SVG Donut */}
                              <div className="flex flex-col items-center flex-shrink-0">
                                <svg width="136" height="136" viewBox="0 0 136 136">
                                  <circle cx={cxy} cy={cxy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="22" />
                                  {totalPct > 0 && (<>
                                    <circle cx={cxy} cy={cxy} r={r} fill="none" stroke="#f97316" strokeWidth="21"
                                      strokeDasharray={`${fD} ${circ - fD}`}
                                      strokeDashoffset={Q - pD - cD} />
                                    <circle cx={cxy} cy={cxy} r={r} fill="none" stroke="#eab308" strokeWidth="21"
                                      strokeDasharray={`${cD} ${circ - cD}`}
                                      strokeDashoffset={Q - pD} />
                                    <circle cx={cxy} cy={cxy} r={r} fill="none" stroke="#3b82f6" strokeWidth="21"
                                      strokeDasharray={`${pD} ${circ - pD}`}
                                      strokeDashoffset={Q} />
                                  </>)}
                                  <text x={cxy} y={cxy - 8} textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="800">{adjustedCalories}</text>
                                  <text x={cxy} y={cxy + 10} textAnchor="middle" fill="#94a3b8" fontSize="10">kcal/día</text>
                                </svg>
                                <div className="flex flex-col gap-1">
                                  {[
                                    { color: '#3b82f6', label: `Prot. ${menuProteinPct}%` },
                                    { color: '#eab308', label: `HCO ${menuCarbsPct}%` },
                                    { color: '#f97316', label: `Gras. ${menuFatPct}%` },
                                  ].map(({ color, label }) => (
                                    <div key={label} className="flex items-center gap-1.5">
                                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                                      <span className="text-[10px] text-slate-500">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {/* Macro result cards */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                              {[
                                { label: 'Proteínas', g: proteinG, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                { label: 'Carbohidratos', g: carbsG, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                                { label: 'Grasas', g: fatG, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                              ].map(({ label, g, color }) => (
                                <div key={label} className={`border rounded-xl p-3 text-center ${color}`}>
                                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
                                  <p className="text-2xl font-bold mt-1">{g}<span className="text-sm font-normal ml-0.5">g</span></p>
                                </div>
                              ))}
                            </div>
                            <button
                              disabled={totalPct !== 100}
                              onClick={() => {
                                const goalLabel = menuGoal === 'disminuir' ? ` (déficit ${menuGoalPct}%, GET base: ${menuCalories} kcal)` : menuGoal === 'ganar' ? ` (superávit ${menuGoalPct}%, GET base: ${menuCalories} kcal)` : '';
                                const prompt = `Genera un menú diario para el paciente ${selected?.firstName} ${selected?.lastName} con:\n- ${adjustedCalories} kcal totales${goalLabel}\n- Proteínas: ${menuProteinPct}% (${proteinG}g)\n- Carbohidratos: ${menuCarbsPct}% (${carbsG}g)\n- Grasas: ${menuFatPct}% (${fatG}g)\n\nIncluye desayuno, media mañana, almuerzo, merienda y cena con alimentos específicos y porciones.`;
                                setAiInput(prompt);
                                setActiveTab('historia');
                              }}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                              Enviar al Asistente IA
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {activeTab === 'antropometria' && (
                      <div className="space-y-6">
                        <AnthropometryForm
                          onSubmit={handleAddAnthropometry}
                          gender={selected.gender as Gender}
                          lastRecord={selected.anthropometry?.[0] ?? null}
                        />
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

          {/* ── Right chat panel (resizable) ────────────────────────────── */}
          <div className="relative border-l border-slate-200 flex flex-col flex-shrink-0 bg-white"
               style={{ width: chatWidth }}>

            {/* Drag handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center hover:bg-violet-400/30 transition-colors"
              onMouseDown={e => {
                chatDrag.current = { active: true, startX: e.clientX, startW: chatWidth };
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
              }}
            >
              <GripVertical size={12} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
            </div>

            {/* Header */}
            <div className="pl-3 pr-3 py-3 border-b border-slate-200 flex items-center gap-2 flex-shrink-0"
                 style={{ background: 'linear-gradient(90deg, #4c1d95, #3730a3)' }}>
              <div className="w-6 h-6 rounded-lg bg-violet-400/30 flex items-center justify-center flex-shrink-0 ml-2">
                <Bot size={13} className="text-violet-200" />
              </div>
              <span className="text-white text-xs font-semibold">Asistente IA</span>
              <span className="text-violet-300 text-[10px] bg-violet-800/50 px-2 py-0.5 rounded-full truncate min-w-0">
                {selected ? `${selected.firstName}` : 'Global'}
              </span>
              <button
                onClick={async () => {
                  const pid = selected?.id ?? 'global';
                  await aiService.clearChatHistory(pid);
                  setAiMessages([{ role: 'ai', text: 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones nutricionales, analizar alimentos y también puedes subir documentos PDF para que los analice.' }]);
                }}
                title="Limpiar historial"
                className="ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-violet-700/50 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} className="text-violet-300" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/50">
              {aiMessages.map((msg, i) => (
                msg.role === 'ai' ? (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-3 py-2 flex-1 min-w-0 overflow-x-auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p:      ({children}) => <p className="text-xs text-slate-700 leading-relaxed mb-1.5 last:mb-0">{children}</p>,
                          h1:     ({children}) => <p className="text-sm font-bold text-slate-800 mb-1 mt-2">{children}</p>,
                          h2:     ({children}) => <p className="text-xs font-bold text-slate-800 mb-1 mt-2">{children}</p>,
                          h3:     ({children}) => <p className="text-xs font-semibold text-slate-700 mb-0.5 mt-1.5">{children}</p>,
                          ul:     ({children}) => <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 mb-1.5 ml-1">{children}</ul>,
                          ol:     ({children}) => <ol className="list-decimal list-inside text-xs text-slate-700 space-y-0.5 mb-1.5 ml-1">{children}</ol>,
                          li:     ({children}) => <li className="leading-snug">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                          em:     ({children}) => <em className="italic">{children}</em>,
                          code:   ({children}) => <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>,
                          pre:    ({children}) => <pre className="bg-slate-100 rounded-lg p-2 text-[10px] font-mono overflow-x-auto mb-1.5">{children}</pre>,
                          table:  ({children}) => <div className="overflow-x-auto mb-2"><table className="text-[11px] border-collapse w-full">{children}</table></div>,
                          thead:  ({children}) => <thead className="bg-slate-50">{children}</thead>,
                          th:     ({children}) => <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700">{children}</th>,
                          td:     ({children}) => <td className="border border-slate-200 px-2 py-1 text-slate-600">{children}</td>,
                          hr:     () => <hr className="border-slate-200 my-2" />,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-violet-300 pl-2 italic text-slate-500 text-xs my-1">{children}</blockquote>,
                        }}
                      >
                        {cleanAiText(msg.text)}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2 items-start justify-end">
                    <div className="flex flex-col items-end gap-1 min-w-0 max-w-[80%]">
                      {msg.fileName && (
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Paperclip size={9} /> {msg.fileName}
                        </span>
                      )}
                      <div className="text-white rounded-xl rounded-tr-sm px-3 py-2 text-xs whitespace-pre-wrap break-words"
                           style={{ background: '#4c1d95' }}>
                        {msg.text}
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-slate-200 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-slate-500">Ntr</div>
                  </div>
                )
              ))}
              {aiLoading && (
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
                    {[0,1,2].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 px-3 py-2 bg-white flex-shrink-0 space-y-2">
              {aiFile && (
                <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1">
                  <Paperclip size={11} className="shrink-0 text-violet-500" />
                  <span className="truncate flex-1">{aiFile.name}</span>
                  <button onClick={() => setAiFile(null)} className="ml-auto text-violet-400 hover:text-violet-700 flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex gap-1.5 items-center">
                <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden"
                  onChange={e => setAiFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileInputRef.current?.click()} disabled={aiLoading} title="Subir PDF/TXT"
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 hover:bg-violet-50 hover:border-violet-300 transition-colors disabled:opacity-40 flex-shrink-0">
                  <Paperclip size={14} className="text-slate-500" />
                </button>
                <input
                  type="text" value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                  placeholder={aiFile ? 'Pregunta sobre el doc...' : 'Consulta nutricional...'}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-0"
                  disabled={aiLoading}
                />
                <button onClick={sendAiMessage} disabled={aiLoading || (!aiInput.trim() && !aiFile)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
                  style={{ background: '#4c1d95' }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>

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
              <button onClick={openCreateFood} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus size={14} /> Nuevo Alimento
              </button>
            </div>
          </div>

          {/* Food form */}
          {showFoodForm && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{editingFoodId ? 'Editar Alimento' : 'Registrar Nuevo Alimento'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Los campos marcados con * son obligatorios</p>
                </div>
                <button onClick={() => setShowFoodForm(false)} className="text-slate-300 hover:text-slate-600 text-2xl leading-none transition-colors">×</button>
              </div>

              {/* Sección 1 — Identidad */}
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identificación</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="md:col-span-2">
                  <label className={labelCls}>Nombre *</label>
                  <input className={inputCls} value={foodForm.name}
                    onChange={e => setFoodForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: Arroz blanco cocido" />
                  {foodErrors.name && <p className={errCls}>{foodErrors.name}</p>}
                </div>
                <div>
                  <label className={labelCls}>Grupo SMAE</label>
                  <select className={inputCls} value={foodForm.grupoSmae}
                    onChange={e => setFoodForm(f => ({ ...f, grupoSmae: e.target.value }))}>
                    <option value="">— Sin grupo —</option>
                    {smaeGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Subgrupo</label>
                  <input className={inputCls} value={foodForm.subgrupoSmae}
                    onChange={e => setFoodForm(f => ({ ...f, subgrupoSmae: e.target.value }))}
                    placeholder="Ej: Sin proteína añadida" />
                </div>
              </div>

              {/* Sección 2 — Porción */}
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Porción sugerida</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Cantidad</label>
                  <input type="number" className={inputCls} value={foodForm.porcionSugerida}
                    onChange={e => setFoodForm(f => ({ ...f, porcionSugerida: e.target.value }))}
                    placeholder="Ej: 0.5" min="0" step="0.01" />
                </div>
                <div>
                  <label className={labelCls}>Unidad</label>
                  <input className={inputCls} value={foodForm.unidadPorcion}
                    onChange={e => setFoodForm(f => ({ ...f, unidadPorcion: e.target.value }))}
                    placeholder="Ej: taza, pieza, g" />
                </div>
                <div>
                  <label className={labelCls}>Peso bruto (g)</label>
                  <input type="number" className={inputCls} value={foodForm.grossWeight}
                    onChange={e => setFoodForm(f => ({ ...f, grossWeight: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div>
                  <label className={labelCls}>Peso neto (g) *</label>
                  <input type="number" className={inputCls} value={foodForm.netWeight}
                    onChange={e => setFoodForm(f => ({ ...f, netWeight: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                  {foodErrors.netWeight && <p className={errCls}>{foodErrors.netWeight}</p>}
                </div>
              </div>

              {/* Sección 3 — Macronutrimentos */}
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Composición nutrimental</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Energía (Kcal) *</label>
                  <input type="number" className={inputCls} value={foodForm.energyKcal}
                    onChange={e => setFoodForm(f => ({ ...f, energyKcal: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                  {foodErrors.energyKcal && <p className={errCls}>{foodErrors.energyKcal}</p>}
                </div>
                <div>
                  <label className={labelCls}>Proteína (g)</label>
                  <input type="number" className={inputCls} value={foodForm.protein}
                    onChange={e => setFoodForm(f => ({ ...f, protein: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div>
                  <label className={labelCls}>Lípidos (g)</label>
                  <input type="number" className={inputCls} value={foodForm.fats}
                    onChange={e => setFoodForm(f => ({ ...f, fats: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div>
                  <label className={labelCls}>HCO (g)</label>
                  <input type="number" className={inputCls} value={foodForm.carbohydrates}
                    onChange={e => setFoodForm(f => ({ ...f, carbohydrates: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div>
                  <label className={labelCls}>Fibra (g)</label>
                  <input type="number" className={inputCls} value={foodForm.fiber}
                    onChange={e => setFoodForm(f => ({ ...f, fiber: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div>
                  <label className={labelCls}>Índ. glucémico</label>
                  <input type="number" className={inputCls} value={foodForm.indiceGlucemico}
                    onChange={e => setFoodForm(f => ({ ...f, indiceGlucemico: e.target.value }))}
                    placeholder="0–100" min="0" max="100" step="1" />
                </div>
                <div>
                  <label className={labelCls}>Carga glucémica</label>
                  <input type="number" className={inputCls} value={foodForm.cargaGlucemica}
                    onChange={e => setFoodForm(f => ({ ...f, cargaGlucemica: e.target.value }))}
                    placeholder="0" min="0" step="0.1" />
                </div>
                <div className="flex items-end pb-1">
                  <p className="text-xs text-slate-400">kJ se calcula automáticamente<br />(Kcal × 4.184)</p>
                </div>
              </div>

              <div className="flex gap-3 pt-1 border-t border-slate-100">
                <button onClick={handleSaveFood} disabled={foodFormLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {foodFormLoading ? 'Guardando...' : editingFoodId ? 'Actualizar Alimento' : 'Registrar Alimento'}
                </button>
                <button onClick={() => setShowFoodForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* SMAE table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            {/* Scrollable table wrapper */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-emerald-700 text-white text-xs">
                    {/* ALIMENTO — sortable */}
                    <th className="text-left min-w-[200px] px-4 py-3 cursor-pointer select-none hover:bg-emerald-800 transition-colors"
                      onClick={() => handleSort('name')}>
                      ALIMENTO <SortIcon field="name" />
                    </th>
                    {/* CANTIDAD (porcionSugerida + unidadPorcion) */}
                    <th className="text-left min-w-[120px] px-3 py-3 bg-emerald-600">
                      Cantidad
                    </th>
                    {/* Numeric sortable columns */}
                    {([
                      { label: 'Peso neto (g)', field: 'netWeight'      as SortField },
                      { label: 'Kcal',          field: 'energyKcal'     as SortField },
                      { label: 'Prot (g)',       field: 'protein'        as SortField },
                      { label: 'Líp (g)',        field: 'fats'           as SortField },
                      { label: 'HCO (g)',        field: 'carbohydrates'  as SortField },
                      { label: 'Fibra (g)',      field: 'fiber'          as SortField },
                    ] as { label: string; field: SortField }[]).map(h => (
                      <th key={h.field}
                        className="text-right min-w-[80px] px-3 py-3 cursor-pointer select-none hover:bg-emerald-800 transition-colors"
                        onClick={() => handleSort(h.field)}>
                        {h.label} <SortIcon field={h.field} />
                      </th>
                    ))}
                    {/* GRUPO — sortable + filter combo */}
                    <th className="text-left min-w-[150px] px-3 py-3 bg-yellow-600 cursor-pointer select-none"
                      onClick={() => handleSort('grupoSmae')}>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center">GRUPO <SortIcon field="grupoSmae" /></span>
                        <select
                          value={filterGrupo}
                          onChange={e => { e.stopPropagation(); setFilterGrupo(e.target.value); setFoodPage(1); }}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-xs bg-yellow-50 text-yellow-900 border border-yellow-300 rounded px-1 py-0.5 font-normal cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        >
                          <option value="">Todos los grupos</option>
                          {smaeGroups.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="text-center min-w-[90px] px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingFoods ? (
                    <tr><td colSpan={10} className="py-10 text-center text-slate-400 text-sm">Cargando alimentos...</td></tr>
                  ) : sortedFoods.length === 0 ? (
                    <tr><td colSpan={10} className="py-14 text-center">
                      <p className="text-slate-400 text-sm font-medium">No hay alimentos registrados</p>
                      <p className="text-slate-300 text-xs mt-1">Haz clic en "+ Nuevo Alimento" para comenzar</p>
                    </td></tr>
                  ) : pagedFoods.map((f, i) => (
                    <tr key={f.id} className={`border-b border-slate-100 hover:bg-emerald-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="py-2.5 px-4 font-medium text-slate-800 text-sm max-w-[240px] truncate" title={f.name}>{f.name}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-sm whitespace-nowrap">
                        {f.porcionSugerida != null
                          ? (() => {
                              const unit = f.unidadPorcion?.trim().replace(/^[-–—]+$/, '') || '';
                              return <span className="text-emerald-700 font-semibold">{toFraction(f.porcionSugerida)}{unit ? ` ${unit}` : ''}</span>;
                            })()
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.netWeight}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums text-sm">{f.energyKcal}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.protein}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.fats}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.carbohydrates}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums text-sm">{f.fiber}</td>
                      <td className="py-2.5 px-3 bg-yellow-50">
                        {f.grupoSmae
                          ? <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap">{f.grupoSmae}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditFood(f)} title="Editar"
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteFood({ open: true, food: f })} title="Eliminar"
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                          <button onClick={() => setInfoFood(f)} title="Ver detalles"
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
                            <Info size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer: count + pagination */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-slate-400">
                {sortedFoods.length} alimento{sortedFoods.length !== 1 ? 's' : ''}
                {filterGrupo ? ` · grupo: ${filterGrupo}` : ''}
                {sortedFoods.length > 0 ? ` · pág. ${foodPage}/${totalPages}` : ''}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={foodPage === 1} onClick={() => setFoodPage(1)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">«</button>
                  <button disabled={foodPage === 1} onClick={() => setFoodPage(p => p - 1)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">‹</button>
                  <span className="px-2 py-1 text-xs text-slate-600 tabular-nums">{foodPage} / {totalPages}</span>
                  <button disabled={foodPage === totalPages} onClick={() => setFoodPage(p => p + 1)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">›</button>
                  <button disabled={foodPage === totalPages} onClick={() => setFoodPage(totalPages)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">»</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info modal — detalles completos del alimento */}
      {infoFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setInfoFood(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-start px-6 py-4 border-b border-slate-100">
              <div className="flex-1 min-w-0 pr-3">
                <h2 className="text-sm font-bold text-slate-900 leading-tight">{infoFood.name}</h2>
                {infoFood.grupoSmae && (
                  <span className="inline-block mt-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">{infoFood.grupoSmae}</span>
                )}
                {infoFood.subgrupoSmae && (
                  <span className="inline-block mt-1 ml-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{infoFood.subgrupoSmae}</span>
                )}
              </div>
              <button onClick={() => setInfoFood(null)} className="text-slate-300 hover:text-slate-600 text-2xl leading-none flex-shrink-0">×</button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Porción */}
              {infoFood.porcionSugerida != null && (
                <section>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Porción sugerida</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {toFraction(infoFood.porcionSugerida)}
                    {(() => { const u = infoFood.unidadPorcion?.trim().replace(/^[-–—]+$/, '') || ''; return u ? <span className="text-base font-medium text-slate-500 ml-1">{u}</span> : null; })()}
                  </p>
                </section>
              )}

              {/* Pesos */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pesos</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Peso bruto', value: infoFood.grossWeight, unit: 'g' },
                    { label: 'Peso neto',  value: infoFood.netWeight,   unit: 'g' },
                  ].map(row => (
                    <div key={row.label} className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400">{row.label}</p>
                      <p className="text-lg font-bold text-slate-800">{row.value} <span className="text-xs font-normal">{row.unit}</span></p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Energía */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Energía</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Kilocalorías</p>
                    <p className="text-lg font-bold text-emerald-700">{infoFood.energyKcal} <span className="text-xs font-normal">kcal</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400">Kilojulios</p>
                    <p className="text-lg font-bold text-slate-700">{infoFood.energyKj} <span className="text-xs font-normal">kJ</span></p>
                  </div>
                </div>
              </section>

              {/* Macronutrimentos */}
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Macronutrimentos</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Proteína',       value: infoFood.protein,        color: 'blue'   },
                    { label: 'Lípidos',        value: infoFood.fats,           color: 'amber'  },
                    { label: 'Carbohidratos',  value: infoFood.carbohydrates,  color: 'orange' },
                    { label: 'Fibra',          value: infoFood.fiber,          color: 'green'  },
                  ].map(row => (
                    <div key={row.label} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                      <p className="text-xs text-slate-500">{row.label}</p>
                      <p className="text-sm font-bold text-slate-800">{row.value} <span className="text-xs font-normal text-slate-400">g</span></p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Índice / Carga glucémica */}
              {(infoFood.indiceGlucemico != null || infoFood.cargaGlucemica != null) && (
                <section>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Glucemia</p>
                  <div className="grid grid-cols-2 gap-3">
                    {infoFood.indiceGlucemico != null && (
                      <div className="bg-rose-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-rose-400">Índice glucémico</p>
                        <p className="text-lg font-bold text-rose-600">{infoFood.indiceGlucemico}</p>
                      </div>
                    )}
                    {infoFood.cargaGlucemica != null && (
                      <div className="bg-rose-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-rose-400">Carga glucémica</p>
                        <p className="text-lg font-bold text-rose-600">{infoFood.cargaGlucemica}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Fuente */}
              {infoFood.source && (
                <p className="text-xs text-slate-300 text-right">Fuente: {infoFood.source}</p>
              )}
            </div>

            <div className="px-6 pb-4 flex gap-2">
              <button onClick={() => { setInfoFood(null); openEditFood(infoFood); }}
                className="flex-1 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">
                Editar este alimento
              </button>
              <button onClick={() => setInfoFood(null)}
                className="px-5 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
