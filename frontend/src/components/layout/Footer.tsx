import React from 'react';
import { Crown, ShieldCheck, MapPin, Mail, Phone } from 'lucide-react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          {/* Columna 1: Marca */}
          <div className={styles.brandCol}>
            <div className={styles.brandTitle}>
              <Crown size={22} color="#C9A227" />
              <span>LuxeStays</span>
            </div>
            <p className={styles.brandDesc}>
              Marketplace exclusivo de alojamientos y hospedajes de alta gama en Ecuador. Reserva con total seguridad y transparencia tarifaria.
            </p>
            <div className={styles.policyBadge}>
              <div className={styles.policyTitle}>
                <ShieldCheck size={14} />
                <span>Política de Cancelación Transparente</span>
              </div>
              <p className={styles.policyText}>
                Reembolso del 100% hasta 48 horas antes del check-in. 50% entre 48 y 24 horas.
              </p>
            </div>
          </div>

          {/* Columna 2: Destinos */}
          <div>
            <h4 className={styles.colTitle}>Destinos Populares</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><a href="/?ciudad=Quito">Quito Colonial & Moderno</a></li>
              <li className={styles.linkItem}><a href="/?ciudad=Guayaquil">Guayaquil Puerto Santa Ana</a></li>
              <li className={styles.linkItem}><a href="/?ciudad=Cuenca">Cuenca Patrimonial</a></li>
              <li className={styles.linkItem}><a href="/?ciudad=Manta">Manta & Costa del Pacífico</a></li>
              <li className={styles.linkItem}><a href="/?ciudad=Gal%C3%A1pagos">Islas Galápagos</a></li>
            </ul>
          </div>

          {/* Columna 3: Información */}
          <div>
            <h4 className={styles.colTitle}>Legal & Soporte</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}><a href="#terminos">Términos del Servicio</a></li>
              <li className={styles.linkItem}><a href="#privacidad">Política de Privacidad</a></li>
              <li className={styles.linkItem}><a href="#sri">Facturación Electrónica SRI</a></li>
              <li className={styles.linkItem}><a href="#preguntas">Preguntas Frecuentes</a></li>
              <li className={styles.linkItem}><a href="#contacto">Contacto & Asistencia</a></li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className={styles.colTitle}>Atención al Huésped</h4>
            <ul className={styles.linkList}>
              <li className={styles.linkItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#C9A227" />
                <span>Av. Amazonas y República, Quito, Ecuador</span>
              </li>
              <li className={styles.linkItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#C9A227" />
                <span>concierge@luxestays.ec</span>
              </li>
              <li className={styles.linkItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="#C9A227" />
                <span>+593 2 299 0000</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior fiscal */}
        <div className={styles.bottomBar}>
          <div className={styles.fiscalInfo}>
            LuxeStays Ecuador Cía. Ltda. · RUC: 1792345678001 · Operador Turístico Autorizado Mintur Nº 17-01-2026
          </div>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} LuxeStays. Todos los derechos reservados. Moneda: USD (Dólares de EE. UU.).
          </div>
        </div>
      </div>
    </footer>
  );
};

