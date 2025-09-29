The Last of Guss

Long story short: браузерная игра про раунды и тапы по гусю. 
Есть роли, очки и реальное время. 
Backend - NestJS + PostgreSQL, Frontend - React + TypeScript.

Как запустить быстро через Docker:

```bash
docker-compose up -d
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Swagger:  http://localhost:3000/api/docs
```

Локально (без Compose):

```bash
# Backend
cd backend
npm install
cp .env.example .env
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
npm run migration:run
npm run start:dev

# Frontend
cd ../frontend
npm install
npm run dev
```

## Структура Backend
- `src/app.module.ts` — корневой модуль: конфиг, TypeORM, импорт приложенческих модулей.
- `src/application` — прикладной слой (auth, rounds). Контроллеры/сервисы, DTO, guards/strategies.
- `src/domain` — домен (сущности, enum, доменные сервисы, порты репозиториев). Без зависимостей от Nest/TypeORM.
- `src/infrastructure` — адаптеры/инфраструктура:
  - `adapters/*` — реализации портов домена на TypeORM
  - `database/*` — конфиг и миграции
  - `transaction/transactional-runner.ts` — упрощённый Unit of Work для атомарных операций (участник+раунд)
  - `infrastructure.module.ts` — реестр провайдеров инфраструктуры
- `src/interfaces` — интерфейсный слой:
  - `rest/*` — контроллеры HTTP
  - `ws/game.gateway.ts` — Socket.IO Gateway (namespace `/game`) для реального времени (tap, round:update)
- `src/main.ts` — точка входа: CORS, rate-limit, helmet, Swagger (по флагу), trust proxy.

Ключевое:
- Порты/адаптеры: домен знает только о портах, инфраструктура подключает реализации.
- Транзакции: инкремент очков участника и `totalScore` раунда — в одной транзакции, с блокировками.
- WebSockets: все игровые события через Socket.IO, HTTP — только для чтения/создания раунда и auth.

## Структура Frontend
- `src/pages/*` — страницы: список раундов, детали раунда, логин.
- `src/hooks/*` — React Query и WebSocket-хуки: загрузка раундов, `useRoundChannel` для событий.
- `src/store/auth.ts` — Zustand для токена/пользователя.
- `src/utils/api.ts` — Axios-инстанс (интерцепторы, 401→logout).
- `src/utils/socket.ts` — singleton Socket.IO клиент (`/game`, путь `/socket.io`).
- `src/styles/*` — базовые стили и компоненты (кнопки, карточки).

Замечания по окружению:
- В продакшне фронт подключается к относительному `/game`; в dev — к `http://localhost:3000/game` (или `VITE_WS_URL`).
- Для запуска за Nginx настроен прокси `/socket.io/` и `/api/` на backend:3000.
- Для корректного rate-limit за прокси установите `TRUST_PROXY=true` у backend.
