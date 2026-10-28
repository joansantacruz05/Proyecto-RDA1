import React from 'react';
import { Crown, Shield, FileText, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Crown size={24} style={{ color: '#D4AF37' }} />
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.05em' }}>
            LUXE<span style={{ color: '#D4AF37' }}>STAYS</span>
          </span>
        </div>

        <p>
          Colección de hospitalidad premium y alojamientos exclusivos en el Ecuador. Integración multimodal
          certificada bajo estándares GDS Core Hub y sincronización gRPC de inventario en tiempo real.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            margin: '24px 0',
            fontSize: '0.85rem',
            color: '#9CA3AF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} style={{ color: '#D4AF37' }} />
            <span>Facturación Electrónica SRI (001-001)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} style={{ color: '#D4AF37' }} />
            <span>Contratos Digitales de Arrendamiento</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} style={{ color: '#10B981' }} />
            <span>Transacciones Idempotentes RFC 7807</span>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} LuxeStays Ecuador · Escuela Politécnica Nacional (EPN) · Proyecto RDA1
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
