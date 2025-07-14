import { schemas } from '../inc/schemas.js';
import logger from '../logger.js';

/**
 * Middleware для валидации данных запроса
 * @param {string} schemaName - Название схемы из schemas объекта
 * @param {string} source - Источник данных ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export const validateRequest = (schemaName, source = 'body') => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        
        if (!schema) {
            logger.error(`Validation schema '${schemaName}' not found`);
            return res.status(500).json({ 
                error: true, 
                msg: 'Internal validation error' 
            });
        }

        const dataToValidate = req[source];
        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false, // Показать все ошибки, не только первую
            stripUnknown: true, // Удалить неизвестные поля
            convert: true // Автоматическое преобразование типов
        });

        if (error) {
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            logger.warn(`Validation failed for ${schemaName}:`, errorMessages);
            
            // Получаем первую ошибку для сообщения
            let mainError = "Validation failed";
            if (errorMessages.length > 0) {
                if (errorMessages[0].field === 'mail' && errorMessages[0].message.includes('valid')) {
                    mainError = "Invalid email format";
                } else if (errorMessages[0].field === 'password' && errorMessages[0].message.includes('length')) {
                    mainError = "Password must be at least 8 characters long";
                }
            }
            
            return res.status(400).json({
                error: true,
                msg: mainError,
                details: errorMessages
            });
        }

        // Заменяем исходные данные на валидированные и очищенные
        req[source] = value;
        next();
    };
};

/**
 * Универсальная функция для валидации данных
 * @param {Object} data - Данные для валидации
 * @param {string} schemaName - Название схемы
 * @returns {Object} { isValid, errors, value }
 */
export const validateData = (data, schemaName) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
        return {
            isValid: false,
            errors: [{ field: 'schema', message: `Schema '${schemaName}' not found` }],
            value: null
        };
    }

    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return {
            isValid: false,
            errors,
            value: null
        };
    }

    return {
        isValid: true,
        errors: null,
        value
    };
};

export default { validateRequest, validateData };
