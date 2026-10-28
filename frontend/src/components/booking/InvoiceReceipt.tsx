import React from 'react';
import { Printer, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { FacturaSRI } from '../../types';

interface InvoiceReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  factura: FacturaSRI | null;
}

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({ isOpen, onClose, factura }) => {
  if (!factura) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comprobante Tributario Electrónico SRI" maxWidth="max-w-xl">
      <div className="space-y-4 text-xs font-sans print:text-black">
        {/* Cabecera de la Factura */}
        <div className="bg-[#0B132B] p-4 rounded-xl border border-white/10 flex justify-between items-start">
          <div>
            <div className="text-sm font-bold text-white tracking-wide">LUXESTAYS ECUADOR S.A.S.</div>
            <div className="text-gray-400 text-[11px] mt-0.5">RUC: 1792994832001</div>
            <div className="text-gray-400 text-[11px]">Matriz: Av. República del Salvador y Shirys, Quito</div>
            <div className="text-gray-400 text-[11px]">Contribuyente Régimen General</div>
          </div>

          <div className="text-right">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              AUTORIZADO SRI
            </span>
            <div className="text-xs text-gray-400 mt-2">FACTURA N°:</div>
            <div className="text-sm font-mono font-bold text-[#D4AF37]">
              {factura.numeroFactura || '001-001-000000001'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Fecha: {new Date(factura.createdAt || Date.now()).toLocaleDateString('es-EC')}
            </div>
          </div>
        </div>

        {/* Datos del Cliente */}
        <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
          <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
            Información del Adquirente
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Razón Social:</span>{' '}
              <strong className="text-white">{factura.clienteNombre}</strong>
            </div>
            <div>
              <span className="text-gray-400">Identificación:</span>{' '}
              <strong className="text-white font-mono">{factura.clienteIdentificacion}</strong> (
              {factura.tipoIdentificacion})
            </div>
          </div>
        </div>

        {/* Detalle de Rubros */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B132B] text-gray-400 text-[11px]">
              <tr>
                <th className="p-2.5">Descripción del Servicio</th>
                <th className="p-2.5 text-right">Monto (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-200">
              <tr>
                <td className="p-2.5">Servicio de Hospedaje y Alojamiento Temporal</td>
                <td className="p-2.5 text-right font-mono">${Number(factura.subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Tasa Municipal de Turismo y Pernoctación</td>
                <td className="p-2.5 text-right font-mono">
                  ${Number(factura.tasaMunicipal || 2.0).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="p-2.5">Impuesto al Valor Agregado (IVA 15%)</td>
                <td className="p-2.5 text-right font-mono">${Number(factura.iva).toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-[#0B132B] text-white font-bold border-t border-white/10">
              <tr>
                <td className="p-2.5 text-sm">TOTAL IMPORTE:</td>
                <td className="p-2.5 text-right text-base text-[#D4AF37] font-mono">
                  ${Number(factura.total).toFixed(2)} USD
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <CheckCircle size={13} className="text-emerald-400" />
          <span>Comprobante válido para crédito tributario y deducibilidad de gastos conforme normativa SRI Ecuador.</span>
        </div>

        {/* Botones */}
        <div className="pt-2 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20"
          >
            <Printer size={14} />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceReceipt;
