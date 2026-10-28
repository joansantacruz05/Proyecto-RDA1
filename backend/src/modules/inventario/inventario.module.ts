import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryGrpcClient } from './inventory-grpc.client';
import { InventorySyncService } from './inventory-sync.service';
import { InventarioController } from './inventario.controller';

@Module({
  imports: [ConfigModule],
  controllers: [InventarioController],
  providers: [InventoryGrpcClient, InventorySyncService],
  exports: [InventorySyncService, InventoryGrpcClient],
})
export class InventarioModule {}
