import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AiInsightModule } from './modules/ai-insight/ai-insight.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CostLayersModule } from './modules/cost_layers/cost_layers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PosSessionsModule } from './modules/pos-sessions/pos-sessions.module';
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
import { StockTakesModule } from './modules/stock-takes/stock-takes.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { TaxModule } from './modules/tax/tax.module';
import { EventsModule } from './modules/events/events.module';
import { ProductBatchesModule } from './modules/product-batches/product-batches.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { doubleCsrfProtection } from './common/config/csrf.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production', '.env.development', '.env.local'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST') || process.env.DB_HOST,
          port: Number(configService.get('DB_PORT') || process.env.DB_PORT || 5432),
          username: configService.get<string>('DB_USER') || process.env.DB_USER,
          password: configService.get<string>('DB_PASS') || process.env.DB_PASS,
          database: configService.get<string>('DB_NAME') || process.env.DB_NAME,
          entities: [__dirname + '/**/*.entity{.ts,.js}', __dirname + '/**/*.entities{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: (configService.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'development',
          ssl: false,
        };

        console.log(`[DB DEBUG] Connecting to ${dbConfig.host} as user ${dbConfig.username}`);
        return dbConfig;
      },
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('AI Powered POS', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
      ],
    }),
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
    StockTakesModule,
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    SalesReportsModule,
    AiInsightModule,
    PermissionsModule,
    RolePermissionsModule,
    SupplierModule,
    TaxModule,
    PurchasesModule,
    CostLayersModule,
    PurchaseReceivingsModule,
    ExpensesModule,
    AccountingModule,
    PosSessionsModule,
    EventsModule,
    ProductBatchesModule,
    PromotionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(doubleCsrfProtection)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/csrf-token', method: RequestMethod.GET },
        { path: 'auth/verify-account', method: RequestMethod.POST },
        { path: 'auth/resend-verify-account', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'auth/refresh-token', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
