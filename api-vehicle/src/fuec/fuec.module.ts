import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Fuec, FuecSchema } from '../schema/fuec.schema';
import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';
import { UserRef, UserRefSchema } from '../schema/user-ref.schema';
import { FuecService } from './fuec.service';
import { FuecController } from './fuec.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Fuec.name, schema: FuecSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: UserRef.name, schema: UserRefSchema },
    ]),
  ],
  providers: [FuecService],
  controllers: [FuecController],
})
export class FuecModule {}
