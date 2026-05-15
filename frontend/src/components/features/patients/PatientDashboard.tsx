import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { patientService } from '../../../services/patientService';
import { Patient } from '../../../types/patient';

// TODO: Migrar PatientDashboard del proyecto anterior (MenuView, PatientProgressReport)
const PatientDashboard: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    patientService.getById(patientId).then(setPatient);
  }, [patientId]);

  if (!patient) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header — consistent with NutritionistPanel */}
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
              <p className="text-slate-500 text-[10px]">{user?.fullName || patient.firstName}</p>
            </div>
          </div>
        </div>

        <button onClick={logout} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
          Salir
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Mi Seguimiento</h1>
          <p className="text-slate-500 text-sm mb-6">Visualiza tu progreso nutricional y recomendaciones personalizadas</p>

          {/* Placeholder Content */}
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-500">Dashboard del paciente — pendiente de implementar</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
