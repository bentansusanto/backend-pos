import { ValidationPipe } from '@nestjs/common'; // Added ValidationPipe import
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ErrorsService } from './common/errors/errors.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup global guards for RBAC
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
    new PermissionsGuard(reflector),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ErrorsService());
  app.use(cookieParser()); // Existing usage, now with new import style

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = ['http://localhost:3500'];
  app.enableCors({
    origin: function (origin, callback) {
      const allowedOrigins = origins;
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('AI Powered POS')
    .setDescription('The AI Powered POS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs/v1', app, document);

  const port = process.env.PORT || 8081;
  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
