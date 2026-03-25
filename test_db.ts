import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ProductStocksService } from './src/modules/product-stocks/product-stocks.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ProductStocksService);
  const result = await service.findAll();
  console.log(JSON.stringify(result.datas.slice(0, 2), null, 2));
  await app.close();
}
bootstrap();
