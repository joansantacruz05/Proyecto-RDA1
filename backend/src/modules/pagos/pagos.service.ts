import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { generateEntityId } from '../../common/utils/password-rules';
import { validarIdentificacion } from '../../common/utils/ecuador-validators';

export interface ProcesarPagoDto {
  reservaId: string;
  metodoPagoId: string;
  requiereFactura?: boolean;
  factura?: {
    identificacion: string;
    nombre: string;
    direccion?: string;
  };
}

@Injectable()
export class PagosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async getMetodosPago() {
    const rows = await this.dataSource.query(
      'SELECT id, nombre, estado FROM metodos_pago WHERE estado = $1 ORDER BY id ASC',
      ['Activo'],
    );
    return rows;
  }

  async procesarPago(dto: ProcesarPagoDto, userId: string, userRol?: string) {
    const { reservaId, metodoPagoId, requiereFactura, factura } = dto;

    return await this.dataSource.transaction(async (manager) => {
      // 1. Obtener y bloquear la reserva (por ID o por ordenId)
      const reservas = await manager.query(
        `SELECT * FROM reservas WHERE id = $1 OR "ordenId"::text = $1 FOR UPDATE`,
        [reservaId],
      );

      if (!reservas || reservas.length === 0) {
        throw new NotFoundException('La reserva indicada no existe.');
      }

      const reserva = reservas[0];
      const realReservaId = reserva.id;

      // Verificar que el usuario sea el dueño o Admin
      const esAdmin = (userRol || '').toLowerCase().includes('admin');
      if (!esAdmin && reserva.usuarioId !== userId) {
        throw new ForbiddenException('No tienes permiso para pagar esta reserva.');
      }

      // Validar que la reserva no esté cancelada
      if (reserva.estadoId === 'EST-003') {
        throw new ConflictException('No se puede pagar una reserva cancelada.');
      }

      // Validar que no exista ya un pago Completado para esta reserva
      const pagosExistentes = await manager.query(
        `SELECT id, estado, monto FROM pagos WHERE "reservaId" = $1 AND estado = 'Completado'`,
        [realReservaId],
      );

      if (pagosExistentes && pagosExistentes.length > 0) {
        throw new ConflictException('Esta reserva ya cuenta con un pago completado.');
      }

      // 2. Determinar estado del pago según el método
      // Tarjetas y PayPal se completan inmediatamente de forma simulada
      // Transferencia (MET-003) y Efectivo (MET-005) quedan en 'Pendiente' hasta confirmación del admin
      const esInmediato = ['MET-001', 'MET-002', 'MET-004'].includes(metodoPagoId);
      const estadoPago = esInmediato ? 'Completado' : 'Pendiente';
      const montoTotal = Number(reserva.precioTotal);

      const pagoId = generateEntityId('PAG');
      await manager.query(
        `INSERT INTO pagos (id, "reservaId", "metodoPagoId", monto, estado, "fechaPago")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [pagoId, realReservaId, metodoPagoId, montoTotal, estadoPago],
      );

      // Si el pago es completado, actualizar la reserva a Confirmada (EST-002) y registrar historial
      if (estadoPago === 'Completado') {
        await manager.query(
          `UPDATE reservas SET "estadoId" = 'EST-002' WHERE id = $1`,
          [realReservaId],
        );

        await manager.query(
          `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
           VALUES ($1, $2, $3, 'EST-002', $4)`,
          [
            generateEntityId('HIS'),
            realReservaId,
            reserva.estadoId,
            `Pago completado vía ${metodoPagoId} ($${montoTotal.toFixed(2)})`,
          ],
        );
      } else {
        await manager.query(
          `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
           VALUES ($1, $2, $3, $3, $4)`,
          [
            generateEntityId('HIS'),
            realReservaId,
            reserva.estadoId,
            `Pago registrado en espera de verificación manual ($${montoTotal.toFixed(2)})`,
          ],
        );
      }

      // 3. Generación de Factura si fue solicitada
      let facturaGenerada = null;
      if (requiereFactura && factura) {
        const valId = validarIdentificacion(factura.identificacion);
        if (!valId.valido) {
          throw new BadRequestException(valId.mensaje || 'Identificación para facturación no válida.');
        }

        // Obtener siguiente número secuencial de factura electrónica
        const seqResult = await manager.query(`SELECT nextval('seq_numero_factura') as seq`);
        const secuencia = seqResult[0].seq;
        const numeroFactura = `001-001-${String(secuencia).padStart(9, '0')}`;

        const ivaRate = parseFloat(this.configService.get('IVA_RATE') || '0.15');
        const subtotal = reserva.subtotal ? Number(reserva.subtotal) : Number((montoTotal / (1 + ivaRate)).toFixed(2));
        const iva = reserva.iva ? Number(reserva.iva) : Number((montoTotal - subtotal).toFixed(2));
        const tasaMunicipal = reserva.tasaMunicipal ? Number(reserva.tasaMunicipal) : 0;

        const facturaId = generateEntityId('FAC');
        await manager.query(
          `INSERT INTO facturas (id, "pagoId", "numeroFactura", "identificacionCliente", "nombreRazonSocial", direccion, subtotal, iva, total, "tasaMunicipal", "fechaEmision")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          [
            facturaId,
            pagoId,
            numeroFactura,
            factura.identificacion.trim(),
            factura.nombre.trim(),
            factura.direccion ? factura.direccion.trim() : 'Consumidor Final',
            subtotal,
            iva,
            montoTotal,
            tasaMunicipal,
          ],
        );

        facturaGenerada = {
          id: facturaId,
          numeroFactura,
          identificacion: factura.identificacion,
          nombreRazonSocial: factura.nombre,
          subtotal: subtotal.toFixed(2),
          iva: iva.toFixed(2),
          tasaMunicipal: tasaMunicipal.toFixed(2),
          total: montoTotal.toFixed(2),
        };
      }

      return {
        pagoId,
        reservaId,
        estado: estadoPago,
        monto: montoTotal.toFixed(2),
        factura: facturaGenerada,
        mensaje:
          estadoPago === 'Completado'
            ? 'Pago procesado exitosamente. Tu reserva ha sido confirmada.'
            : 'Pago registrado en estado pendiente. Se confirmará una vez verificado el comprobante.',
      };
    });
  }

  // Facturas del usuario autenticado
  async getMisFacturas(userId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT 
        f.id, f."numeroFactura", f."identificacionCliente", f."nombreRazonSocial",
        f.direccion, f."fechaEmision", f.subtotal, f.iva, f.total, f."tasaMunicipal",
        p.id as "pagoId", p.monto, p.estado as "estadoPago", p."fechaPago",
        r.id as "reservaId", r."ordenId", m.nombre as "metodoPago",
        a.nombre as "alojamientoNombre"
      FROM facturas f
      JOIN pagos p ON f."pagoId" = p.id
      JOIN reservas r ON p."reservaId" = r.id
      JOIN espacios_rentables e ON r."espacioId" = e.id
      JOIN alojamientos a ON e."alojamientoId" = a.id
      JOIN metodos_pago m ON p."metodoPagoId" = m.id
      WHERE r."usuarioId" = $1
      ORDER BY f."fechaEmision" DESC
    `,
      [userId],
    );
    return rows;
  }

  // Facturas globales para Admin
  async getFacturasAdmin() {
    const rows = await this.dataSource.query(`
      SELECT 
        f.id, f."numeroFactura", f."identificacionCliente", f."nombreRazonSocial",
        f.direccion, f."fechaEmision", f.subtotal, f.iva, f.total, f."tasaMunicipal",
        p.id as "pagoId", p.monto, p.estado as "estadoPago", p."fechaPago",
        r.id as "reservaId", r."ordenId", m.nombre as "metodoPago",
        a.nombre as "alojamientoNombre"
      FROM facturas f
      JOIN pagos p ON f."pagoId" = p.id
      JOIN reservas r ON p."reservaId" = r.id
      JOIN espacios_rentables e ON r."espacioId" = e.id
      JOIN alojamientos a ON e."alojamientoId" = a.id
      JOIN metodos_pago m ON p."metodoPagoId" = m.id
      ORDER BY f."fechaEmision" DESC
    `);
    return rows;
  }

  // Confirmar pago en estado Pendiente (Admin)
  async confirmarPagoAdmin(pagoId: string, adminUserId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const pagos = await manager.query(`SELECT * FROM pagos WHERE id = $1 FOR UPDATE`, [pagoId]);
      if (!pagos || pagos.length === 0) {
        throw new NotFoundException('Pago no encontrado.');
      }
      const pago = pagos[0];

      if (pago.estado === 'Completado') {
        return { message: 'El pago ya se encuentra completado.', pagoId };
      }

      await manager.query(`UPDATE pagos SET estado = 'Completado' WHERE id = $1`, [pagoId]);
      await manager.query(`UPDATE reservas SET "estadoId" = 'EST-002' WHERE id = $1`, [pago.reservaId]);

      await manager.query(
        `INSERT INTO historial_reservas (id, "reservaId", "estadoAnteriorId", "estadoNuevoId", notas)
         VALUES ($1, $2, 'EST-001', 'EST-002', $3)`,
        [
          generateEntityId('HIS'),
          pago.reservaId,
          `Pago confirmado manualmente por Administrador (${adminUserId})`,
        ],
      );

      return { message: 'Pago y reserva confirmados exitosamente.', pagoId, estado: 'Completado' };
    });
  }
}
