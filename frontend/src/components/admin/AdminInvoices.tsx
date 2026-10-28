import React, { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import type { FacturaSRI } from '../../types';
import { InvoiceReceipt } from '../booking/InvoiceReceipt';

interface AdminInvoicesProps {
  facturas: FacturaSRI[];
}

export const AdminInvoices: React.FC<AdminInvoicesProps> = ({ facturas }) => {
  const [selectedFactura, setSelectedFactura] = useState<FacturaSRI | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const facturasFiltradas = facturas.filter((f) => {
    const q = busqueda.toLowerCase();
    return (
      f.numeroFactura?.toLowerCase().includes(q) ||
      f.clienteNombre?.toLowerCase().includes(q) ||
      f.clienteIdentificacion?.includes(q)
    );
  });

  return (
    <div className="bg-[#1C2541]/70 border border-white/10 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-white">Facturación Electrónica SRI (001-001)</h3>
          <p className="text-xs text-gray-400">
            Comprobantes fiscales generados secuencialmente con 15% IVA y tasas municipales.
          </p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por N° o RUC..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-[#0B132B] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B132B] text-gray-400 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Secuencial SRI</th>
              <th className="p-3">Cliente / Razón Social</th>
              <th className="p-3">Cédula / RUC</th>
              <th className="p-3">Subtotal</th>
              <th className="p-3">IVA (15%)</th>
              <th className="p-3">Total (USD)</th>
              <th className="p-3">Emisión</th>
              <th className="p-3 text-right">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {facturasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No hay comprobantes tributarios registrados para el criterio de búsqueda.
                </td>
              </tr>
            ) : (
              facturasFiltradas.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition">
                  <td className="p-3 font-mono font-bold text-[#D4AF37]">
                    {f.numeroFactura}
                  </td>
                  <td className="p-3 font-semibold text-white">{f.clienteNombre}</td>
                  <td className="p-3 font-mono text-gray-300">
                    {f.clienteIdentificacion}{' '}
                    <span className="text-[10px] text-gray-500">({f.tipoIdentificacion})</span>
                  </td>
                  <td className="p-3 font-mono">${Number(f.subtotal).toFixed(2)}</td>
                  <td className="p-3 font-mono text-gray-400">${Number(f.iva).toFixed(2)}</td>
                  <td className="p-3 font-mono font-bold text-white">
                    ${Number(f.total).toFixed(2)}
                  </td>
                  <td className="p-3 text-[11px] text-gray-400">
                    {new Date(f.createdAt || Date.now()).toLocaleDateString('es-EC')}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedFactura(f)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[#D4AF37] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <Eye size={12} />
                      <span>Ver Factura</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InvoiceReceipt
        isOpen={!!selectedFactura}
        onClose={() => setSelectedFactura(null)}
        factura={selectedFactura}
      />
    </div>
  );
};

export default AdminInvoices;
