import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { PrismaService } from "@/prisma/prisma.service";
import { ProjectService } from "@/projects/projects.service";

interface BotState {
  step: "project" | "title" | "description" | "deadline";
  projectId?: string;
  title?: string;
  description?: string;
  deadline?: Date;
  userId?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private readonly chatId: string | null = null;
  private readonly botState = new Map<number, BotState>();
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectService: ProjectService
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = process.env.API_URL || process.env.BASE_URL || "http://localhost:3000";

    if (!token) {
      this.logger.warn(
        "TELEGRAM_BOT_TOKEN is not set. Telegram notifications will be disabled."
      );
      return;
    }

    if (!chatId) {
      this.logger.warn(
        "TELEGRAM_CHAT_ID is not set. Telegram notifications will be disabled."
      );
      return;
    }

    this.chatId = chatId;
    
    // Определяем режим работы: webhook или polling
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl) {
      // Webhook режим
      this.bot = new TelegramBot(token);
      this.logger.log(`Telegram bot initialized in webhook mode: ${webhookUrl}`);
    } else {
      // Polling режим (для локальной разработки)
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log("Telegram bot initialized in polling mode");
    }
    
    this.setupBotHandlers();
  }

  async onModuleInit() {
    if (this.bot) {
      this.logger.log("Telegram bot initialized successfully");
    }
  }

  // Метод для установки webhook (вызывается из main.ts)
  async setWebhook(webhookUrl: string): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Bot is not initialized, cannot set webhook");
      return;
    }

    try {
      await this.bot.setWebHook(webhookUrl);
      this.logger.log(`Webhook set to: ${webhookUrl}`);
    } catch (error) {
      this.logger.error(`Failed to set webhook: ${error}`);
      throw error;
    }
  }

  // Метод для обработки webhook обновлений
  processUpdate(update: any): void {
    if (!this.bot) {
      this.logger.warn("Bot is not initialized, cannot process update");
      return;
    }

    this.bot.processUpdate(update);
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stopPolling?.();
      this.logger.log("Telegram bot stopped");
    }
  }

  private setupBotHandlers() {
    if (!this.bot) return;

    // Обработка команды /add
    this.bot.onText(/\/add/, async (msg) => {
      await this.handleAddCommand(msg);
    });

    // Обработка callback query (выбор проекта)
    this.bot.on("callback_query", async (query: CallbackQuery) => {
      await this.handleCallbackQuery(query);
    });

    // Обработка текстовых сообщений (для сбора данных задачи)
    this.bot.on("message", async (msg: Message) => {
      // Пропускаем команды
      if (msg.text?.startsWith("/")) {
        return;
      }
      await this.handleMessage(msg);
    });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.bot || !this.chatId) {
      this.logger.warn("Telegram bot is not initialized. Message not sent.");
      return;
    }

    try {
      await this.bot.sendMessage(this.chatId, text);
      this.logger.log("Telegram message sent successfully");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send Telegram message: ${error.message}`,
          error.stack
        );
      } else {
        this.logger.error(
          "Failed to send Telegram message: Unknown error",
          String(error)
        );
      }
      throw error;
    }
  }

  async sendDeadlineReminder(
    taskTitle: string,
    projectName: string,
    deadline: Date
  ): Promise<void> {
    const deadlineStr = deadline.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `⏰ Дедлайн скоро/наступил: ${taskTitle}, проект ${projectName}, время ${deadlineStr}`;

    await this.sendMessage(message);
  }

  async sendDailyDigest(
    todayCount: number,
    overdueCount: number,
    tomorrowTasks: Array<{ title: string; projectName: string; deadline: Date }>
  ): Promise<void> {
    let message = `🗓 Сегодня: ${todayCount} задач, Просрочено: ${overdueCount}`;

    if (tomorrowTasks.length > 0) {
      message += `, Ближайшие: ${tomorrowTasks.map((t) => t.title).join(", ")}`;
    }

    await this.sendMessage(message);
  }

  private async handleAddCommand(msg: Message) {
    if (!this.bot || !msg.chat) return;

    const chatId = msg.chat.id;

    try {
      // Находим пользователя по telegramChatId
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;
      if (!telegramChatId) {
        await this.bot.sendMessage(chatId, "❌ Ошибка: TELEGRAM_CHAT_ID не настроен");
        return;
      }

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { telegramChatId: telegramChatId },
            { telegramChatId: chatId.toString() },
          ],
        },
      });

      if (!user) {
        await this.bot.sendMessage(
          chatId,
          "❌ Пользователь не найден. Убедитесь, что ваш Telegram Chat ID привязан к аккаунту."
        );
        return;
      }

      // Получаем проекты пользователя
      const projects = await this.projectService.findAll(user.id);

      if (projects.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "❌ У вас нет проектов. Создайте проект через веб-интерфейс."
        );
        return;
      }

      // Инициализируем состояние
      this.botState.set(chatId, {
        step: "project",
        userId: user.id,
      });

      // Создаем inline keyboard с проектами
      const keyboard = projects.map((project) => [
        {
          text: project.name,
          callback_data: `project_${project.id}`,
        },
      ]);

      await this.bot.sendMessage(chatId, "📋 Выберите проект:", {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling /add command: ${error}`);
      if (this.bot && msg.chat) {
        await this.bot.sendMessage(msg.chat.id, "❌ Произошла ошибка при обработке команды");
      }
    }
  }

  private async handleCallbackQuery(query: CallbackQuery) {
    if (!this.bot || !query.message || !query.data) return;

    const chatId = query.message.chat.id;
    const state = this.botState.get(chatId);

    if (!state) {
      await this.bot.answerCallbackQuery(query.id, {
        text: "Сессия истекла. Используйте /add для начала",
      });
      return;
    }

    if (query.data.startsWith("project_")) {
      if (state.step !== "project") {
        await this.bot.answerCallbackQuery(query.id, {
          text: "Неверный шаг",
        });
        return;
      }

      const projectId = query.data.replace("project_", "");
      state.projectId = projectId;
      state.step = "title";

      await this.bot.answerCallbackQuery(query.id, { text: "Проект выбран" });
      await this.bot.sendMessage(chatId, "✏️ Введите название задачи:");
    } else if (query.data === "skip_deadline") {
      if (state.step !== "deadline") {
        await this.bot.answerCallbackQuery(query.id, {
          text: "Неверный шаг",
        });
        return;
      }

      state.deadline = undefined;
      await this.bot.answerCallbackQuery(query.id, { text: "Дедлайн пропущен" });
      await this.createTaskFromState(chatId, state);
    }
  }

  private async handleMessage(msg: Message) {
    if (!this.bot || !msg.chat || !msg.text) return;

    const chatId = msg.chat.id;
    const state = this.botState.get(chatId);

    if (!state) {
      // Игнорируем сообщения без активного состояния
      return;
    }

    try {
      switch (state.step) {
        case "title":
          state.title = msg.text;
          state.step = "description";
          await this.bot.sendMessage(chatId, "📝 Введите описание задачи:");
          break;

        case "description":
          state.description = msg.text;
          state.step = "deadline";
          await this.bot.sendMessage(chatId, "📅 Введите дедлайн (DD.MM.YYYY или DD.MM.YYYY HH:MM) или отправьте 'пропустить':", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "⏭ Пропустить", callback_data: "skip_deadline" }],
              ],
            },
          });
          break;

        case "deadline":
          if (msg.text.toLowerCase() === "пропустить" || msg.text.toLowerCase() === "skip") {
            state.deadline = undefined;
          } else {
            const parsedDate = this.parseDate(msg.text);
            if (!parsedDate) {
              await this.bot.sendMessage(
                chatId,
                "❌ Неверный формат даты. Попробуйте снова (DD.MM.YYYY или DD.MM.YYYY HH:MM) или отправьте 'пропустить':"
              );
              return;
            }
            state.deadline = parsedDate;
          }

          // Все данные собраны, создаем задачу
          await this.createTaskFromState(chatId, state);
          break;

        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error}`);
      await this.bot.sendMessage(chatId, "❌ Произошла ошибка. Попробуйте снова с команды /add");
      this.botState.delete(chatId);
    }
  }

  private async createTaskFromState(chatId: number, state: BotState) {
    if (!this.bot || !state.projectId || !state.title || !state.description || !state.userId) {
      await this.bot?.sendMessage(chatId, "❌ Ошибка: не все данные собраны");
      this.botState.delete(chatId);
      return;
    }

    try {
      // Отправляем запрос на /inbox
      const requestBody = {
        source: "telegram",
        type: "task_create",
        data: {
          title: state.title,
          description: state.description,
          projectId: state.projectId,
          deadline: state.deadline?.toISOString(),
        },
        userId: state.userId,
      };

      const response = await fetch(`${this.apiUrl}/inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      await this.bot.sendMessage(
        chatId,
        `✅ Задача "${state.title}" успешно создана!`
      );

      // Очищаем состояние
      this.botState.delete(chatId);
    } catch (error) {
      this.logger.error(`Error creating task: ${error}`);
      await this.bot.sendMessage(
        chatId,
        `❌ Ошибка при создании задачи: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
      this.botState.delete(chatId);
    }
  }

  private parseDate(dateString: string): Date | null {
    // Пробуем различные форматы
    const formats = [
      /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/, // DD.MM.YYYY HH:MM
      /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, // ISO format
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        if (match.length === 6) {
          // DD.MM.YYYY HH:MM
          const [, day, month, year, hour, minute] = match;
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute)
          );
          if (!isNaN(date.getTime())) {
            return date;
          }
        } else if (match.length === 4) {
          // DD.MM.YYYY
          const [, day, month, year] = match;
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
          if (!isNaN(date.getTime())) {
            return date;
          }
        } else if (match.length === 7) {
          // ISO format
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    // Пробуем стандартный парсинг
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  }

}
