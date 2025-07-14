import knex from '../../inc/knex.js';
import { createResponse } from '../../inc/common.js';

// Получить все устройства пользователя
export async function getUserDevices(req, res) {
    const userId = req.params.userId;
    try {
        const devices = await knex('devices').where('userid', userId);
        res.status(200).json(createResponse('Список устройств', null, devices));
    } catch (error) {
        res.status(500).json(createResponse('Ошибка получения устройств'));
    }
}

// Забанить устройство
export async function banDevice(req, res) {
    const deviceId = req.params.deviceId;
    try {
        await knex('devices').where('id', deviceId).update({ banned: true });
        res.status(200).json(createResponse('Устройство забанено'));
    } catch (error) {
        res.status(500).json(createResponse('Ошибка бана устройства'));
    }
}

// Разбанить устройство
export async function unbanDevice(req, res) {
    const deviceId = req.params.deviceId;
    try {
        await knex('devices').where('id', deviceId).update({ banned: false });
        res.status(200).json(createResponse('Устройство разбанено'));
    } catch (error) {
        res.status(500).json(createResponse('Ошибка разбана устройства'));
    }
}

// Удалить устройство
export async function deleteDevice(req, res) {
    const deviceId = req.params.deviceId;
    try {
        await knex('devices').where('id', deviceId).del();
        res.status(200).json(createResponse('Устройство удалено'));
    } catch (error) {
        res.status(500).json(createResponse('Ошибка удаления устройства'));
    }
}
