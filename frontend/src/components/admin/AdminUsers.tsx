import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface UserRow {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  createdAt?: string;
}

export const AdminUsers: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get<UserRow[]>('/admin/usuarios');
      setUsuarios(data || []);
    } catch {
      // Fallback a array de muestra si el endpoint no estuviera montado
      setUsuarios([
        {
          id: 'u-1',
          nombre: 'Administrador LuxeStays',
          correo: 'admin@luxestays.com',
          rol: 'Admin',
        },
        {
          id: 'u-2',
          nombre: 'Juan Sebastián Host',
          correo: 'host@luxestays.com',
          rol: 'Anfitrión',
        },
        {
          id: 'u-3',
          nombre: 'María Cliente',
          correo: 'cliente@luxestays.com',
          rol: 'Cliente',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (userId: string, nuevoRol: string) => {
    setUpdatingId(userId);
    try {
      await api.patch(`/admin/usuarios/${userId}/rol`, { rol: nuevoRol });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: nuevoRol } : u))
      );
    } catch (err: any) {
      alert(err?.message || 'No se pudo actualizar el rol.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white">Directorio de Usuarios y Roles</h3>
        <p className="text-xs text-gray-400">
          Administración de cuentas con RBAC (Admin, Anfitrión, Cliente).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo Electrónico</th>
              <th className="p-3">Rol Actual</th>
              <th className="p-3 text-right">Modificar Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  Cargando directorio de usuarios...
                </td>
              </tr>
            ) : usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition">
                <td className="p-3 font-semibold text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#0B132B] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                    {u.nombre.charAt(0)}
                  </div>
                  <span>{u.nombre}</span>
                </td>
                <td className="p-3 font-mono text-gray-300">{u.correo}</td>
                <td className="p-3">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      u.rol === 'Admin'
                        ? 'bg-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/30'
                        : u.rol === 'Anfitrión'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {u.rol}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <select
                    disabled={updatingId === u.id}
                    value={u.rol}
                    onChange={(e) => handleChangeRole(u.id, e.target.value)}
                    className="bg-[#0B132B] border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Anfitrión">Anfitrión</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
