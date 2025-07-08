# 🔧 Руководство по использованию схем валидации

## 📋 Обзор

Схемы валидации с Joi обеспечивают безопасную и надежную проверку входных данных в вашем приложении CookieCMS-JS.

## 🚀 Быстрый старт

### 1. Импорт и использование

```javascript
import { validateRequest, validateData } from '../middleware/validation.js';
import { schemas } from '../inc/schemas.js';
```

### 2. Использование middleware в роутах

```javascript
// В файле роутов (например, auth/index.js)
import express from 'express';
import { validateRequest } from '../../middleware/validation.js';
import login from './Singin.js';
import signup from './Singup.js';

const router = express.Router();

// Автоматическая валидация перед выполнением контроллера
router.post('/login', validateRequest('sign'), login);
router.post('/signup', validateRequest('signup'), signup);

export default router;
```

### 3. Ручная валидация в контроллерах

```javascript
// В контроллере
async function changePassword(req, res) {
    // Валидация данных
    const validation = validateData(req.body, 'changePassword');
    
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Validation failed',
            details: validation.errors
        });
    }
    
    // Используем проверенные данные
    const { currentPassword, newPassword } = validation.value;
    
    // Продолжаем логику...
}
```

## 📝 Доступные схемы

### Аутентификация
- `sign` - Вход в систему (username, password)
- `signup` - Регистрация (username, email, password)
- `forgetPassword` - Забыли пароль (email)
- `resetPassword` - Сброс пароля (code, password)

### Управление профилем
- `changeEmail` - Смена email (mail, password)
- `changePassword` - Смена пароля (currentPassword, newPassword)
- `verifyCode` - Подтверждение кода (code, password?)

### Загрузка файлов
- `uploadSkin` - Загрузка скина (name?, slim?, hd?)

### Общие
- `FormMail` - Простая проверка email

## 🔧 Создание новых схем

```javascript
// В src/inc/schemas.js добавьте новую схему:

const schemas = {
  // Существующие схемы...
  
  // Новая схема для обновления профиля
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    bio: Joi.string().max(500).optional(),
    avatar: Joi.string().uri().optional()
  }),
  
  // Схема для админских действий
  adminUpdateUser: Joi.object({
    userId: Joi.number().integer().positive().required(),
    permissions: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('active', 'banned', 'suspended').optional()
  })
};
```

## 🛡️ Продвинутые возможности

### 1. Условная валидация

```javascript
// Схема с условием
const conditionalSchema = Joi.object({
  type: Joi.string().valid('email', 'sms').required(),
  contact: Joi.when('type', {
    is: 'email',
    then: Joi.string().email().required(),
    otherwise: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
  })
});
```

### 2. Кастомная валидация

```javascript
const customSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .custom((value, helpers) => {
      // Проверка на уникальность username
      if (bannedUsernames.includes(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
});
```

### 3. Валидация файлов

```javascript
const fileUploadSchema = Joi.object({
  file: Joi.object({
    mimetype: Joi.string().valid('image/png', 'image/jpeg').required(),
    size: Joi.number().max(5 * 1024 * 1024).required() // 5MB max
  }).required(),
  description: Joi.string().max(200).optional()
});
```

## 🔄 Интеграция с middleware

### 1. Создание специализированного middleware

```javascript
// src/middleware/authValidation.js
import { validateRequest } from './validation.js';
import { requireAuth } from './auth.js';

export const validateAndAuth = (schemaName) => [
  validateRequest(schemaName),
  requireAuth
];

// Использование
router.post('/admin/users', ...validateAndAuth('adminUpdateUser'), adminController);
```

### 2. Валидация с трансформацией

```javascript
export const validateAndTransform = (schemaName) => {
  return (req, res, next) => {
    const validation = validateData(req.body, schemaName);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: true,
        msg: 'Validation failed',
        details: validation.errors
      });
    }
    
    // Трансформируем данные
    req.validatedData = validation.value;
    req.originalData = req.body;
    
    next();
  };
};
```

## 📊 Обработка ошибок валидации

### 1. Стандартный формат ошибок

```javascript
{
  "error": true,
  "msg": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "\"password\" must be at least 8 characters"
    },
    {
      "field": "email", 
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

### 2. Кастомизация сообщений

```javascript
const customMessages = {
  'string.min': 'Поле {#label} должно содержать минимум {#limit} символов',
  'string.email': 'Поле {#label} должно быть валидным email адресом',
  'any.required': 'Поле {#label} обязательно для заполнения'
};

const schema = Joi.object({
  email: Joi.string().email().required().messages(customMessages)
});
```

## 🧪 Тестирование схем

```javascript
// tests/validation.test.js
import { validateData } from '../src/middleware/validation.js';

describe('Validation Schemas', () => {
  test('valid login data', () => {
    const data = {
      username: 'testuser',
      password: 'Password123!'
    };
    
    const result = validateData(data, 'sign');
    expect(result.isValid).toBe(true);
  });
  
  test('invalid email format', () => {
    const data = {
      username: 'test',
      email: 'invalid-email',
      password: 'Password123!'
    };
    
    const result = validateData(data, 'signup');
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('email');
  });
});
```

## 📈 Лучшие практики

1. **Всегда валидируйте** входные данные перед обработкой
2. **Используйте whitelist подход** - разрешайте только известные поля
3. **Логируйте ошибки валидации** для мониторинга
4. **Не передавайте** системные ошибки пользователю
5. **Кешируйте схемы** для лучшей производительности
6. **Тестируйте схемы** с различными типами данных

## 🔧 Миграция существующего кода

1. Замените ручную валидацию на схемы Joi
2. Обновите роуты с middleware валидации
3. Протестируйте все endpoints
4. Обновите фронтенд для обработки новых форматов ошибок

## 📚 Полезные ссылки

- [Joi Documentation](https://joi.dev/api/)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [Validation Best Practices](https://owasp.org/www-project-cheat-sheets/cheatsheets/Input_Validation_Cheat_Sheet.html)
