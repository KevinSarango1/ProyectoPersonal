import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Send, Paperclip, X, Trash2, Pencil, Info,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ClipboardList, Activity, Ruler, UtensilsCrossed, ChefHat,
  Calculator, AlertTriangle, TrendingDown, TrendingUp, Minus,
  LogOut, Plus, AlertCircle, Download,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { patientService } from '../../../services/patientService';
import { useFoods } from '../../../hooks/useFoods';
import { Patient, PatientForm, Anthropometry, Food } from '../../../types/patient';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { SuccessAlert } from '../../ui/SuccessAlert';
import { ClinicalGauge } from '../../ui/ClinicalGauge';
import { BodySilhouette } from '../../ui/BodySilhouette';
import { ClinicalHistoryForm } from '../clinical/ClinicalHistoryForm';
import { BiometricsForm } from '../biometrics/BiometricsForm';
import { AnthropometryForm } from '../anthropometry/AnthropometryForm';
import DietaryHabitsForm from '../dietary/DietaryHabitsForm';
import { classifyBMI, classifyWHR, getAge, formatGender, type Gender } from '../../../utils/nutritionCalculations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService } from '../../../services/aiService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  // ── Bloque de restricciones críticas (siempre al final, en mayúsculas) ──────
  const criticalItems: string[] = [];
  if (ch?.allergies?.length)         criticalItems.push(`ALERGIAS (riesgo vital): ${ch.allergies.join(', ')}`);
  if (ch?.foodIntolerances?.length)  criticalItems.push(`INTOLERANCIAS ALIMENTARIAS: ${ch.foodIntolerances.join(', ')}`);
  if (ch?.dietaryRestrictions)       criticalItems.push(`RESTRICCIONES DIETÉTICAS: ${ch.dietaryRestrictions}`);
  if (criticalItems.length > 0) {
    lines.push(`\n⚠️ PROHIBICIONES ABSOLUTAS — NUNCA incluir en menús ni planes:`);
    criticalItems.forEach(item => lines.push(`  • ${item}`));
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
  const foodFormRef = useRef<HTMLDivElement>(null);
  const [foodSearch, setFoodSearch]           = useState('');
  const [showFoodForm, setShowFoodForm]       = useState(false);
  const [editingFoodId, setEditingFoodId]     = useState<string | null>(null);
  const [foodForm, setFoodForm]               = useState(EMPTY_FOOD);
  const [foodErrors, setFoodErrors]           = useState<Record<string, string>>({});
  const [foodFormLoading, setFoodFormLoading] = useState(false);
  const [expandedFoodSections, setExpandedFoodSections] = useState({ id: true, porcion: true, macro: true });
  const toggleFoodSection = (s: keyof typeof expandedFoodSections) =>
    setExpandedFoodSections(prev => ({ ...prev, [s]: !prev[s] }));
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
  const [aiModel, setAiModel]       = useState('gpt-oss-120b');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'ai', text: 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones, analizar alimentos y también puedes subir documentos PDF para que los analice.' },
  ]);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiFile, setAiFile]         = useState<File | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const aiTextareaRef               = useRef<HTMLTextAreaElement>(null);

  // Resizable + collapsible chat panel
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(365);
  const aiResizingRef = useRef(false);
  const aiResizeStartX = useRef(0);
  const aiResizeStartW = useRef(0);

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

  // Auto-resize textarea whenever aiInput changes (including programmatic set)
  useEffect(() => {
    const el = aiTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [aiInput]);


  const selectPatient = async (id: string) => {
    const patientData = await patientService.getById(id);
    setSelected(patientData);
    setActiveTab('historia');
    setShowPatientForm(false);
    setAiInput('');
    setAiFile(null);
    if (aiTextareaRef.current) aiTextareaRef.current.style.height = 'auto';
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
    const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜüÀàÈèÌìÒò\s'-]+$/;

    // Nombre
    const fn = patientForm.firstName.trim();
    if (!fn)                          e.firstName = 'El nombre es obligatorio';
    else if (fn.length < 2)           e.firstName = 'Mínimo 2 caracteres';
    else if (fn.length > 50)          e.firstName = 'Máximo 50 caracteres';
    else if (!nameRe.test(fn))        e.firstName = 'Solo letras, tildes y guiones';

    // Apellido
    const ln = patientForm.lastName.trim();
    if (!ln)                          e.lastName = 'El apellido es obligatorio';
    else if (ln.length < 2)           e.lastName = 'Mínimo 2 caracteres';
    else if (ln.length > 50)          e.lastName = 'Máximo 50 caracteres';
    else if (!nameRe.test(ln))        e.lastName = 'Solo letras, tildes y guiones';

    // Fecha de nacimiento
    if (!patientForm.dateOfBirth) {
      e.dateOfBirth = 'La fecha de nacimiento es obligatoria';
    } else {
      const dob  = new Date(patientForm.dateOfBirth);
      const now  = new Date();
      const age  = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (dob >= now)    e.dateOfBirth = 'La fecha no puede ser futura';
      else if (age < 1)  e.dateOfBirth = 'El paciente debe tener al menos 1 año';
      else if (age > 120) e.dateOfBirth = 'Fecha de nacimiento no válida';
    }

    // Ocupación (opcional, límite de longitud)
    if (patientForm.occupation && patientForm.occupation.trim().length > 100)
      e.occupation = 'Máximo 100 caracteres';

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
  const openCreateFood = () => {
    setEditingFoodId(null); setFoodForm(EMPTY_FOOD); setFoodErrors({}); setShowFoodForm(true);
    setTimeout(() => foodFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
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
    setTimeout(() => foodFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const validateFood = () => {
    const e: Record<string, string> = {};
    const num = (v: string) => v === '' ? NaN : Number(v);

    // ── Identificación ────────────────────────────────────────────────────────
    const name = foodForm.name.trim();
    if (!name)              e.name = 'El nombre del alimento es obligatorio';
    else if (name.length < 3)  e.name = 'Mínimo 3 caracteres';
    else if (name.length > 200) e.name = 'Máximo 200 caracteres';

    // ── Pesos ──────────────────────────────────────────────────────────────────
    const nw = num(foodForm.netWeight);
    const gw = num(foodForm.grossWeight);
    if (foodForm.netWeight === '' || isNaN(nw)) e.netWeight = 'Número requerido';
    else if (nw <= 0)                            e.netWeight = 'Debe ser mayor que 0';

    if (foodForm.grossWeight !== '' && !isNaN(gw)) {
      if (gw < 0)      e.grossWeight = 'No puede ser negativo';
      else if (!isNaN(nw) && gw < nw) e.grossWeight = 'El peso bruto no puede ser menor que el peso neto';
    }

    // ── Energía ────────────────────────────────────────────────────────────────
    const kcal = num(foodForm.energyKcal);
    if (foodForm.energyKcal === '' || isNaN(kcal)) e.energyKcal = 'Número requerido';
    else if (kcal < 0)                              e.energyKcal = 'No puede ser negativo';
    else if (kcal > 9000)                           e.energyKcal = 'Valor fuera de rango (máx 9000 kcal)';

    // ── Macronutrimentos ───────────────────────────────────────────────────────
    const prot  = num(foodForm.protein);
    const fat   = num(foodForm.fats);
    const carbs = num(foodForm.carbohydrates);
    const fiber = num(foodForm.fiber);

    if (foodForm.protein !== '' && !isNaN(prot) && prot < 0)    e.protein = 'No puede ser negativo';
    if (foodForm.fats    !== '' && !isNaN(fat)  && fat  < 0)    e.fats    = 'No puede ser negativo';
    if (foodForm.carbohydrates !== '' && !isNaN(carbs) && carbs < 0) e.carbohydrates = 'No puede ser negativo';
    if (foodForm.fiber   !== '' && !isNaN(fiber) && fiber < 0)  e.fiber   = 'No puede ser negativo';

    // Fibra no puede superar los carbohidratos
    if (!isNaN(fiber) && !isNaN(carbs) && fiber > carbs && carbs > 0)
      e.fiber = 'La fibra no puede superar los carbohidratos';

    // Balance energético: si todos los macros están presentes, la energía calculada
    // debe estar dentro de ±25% de la declarada
    if (!isNaN(prot) && !isNaN(fat) && !isNaN(carbs) && !isNaN(kcal) && kcal > 0) {
      const calcKcal = prot * 4 + fat * 9 + carbs * 4;
      const diff = Math.abs(calcKcal - kcal) / kcal;
      if (diff > 0.25)
        e.energyKcal = `Energía calculada por macros (${Math.round(calcKcal)} kcal) difiere >25% del valor declarado`;
    }

    // ── Índice glucémico ───────────────────────────────────────────────────────
    const ig = num(foodForm.indiceGlucemico);
    if (foodForm.indiceGlucemico !== '' && !isNaN(ig)) {
      if (ig < 0 || ig > 100) e.indiceGlucemico = 'Debe estar entre 0 y 100';
    }

    // ── Porción sugerida ───────────────────────────────────────────────────────
    const porcion = num(foodForm.porcionSugerida);
    if (foodForm.porcionSugerida !== '' && !isNaN(porcion) && porcion <= 0)
      e.porcionSugerida = 'Debe ser mayor que 0';

    // Auto-expandir secciones con errores
    if (e.name || e.grupoSmae)
      setExpandedFoodSections(prev => ({ ...prev, id: true }));
    if (e.netWeight || e.grossWeight || e.porcionSugerida)
      setExpandedFoodSections(prev => ({ ...prev, porcion: true }));
    if (e.energyKcal || e.protein || e.fats || e.carbohydrates || e.fiber || e.indiceGlucemico)
      setExpandedFoodSections(prev => ({ ...prev, macro: true }));

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
    if (aiTextareaRef.current) aiTextareaRef.current.style.height = 'auto';
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
        const res = await aiService.chatWithFile(text, fileToSend, pid, aiModel);
        reply = res.reply ?? 'Sin respuesta.';
      } else {
        const res = await aiService.chat(text, pid, patientContext, aiModel);
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
    <div
      className="h-screen flex flex-col bg-slate-50 overflow-hidden"
      style={{ marginRight: aiPanelOpen ? aiPanelWidth : 0, transition: aiResizingRef.current ? 'none' : 'margin-right 0.32s cubic-bezier(0.4,0,0.2,1)' }}
    >
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
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  <p className="text-slate-500 text-xs mt-0.5">{getAge(p.dateOfBirth)} años · {formatGender(p.gender as Gender)}</p>
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">

            {/* Patient form — modal */}

            {/* Empty state — dashboard de bienvenida */}
            {!selected && !showPatientForm && (
              <div className="p-6 space-y-6">
                {/* Saludo */}
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Bienvenido/a, {user?.fullName?.split(' ')[0] ?? 'Nutricionista'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Selecciona un paciente de la lista o crea uno nuevo para comenzar.
                  </p>
                </div>

                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Total pacientes',
                      value: loadingPts ? '—' : patients.length,
                      icon: <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                      iconBg: 'bg-slate-100',
                    },
                    {
                      label: 'Con antropometría',
                      value: loadingPts ? '—' : patients.filter(p => p.anthropometry && p.anthropometry.length > 0).length,
                      icon: <Ruler className="w-4 h-4 text-teal-600" />,
                      iconBg: 'bg-teal-50',
                    },
                    {
                      label: 'Con bioquímica',
                      value: loadingPts ? '—' : patients.filter(p => p.biometrics && p.biometrics.length > 0).length,
                      icon: <Activity className="w-4 h-4 text-blue-600" />,
                      iconBg: 'bg-blue-50',
                    },
                    {
                      label: 'Con historia clínica',
                      value: loadingPts ? '—' : patients.filter(p => p.clinicalHistory).length,
                      icon: <ClipboardList className="w-4 h-4 text-violet-600" />,
                      iconBg: 'bg-violet-50',
                    },
                  ].map(({ label, value, icon, iconBg }) => (
                    <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-tight mb-0.5">{label}</p>
                        <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Acceso rápido */}
                {patients.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Pacientes recientes</p>
                    <div className="space-y-1.5">
                      {patients.slice(0, 5).map(p => {
                        const age = p.dateOfBirth
                          ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
                          : null;
                        return (
                          <button key={p.id} onClick={() => selectPatient(p.id)}
                            className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 hover:border-emerald-300 hover:shadow-sm transition-all text-left group">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-emerald-600">
                                {p.firstName?.[0]}{p.lastName?.[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 truncate">
                                {p.firstName} {p.lastName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {age ? `${age} años · ` : ''}{formatGender(p.gender as Gender)}
                              </p>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CTA si no hay pacientes */}
                {!loadingPts && patients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Aún no hay pacientes registrados</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Crea el primer paciente para empezar a trabajar.</p>
                    <button onClick={() => { setShowPatientForm(true); setEditingPatientId(null); setPatientForm(EMPTY_PATIENT); }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
                      + Nuevo Paciente
                    </button>
                  </div>
                )}
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
                                const goalLabel = menuGoal === 'disminuir'
                                  ? ` (déficit ${menuGoalPct}%, GET base: ${menuCalories} kcal)`
                                  : menuGoal === 'ganar'
                                  ? ` (superávit ${menuGoalPct}%, GET base: ${menuCalories} kcal)`
                                  : '';
                                // Restrições clínicas clave del paciente para incluirlas en el prompt
                                const ch = selected?.clinicalHistory;
                                const restrictions: string[] = [];
                                if (ch?.allergies?.length)         restrictions.push(`Alergias: ${ch.allergies.join(', ')}`);
                                if (ch?.foodIntolerances?.length)  restrictions.push(`Intolerancias: ${ch.foodIntolerances.join(', ')}`);
                                if (ch?.dietaryRestrictions)       restrictions.push(`Restricciones: ${ch.dietaryRestrictions}`);
                                if (ch?.currentMedications?.length) restrictions.push(`Medicación: ${ch.currentMedications.join(', ')}`);
                                const restrictBlock = restrictions.length
                                  ? `\n\nRESTRICCIONES CLÍNICAS A RESPETAR:\n${restrictions.map(r => `- ${r}`).join('\n')}`
                                  : '';
                                const prompt =
                                  `Genera un menú diario COMPLETO para ${selected?.firstName} ${selected?.lastName}:\n` +
                                  `- ${adjustedCalories} kcal totales${goalLabel}\n` +
                                  `- Proteínas: ${menuProteinPct}% (${proteinG} g)\n` +
                                  `- Carbohidratos: ${menuCarbsPct}% (${carbsG} g)\n` +
                                  `- Grasas: ${menuFatPct}% (${fatG} g)` +
                                  restrictBlock +
                                  `\n\nEstructura: desayuno, colación AM, almuerzo, colación PM y cena. ` +
                                  `Para cada tiempo de comida indica el alimento, cantidad (g o medida casera) y aporte calórico aproximado. ` +
                                  `Respeta estrictamente las restricciones indicadas.`;
                                setAiInput(prompt);
                                setAiPanelOpen(true);
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
                        <div className="flex gap-4 items-start">
                          {/* Body silhouette — only when there's data */}
                          {(selected.anthropometry?.[0]?.bmi ?? 0) > 0 && (
                            <div className="flex-shrink-0 w-44 hidden md:block">
                              <BodySilhouette
                                bmi={selected.anthropometry![0].bmi!}
                                weight={selected.anthropometry![0].weight}
                                height={selected.anthropometry![0].height}
                                gender={selected.gender as 'M' | 'F' | 'O'}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <AnthropometryForm
                              onSubmit={handleAddAnthropometry}
                              gender={selected.gender as Gender}
                              lastRecord={selected.anthropometry?.[0] ?? null}
                            />
                          </div>
                        </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Base de Datos de Alimentos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Sistema SMAE — Equivalentes nutricionales</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input type="text" value={foodSearch} onChange={e => setFoodSearch(e.target.value)} placeholder="Buscar alimento..."
                className="bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52" />
              <select
                value={filterGrupo}
                onChange={e => { setFilterGrupo(e.target.value); setFoodPage(1); }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Todos los grupos</option>
                {smaeGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button onClick={openCreateFood} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus size={14} /> Nuevo Alimento
              </button>
            </div>
          </div>

          {/* Food form — modal (rendered via portal below, outside foods view) */}

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
                    {/* GRUPO — sortable */}
                    <th className="text-left min-w-[150px] px-3 py-3 cursor-pointer select-none hover:bg-emerald-800 transition-colors"
                      onClick={() => handleSort('grupoSmae')}>
                      GRUPO <SortIcon field="grupoSmae" />
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
                      <td className="py-2.5 px-3">
                        {f.grupoSmae
                          ? <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap border border-emerald-100">{f.grupoSmae}</span>
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

      {/* Food form modal */}
      {showFoodForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFoodForm(false)}
        >
          <div
            ref={foodFormRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingFoodId ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <UtensilsCrossed size={15} className={editingFoodId ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{editingFoodId ? 'Editar Alimento' : 'Registrar Nuevo Alimento'}</h3>
                  <p className="text-xs text-slate-400">Campos marcados con * son obligatorios</p>
                </div>
              </div>
              <button onClick={() => setShowFoodForm(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">

              {/* ── Sección I: Identificación ─────────────────────────── */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleFoodSection('id')}
                  className="w-full flex items-center gap-2.5 py-3 px-4 text-left font-semibold text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors">
                  <UtensilsCrossed size={14} className="shrink-0" />
                  <span className="flex-1">I. IDENTIFICACIÓN</span>
                  {foodErrors.name && (
                    <span className="text-xs text-red-500 font-normal flex items-center gap-1">
                      <AlertTriangle size={11} /> incompleto
                    </span>
                  )}
                  {expandedFoodSections.id ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                </button>
                {expandedFoodSections.id && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className={labelCls}>Nombre *</label>
                      <input className={inputCls} value={foodForm.name}
                        onChange={e => setFoodForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Ej: Arroz blanco cocido" />
                      {foodErrors.name && <p className={errCls}>{foodErrors.name}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                )}
              </div>

              {/* ── Sección II: Porción sugerida ──────────────────────── */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleFoodSection('porcion')}
                  className="w-full flex items-center gap-2.5 py-3 px-4 text-left font-semibold text-sm bg-blue-50 hover:bg-blue-100 text-blue-800 transition-colors">
                  <Ruler size={14} className="shrink-0" />
                  <span className="flex-1">II. PORCIÓN SUGERIDA</span>
                  {(foodErrors.netWeight || foodErrors.grossWeight || foodErrors.porcionSugerida) && (
                    <span className="text-xs text-red-500 font-normal flex items-center gap-1">
                      <AlertTriangle size={11} /> incompleto
                    </span>
                  )}
                  {expandedFoodSections.porcion ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                </button>
                {expandedFoodSections.porcion && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className={labelCls}>Cantidad</label>
                      <input type="number" className={inputCls} value={foodForm.porcionSugerida}
                        onChange={e => setFoodForm(f => ({ ...f, porcionSugerida: e.target.value }))}
                        placeholder="0.5" min="0" step="0.01" />
                      {foodErrors.porcionSugerida && <p className={errCls}>{foodErrors.porcionSugerida}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Unidad</label>
                      <input className={inputCls} value={foodForm.unidadPorcion}
                        onChange={e => setFoodForm(f => ({ ...f, unidadPorcion: e.target.value }))}
                        placeholder="taza, pieza, g" />
                    </div>
                    <div>
                      <label className={labelCls}>Peso bruto (g)</label>
                      <input type="number" className={inputCls} value={foodForm.grossWeight}
                        onChange={e => setFoodForm(f => ({ ...f, grossWeight: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                      {foodErrors.grossWeight && <p className={errCls}>{foodErrors.grossWeight}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Peso neto (g) *</label>
                      <input type="number" className={inputCls} value={foodForm.netWeight}
                        onChange={e => setFoodForm(f => ({ ...f, netWeight: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                      {foodErrors.netWeight && <p className={errCls}>{foodErrors.netWeight}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Sección III: Composición nutrimental ──────────────── */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleFoodSection('macro')}
                  className="w-full flex items-center gap-2.5 py-3 px-4 text-left font-semibold text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors">
                  <Activity size={14} className="shrink-0" />
                  <span className="flex-1">III. COMPOSICIÓN NUTRIMENTAL</span>
                  {(foodErrors.energyKcal || foodErrors.protein || foodErrors.fats || foodErrors.carbohydrates || foodErrors.fiber || foodErrors.indiceGlucemico) && (
                    <span className="text-xs text-red-500 font-normal flex items-center gap-1">
                      <AlertTriangle size={11} /> incompleto
                    </span>
                  )}
                  {expandedFoodSections.macro ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                </button>
                {expandedFoodSections.macro && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-4">
                      <label className={labelCls}>Energía (kcal) *</label>
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
                      {foodErrors.protein && <p className={errCls}>{foodErrors.protein}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Lípidos (g)</label>
                      <input type="number" className={inputCls} value={foodForm.fats}
                        onChange={e => setFoodForm(f => ({ ...f, fats: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                      {foodErrors.fats && <p className={errCls}>{foodErrors.fats}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>HCO (g)</label>
                      <input type="number" className={inputCls} value={foodForm.carbohydrates}
                        onChange={e => setFoodForm(f => ({ ...f, carbohydrates: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                      {foodErrors.carbohydrates && <p className={errCls}>{foodErrors.carbohydrates}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Fibra (g)</label>
                      <input type="number" className={inputCls} value={foodForm.fiber}
                        onChange={e => setFoodForm(f => ({ ...f, fiber: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                      {foodErrors.fiber && <p className={errCls}>{foodErrors.fiber}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Índ. glucémico</label>
                      <input type="number" className={inputCls} value={foodForm.indiceGlucemico}
                        onChange={e => setFoodForm(f => ({ ...f, indiceGlucemico: e.target.value }))}
                        placeholder="0–100" min="0" max="100" step="1" />
                      {foodErrors.indiceGlucemico && <p className={errCls}>{foodErrors.indiceGlucemico}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Carga glucémica</label>
                      <input type="number" className={inputCls} value={foodForm.cargaGlucemica}
                        onChange={e => setFoodForm(f => ({ ...f, cargaGlucemica: e.target.value }))}
                        placeholder="0" min="0" step="0.1" />
                    </div>
                    <div className="flex items-end pb-1">
                      <p className="text-xs text-slate-400 leading-relaxed">kJ se calcula<br />automáticamente<br />(kcal × 4.184)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex-shrink-0">
              <button onClick={handleSaveFood} disabled={foodFormLoading}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${editingFoodId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {foodFormLoading
                  ? 'Guardando...'
                  : editingFoodId
                    ? <><Pencil size={14} /> Actualizar Alimento</>
                    : <><Plus size={14} /> Registrar Alimento</>}
              </button>
              <button onClick={() => setShowFoodForm(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient form modal */}
      {showPatientForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPatientForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingPatientId ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <svg className={`w-4 h-4 ${editingPatientId ? 'text-amber-600' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{editingPatientId ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
                  <p className="text-xs text-slate-400">Campos marcados con * son obligatorios</p>
                </div>
              </div>
              <button onClick={() => setShowPatientForm(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Form fields */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: 'firstName',   label: 'Nombre *',               type: 'text', ph: 'Juan' },
                  { field: 'lastName',    label: 'Apellido *',             type: 'text', ph: 'Pérez' },
                  { field: 'dateOfBirth', label: 'Fecha de Nacimiento *',  type: 'date', ph: '' },
                  { field: 'occupation',  label: 'Ocupación',              type: 'text', ph: 'Profesión' },
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
                  <select className={inputCls} value={patientForm.gender}
                    onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value as any }))}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                  {patientErrors.gender && <p className={errCls}>{patientErrors.gender}</p>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={handleSavePatient} disabled={patientFormLoading}
                className={`flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${editingPatientId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {patientFormLoading ? 'Guardando...' : editingPatientId ? 'Actualizar Paciente' : 'Registrar Paciente'}
              </button>
              <button onClick={() => setShowPatientForm(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white transition-colors">
                Cancelar
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

      {/* ── AI Assistant: FAB + side panel ───────────────────────────────── */}
      <style>{`
        @keyframes nutri-orbit-a {
          from { transform: rotate(0deg)   translateX(34px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(34px) rotate(-360deg); }
        }
        @keyframes nutri-orbit-b {
          from { transform: rotate(120deg)  translateX(28px) rotate(-120deg); }
          to   { transform: rotate(480deg)  translateX(28px) rotate(-480deg); }
        }
        @keyframes nutri-orbit-c {
          from { transform: rotate(240deg)  translateX(38px) rotate(-240deg); }
          to   { transform: rotate(600deg)  translateX(38px) rotate(-600deg); }
        }
        @keyframes nutri-orbit-d {
          from { transform: rotate(60deg)   translateX(30px) rotate(-60deg); }
          to   { transform: rotate(420deg)  translateX(30px) rotate(-420deg); }
        }
        @keyframes nutri-fab-glow {
          0%,100% { box-shadow: 0 0 0 0 #7138E833, 0 6px 28px #0003; }
          50%      { box-shadow: 0 0 0 10px #7138E811, 0 6px 32px #7138E840; }
        }
        .nutri-orbit-a { position:absolute; top:50%; left:50%; margin:-4px 0 0 -4px;
          width:8px; height:8px; border-radius:50%; background:#7138E8;
          animation: nutri-orbit-a 4s linear infinite; }
        .nutri-orbit-b { position:absolute; top:50%; left:50%; margin:-3px 0 0 -3px;
          width:6px; height:6px; border-radius:50%; background:#a78bfa; opacity:.7;
          animation: nutri-orbit-b 6s linear infinite; }
        .nutri-orbit-c { position:absolute; top:50%; left:50%; margin:-2.5px 0 0 -2.5px;
          width:5px; height:5px; border-radius:50%; background:#c4b5fd; opacity:.5;
          animation: nutri-orbit-c 5s linear infinite; }
        .nutri-orbit-d { position:absolute; top:50%; left:50%; margin:-2px 0 0 -2px;
          width:4px; height:4px; border-radius:50%; background:#7138E8; opacity:.6;
          animation: nutri-orbit-d 7s linear infinite; }
        .nutri-fab-btn { animation: nutri-fab-glow 2.5s ease-in-out infinite; }
        .nutri-panel-enter {
          transform: translateX(0) !important;
        }
      `}</style>

      {/* Side panel — slides in from right, starts at top-0 so header aligns with navbar */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: aiPanelWidth, zIndex: 60,
          display: 'flex', flexDirection: 'column',
          background: '#fff',
          borderLeft: '1px solid #1e1e2e',
          boxShadow: '-4px 0 32px #0000002a',
          transform: aiPanelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: aiResizingRef.current ? 'none' : 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Resize handle — left edge */}
        <div
          onMouseDown={e => {
            aiResizingRef.current = true;
            aiResizeStartX.current = e.clientX;
            aiResizeStartW.current = aiPanelWidth;
            const onMove = (ev: MouseEvent) => {
              if (!aiResizingRef.current) return;
              const delta = aiResizeStartX.current - ev.clientX;
              const next = Math.min(720, Math.max(300, aiResizeStartW.current + delta));
              setAiPanelWidth(next);
            };
            const onUp = () => {
              aiResizingRef.current = false;
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            e.preventDefault();
          }}
          style={{
            position: 'absolute', left: 0, top: 0, width: 5, height: '100%',
            cursor: 'col-resize', zIndex: 10,
            background: 'transparent',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#7138E822'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        />
        {/* Panel header — same height as main navbar (py-3 + content ≈ 46px) */}
        <div className="pl-4 pr-3 flex items-center gap-2 flex-shrink-0"
             style={{ background: '#0d1117', minHeight: 46, height: 46 }}>
          {/* AI icon */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ background: '#7138E820', border: '1.5px solid #7138E860' }}>
            <Bot size={14} style={{ color: '#7138E8' }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-white text-xs font-semibold">Asistente IA</span>
            {selected && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full truncate max-w-[100px]"
                    style={{ background: '#7138E820', color: '#a78bfa', border: '1px solid #7138E840' }}>
                {selected.firstName}
              </span>
            )}
          </div>
          <button
            onClick={async () => {
              const pid = selected?.id ?? 'global';
              await aiService.clearChatHistory(pid);
              setAiMessages([{ role: 'ai', text: 'Hola. Soy el Asistente Nutricional IA. Puedo ayudarte a generar recomendaciones nutricionales, analizar alimentos y también puedes subir documentos PDF para que los analice.' }]);
            }}
            title="Limpiar historial"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
            style={{ color: '#a78bfa' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#7138E820')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => setAiPanelOpen(false)}
            title="Cerrar"
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ml-0.5"
            style={{ color: '#a78bfa' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#7138E820')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: '#f8f8fc' }}>
          {aiMessages.map((msg, i) => (
            msg.role === 'ai' ? (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                     style={{ background: '#0B0B0F', border: '1.5px solid #7138E860' }}>
                  <Bot size={11} style={{ color: '#7138E8' }} />
                </div>
                <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-3 py-2 flex-1 min-w-0 overflow-x-auto shadow-sm">
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
                  {i > 0 && (
                    <div className="flex justify-end mt-1.5 border-t border-slate-100 pt-1.5">
                      <button
                        title="Descargar como PDF"
                        onClick={async () => {
                          const patientName = selected ? `${selected.firstName} ${selected.lastName}` : 'Global';
                          const date = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
                          // ── Markdown → HTML converter (handles tables, lists, headings, inline) ──
                          const mdToHtml = (raw: string): string => {
                            const lines = raw.split('\n');
                            const out: string[] = [];
                            let inList = false;
                            let inTable = false;
                            let tableHead = true;
                            let i2 = 0;
                            const inlineFormat = (s: string) =>
                              s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                               .replace(/\*(.+?)\*/g, '<em>$1</em>')
                               .replace(/`(.+?)`/g, '<code>$1</code>');

                            while (i2 < lines.length) {
                              const line = lines[i2];
                              // heading
                              const hm = line.match(/^(#{1,4})\s+(.+)$/);
                              if (hm) {
                                if (inList) { out.push('</ul>'); inList = false; }
                                if (inTable) { out.push('</tbody></table>'); inTable = false; }
                                const lvl = Math.min(hm[1].length + 1, 4);
                                out.push(`<h${lvl}>${inlineFormat(hm[2])}</h${lvl}>`);
                                i2++; continue;
                              }
                              // table row
                              if (line.trim().startsWith('|')) {
                                if (inList) { out.push('</ul>'); inList = false; }
                                const isSep = /^\|[\s\-:|\s]+\|$/.test(line.trim());
                                if (isSep) { tableHead = false; i2++; continue; }
                                if (!inTable) { out.push('<table><thead>'); inTable = true; tableHead = true; }
                                const cells = line.trim().replace(/^\||\|$/g,'').split('|').map(c => c.trim());
                                if (tableHead) {
                                  out.push('<tr>' + cells.map(c => `<th>${inlineFormat(c)}</th>`).join('') + '</tr>');
                                  tableHead = false;
                                  // check next line is separator
                                  if (i2 + 1 < lines.length && /^\|[\s\-:|\s]+\|$/.test(lines[i2+1].trim())) {
                                    out.push('</thead><tbody>');
                                    i2 += 2; continue;
                                  } else {
                                    out.push('</thead><tbody>');
                                  }
                                } else {
                                  out.push('<tr>' + cells.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
                                }
                                i2++; continue;
                              } else if (inTable) {
                                out.push('</tbody></table>'); inTable = false;
                              }
                              // list
                              const lm = line.match(/^[-*]\s+(.+)$/);
                              if (lm) {
                                if (!inList) { out.push('<ul>'); inList = true; }
                                out.push(`<li>${inlineFormat(lm[1])}</li>`);
                                i2++; continue;
                              } else if (inList) {
                                out.push('</ul>'); inList = false;
                              }
                              // empty line
                              if (line.trim() === '') { i2++; continue; }
                              // paragraph
                              out.push(`<p>${inlineFormat(line)}</p>`);
                              i2++;
                            }
                            if (inList) out.push('</ul>');
                            if (inTable) out.push('</tbody></table>');
                            return out.join('\n');
                          };

                          const bodyHtml = mdToHtml(msg.text);
                          const fullHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Plan Nutricional — ${patientName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2332;background:#fff;padding:0}
  .cover{background:linear-gradient(135deg,#0f172a,#1e1b4b);color:#fff;padding:36px 48px 28px;display:flex;align-items:center;justify-content:space-between}
  .cover-title{font-size:2rem;font-weight:800;letter-spacing:-.5px}
  .cover-sub{font-size:.95rem;opacity:.7;margin-top:4px}
  .cover-badge{background:#7138e820;border:1.5px solid #7138e860;border-radius:12px;padding:10px 18px;text-align:right}
  .cover-badge .name{font-size:1.1rem;font-weight:700;color:#c4b5fd}
  .cover-badge .label{font-size:.75rem;opacity:.65;margin-top:2px}
  .meta-bar{background:#f5f3ff;border-bottom:2px solid #ddd6fe;padding:12px 48px;display:flex;gap:32px;font-size:.82rem;color:#4c1d95}
  .meta-bar span strong{color:#7138e8}
  .content{padding:28px 48px 48px;max-width:900px;margin:0 auto}
  h2{font-size:1.15rem;font-weight:700;color:#7138e8;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #ede9fe}
  h3{font-size:1rem;font-weight:600;color:#1e1b4b;margin:18px 0 8px}
  h4{font-size:.9rem;font-weight:600;color:#374151;margin:14px 0 6px}
  p{font-size:.88rem;line-height:1.65;margin-bottom:8px;color:#374151}
  ul{margin:6px 0 10px 20px;padding-left:4px}
  li{font-size:.87rem;line-height:1.6;color:#374151;margin-bottom:3px}
  code{background:#f5f3ff;padding:1px 5px;border-radius:4px;font-size:.82rem;font-family:monospace;color:#7138e8}
  strong{font-weight:600;color:#111}
  table{width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:.85rem;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px #0001}
  thead{background:#0f172a;color:#fff}
  thead th{padding:10px 12px;text-align:left;font-weight:600;font-size:.82rem;letter-spacing:.3px}
  tbody tr:nth-child(even){background:#f5f3ff}
  tbody tr:hover{background:#ede9fe}
  td{padding:9px 12px;border-bottom:1px solid #ede9fe;vertical-align:top}
  tr{page-break-inside:avoid}
  h2,h3,h4{page-break-after:avoid}
  p,li{page-break-inside:avoid}
  .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:14px;text-align:center;font-size:.75rem;color:#9ca3af;page-break-inside:avoid}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .meta-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    thead{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    tbody tr:nth-child(even){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0}
    .content{padding:20px 32px 32px}
  }
</style></head><body>
<div class="cover">
  <div>
    <div class="cover-title">Plan Nutricional</div>
    <div class="cover-sub">NutriApp — Sistema de Gestión Nutricional</div>
  </div>
  <div class="cover-badge">
    <div class="name">${patientName}</div>
    <div class="label">Fecha: ${date}</div>
  </div>
</div>
<div class="meta-bar">
  <span>Paciente: <strong>${patientName}</strong></span>
  <span>Generado: <strong>${date}</strong></span>
  <span>Sistema: <strong>NutriApp IA</strong></span>
</div>
<div class="content">
${bodyHtml}
<div class="footer">Generado por NutriApp &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; Documento de uso clínico</div>
</div>
</body></html>`;
                          // Render off-screen (left:-9999px keeps opacity=1 so html2canvas captures content)
                          const container = document.createElement('div');
                          container.style.cssText =
                            'position:absolute;left:-9999px;top:0;width:800px;background:#fff;overflow:visible;';
                          container.innerHTML = fullHtml;   // Chrome handles <style> inside innerHTML
                          document.body.appendChild(container);
                          // Wait for layout and fonts
                          await new Promise(r => setTimeout(r, 300));
                          try {
                            const canvas = await html2canvas(container, {
                              scale: 2,
                              useCORS: true,
                              logging: false,
                              backgroundColor: '#ffffff',
                              width: 800,
                              scrollX: -window.scrollX,
                              scrollY: -window.scrollY,
                              windowWidth: 800,
                              windowHeight: container.scrollHeight,
                              x: 0,
                              y: 0,
                            });

                            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                            const margin = 10;
                            const pdfW = pdf.internal.pageSize.getWidth();
                            const pdfH = pdf.internal.pageSize.getHeight();
                            const contentW = pdfW - margin * 2;
                            const scale = canvas.width / contentW; // px per mm
                            const pageHeightPx = (pdfH - margin * 2) * scale;

                            // Find a white/near-white row to cut at (avoids splitting table rows)
                            const findCutRow = (startPx: number, idealEndPx: number): number => {
                              const ctx = canvas.getContext('2d');
                              if (!ctx) return idealEndPx;
                              const searchStart = Math.min(idealEndPx, canvas.height - 1);
                              const searchEnd = Math.max(searchStart - Math.round(pageHeightPx * 0.08), startPx + 1);
                              for (let y = searchStart; y > searchEnd; y--) {
                                const row = ctx.getImageData(0, y, canvas.width, 1).data;
                                let isLight = true;
                                for (let x = 0; x < row.length; x += 4) {
                                  if (row[x] < 230 || row[x + 1] < 230 || row[x + 2] < 230) { isLight = false; break; }
                                }
                                if (isLight) return y;
                              }
                              return idealEndPx;
                            };

                            let pageStart = 0;
                            let pageNum = 0;
                            while (pageStart < canvas.height) {
                              if (pageNum > 0) pdf.addPage();
                              const idealEnd = pageStart + pageHeightPx;
                              const pageEnd = idealEnd >= canvas.height
                                ? canvas.height
                                : findCutRow(pageStart, Math.round(idealEnd));
                              const sliceH = pageEnd - pageStart;

                              const sliceCanvas = document.createElement('canvas');
                              sliceCanvas.width = canvas.width;
                              sliceCanvas.height = sliceH;
                              const ctx2 = sliceCanvas.getContext('2d')!;
                              ctx2.fillStyle = '#ffffff';
                              ctx2.fillRect(0, 0, sliceCanvas.width, sliceH);
                              ctx2.drawImage(canvas, 0, pageStart, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

                              const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
                              pdf.addImage(sliceData, 'JPEG', margin, margin, contentW, sliceH / scale);
                              pageStart = pageEnd;
                              pageNum++;
                            }
                            pdf.save(`plan-nutricional-${patientName.replace(/\s+/g, '-')}.pdf`);
                          } finally {
                            document.body.removeChild(container);
                          }
                        }}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 transition-colors"
                      >
                        <Download size={11} /> Descargar PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2 items-start justify-end">
                <div className="flex flex-col items-end gap-1 min-w-0 max-w-[82%]">
                  {msg.fileName && (
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Paperclip size={9} /> {msg.fileName}
                    </span>
                  )}
                  <div className="text-white rounded-xl rounded-tr-sm px-3 py-2 text-xs whitespace-pre-wrap break-words"
                       style={{ background: '#7138E8' }}>
                    {msg.text}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                     style={{ background: '#0B0B0F', color: '#a78bfa' }}>Ntr</div>
              </div>
            )
          ))}
          {aiLoading && (
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                   style={{ background: '#0B0B0F', border: '1.5px solid #7138E860' }}>
                <Bot size={11} style={{ color: '#7138E8' }} />
              </div>
              <div className="bg-white border border-slate-100 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5 shadow-sm">
                {[0,1,2].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#7138E8', animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t px-3 py-2 flex-shrink-0 space-y-2" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
          {/* Model selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 flex-shrink-0">Modelo:</span>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              disabled={aiLoading}
              className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none disabled:opacity-50 cursor-pointer"
              style={{ '--tw-ring-color': '#7138E8' } as React.CSSProperties}
            >
              <option value="gpt-oss-120b">GPT-OSS 120B — Alta calidad</option>
              <option value="qwen-27b">Qwen 3.8 27B — Equilibrado</option>
              <option value="gpt-oss-20b">GPT-OSS 20B — Más rápido</option>
            </select>
          </div>
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
            <textarea
              ref={aiTextareaRef}
              value={aiInput}
              rows={1}
              onChange={e => {
                setAiInput(e.target.value);
                const el = aiTextareaRef.current;
                if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); if (aiTextareaRef.current) aiTextareaRef.current.style.height = 'auto'; } }}
              placeholder={aiFile ? 'Pregunta sobre el doc...' : 'Consulta nutricional...'}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none min-w-0 resize-none overflow-y-auto leading-relaxed"
              style={{ focusRingColor: '#7138E8' } as React.CSSProperties}
              disabled={aiLoading}
            />
            <button onClick={sendAiMessage} disabled={aiLoading || (!aiInput.trim() && !aiFile)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
              style={{ background: '#7138E8' }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* FAB — animated orbiting circles, hidden when panel is open */}
      {!aiPanelOpen && (
        <div
          className="fixed z-50"
          style={{ bottom: 28, right: 28, width: 80, height: 80 }}
        >
          {/* Orbiting particles */}
          <div className="nutri-orbit-a" />
          <div className="nutri-orbit-b" />
          <div className="nutri-orbit-c" />
          <div className="nutri-orbit-d" />
          {/* Main button */}
          <button
            onClick={() => setAiPanelOpen(true)}
            title="Abrir Asistente IA"
            className="nutri-fab-btn absolute rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 56, height: 56,
              background: '#0B0B0F',
              border: '1.5px solid #7138E840',
            }}
          >
            <Bot size={24} style={{ color: '#7138E8' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NutritionistPanel;
