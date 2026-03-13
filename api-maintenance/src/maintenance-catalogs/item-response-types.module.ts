import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ItemResponseType,
  ItemResponseTypeSchema,
} from '../schema/item-response-type.schema';
import { ItemResponseTypesService } from './item-response-types.service';
import { ItemResponseTypesController } from './item-response-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ItemResponseType.name, schema: ItemResponseTypeSchema },
    ]),
  ],
  controllers: [ItemResponseTypesController],
  providers: [ItemResponseTypesService],
  exports: [MongooseModule, ItemResponseTypesService],
})
export class ItemResponseTypesModule {}
