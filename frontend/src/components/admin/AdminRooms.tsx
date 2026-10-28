import React, { useState } from 'react';
import { Plus, Edit2, Trash2, BedDouble, Users, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Alojamiento, Habitacion } from '../../types';
import { api } from '../../lib/api';

interface AdminRoomsProps {
  alojamientos: Alojamiento[];
  onRefresh: () => void;
}

export const AdminRooms: React.FC<AdminRoomsProps> = ({ alojamientos, onRefresh }) => {
  const [selectedAlojamientoId, setSelectedAlojamientoId] = useState<string | number>(
    alojamientos[0]?.id || ''
  );

  const selectedAlojamiento =
    alojamientos.find((a) => String(a.id) === String(selectedAlojamientoId)) || alojamientos[0];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Habitacion | null>(null);

  // Formulario
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Suite');
  const [precioNoche, setPrecioNoche] = useState(150);
  const [capacidad, setCapacidad] = useState(2);
  const [cantidadDisponible, setCantidadDisponible] = useState(5);
  const [amenitiesStr, setAmenitiesStr] = useState('Cama King, Smart TV, Wi-Fi, Jacuzzi');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreate = () => {
    if (!selectedAlojamiento) return;
    setEditingRoom(null);
    setTitulo('');
    setTipo('Suite');
    setPrecioNoche(150);
    setCapacidad(2);
    setCantidadDisponible(5);
    setAmenitiesStr('Cama King, Smart TV, Wi-Fi, Jacuzzi');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (room: Habitacion) => {
    setEditingRoom(room);
    setTitulo(room.titulo);
    setTipo(room.tipo);
    setPrecioNoche(Number(room.precioNoche) || 150);
    setCapacidad(room.capacidad || 2);
    setCantidadDisponible(room.cantidadDisponible ?? 5);
    setAmenitiesStr(room.amenities ? room.amenities.join(', ') : '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlojamiento) return;

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      alojamientoId: selectedAlojamiento.id,
      titulo,
      tipo,
      precioNoche: Number(precioNoche),
      capacidad: Number(capacidad),
      cantidadDisponible: Number(cantidadDisponible),
      amenities: amenitiesStr.split(',').map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (editingRoom) {
        await api.put(`/admin/habitaciones/${editingRoom.id}`, payload);
      } else {
        await api.post('/admin/habitaciones', payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la habitación.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.delete(`/admin/habitaciones/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la habitación.');
    }
  };

  const habitaciones = selectedAlojamiento?.habitaciones || [];

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">Gestión de Habitaciones e Inventario</h3>
          <p className="text-xs text-gray-400">
            Controla tipos de habitación, capacidad, precios dinámicos y cupos disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Alojamiento */}
          <select
            value={selectedAlojamientoId}
            onChange={(e) => setSelectedAlojamientoId(e.target.value)}
            className="bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
          >
            {alojamientos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.titulo} ({a.ciudad})
              </option>
            ))}
          </select>

          <button
            onClick={openCreate}
            disabled={!selectedAlojamiento}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] text-xs font-bold cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            <Plus size={15} />
            <span>Nueva Habitación</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Habitación / Suite</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Capacidad</th>
              <th className="p-3">Precio / Noche</th>
              <th className="p-3">Stock Disponible</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {habitaciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No hay habitaciones registradas para esta propiedad. Haz clic en "Nueva Habitación".
                </td>
              </tr>
            ) : (
              habitaciones.map((h) => (
                <tr key={h.id} className="hover:bg-white/5 transition">
                  <td className="p-3 font-semibold text-white flex items-center gap-2">
                    <BedDouble size={16} className="text-[#D4AF37]" />
                    <span>{h.titulo}</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-white/10 text-gray-200 text-[10px] px-2 py-0.5 rounded">
                      {h.tipo}
                    </span>
                  </td>
                  <td className="p-3 flex items-center gap-1 text-gray-300">
                    <Users size={13} className="text-gray-400" />
                    <span>{h.capacidad} personas</span>
                  </td>
                  <td className="p-3 font-mono text-[#D4AF37]">
                    ${Number(h.precioNoche || 0).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] font-mono ${
                        h.cantidadDisponible > 2
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : h.cantidadDisponible > 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {h.cantidadDisponible} unidades
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(h)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                        title="Editar Habitación"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                        title="Eliminar Habitación"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Habitación */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? 'Editar Habitación' : 'Nueva Habitación en Inventario'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Nombre / Título de la Habitación *</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Master Suite Vista Panorámica"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Categoría / Tipo *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="Suite">Suite</option>
                <option value="Habitación Estándar">Habitación Estándar</option>
                <option value="Habitación Familiar">Habitación Familiar</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Villa Completa">Villa Completa</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Precio por Noche (USD) *</label>
              <input
                type="number"
                min="10"
                required
                value={precioNoche}
                onChange={(e) => setPrecioNoche(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Capacidad Máxima (Personas) *</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={capacidad}
                onChange={(e) => setCapacidad(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Cantidad de Cuartos Disponibles *</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={cantidadDisponible}
                onChange={(e) => setCantidadDisponible(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Amenidades del Cuarto (Separadas por comas)</label>
              <input
                type="text"
                value={amenitiesStr}
                onChange={(e) => setAmenitiesStr(e.target.value)}
                placeholder="Cama King, Balcón, Bañera, Smart TV"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              <span>{saving ? 'Guardando...' : 'Guardar Habitación'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminRooms;
