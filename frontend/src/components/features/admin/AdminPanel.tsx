import React, { useState, useEffect } from 'react';
import { User, NutritionistForm } from '../../../types/auth';
import { authService } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { SuccessAlert } from '../../ui/SuccessAlert';

const EMPTY_FORM: NutritionistForm = { email: '', password: '', fullName: '', specialization: '', phone: '' };

const AdminPanel: React.FC = () => {
  const { logout } = useAuth();
  const [nutritionists, setNutritionists] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NutritionistForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [createConfirm, setCreateConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { loadNutritionists(); }, []);

  const loadNutritionists = async () => {
    try {
      const data = await authService.getNutritionists();
      setNutritionists(data);
    } catch {
      // sin nutricionistas aún
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'fullName' || name === 'specialization') {
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(value)) return;
      if (name === 'specialization' && value.length > 30) return;
    }
    if (name === 'password' && value.length > 20) return;
    if (name === 'phone') {
      if (!/^[0-9]*$/.test(value) || value.length > 10) return;
      if (value.length >= 2 && !value.startsWith('09')) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!formData.email.trim()) e.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Ingresa un email válido';

    if (!editingId || formData.password) {
      if (!formData.password.trim()) e.password = 'La contraseña es requerida';
      else if (formData.password.length < 6) e.password = 'Mínimo 6 caracteres';
    }

    if (!formData.fullName.trim()) e.fullName = 'El nombre es requerido';
    if (!formData.specialization?.trim()) e.specialization = 'La especialización es requerida';

    if (!formData.phone?.trim()) {
      e.phone = 'El teléfono es requerido';
    } else if (formData.phone.length !== 10) {
      e.phone = 'Debe tener exactamente 10 dígitos';
    } else if (!formData.phone.startsWith('09')) {
      e.phone = 'Debe comenzar con 09';
    }

    const duplicate = nutritionists.find(
      n => n.email.toLowerCase() === formData.email.toLowerCase() && n.id !== editingId
    );
    if (duplicate) e.email = 'Este email ya está registrado';

    const dupPhone = nutritionists.find(
      n => n.phone === formData.phone && n.id !== editingId
    );
    if (dupPhone) e.phone = 'Este teléfono ya está registrado';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setCreateConfirm(true);
  };

  const confirmSave = async () => {
    setLoading(true);
    try {
      if (editingId) {
        await authService.updateNutritionist(editingId, formData);
        showSuccess('Nutricionista actualizado correctamente');
        setEditingId(null);
      } else {
        await authService.createNutritionist(formData);
        showSuccess('Nutricionista creado correctamente');
      }
      await loadNutritionists();
      resetForm();
    } catch (err: any) {
      setErrors({ email: err.response?.data?.message || 'Error al guardar' });
    } finally {
      setLoading(false);
      setCreateConfirm(false);
    }
  };

  const handleEdit = (n: User) => {
    setFormData({ email: n.email, password: '', fullName: n.fullName, specialization: n.specialization || '', phone: n.phone || '' });
    setEditingId(n.id);
    setShowForm(true);
    setErrors({});
  };

  const confirmDelete = async () => {
    try {
      await authService.deleteNutritionist(deleteConfirm.id);
      await loadNutritionists();
      showSuccess('Nutricionista eliminado correctamente');
    } catch {
      showSuccess('Error al eliminar');
    }
    setDeleteConfirm({ open: false, id: '', name: '' });
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

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
              <p className="text-slate-500 text-[10px]">Administrador</p>
            </div>
          </div>
        </div>

        <button onClick={logout} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
          Salir
        </button>
      </header>

      {/* Success Alert */}
      <SuccessAlert isOpen={!!successMsg} title="Listo" message={successMsg} onClose={() => setSuccessMsg('')} />

      <div className="flex-1 flex flex-col p-5 overflow-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Nutricionistas</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona los nutricionistas registrados en el sistema</p>
        </div>

        {/* Action Button */}
        <div className="mb-6 flex justify-between items-center">
          <div />
          <button
            onClick={() => showForm ? resetForm() : setShowForm(true)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              showForm
                ? 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {showForm ? 'Cancelar' : '+ Agregar Nutricionista'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar Nutricionista' : 'Nuevo Nutricionista'}</h3>
            
            {Object.values(errors).some(v => v) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-bold mb-2">Corrige los errores:</p>
                <ul className="space-y-1">
                  {Object.entries(errors).filter(([, v]) => v).map(([k, err]) => (
                    <li key={k} className="text-red-700 text-xs">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Juan Pérez" className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="juan@clinica.ec" className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contraseña</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={editingId ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Especialización</label>
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Nutrición Deportiva" className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Teléfono</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="09XXXXXXXX" className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {nutritionists.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500">Sin nutricionistas registrados</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Especialización</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nutritionists.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{n.fullName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{n.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{n.specialization || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{n.phone || '—'}</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(n)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, id: n.id, name: n.fullName })}
                          className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Diálogos */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Eliminar Nutricionista"
        message={`¿Estás seguro de eliminar a ${deleteConfirm.name}?\n\nEsta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: '', name: '' })}
      />

      <ConfirmDialog
        isOpen={createConfirm}
        title={editingId ? 'Confirmar actualización' : 'Confirmar creación'}
        message={
          editingId
            ? `¿Actualizar los datos de ${formData.fullName}?`
            : `¿Crear nutricionista?\n\nNombre: ${formData.fullName}\nEmail: ${formData.email}`
        }
        confirmText={editingId ? 'Actualizar' : 'Crear'}
        cancelText="Cancelar"
        variant="primary"
        onConfirm={confirmSave}
        onCancel={() => setCreateConfirm(false)}
      />

      <SuccessAlert
        isOpen={!!successMsg}
        title="Operación exitosa"
        message={successMsg}
        onClose={() => setSuccessMsg('')}
      />
    </div>
  );
};

export default AdminPanel;
