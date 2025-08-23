import knex from '../../inc/knex.js';
import { checkPermissionInc } from '../../inc/common.js';

// Middleware для проверки авторизации

// Получить расширенный список всех ролей и разрешений
export async function getExtendedRolePermissions(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const groups = await knex('permissions_groups').select('*');
    const permissions = await knex('permissions').select('*');

    // Получаем разрешения для каждой группы
    const groupIds = groups.map(g => g.id);
    const relations = await knex('permission_group_relations')
      .whereIn('group_id', groupIds);

    const permsById = {};
    permissions.forEach(p => { permsById[p.id] = p; });

    const groupsWithPerms = groups.map(g => ({
      ...g,
      permissions: relations
        .filter(r => r.group_id === g.id)
        .map(r => permsById[r.permission_id])
        .filter(Boolean)
    }));

    res.json({
      groups: groupsWithPerms,
      permissions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch extended role permissions' });
  }
}

// Получить список всех ролей
export async function getRoles(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const roles = await knex('permissions_groups').select('*');
    res.json({ roles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
}

// Создать новую роль
export async function createRole(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { name, description, level, is_default } = req.body;
    const [id] = await knex('permissions_groups')
      .insert({ name, description, level, is_default: !!is_default })
      .returning('id');
    res.status(201).json({ id, message: 'Role created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create role' });
  }
}

// Обновить существующую роль
export async function updateRole(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { id } = req.params;
    const { name, description, level, is_default } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (level !== undefined) updateFields.level = level;
    if (is_default !== undefined) updateFields.is_default = is_default;

    const updated = await knex('permissions_groups').where({ id }).update(updateFields);
    if (!updated) return res.status(404).json({ error: 'Role not found' });

    res.json({
      message: 'Role updated successfully',
      updatedFields: Object.keys(updateFields)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

// Удалить роль
export async function deleteRole(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { id } = req.params;
    // Проверка: есть ли пользователи с этой ролью
    const usersWithRole = await knex('users').where({ role_id: id }).first();
    if (usersWithRole) {
      return res.status(400).json({ error: 'Cannot delete role: assigned to users' });
    }
    const deleted = await knex('permissions_groups').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
}

// Получить список всех разрешений
export async function getPermissions(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const permissions = await knex('permissions').select('*');
    res.json({ permissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

// Создать новое разрешение
export async function createPermission(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { name, category, description } = req.body;
    const idArr = await knex('permissions')
      .insert({ name, category, description })
      .returning('id');

    const id = typeof idArr[0] === 'object' ? idArr[0].id : idArr[0];

    res.status(201).json({ id, message: 'Permission created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create permission' });
  }
}

// Обновить разрешение
export async function updatePermission(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;
    const updated = await knex('permissions').where({ id }).update({ name, category, description });
    if (!updated) return res.status(404).json({ error: 'Permission not found' });
    res.json({ message: 'Permission updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
}

// Удалить разрешение
export async function deletePermission(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { id } = req.params;
    // Проверка: используется ли разрешение ролями
    const used = await knex('permission_group_relations').where({ permission_id: id }).first();
    if (used) {
      return res.status(400).json({ error: 'Cannot delete permission: used by roles' });
    }
    const deleted = await knex('permissions').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Permission not found' });
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
}

// Назначить разрешение роли
export async function assignPermissionToRole(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { roleId, permissionId } = req.params;
    
    console.log(`Assigning permission ${permissionId} to role ${roleId}`);
    
    if (!roleId || !permissionId) {
      return res.status(400).json({ error: 'roleId and permissionId are required' });
    }
    
    // Проверка существования роли и разрешения
    const role = await knex('permissions_groups').where({ id: roleId }).first();
    const perm = await knex('permissions').where({ id: permissionId }).first();
    if (!role || !perm) return res.status(404).json({ error: 'Role or permission not found' });

    // Проверка, не назначено ли уже
    const exists = await knex('permission_group_relations')
      .where({ group_id: roleId, permission_id: permissionId }).first();
    if (exists) {
      return res.json({
        message: 'Permission already assigned to role',
        status: 'already_exists'
      });
    }

    await knex('permission_group_relations').insert({ group_id: roleId, permission_id: permissionId });
    res.json({
      message: 'Permission assigned to role successfully',
      status: 'assigned'
    });
  } catch (error) {
    console.error('Error assigning permission to role:', error);
    res.status(500).json({ error: 'Failed to assign permission to role' });
  }
}

// Отозвать разрешение у роли
export async function revokePermissionFromRole(req, res) {
  if (!await checkPermissionInc(req, 'admin.settings')) {
    return res.status(403).json({
      error: true,
      msg: 'Permission denied',
      code: 403
    });
  }
  try {
    const { roleId, permissionId } = req.params;
    console.log(`Revoke permission ${permissionId} from role ${roleId}`);

    if (!roleId || !permissionId) {
      return res.status(400).json({ error: 'roleId and permissionId are required' });
    }


    // Проверка существования роли и разрешения
    const role = await knex('permissions_groups').where({ id: roleId }).first();
    const perm = await knex('permissions').where({ id: permissionId }).first();
    if (!role || !perm) {
      return res.status(404).json({ error: 'Role or permission not found' });
    }

    // Проверка, назначено ли разрешение
    const exists = await knex('permission_group_relations')
      .where({ group_id: roleId, permission_id: permissionId }).first();
    if (!exists) {
      return res.status(400).json({ error: 'Permission not assigned to this role' });
    }

    await knex('permission_group_relations')
      .where({ group_id: roleId, permission_id: permissionId }).del();
    res.json({ message: 'Permission revoked from role successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to revoke permission from role' });
  }
}
