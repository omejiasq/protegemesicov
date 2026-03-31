import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuCatalog, MenuCatalogSchema } from '../schemas/menu-catalog.schema';
import { MenuCatalogService } from './menu-catalog.service';
import { MenuCatalogController } from './menu-catalog.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: MenuCatalog.name, schema: MenuCatalogSchema },
    ]),
  ],
  providers: [MenuCatalogService],
  controllers: [MenuCatalogController],
  exports: [MenuCatalogService],
})
export class MenuCatalogModule implements OnModuleInit {
  constructor(private readonly menuCatalogService: MenuCatalogService) {}

  async onModuleInit() {
    await this.menuCatalogService.seed();
  }
}
