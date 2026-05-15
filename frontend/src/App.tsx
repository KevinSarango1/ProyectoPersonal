import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// TODO: importar los componentes reales cuando estén listos
const Login = React.lazy(() => import('./components/features/auth/Login'));
const AdminPanel = React.lazy(() => import('./components/features/admin/AdminPanel'));
const NutritionistPanel = React.lazy(() => import('./components/features/patients/NutritionistPanel'));
const PatientDashboard = React.lazy(() => import('./components/features/patients/PatientDashboard'));

const AppRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Login />;
  if (user.role === 'ADMIN') return <AdminPanel />;
  if (user.role === 'NUTRITIONIST') return <NutritionistPanel />;
  if (user.role === 'PATIENT') return <PatientDashboard patientId={user.id} />;

  return null;
};

const App: React.FC = () => (
  <AuthProvider>
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <AppRouter />
    </React.Suspense>
  </AuthProvider>
);

export default App;
