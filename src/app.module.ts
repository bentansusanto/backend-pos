import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductStocksModule } from './modules/product-stocks/product-stocks.module';
import { CategoriesModule } from './modules/products/categories/categories.module';
import { ProductVariantsModule } from './modules/products/product-variants/product-variants.module';
import { ProductsModule } from './modules/products/products.module';
import { AuthModule } from './modules/rbac/auth/auth.module';
import { ProfilesModule } from './modules/rbac/profiles/profiles.module';
import { RolesModule } from './modules/rbac/roles/roles.module';
import { SessionsModule } from './modules/rbac/sessions/sessions.module';
import { UsersModule } from './modules/rbac/users/users.module';
import { SeederModule } from './modules/seeder/seeder.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { SalesReportsModule } from './modules/sales-reports/sales-reports.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    RolesModule,
    BranchesModule,
    SeederModule,
    ProfilesModule,
    ProductVariantsModule,
    ProductsModule,
    CategoriesModule,
    ProductStocksModule,
    StockMovementsModule,
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    SalesReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
