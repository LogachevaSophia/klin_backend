# 🏥 Klin Backend

> **REST API для управления клиническими рекомендациями в виде графов (BPMN-процессов)**

![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Express](https://img.shields.io/badge/Express-4-lightgrey.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg)

## 🚀 Быстрый старт

### Локальная разработка

```bash
# 1. Установка зависимостей
npm install

# 2. Скопировать и настроить переменные окружения
cp .env.example .env

# 3. Поднять PostgreSQL (через Docker Compose)
docker compose up db -d

# 4. Применить миграции и сгенерировать Prisma Client
npm run db:migrate
npm run db:generate

# 5. Запустить сервер в режиме разработки
npm run dev
```

Сервер запустится на порту, указанном в `BACKEND_PORT` (по умолчанию `8000`).

### Запуск через Docker Compose (полный стек)

```bash
# Поднять PostgreSQL + бэкенд одной командой
BACKEND_PORT=8000 docker compose up --build
```

## ⚙️ Переменные окружения

| Переменная     | По умолчанию                                              | Описание                                      |
|----------------|-----------------------------------------------------------|-----------------------------------------------|
| `BACKEND_PORT` | `8000`                                                    | Порт, на котором слушает сервер               |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/klin_backend` | Строка подключения к PostgreSQL               |
| `CORS_ORIGINS` | `["*"]`                                                   | Разрешённые CORS-источники (JSON-массив или строка) |

Пример `.env`:
```env
BACKEND_PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/klin_backend
CORS_ORIGINS=["http://localhost:5173"]
```

## 📡 API Endpoints

Базовый путь: `/v1/process`

| Метод    | Путь                          | Описание                                  |
|----------|-------------------------------|-------------------------------------------|
| `GET`    | `/health`                     | Проверка работоспособности сервера        |
| `GET`    | `/v1/process/all`             | Список всех процессов (id + name)         |
| `GET`    | `/v1/process?process_id=<id>` | Получить процесс с нодами и рёбрами по id |
| `POST`   | `/v1/process`                 | Создать новый процесс                     |
| `PUT`    | `/v1/process`                 | Обновить процесс (полная замена нод/рёбер)|
| `DELETE` | `/v1/process?process_id=<id>` | Удалить процесс                           |

### Формат процесса (JSON)

```json
{
  "process_id": "ac2feb38-d5f5-4f81-bdb6-434f336e334f",
  "name": "Новый процесс",
  "nodes": [
    {
      "id": 31,
      "type": 3,
      "data": { "label": "Старт" },
      "json_data": { "x": -1, "y": -1 },
      "subprocess_id": null
    },
    {
      "id": 2,
      "type": 4,
      "data": { "label": "подпроцесс1" },
      "json_data": { "x": -28, "y": -1 },
      "subprocess_id": "другой-uuid-процесса"
    }
  ],
  "edges": [
    { "id": 1, "source": 31, "target": 2 }
  ]
}
```

## 🎯 Типы нод

| Тип (число) | Название    | Описание                                      |
|-------------|-------------|-----------------------------------------------|
| `0`         | Start       | Начало процесса                               |
| `1`         | Finish      | Завершение процесса                           |
| `2`         | Condition   | Узел принятия решений (ромб)                  |
| `3`         | Action      | Действие / шаг процесса                       |
| `4`         | Subprocess  | Ссылка на вложенный процесс (через `subprocess_id`) |
| `5`         | Loop        | Циклический узел                              |

### Подпроцессы

Нода типа `4` (Subprocess) содержит поле `subprocess_id` — UUID другого процесса в базе данных. Это позволяет строить многоуровневые графы клинических рекомендаций.

## 🗄️ Схема базы данных

```
Process
  id          UUID (PK)
  name        String

Node
  pk          Int (autoincrement PK)
  nodeId      Int          — числовой id ноды внутри процесса
  processId   UUID (FK → Process)
  type        Int          — тип ноды (0–5)
  data        Json         — { label, attributes?, loopCondition?, ... }
  jsonData    Json         — { x, y } координаты
  subprocessId UUID?       — ссылка на дочерний Process (для type=4)

Edge
  pk          Int (autoincrement PK)
  edgeId      Int          — числовой id ребра внутри процесса
  processId   UUID (FK → Process)
  source      Int          — nodeId источника
  target      Int          — nodeId цели
  label       String?
  data        Json?        — { type: "condition", value: true/false }
  sourceHandle String?
  targetHandle String?
  style       Json?
```

## 🔧 Команды

```bash
npm run dev          # Запуск в режиме разработки (ts-node-dev)
npm run build        # Компиляция TypeScript → dist/
npm run start        # Запуск скомпилированного сервера
npm run db:migrate   # Применить Prisma-миграции
npm run db:generate  # Сгенерировать Prisma Client
npm run db:studio    # Открыть Prisma Studio (GUI для БД)
```

## 🐳 Docker

```bash
# Сборка образа
docker build --build-arg BACKEND_PORT=8000 -t klin-backend .

# Запуск контейнера
docker run -d \
  --name klin-backend \
  -p 8000:8000 \
  -e BACKEND_PORT=8000 \
  -e DATABASE_URL=postgresql://... \
  -e CORS_ORIGINS='["*"]' \
  klin-backend
```

## 📦 CI/CD

- **`docker-publish.yml`** — при пуше в `main`/`master` собирает Docker-образ и публикует в `ghcr.io`
- **`deploy.yml`** — при мердже PR или ручном запуске деплоит образ на VM через SSH

### Необходимые GitHub Secrets

| Secret              | Описание                                      |
|---------------------|-----------------------------------------------|
| `VM_SSH_PRIVATE_KEY`| Приватный SSH-ключ для доступа к VM           |
| `VM_HOST`           | IP или hostname VM                            |
| `VM_USER`           | Пользователь SSH на VM                        |
| `BACKEND_PORT`      | Порт бэкенда на VM                            |
| `DATABASE_URL`      | Строка подключения к PostgreSQL на VM         |
| `CORS_ORIGINS`      | Разрешённые CORS-источники                    |

---

**Разработано с ❤️ для медицинских специалистов**
