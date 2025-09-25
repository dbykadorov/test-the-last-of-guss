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

Локально (без Docker):

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

Что важно знать:
- Роли: обычный игрок, админ, особая роль "Никита" (тапы не считаются)
- Раунд: cooldown - active - finished
- Счёт: 1 тап = 1 очко, каждый 11-й = +10
