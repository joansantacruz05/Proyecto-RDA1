import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PagosService {
  constructor(private readonly dataSource: DataSource) {}

  async getMetodosPago() {
    const rows = await this.dataSource.query('SELECT * FROM metodos_pago WHERE estado = $1', ['Activo']);
    return rows;
  }

  async procesarPago(dto: any) {
    const pagoId = 'PAG-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*1000);
    
    // Insertar Pago
    await this.dataSource.query(
      `INSERT INTO pagos (id, "reservaId", "metodoPagoId", monto, estado) 
       VALUES ($1, $2, $3, $4, 'Completado')`,
      [pagoId, dto.reservaId, dto.metodoPagoId, dto.monto]
    );

    // La reserva no se aprueba automáticamente al pagar. 
    // Queda a la espera de que el administrador apruebe manualmente.

    let facturaId = null;
    // Si pidieron factura
    if (dto.requiereFactura && dto.factura) {
      facturaId = 'FAC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*1000);
      const subtotal = Number((dto.monto / 1.15).toFixed(2));
      const iva = Number((dto.monto - subtotal).toFixed(2));

      await this.dataSource.query(
        `INSERT INTO facturas (id, "pagoId", "numeroFactura", "identificacionCliente", "nombreRazonSocial", direccion, subtotal, iva, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [facturaId, pagoId, facturaId, dto.factura.identificacion, dto.factura.nombre, dto.factura.direccion, subtotal, iva, dto.monto]
      );
    }

    return { pagoId, facturaId, status: 'success' };
  }

  async getFacturas() {
    const rows = await this.dataSource.query(`
      SELECT f.*, p.monto, p."fechaPago", r.id as "reservaId", m.nombre as "metodoPago"
      FROM facturas f
      JOIN pagos p ON f."pagoId" = p.id
      JOIN reservas r ON p."reservaId" = r.id
      JOIN metodos_pago m ON p."metodoPagoId" = m.id
      ORDER BY f."fechaEmision" DESC
    `);
    return rows;
  }
}
