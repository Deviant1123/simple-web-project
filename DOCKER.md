# Docker Setup для InfBez2

## Быстрый запуск

### 1. Запуск с Docker Compose (рекомендуется)

```bash
# Сборка и запуск всех сервисов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d --build
```

### 2. Ручная сборка и запуск

```bash
# Сборка образа
docker build -t infbez2 .

# Запуск контейнера с базой данных
docker run -d --name mysql-db \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=labainfsec \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppassword \
  -p 3306:3306 \
  mysql:8.0

# Запуск приложения
docker run -d --name infbez-app \
  --link mysql-db:mysql \
  -e DB_HOST=mysql \
  -e DB_USER=appuser \
  -e DB_PASSWORD=apppassword \
  -e DB_NAME=labainfsec \
  -e SESSION_SECRET=your-secret-key \
  -p 3001:3001 \
  infbez2
```

## Переменные окружения

Создайте файл `.env` с настройками:

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=apppassword
DB_NAME=labainfsec
SESSION_SECRET=your-secret-key-change-this
NODE_ENV=production
PORT=3001
```

## Доступ к приложению

- Приложение: http://localhost:3001
- База данных: localhost:3306

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f app

# Остановка сервисов
docker-compose down

# Остановка с удалением volumes
docker-compose down -v

# Перезапуск только приложения
docker-compose restart app

# Подключение к контейнеру
docker-compose exec app sh
```

## Безопасность

⚠️ **Важно**: Измените пароли и секретные ключи в production!

- `SESSION_SECRET` - должен быть случайной строкой
- `MYSQL_ROOT_PASSWORD` - пароль root для MySQL
- `MYSQL_PASSWORD` - пароль пользователя приложения
