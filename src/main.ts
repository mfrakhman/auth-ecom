import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.getHttpAdapter().get('/health', (_req: any, res: any) => res.status(200).json({ status: 'ok' }));
  console.log('server running on port 3001');
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
