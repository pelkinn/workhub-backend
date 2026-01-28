import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { getQueueToken } from "@nestjs/bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { AppModule } from "./app.module";
import { TelegramService } from "./notifications/telegram.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ["http://workhub.team", "https://workhub.team"],
    credentials: true,
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  const testQueue = app.get(getQueueToken("test-queue"));
  const remindersQueue = app.get(getQueueToken("reminders-queue"));
  const deadlineRemindersQueue = app.get(
    getQueueToken("deadline-reminders-queue"),
  );
  const dailyDigestQueue = app.get(getQueueToken("daily-digest-queue"));

  createBullBoard({
    queues: [
      new BullMQAdapter(testQueue),
      new BullMQAdapter(remindersQueue),
      new BullMQAdapter(deadlineRemindersQueue),
      new BullMQAdapter(dailyDigestQueue),
    ],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  const config = new DocumentBuilder()
    .setTitle("WorkHub API")
    .setDescription("Backend API WorkHub")
    .setVersion("0.1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Настройка Telegram webhook (если указан URL)
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (webhookUrl) {
    const telegramService = app.get(TelegramService);
    await telegramService.setWebhook(webhookUrl);

    // Добавляем endpoint для получения webhook обновлений
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.post("/telegram/webhook", (req: any, res: any) => {
      telegramService.processUpdate(req.body);
      res.sendStatus(200);
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
