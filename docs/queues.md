# BullMQ — Система очередей и фоновых задач

Документация по использованию BullMQ в WorkHub для выполнения фоновых задач и периодических операций.

## Содержание

- [Обзор](#обзор)
- [Настройка](#настройка)
- [Архитектура](#архитектура)
- [Существующие очереди](#существующие-очереди)
- [Добавление новой очереди](#добавление-новой-очереди)
- [Переменные окружения](#переменные-окружения)
- [Мониторинг](#мониторинг)
- [Примеры использования](#примеры-использования)

## Обзор

BullMQ используется для:

- **Периодических задач** (cron jobs) — напоминания о дедлайнах, дайджесты
- **Асинхронной обработки** — тяжелые операции, не блокирующие API
- **Очередей задач** — гарантированная обработка с retry механизмом

### Технологии

- **BullMQ** — очередь задач на основе Redis
- **@nestjs/bullmq** — интеграция с NestJS
- **Redis** — хранилище очередей (запускается через Docker Compose)

## Настройка

### Требования

1. **Redis** должен быть запущен (через Docker Compose или отдельно)
2. Переменные окружения настроены (см. [Переменные окружения](#переменные-окружения))

### Запуск Redis

```bash
# Через Docker Compose
docker-compose up -d redis

# Или отдельно
docker run -d -p 6379:6379 redis:7-alpine
```

### Конфигурация модуля

Модуль `QueuesModule` настраивается в `src/queues/queues.module.ts`:

```typescript
BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
});
```

## Архитектура

### Компоненты

1. **Queue (Очередь)** — контейнер для задач одного типа
2. **Processor (Процессор)** — обработчик задач из очереди
3. **Job (Задача)** — единица работы, добавляемая в очередь
4. **Worker (Воркер)** — процесс, который обрабатывает задачи

### Структура файлов

```
src/queues/
├── queues.module.ts          # Модуль с настройкой очередей
├── queues.service.ts         # Сервис для добавления задач
└── processors/
    ├── test.processor.ts     # Тестовый процессор
    └── reminder.processor.ts # Процессор напоминаний
```

## Существующие очереди

### 1. `test-queue`

**Назначение:** Тестовая очередь для проверки работы системы.

**Процессор:** `TestProcessor`

**Использование:**

```typescript
// В любом сервисе
constructor(private readonly queuesService: QueuesService) {}

async someMethod() {
  await this.queuesService.addTestJob({ message: "Hello" });
}
```

### 2. `reminders-queue`

**Назначение:** Автоматические напоминания о дедлайнах задач.

**Процессор:** `ReminderProcessor`

**Автоматический запуск:** Настраивается при старте приложения через `onModuleInit()` в `QueuesService`.

**Параметры:**

- `reminderHours` — за сколько часов до дедлайна отправлять напоминание (по умолчанию 24)

**Расписание:** Запускается каждый час (cron: `0 * * * *`)

**Логика работы:**

1. Находит все невыполненные задачи с дедлайнами
2. Фильтрует задачи, у которых дедлайн наступит в течение `reminderHours`
3. Для каждой задачи получает всех участников проекта
4. Логирует напоминания (в будущем — отправка email/telegram)

**Ручной запуск:**

```typescript
await this.queuesService.addReminderJob({ reminderHours: 48 });
```

## Добавление новой очереди

### Шаг 1: Создать процессор

Создайте файл `src/queues/processors/my-processor.ts`:

```typescript
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

interface MyJobData {
  // Определите структуру данных задачи
  userId: string;
  message: string;
}

@Processor("my-queue")
export class MyProcessor extends WorkerHost {
  private readonly logger = new Logger(MyProcessor.name);

  async process(job: Job<MyJobData, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id}`);

    const { userId, message } = job.data;

    // Ваша логика обработки
    // ...

    return { success: true, jobId: job.id };
  }
}
```

### Шаг 2: Зарегистрировать очередь в модуле

В `src/queues/queues.module.ts`:

```typescript
import { MyProcessor } from "./processors/my.processor";

@Module({
  imports: [
    // ... существующие настройки
    BullModule.registerQueue({
      name: "my-queue",
    }),
  ],
  providers: [
    // ... существующие провайдеры
    MyProcessor,
  ],
})
export class QueuesModule {}
```

### Шаг 3: Добавить метод в QueuesService

В `src/queues/queues.service.ts`:

```typescript
constructor(
  // ... существующие очереди
  @InjectQueue("my-queue") private readonly myQueue: Queue
) {}

async addMyJob(data: { userId: string; message: string }) {
  return await this.myQueue.add("my-job", data, {
    // Опционально: настройки задачи
    attempts: 3, // Количество попыток при ошибке
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });
}
```

### Шаг 4: Добавить очередь в Bull Board (опционально)

В `src/main.ts`:

```typescript
const myQueue = app.get(getQueueToken("my-queue"));

createBullBoard({
  queues: [
    // ... существующие очереди
    new BullMQAdapter(myQueue),
  ],
  serverAdapter,
});
```

## Переменные окружения

Добавьте в `.env`:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Reminder Job
REMINDER_CRON=0 * * * *        # Cron паттерн (по умолчанию: каждый час)
REMINDER_HOURS=24              # За сколько часов до дедлайна напоминать
```

### Cron паттерны

Примеры cron-выражений:

- `0 * * * *` — каждый час в 0 минут
- `0 9 * * *` — каждый день в 9:00
- `0 9 * * 1` — каждый понедельник в 9:00
- `*/15 * * * *` — каждые 15 минут
- `0 0 * * *` — каждый день в полночь

Формат: `минута час день месяц день_недели`

## Мониторинг

### Bull Board

Доступен по адресу: `http://localhost:3000/admin/queues`

**Возможности:**

- Просмотр всех очередей
- Мониторинг активных, завершенных и failed задач
- Просмотр данных задач
- Управление задачами (retry, remove)

### Логирование

Все процессоры логируют:

- Начало обработки задачи
- Завершение обработки
- Ошибки при обработке

Пример логов:

```
[ReminderProcessor] Processing reminder job 123
[ReminderProcessor] Found 5 tasks with approaching deadlines
[ReminderProcessor] Reminder job 123 completed: 12 reminders for 5 tasks
```

## Примеры использования

### Пример 1: Простая задача

```typescript
// В контроллере или сервисе
import { QueuesService } from "src/queues/queues.service";

@Injectable()
export class MyService {
  constructor(private readonly queuesService: QueuesService) {}

  async processUserAction(userId: string) {
    // Добавляем задачу в очередь
    await this.queuesService.addTestJob({
      userId,
      action: "user_action",
      timestamp: new Date(),
    });

    // Задача будет обработана асинхронно
    return { message: "Task queued" };
  }
}
```

### Пример 2: Задача с повторными попытками

```typescript
// В QueuesService
async addImportantJob(data: ImportantData) {
  return await this.importantQueue.add("important-job", data, {
    attempts: 5, // 5 попыток
    backoff: {
      type: "exponential",
      delay: 2000, // Начинаем с 2 секунд
    },
    removeOnComplete: {
      age: 3600, // Удалять через час после завершения
      count: 100, // Хранить максимум 100 завершенных задач
    },
  });
}
```

### Пример 3: Периодическая задача

```typescript
// В QueuesService.onModuleInit()
async onModuleInit() {
  const cronPattern = "0 9 * * *"; // Каждый день в 9:00

  // Удаляем существующую задачу
  try {
    await this.dailyQueue.removeRepeatable("daily-job", {
      pattern: cronPattern,
    });
  } catch (error) {
    // Игнорируем, если задачи нет
  }

  // Добавляем новую
  await this.dailyQueue.add(
    "daily-job",
    {},
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: "daily-job-recurring",
    }
  );
}
```

### Пример 4: Задача с задержкой

```typescript
async scheduleDelayedJob(data: any, delayMs: number) {
  return await this.myQueue.add("delayed-job", data, {
    delay: delayMs, // Задержка в миллисекундах
  });
}

// Использование
await this.queuesService.scheduleDelayedJob(
  { userId: "123" },
  60000 // Через 1 минуту
);
```

## Обработка ошибок

### В процессоре

```typescript
async process(job: Job<MyData, any, string>): Promise<any> {
  try {
    // Ваша логика
    return { success: true };
  } catch (error) {
    this.logger.error(`Error processing job ${job.id}:`, error);

    // Выбросить ошибку для retry
    throw error;

    // Или вернуть результат с ошибкой (без retry)
    // return { success: false, error: error.message };
  }
}
```

### Настройка retry

```typescript
await this.queue.add("job-name", data, {
  attempts: 3,
  backoff: {
    type: "exponential", // или "fixed"
    delay: 2000,
  },
});
```

## Best Practices

1. **Именование:** Используйте понятные имена для очередей и задач
2. **Типизация:** Всегда типизируйте данные задач через интерфейсы
3. **Логирование:** Логируйте начало, завершение и ошибки
4. **Idempotency:** Делайте задачи идемпотентными (можно безопасно повторять)
5. **Очистка:** Настраивайте `removeOnComplete` для старых задач
6. **Мониторинг:** Регулярно проверяйте Bull Board на failed задачи

## Troubleshooting

### Задачи не обрабатываются

1. Проверьте, что Redis запущен: `docker ps | grep redis`
2. Проверьте логи процессора на ошибки
3. Убедитесь, что процессор зарегистрирован в модуле
4. Проверьте Bull Board на наличие задач в очереди

### Задачи падают с ошибкой

1. Проверьте логи процессора
2. Убедитесь, что все зависимости доступны (PrismaService и т.д.)
3. Проверьте данные задачи в Bull Board
4. Увеличьте количество попыток (`attempts`)

### Повторяющиеся задачи не запускаются

1. Проверьте cron-паттерн
2. Убедитесь, что задача добавлена в `onModuleInit()`
3. Проверьте логи при старте приложения
4. Проверьте Bull Board на наличие повторяющейся задачи

## Дополнительные ресурсы

- [Документация BullMQ](https://docs.bullmq.io/)
- [Документация @nestjs/bullmq](https://docs.nestjs.com/techniques/queues)
- [Cron Expression Generator](https://crontab.guru/)
