import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CorrectiveController } from './corrective.controller';
import { CorrectiveService } from './corrective.service';
import { CorrectiveDetail, CorrectiveDetailSchema } from '../schema/corrective.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CorrectiveDetail.name, schema: CorrectiveDetailSchema }]),
  ],
  controllers: [CorrectiveController],
  providers: [CorrectiveService],
  exports: [CorrectiveService],
})
export class CorrectiveModule {}