import knex from '../../inc/knex.js';
import { checkPermissionInc } from '../../inc/common.js';

// Получить список устройств пользователя
export default async function getUsersDevices(req, res) {
    try {
        if (!await checkPermissionInc(req, 'admin.hwids')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
            });
        }
        const userId = req.params.userId || req.user?.userId;
        if (!userId) {
            return res.status(400).json({ error: true, msg: 'Missing userId' });
        }

        const devices = await knex('devices')
            .where({ userid: userId })
            .select(
                'id',
                'publickey',
                'hwDiskId',
                'baseboardSerialNumber',
                'graphicCard',
                'displayId',
                'bitness',
                'totalMemory',
                'logicalProcessors',
                'physicalProcessors',
                'processorMaxFreq',
                'battery',
                'banned'
            );

        return res.status(200).json({
            error: false,
            msg: 'Devices retrieved successfully',
            data: devices
        });
    } catch (error) {
        console.error('Error retrieving devices:', error);
        return res.status(500).json({ error: true, msg: 'Failed to retrieve devices' });
    }
}
