import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

export interface StockUpdateMessage {
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  available_units: number;
  timestamp: number;
  slot_id: string;
}

export interface StockUpdateAck {
  success: boolean;
  message: string;
  processed_at: number;
  error_code: string;
  current_available: number;
}

export interface SlotAvailabilityRequest {
  service_id: string;
  item_id: string;
  date: string;
  time_slot: string;
  slot_id: string;
}

export interface SlotAvailabilityResponse {
  item_id: string;
  slot_id: string;
  date: string;
  time_slot: string;
  available_units: number;
  status: string;
  last_updated_epoch: number;
}

@Injectable()
export class InventoryGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(InventoryGrpcClient.name);
  private client: any = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initClient();
  }

  private initClient() {
    try {
      const protoPath = path.join(process.cwd(), 'proto', 'inventory.proto');
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
      const inventoryProto = protoDescriptor.inventory;

      if (!inventoryProto || !inventoryProto.InventoryStockService) {
        this.logger.error('No se pudo encontrar el servicio InventoryStockService en inventory.proto');
        return;
      }

      const grpcUrl = this.configService.get<string>('BOOKING_GRPC_URL') || '127.0.0.1:50051';
      this.client = new inventoryProto.InventoryStockService(
        grpcUrl,
        grpc.credentials.createInsecure(),
      );

      this.isConnected = true;
      this.logger.log(`Cliente gRPC InventoryStockService inicializado hacia ${grpcUrl}`);
    } catch (err) {
      this.logger.warn(`No se pudo inicializar el cliente gRPC: ${err.message}`);
      this.isConnected = false;
    }
  }

  async pushStockUpdate(message: StockUpdateMessage): Promise<StockUpdateAck> {
    if (!this.client) {
      this.initClient();
    }

    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('Cliente gRPC no disponible'));
      }

      const deadline = new Date(Date.now() + 5000);
      this.client.PushStockUpdate(message, { deadline }, (err: any, response: StockUpdateAck) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
  }

  async getSlotAvailability(request: SlotAvailabilityRequest): Promise<SlotAvailabilityResponse> {
    if (!this.client) {
      this.initClient();
    }

    return new Promise((resolve, reject) => {
      if (!this.client) {
        return reject(new Error('Cliente gRPC no disponible'));
      }

      const deadline = new Date(Date.now() + 5000);
      this.client.GetSlotAvailability(request, { deadline }, (err: any, response: SlotAvailabilityResponse) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
  }
}
