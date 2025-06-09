# Используем официальный Node.js образ
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
COPY .npmrc .npmrc

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Открываем порт (замените на ваш порт, если не 3000)
EXPOSE 5000

# Переменные окружения (опционально)
# ENV NODE_ENV=production

# Запуск приложения
CMD ["npm", "start"]