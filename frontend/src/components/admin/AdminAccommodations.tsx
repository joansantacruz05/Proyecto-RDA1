import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { Alojamiento } from '../../types';
import { api } from '../../lib/api';

interface AdminAccommodationsProps {
  alojamientos: Alojamiento[];
  onRefresh: () => void;
}

export const AdminAccommodations: React.FC<AdminAccommodationsProps> = ({
  alojamientos,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Alojamiento | null>(null);

  // Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ciudad, setCiudad] = useState('Quito');
  const [direccion, setDireccion] = useState('');
  const [tipo, setTipo] = useState('Hotel');
  const [precioBaseNoche, setPrecioBaseNoche] = useState(120);
  const [amenitiesStr, setAmenitiesStr] = useState('Wi-Fi Gratis, Piscina, Desayuno');
  const [fotosStr, setFotosStr] = useState('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreate = () => {
    setEditingItem(null);
    setTitulo('');
    setDescripcion('');
    setCiudad('Quito');
    setDireccion('');
    setTipo('Hotel');
    setPrecioBaseNoche(120);
    setAmenitiesStr('Wi-Fi Gratis, Piscina, Desayuno');
    setFotosStr('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEdit = (item: Alojamiento) => {
    setEditingItem(item);
    setTitulo(item.titulo);
    setDescripcion(item.descripcion || '');
    setCiudad(item.ciudad);
    setDireccion(item.direccion || '');
    setTipo(item.tipo);
    setPrecioBaseNoche(Number(item.precioBaseNoche) || 120);
    setAmenitiesStr(item.amenities ? item.amenities.join(', ') : '');
    setFotosStr(item.fotos ? item.fotos.join('\n') : '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      titulo,
      descripcion,
      ciudad,
      direccion,
      tipo,
      precioBaseNoche: Number(precioBaseNoche),
      amenities: amenitiesStr.split(',').map((s) => s.trim()).filter(Boolean),
      fotos: fotosStr.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (editingItem) {
        await api.put(`/admin/alojamientos/${editingItem.id}`, payload);
      } else {
        await api.post('/admin/alojamientos', payload);
      }
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el alojamiento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await api.delete(`/admin/alojamientos/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar el alojamiento.');
    }
  };

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">Catálogo de Alojamientos</h3>
          <p className="text-xs text-gray-400">
            Administra propiedades, fotos y amenidades publicadas en LuxeStays.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] text-xs font-bold cursor-pointer shadow-md shadow-[#D4AF37]/20 self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Nuevo Alojamiento</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Propiedad</th>
              <th className="p-3">Destino</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Precio Base</th>
              <th className="p-3">Habitaciones</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {alojamientos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No hay alojamientos registrados. Agrega uno con el botón superior.
                </td>
              </tr>
            ) : (
              alojamientos.map((a) => (
                <tr key={a.id} className="hover:bg-white/5 transition">
                  <td className="p-3 flex items-center gap-3">
                    <img
                      src={a.fotos?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=120&q=80'}
                      alt={a.titulo}
                      className="w-10 h-10 rounded-lg object-cover bg-black"
                    />
                    <div>
                      <div className="font-semibold text-white">{a.titulo}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-xs">{a.direccion}</div>
                    </div>
                  </td>
                  <td className="p-3 font-medium text-white">{a.ciudad}</td>
                  <td className="p-3">
                    <span className="bg-white/10 text-gray-200 text-[10px] px-2 py-0.5 rounded">
                      {a.tipo}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[#D4AF37]">
                    ${Number(a.precioBaseNoche || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-gray-400">
                    {a.habitaciones?.length ?? 0} configuradas
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                        title="Eliminar"
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

      {/* Modal Crear / Editar Alojamiento */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Editar Alojamiento' : 'Registrar Nuevo Alojamiento'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Título de la Propiedad *</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Hotel Boutique Colonial San Francisco"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Ciudad / Destino *</label>
              <select
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="Quito">Quito</option>
                <option value="Guayaquil">Guayaquil</option>
                <option value="Cuenca">Cuenca</option>
                <option value="Manta">Manta</option>
                <option value="Baños de Agua Santa">Baños de Agua Santa</option>
                <option value="Galápagos">Galápagos</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Tipo de Propiedad *</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="Hotel">Hotel</option>
                <option value="Airbnb">Airbnb</option>
                <option value="Resort">Resort</option>
                <option value="Hostería">Hostería</option>
                <option value="Villa">Villa Privada</option>
                <option value="Hotel Boutique">Hotel Boutique</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Dirección Exacta</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. García Moreno y Sucre, Centro Histórico"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">Descripción</label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla las características y encanto del lugar..."
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Precio Base Referencial (USD/noche)</label>
              <input
                type="number"
                min="10"
                value={precioBaseNoche}
                onChange={(e) => setPrecioBaseNoche(Number(e.target.value))}
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Amenidades (Separadas por comas)</label>
              <input
                type="text"
                value={amenitiesStr}
                onChange={(e) => setAmenitiesStr(e.target.value)}
                placeholder="Wi-Fi, Piscina, Spa, Restaurante"
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 mb-1">URLs de Fotos (Una por línea o separadas por comas)</label>
              <textarea
                rows={2}
                value={fotosStr}
                onChange={(e) => setFotosStr(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#0B132B] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37] resize-none"
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
              <span>{saving ? 'Guardando...' : 'Guardar Propiedad'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAccommodations;
