import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreventiveController } from './preventive.controller';
import { PreventiveService } from './preventive.service';
import { PreventiveDetail, PreventiveDetailSchema } from '../schema/preventive.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PreventiveDetail.name, schema: PreventiveDetailSchema }]),
  ],
  controllers: [PreventiveController],
  providers: [PreventiveService],
  exports: [PreventiveService],
})
export class PreventiveModule {}