import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import knex from '../../inc/knex.js';
import { getSkinData } from '../skins/gravitlauncher.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'YOUR_BEARER_TOKEN';

// Генерация User-объекта
export async function gl_makeUser(user) {
  let assets = {};
  try {
    assets = await getSkinData(user.uuid);
  } catch (e) {
    assets = {};
  }
  return {
    username: user.username,
    uuid: user.uuid,
    permissions: user.permissions || ['launcher.*'],
    roles: user.roles || ['Admin'],
    assets: assets || {}
  };
}

// Генерация UserSession-объекта
export async function gl_makeSession(user, accessToken, refreshToken, expire) {
  const userObj = await gl_makeUser(user);
  return {
    id: String(user.id),
    accessToken,
    refreshToken,
    expire,
    user: userObj
  };
}

// Ошибка в формате GravitLauncher
export function gl_error(msg, code = 1000) {
  return { error: msg, code };
}

// Авторизация (логин)
export async function gl_authorize(req, res) {
  const { login, password, totpCode } = req.body;

  console.log(req.body);
  if (!login || !password) return res.status(400).json(gl_error('Missing credentials'));

  const user = await knex('users').where({ username: login }).first();
  if (!user) return res.status(401).json(gl_error('Invalid credentials'));

  // 2FA: если у пользователя включен 2FA, но код не передан
  // if (user.totp_secret && !totpCode) {
  //   return res.status(401).json(gl_error('auth.require2fa'));
  // }
  // 2FA: если включен и код передан, проверить его (реализация зависит от вашей 2FA)
  // if (user.totp_secret && totpCode && !verifyTOTP(user.totp_secret, totpCode)) {
  //   return res.status(401).json(gl_error('Invalid 2FA code'));
  // }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json(gl_error('Invalid credentials'));

  const accessToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const expire = 3600;

  const userObj = await gl_makeUser(user);

  res.json({
    id: String(user.id),
    accessToken,
    refreshToken,
    expire,
    user: userObj
  });
}

// Получение пользователя по username
export async function gl_getByUsername(req, res) {
  const { username } = req.query;
  if (!username) return res.status(400).json(gl_error('Missing username'));
  const user = await knex('users').where({ username }).first();
  if (!user) return res.status(404).json(gl_error('User not found'));
  const userObj = await gl_makeUser(user);
  res.json(userObj);
}

// Получение пользователя по uuid
export async function gl_getByUuid(req, res) {
  const { uuid } = req.query;
  if (!uuid) return res.status(400).json(gl_error('Missing uuid'));
  const user = await knex('users').where({ uuid }).first();
  if (!user) return res.status(404).json(gl_error('User not found'));
  const userObj = await gl_makeUser(user);
  res.json(userObj);
}

// Получение сессии по accessToken
export async function gl_getByToken(req, res) {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json(gl_error('Missing accessToken'));
  try {
    const payload = jwt.verify(accessToken, JWT_SECRET);
    const user = await knex('users').where({ id: payload.sub }).first();
    if (!user) return res.status(404).json(gl_error('User not found'));
    const session = await gl_makeSession(user, accessToken, null, 3600);
    res.json(session);
  } catch {
    res.status(401).json(gl_error('Invalid or expired token'));
  }
}

// Обновление токена
export async function gl_refreshToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json(gl_error('Missing refreshToken'));
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = await knex('users').where({ id: payload.sub }).first();
    if (!user) return res.status(404).json(gl_error('User not found'));
    const accessToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const session = await gl_makeSession(user, accessToken, refreshToken, 3600);
    res.json(session);
  } catch {
    res.status(401).json(gl_error('Invalid or expired refreshToken'));
  }
}

// Вход на сервер (joinserver)
export async function gl_joinServer(req, res) {
  const { username, uuid, accessToken, serverId } = req.body;
  if (!username || !uuid || !accessToken || !serverId) {
    return res.status(400).json(gl_error('Missing username, uuid, accessToken or serverId'));
  }

  // Проверка токена пользователя
  try {
    const payload = jwt.verify(accessToken, JWT_SECRET);
    const user = await knex('users').where({ id: payload.sub, username, uuid }).first();
    if (!user) return res.status(401).json(gl_error('Invalid user or token'));

    // Здесь можно сохранить serverId для пользователя, если нужно (например, для checkserver)
    await knex('users').where({ id: user.id }).update({ last_server_id: serverId });

    return res.status(200).json({ msg: 'OK' });
  } catch {
    return res.status(401).json(gl_error('Invalid or expired accessToken'));
  }
}

export async function gl_checkServer(req, res) {
  const { username, serverId } = req.body;
  if (!username || !serverId) return res.status(400).json(gl_error('Missing username or serverId'));
  const user = await knex('users').where({ username }).first();
  if (!user) return res.status(404).json(gl_error('User not found'));
  const userObj = await gl_makeUser(user);
  res.json(userObj);
}


// --- /gravit/gethardwarebykey ---
export async function gl_getHardwareByKey(req, res) {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ error: true, msg: 'Missing publicKey' });

    // publickey хранится как строка (base64), без Buffer
    const hwid = await knex('hwids').where({ publickey: publicKey }).first();
    if (!hwid) return res.status(404).json({ error: true, msg: 'Hardware not found' });

    res.status(200).json({ id: hwid.id, ...hwid });
}

