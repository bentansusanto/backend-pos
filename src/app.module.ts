import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AiInsightModule } from './modules/ai-insight/ai-insight.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CostLayersModule } from './modules/cost_layers/cost_layers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductStocksModule } from './modules/product-stocks/product-stocks.module';
import { CategoriesModule } from './modules/products/categories/categories.module';
import { ProductVariantsModule } from './modules/products/product-variants/product-variants.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseReceivingsModule } from './modules/purchase_receivings/purchase_receivings.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { AuthModule } from './modules/rbac/auth/auth.module';
import { PermissionsModule } from './modules/rbac/permissions/permissions.module';
import { ProfilesModule } from './modules/rbac/profiles/profiles.module';
import { RolePermissionsModule } from './modules/rbac/role-permissions/role-permissions.module';
import { RolesModule } from './modules/rbac/roles/roles.module';
import { SessionsModule } from './modules/rbac/sessions/sessions.module';
import { UsersModule } from './modules/rbac/users/users.module';
import { SalesReportsModule } from './modules/sales-reports/sales-reports.module';
import { SeederModule } from './modules/seeder/seeder.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { TaxModule } from './modules/tax/tax.module';
import { ExpensesModule } from './modules/expenses/expenses.module';

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
    AiInsightModule,
    PermissionsModule,
    RolePermissionsModule,
    DiscountsModule,
    SupplierModule,
    TaxModule,
    PurchasesModule,
    CostLayersModule,
    PurchaseReceivingsModule,
    ExpensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
