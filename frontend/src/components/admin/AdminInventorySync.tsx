import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Search, CheckCircle, AlertTriangle, XCircle, Database, Server, Loader2 } from 'lucide-react';
import type { StockOutboxItem, Habitacion } from '../../types';
import { api } from '../../lib/api';

interface AdminInventorySyncProps {
  habitaciones: Habitacion[];
}

export const AdminInventorySync: React.FC<AdminInventorySyncProps> = ({ habitaciones }) => {
  const [outboxItems, setOutboxItems] = useState<StockOutboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Verificador de slot
  const [verificarHabId, setVerificarHabId] = useState<string | number>(
    habitaciones[0]?.id || ''
  );
  const [verificarFecha, setVerificarFecha] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [verificacionResultado, setVerificacionResultado] = useState<any | null>(null);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const data = await api.get<StockOutboxItem[]>('/admin/inventario/outbox');
      setOutboxItems(data || []);
    } catch (err: any) {
      console.warn('No se pudo cargar la cola outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
  }, []);

  const handleSync90Days = async () => {
    setActionLoading('sync90');
    setMessage(null);
    try {
      const res = await api.post('/admin/inventario/sincronizar');
      setMessage({
        text: `Sincronización masiva de 90 días completada con éxito. Registros encolados/enviados: ${
          res.totalProcesados ?? res.totalEncolados ?? 'OK'
        }`,
        type: 'success',
      });
      fetchOutbox();
    } catch (err: any) {
      setMessage({
        text: `Error en la sincronización gRPC con Booking Hub: ${err.message}`,
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessOutbox = async () => {
    setActionLoading('process');
    setMessage(null);
    try {
      const res = await api.post('/admin/inventario/procesar-outbox');
      setMessage({
        text: `Cola Outbox procesada. Éxito: ${res.procesados ?? res.enviados ?? 0}, Errores: ${
          res.fallidos ?? 0
        }`,
        type: 'success',
      });
      fetchOutbox();
    } catch (err: any) {
      setMessage({
        text: `Error al procesar la cola: ${err.message}`,
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifySlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('verify');
    setVerificacionResultado(null);
    try {
      const res = await api.post('/admin/inventario/verificar', {
        habitacionId: verificarHabId,
        fecha: verificarFecha,
      });
      setVerificacionResultado(res);
    } catch (err: any) {
      setVerificacionResultado({ error: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const pendientesCount = outboxItems.filter((i) => i.estado === 'PENDIENTE').length;
  const fallidosCount = outboxItems.filter((i) => i.estado === 'FALLIDO').length;

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Server size={18} className="text-[#D4AF37]" />
            <h3 className="text-base font-bold text-white">
              Sincronización gRPC & Patrón Transaccional Outbox
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Transmisión de disponibilidad en tiempo real hacia el Booking Hub (Port 50051 · inventory.proto).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync90Days}
            disabled={!!actionLoading}
            className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {actionLoading === 'sync90' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>Sincronizar 90 Días</span>
          </button>

          <button
            onClick={handleProcessOutbox}
            disabled={!!actionLoading}
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'process' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            <span>Procesar Cola</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={15} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle size={15} className="shrink-0 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Resumen de Estado del Outbox */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#0B132B] p-3 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-gray-400">Total Eventos Registrados</div>
            <div className="text-xl font-bold font-mono text-white">{outboxItems.length}</div>
          </div>
          <Database size={20} className="text-gray-500" />
        </div>

        <div className="bg-[#0B132B] p-3 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-gray-400">Pendientes de Envío</div>
            <div className="text-xl font-bold font-mono text-amber-400">{pendientesCount}</div>
          </div>
          <RefreshCw size={20} className="text-amber-400" />
        </div>

        <div className="bg-[#0B132B] p-3 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-gray-400">Envíos con Error</div>
            <div className="text-xl font-bold font-mono text-red-400">{fallidosCount}</div>
          </div>
          <XCircle size={20} className="text-red-400" />
        </div>
      </div>

      {/* Verificador de Disponibilidad (Slot RPC) */}
      <div className="bg-[#0B132B] p-4 rounded-xl border border-white/10">
        <h4 className="text-xs font-bold uppercase text-white tracking-wider mb-2 flex items-center gap-1.5">
          <Search size={14} className="text-[#D4AF37]" />
          Verificador en Vivo de Disponibilidad por Slot (gRPC)
        </h4>

        <form onSubmit={handleVerifySlot} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">Habitación a consultar</label>
            <select
              value={verificarHabId}
              onChange={(e) => setVerificarHabId(e.target.value)}
              className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {habitaciones.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.titulo} (ID {h.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Fecha de Consulta</label>
            <input
              type="date"
              value={verificarFecha}
              onChange={(e) => setVerificarFecha(e.target.value)}
              className="w-full bg-[#1C2541] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={actionLoading === 'verify'}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {actionLoading === 'verify' && <Loader2 size={13} className="animate-spin" />}
              <span>Consultar Slot Remoto</span>
            </button>
          </div>
        </form>

        {verificacionResultado && (
          <div className="mt-3 p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-[11px] text-gray-300">
            {verificacionResultado.error ? (
              <span className="text-red-400">Error: {verificacionResultado.error}</span>
            ) : (
              <div>
                <span className="text-emerald-400 font-bold">✓ Respuesta gRPC Exitosa:</span>
                <pre className="mt-1 text-gray-400 overflow-x-auto">
                  {JSON.stringify(verificacionResultado, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Registros de la Cola Outbox */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-white">Eventos Recientes en `stock_outbox`</span>
          <button
            onClick={fetchOutbox}
            disabled={loading}
            className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Refrescar Cola</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-2.5">ID</th>
                <th className="p-2.5">Habitación</th>
                <th className="p-2.5">Fecha Slot</th>
                <th className="p-2.5">Unidades Disp.</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5">Reintentos</th>
                <th className="p-2.5">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {outboxItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No hay eventos en la cola outbox en este momento.
                  </td>
                </tr>
              ) : (
                outboxItems.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="p-2.5 font-mono text-gray-400">#{item.id}</td>
                    <td className="p-2.5 font-mono font-medium text-white">
                      Hab. {item.habitacionId}
                    </td>
                    <td className="p-2.5 font-mono text-gray-300">{item.fecha}</td>
                    <td className="p-2.5 font-mono font-bold text-[#D4AF37]">
                      {item.cantidadDisponible}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          item.estado === 'ENVIADO'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.estado === 'PENDIENTE'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-gray-400">{item.reintentos}</td>
                    <td className="p-2.5 text-[10px] text-gray-500 font-mono">
                      {new Date(item.updatedAt || item.createdAt).toLocaleTimeString('es-EC')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInventorySync;