// --- /gravit/gethardwarebydata ---
export async function gl_getHardwareByData(req, res) {
    const { info } = req.body;
    if (!info) return res.status(400).json({ error: true, msg: 'Missing info' });

    const hwid = await knex('hwids')
        .where({
            hwDiskId: info.hwDiskId,
            baseboardSerialNumber: info.baseboardSerialNumber,
            graphicCard: info.graphicCard
        })
        .first();

    if (!hwid) return res.status(404).json({ error: true, msg: 'Hardware not found' });

    res.status(200).json({ id: hwid.id, ...hwid });
}

// --- /gravit/createhardware ---
export async function gl_createHardware(req, res) {
    const { info, publicKey } = req.body;
    if (!info || !publicKey) return res.status(400).json({ error: true, msg: 'Missing info or publicKey' });

    // Проверяем, есть ли уже такой HWID
    let hwidRow = await knex('hwids')
        .where({
            hwDiskId: info.hwDiskId,
            baseboardSerialNumber: info.baseboardSerialNumber,
            graphicCard: info.graphicCard
        })
        .first();

    if (!hwidRow) {
        // Создаём новую запись (все поля как строки/числа/boolean)
        const [id] = await knex('hwids')
            .insert({
                publickey: publicKey,
                hwDiskId: info.hwDiskId,
                baseboardSerialNumber: info.baseboardSerialNumber,
                graphicCard: info.graphicCard,
                displayId: info.displayId || null,
                bitness: info.bitness,
                totalMemory: info.totalMemory,
                logicalProcessors: info.logicalProcessors,
                physicalProcessors: info.physicalProcessors,
                processorMaxFreq: info.processorMaxFreq,
                battery: info.battery,
                banned: false
            })
            .returning('id');
        hwidRow = await knex('hwids').where({ id }).first();
    }
    res.status(201).json({ id: hwidRow.id, ...hwidRow });
}

// --- /gravit/connectuserhardware ---
export async function gl_connectUserHardware(req, res) {
    // Ожидается: { userSession, hardware } или { userId, hardwareId }
    let userId, hardwareId;

    // Универсальный парсер для разных форматов
    if (req.body.userId && req.body.hardwareId) {
        userId = req.body.userId;
        hardwareId = req.body.hardwareId;
    } else if (req.body.userSession && req.body.hardware) {
        // Если приходит объект userSession с id
        userId = req.body.userSession.id || req.body.userSession.user?.id;
        hardwareId = req.body.hardware.id;
    } else {
        return res.status(400).json({ error: true, msg: 'Missing userId or hardwareId' });
    }

    if (!userId || !hardwareId) {
        return res.status(400).json({ error: true, msg: 'Missing userId or hardwareId' });
    }

    try {
        // Привязываем hardware к пользователю (например, поле hwidId в users)
        await knex('users').where({ id: userId }).update({ hwidId: hardwareId });
        res.status(201).json({ msg: 'Connected' });
    } catch (e) {
        console.error('connectUserAndHardware error:', e);
        res.status(500).json({ error: true, msg: 'Failed to connect user and hardware' });
    }
}

// --- /gravit/addpublickey ---
export async function gl_addPublicKey(req, res) {
    const { hardwareId, publicKey } = req.body;
    if (!hardwareId || !publicKey) return res.status(400).json({ error: true, msg: 'Missing hardwareId or publicKey' });

    await knex('hwids').where({ id: hardwareId }).update({ publickey: publicKey });
    res.status(201).json({ msg: 'Public key added' });
}

// --- /gravit/gethardwarebyid ---
export async function gl_getHardwareById(req, res) {
    let id = req.body.id;
    if (typeof id === 'object' && id !== null) id = id.id;
    if (!id) return res.status(400).json({ error: true, msg: 'Missing id' });

    const hwid = await knex('hwids').where({ id: Number(id) }).first();
    if (!hwid) return res.status(404).json({ error: true, msg: 'Hardware not found' });

    res.status(200).json({ id: hwid.id, ...hwid });
}

// --- /gravit/getusersbyhardware ---
export async function gl_getUsersByHardware(req, res) {
    const { hardwareId } = req.body;
    if (!hardwareId) return res.status(400).json({ error: true, msg: 'Missing hardwareId' });

    const users = await knex('users').where({ hwidId: hardwareId });
    res.status(200).json({ users });
}

// --- /gravit/banhardware ---
export async function gl_banHardware(req, res) {
    const { hardwareId } = req.body;
    if (!hardwareId) return res.status(400).json({ error: true, msg: 'Missing hardwareId' });

    await knex('hwids').where({ id: hardwareId }).update({ banned: true });
    res.status(201).json({ msg: 'Hardware banned' });
}

// --- /gravit/unbanhardware ---
export async function gl_unbanHardware(req, res) {
    const { hardwareId } = req.body;
    if (!hardwareId) return res.status(400).json({ error: true, msg: 'Missing hardwareId' });

    await knex('hwids').where({ id: hardwareId }).update({ banned: false });
    res.status(201).json({ msg: 'Hardware unbanned' });
}


export default router;