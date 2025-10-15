# Docker Setup для Emplacc Frontend

## Быстрый старт

### 1. Настройка переменных окружения
```bash
cp env.example .env
# Отредактируйте .env файл при необходимости
```

### 2. Запуск в production режиме
```bash
# Простой запуск (только frontend)
make up

# Или с nginx reverse proxy
make prod
```

### 3. Запуск в development режиме
```bash
make dev
```

## Доступные команды

| Команда | Описание |
|---------|----------|
| `make help` | Показать все доступные команды |
| `make build` | Собрать Docker образ |
| `make up` | Запустить приложение |
| `make down` | Остановить приложение |
| `make logs` | Показать логи |
| `make clean` | Очистить контейнеры и образы |
| `make dev` | Запустить в режиме разработки |
| `make prod` | Запустить в production с nginx |
| `make restart` | Перезапустить приложение |
| `make status` | Показать статус контейнеров |
| `make shell` | Открыть shell в контейнере |

## Прямые команды Docker Compose

```bash
# Сборка и запуск
docker-compose up --build

# Запуск в фоне
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f frontend

# Запуск с nginx
docker-compose --profile proxy up -d
```

## Структура

- **Frontend**: Next.js приложение на порту 3000
- **Nginx**: Reverse proxy на портах 80/443 (опционально)

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL API бэкенда | `https://api.emplacc.g-309.ru` |
| `NODE_ENV` | Режим работы | `production` |
| `PORT` | Порт приложения | `3000` |

## SSL/HTTPS

Для настройки HTTPS:

1. Поместите SSL сертификаты в папку `ssl/`:
   - `ssl/cert.pem` - сертификат
   - `ssl/key.pem` - приватный ключ

2. Раскомментируйте HTTPS секцию в `nginx.conf`

3. Запустите с nginx:
   ```bash
   make prod
   ```

## Мониторинг

- Health check доступен по адресу: `http://localhost/health`
- Логи: `make logs` или `docker-compose logs -f`

## Troubleshooting

### Проблемы с портами
```bash
# Проверить занятые порты
netstat -tulpn | grep :3000
netstat -tulpn | grep :80

# Остановить все контейнеры
docker-compose down
```

### Очистка
```bash
# Полная очистка
make clean

# Очистка только контейнеров
docker-compose down -v
```

### Пересборка
```bash
# Принудительная пересборка
docker-compose build --no-cache
docker-compose up -d
```
