import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Proveedor, ProveedorSchema } from '../schema/proveedor.schema';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proveedor.name, schema: ProveedorSchema },
    ]),
  ],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
})
export class ProveedoresModule {}
