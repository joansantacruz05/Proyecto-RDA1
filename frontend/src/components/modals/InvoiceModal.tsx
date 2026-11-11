import React from 'react';
import { Printer, CheckCircle, Building2, FileText, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { ExtraCargoItem } from '../../api/types';
import { formatUSD } from '../ui/PriceDisplay/PriceDisplay';

function formatDateShort(raw?: string | undefined): string {
  if (!raw) return '';
  return String(raw).split('T')[0] || String(raw);
}

export interface InvoiceModalData {
  numeroFactura: string;
  fechaEmision?: string | undefined;
  razonSocial: string;
  identificacion: string;
  clienteEmail?: string | undefined;
  direccionCliente?: string | undefined;
  alojamientoNombre: string;
  alojamientoDireccion?: string | undefined;
  alojamientoDestino?: string | undefined;
  habitacionNombre?: string | undefined;
  fechaEntrada?: string | undefined;
  fechaSalida?: string | undefined;
  huespedes?: number | undefined;
  metodoPago?: string | undefined;
  estadoPago?: string | undefined;
  subtotal: number;
  iva: number;
  tasaMunicipal: number;
  total: number;
  extrasCargos?: ExtraCargoItem[] | undefined;
  cargosAdicionalesTotal?: number | undefined;
  ordenId?: string | undefined;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceModalData | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, invoice }) => {
  if (!invoice) return null;

  const extras = Array.isArray(invoice.extrasCargos) ? invoice.extrasCargos : [];
  const extrasSum = extras.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const hospedajeBase = Math.max(0, Number((invoice.subtotal - extrasSum).toFixed(2)));
  const claveAcceso = `111120260117900123450012${invoice.numeroFactura.replace(/\D/g, '').padStart(15, '0')}1234567819`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura Electrónica SRI · ${invoice.numeroFactura}`}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', color: '#0F1E33' }}>
        {/* Encabezado Emisor y Autorización SRI */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Building2 size={20} color="#14406B" />
              <strong style={{ fontSize: '16px', color: '#0F1E33' }}>LUXESTAYS ECUADOR S.A.</strong>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.55 }}>
              <div><strong>RUC Emisor:</strong> 1790012345001</div>
              <div><strong>Dirección Matriz:</strong> Av. República del Salvador N36-84, Quito - Ecuador</div>
              <div><strong>Establecimiento / Hospedaje:</strong> {invoice.alojamientoNombre}</div>
              {(invoice.alojamientoDireccion || invoice.alojamientoDestino) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: '#14406B', fontWeight: 600 }}>
                  <MapPin size={12} />
                  <span>
                    {invoice.alojamientoDireccion
                      ? `${invoice.alojamientoDireccion}${invoice.alojamientoDestino ? ` · ${invoice.alojamientoDestino}` : ''}`
                      : invoice.alojamientoDestino}
                  </span>
                </div>
              )}
              <div><strong>Obligado a llevar contabilidad:</strong> SÍ</div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              lineHeight: 1.55,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: '#14406B', fontSize: '13px' }}>FACTURA ELECTRÓNICA</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                <CheckCircle size={12} /> AUTORIZADA SRI
              </span>
            </div>
            <div><strong>N.° Comprobante:</strong> <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700 }}>{invoice.numeroFactura}</span></div>
            <div><strong>Fecha de Emisión:</strong> {invoice.fechaEmision ? formatDateShort(invoice.fechaEmision) : formatDateShort(new Date().toISOString())}</div>
            <div><strong>Ambiente:</strong> PRODUCCIÓN · <strong>Emisión:</strong> NORMAL</div>
            <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#64748B', wordBreak: 'break-all' }}>
              <strong>Clave de Acceso SRI:</strong> {claveAcceso}
            </div>
          </div>
        </div>

        {/* Datos del Cliente / Adquirente */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <div>
            <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Razón Social / Nombres y Apellidos</span>
            <strong>{invoice.razonSocial || 'Consumidor Final'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Identificación (Cédula / RUC / Pasaporte)</span>
            <strong style={{ fontFamily: 'monospace' }}>{invoice.identificacion || '9999999999999'}</strong>
          </div>
          {invoice.clienteEmail && (
            <div>
              <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Correo Electrónico</span>
              <strong>{invoice.clienteEmail}</strong>
            </div>
          )}
          <div>
            <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Dirección Fiscal</span>
            <strong>{invoice.direccionCliente || invoice.alojamientoDireccion || 'Quito, Ecuador'}</strong>
          </div>
        </div>

        {/* Resumen de Estancia */}
        {(invoice.fechaEntrada || invoice.habitacionNombre) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              fontSize: '12.5px',
              color: '#0C4A6E',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              <span><strong>Unidad:</strong> {invoice.habitacionNombre || 'Suite Estándar'}</span>
            </div>
            {invoice.fechaEntrada && invoice.fechaSalida && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                <span>
                  <strong>Estancia:</strong> {formatDateShort(invoice.fechaEntrada)} al {formatDateShort(invoice.fechaSalida)}
                </span>
              </div>
            )}
            {invoice.huespedes && (
              <div>
                <strong>Huéspedes:</strong> {invoice.huespedes}
              </div>
            )}
            {invoice.ordenId && (
              <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '11.5px' }}>
                Orden: {invoice.ordenId.slice(0, 12).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Tabla de Conceptos Facturados */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', color: '#334155', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>Cant.</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>Descripción del Servicio / Consumo</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>P. Unitario</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 600 }}>1</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                  <strong>Servicio de Hospedaje Turístico · {invoice.alojamientoNombre}</strong>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {invoice.habitacionNombre || 'Habitación reservada'}
                    {invoice.alojamientoDireccion ? ` — Ubicación: ${invoice.alojamientoDireccion}` : ''}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                  {formatUSD(hospedajeBase)}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', fontWeight: 600 }}>
                  {formatUSD(hospedajeBase)}
                </td>
              </tr>
              {extras.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 600 }}>
                    {item.cantidad}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    <span>Cargo adicional en recepción: <strong>{item.concepto}</strong></span>
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                    {formatUSD(Number(item.precioUnitario || 0))}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', fontWeight: 600 }}>
                    {formatUSD(Number(item.subtotal || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Forma de Pago y Totales SRI */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px', color: '#14406B' }}>
              <CreditCard size={14} /> Forma de Pago SRI
            </div>
            <div><strong>Método:</strong> {invoice.metodoPago || 'Tarjeta de Crédito / Débito (20 - Otros con utilización del sistema financiero)'}</div>
            <div style={{ marginTop: '4px' }}>
              <strong>Estado de Pago:</strong>{' '}
              <span style={{ color: '#059669', fontWeight: 700 }}>{invoice.estadoPago || 'Completado'}</span>
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Subtotal Gravado 15%:</span>
              <strong>{formatUSD(invoice.subtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>IVA Servicios Turísticos (15%):</span>
              <strong>{formatUSD(invoice.iva)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>Tasa Municipal Turística:</span>
              <strong>{formatUSD(invoice.tasaMunicipal)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #F59E0B',
                paddingTop: '8px',
                marginTop: '4px',
                fontSize: '15px',
                fontWeight: 800,
                color: '#0F1E33',
              }}
            >
              <span>VALOR TOTAL USD:</span>
              <span style={{ color: '#14406B' }}>{formatUSD(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="gold" icon={<Printer size={16} />} onClick={handlePrint}>
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};
