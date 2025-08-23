import cron from 'node-cron';
import knex from '../inc/knex.js';
import logger from '../logger.js';

// Функция для выполнения задач из базы данных
async function processCronTasks() {
    try {
        const now = new Date();
        
        // Получаем задачи, которые нужно выполнить
        const tasks = await knex('cron_tasks')
            .where('run_at', '<=', now)
            .where('status', 'pending')
            .limit(10);

        for (const task of tasks) {
            try {
                // Обновляем статус на "processing"
                await knex('cron_tasks')
                    .where('id', task.id)
                    .update({ status: 'processing' });

                // Выполняем задачу в зависимости от типа
                await executeTask(task);

                // Удаляем или помечаем как выполненную
                await knex('cron_tasks')
                    .where('id', task.id)
                    .delete();

                logger.info(`Task ${task.id} completed successfully`);
            } catch (error) {
                logger.error(`Task ${task.id} failed:`, error);
                
                // Помечаем как failed
                await knex('cron_tasks')
                    .where('id', task.id)
                    .update({ 
                        status: 'failed',
                        error_message: error.message 
                    });
            }
        }
    } catch (error) {
        logger.error('Error processing cron tasks:', error);
    }
}

// Выполнение конкретной задачи
async function executeTask(task) {
    switch (task.type) {
        case 'send_email':
            // Отправка email
            break;
        case 'cleanup_sessions':
            // Очистка сессий
            break;
        case 'update_user_status':
            // Обновление статуса пользователя
            await knex('users')
                .where('id', task.target)
                .update({ status: task.update_value });
            break;
        default:
            throw new Error(`Unknown task type: ${task.type}`);
    }
}

// Добавление новой задачи
export async function addNewTask(task, userId, value, time, removeold = false) {
    try {
        await knex.transaction(async (trx) => {
            if (removeold === true) {
                await trx('cron_tasks')
                    .where({ target: userId })
                    .delete();
            }
            
            const runAt = new Date(time * 1000);
            
            await trx('cron_tasks').insert({
                run_at: runAt,
                type: task,
                target: userId,
                update_value: value,
                status: 'pending'
            });
        });
        
        return { success: true };
    } catch (error) {
        logger.error("Error adding task to cron_tasks:", error);
        return { success: false, error: error.message };
    }
}

// Запуск планировщика
export function startCronScheduler() {
    // Проверяем задачи каждую минуту
    cron.schedule('* * * * *', processCronTasks);
    
    // Очистка старых завершенных задач каждый час
    cron.schedule('0 * * * *', async () => {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            await knex('cron_tasks')
                .where('status', 'completed')
                .where('run_at', '<', oneHourAgo)
                .delete();
            
            logger.info('Old completed tasks cleaned up');
        } catch (error) {
            logger.error('Error cleaning up old tasks:', error);
        }
    });
    
    logger.info('Cron scheduler started');
}

export default {
    addNewTask,
    startCronScheduler
};