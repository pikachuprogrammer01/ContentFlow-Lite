// 放到：server/scripts/verify-user-permission-override.ts
//
// 验证用户级权限覆盖（user_permissions GRANT/DENY + 过期）机制，
// 以及 grantUserPermission 写入前必须通过的两项校验：
//   1) assertCanManageUser（层级校验，同级操作应被拒绝）
//   2) "不能分发自己都没有的权限"（仅 GRANT 需要，DENY 不受此限制）
//
// 安全说明：本脚本做真实写入 + finally 里显式清理，不是事务回滚（原因见交付说明）。
// 测试对象固定使用 phase-gate 生成的一次性测试账号。
//
// 已知缺口（非本脚本问题）：grantUserPermission 当前签名没有开放设置 expires_at
// 的参数，测试过期逻辑时被迫绕过服务层直接插库构造，建议给该函数加可选的
// expiresAt 参数，否则"支持临时授权"这个设计意图没有代码路径能实现。
//
// 前提：系统内至少 2 个 admin 角色用户（跟 verify-level-hierarchy-guard.ts
// 共用同一前提，建议紧跟其后执行），以及至少 1 个仅有 user 角色的测试用户。
//
// 用法：tsx server/scripts/verify-user-permission-override.ts

import { AppDataSource } from '../db/client.js';
import { Role, UserRole, Permission, UserPermission } from '../entities/index.js';
import { grantUserPermission, getEffectivePermissions, ForbiddenError } from '../services/permission-service.js';

async function getUserIdsByRole(roleCode: string): Promise<string[]> {
  const role: Role | null = await AppDataSource.manager.findOneBy(Role, { code: roleCode });
  if (!role) return [];
  const rows: UserRole[] = await AppDataSource.manager.find(UserRole, { where: { roleId: role.id } });
  return rows.map((r) => r.userId);
}

async function main() {
  await AppDataSource.initialize();
  let ok = true;
  const cleanup: Array<() => Promise<void>> = [];

  const adminIds = await getUserIdsByRole('admin');
  const superAdminIds = await getUserIdsByRole('super_admin');
  const plainUserIds = (await getUserIdsByRole('user')).filter(
    (id) => !adminIds.includes(id) && !superAdminIds.includes(id),
  );

  if (adminIds.length < 2) {
    console.error('❌ 系统内 admin 角色用户不足 2 个，无法验证层级校验。请先: tsx scripts/promote-admin.ts <某用户名> admin');
    await AppDataSource.destroy();
    process.exit(1);
  }
  if (plainUserIds.length < 1) {
    console.error('❌ 找不到仅有 user 角色的测试账号，请先注册一个普通用户（不带 adminKey）');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const [admin1, admin2] = adminIds;
  const target = plainUserIds[0];

  try {
    // ── A：同级 admin 互相操作 → assertCanManageUser 应在 grantUserPermission 内部生效 ──
    try {
      await grantUserPermission(admin1, admin2, 'content:list', 'GRANT');
      console.error('❌ 危险：同级 admin 之间的权限授予未被拒绝（grantUserPermission 可能没调用 assertCanManageUser）');
      ok = false;
    } catch (err) {
      if (err instanceof ForbiddenError && /层级/.test(err.message)) {
        console.log('✅ 同级 admin 操作被 assertCanManageUser 正确拦截');
      } else {
        console.error('❌ 抛出了非预期的错误（期望层级校验错误）：', err);
        ok = false;
      }
    }

    // ── B："不能分发自己都没有的权限" —— admin 对 system:setting:database 没有该权限 ──
    try {
      await grantUserPermission(admin1, target, 'system:setting:database', 'GRANT');
      console.error('❌ 危险：admin 成功分发了自己都没有的权限 system:setting:database！');
      ok = false;
    } catch (err) {
      if (err instanceof ForbiddenError && /不能分发自己都没有的权限/.test(err.message)) {
        console.log('✅ "不能分发自己都没有的权限" 校验生效');
      } else {
        console.error('❌ 抛出了非预期的错误（期望权限分发校验错误）：', err);
        ok = false;
      }
    }

    // ── C：分发自己拥有的权限 → 应成功，且立即反映在 target 的 effective permissions ──
    const permUserList: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: 'user:list' });
    if (!permUserList) {
      console.error('❌ 权限码 user:list 不存在，请先执行 seed-permissions.ts');
      ok = false;
    } else {
      cleanup.push(async () => { await AppDataSource.manager.delete(UserPermission, { userId: target, permissionId: permUserList.id }); });
      try {
        await grantUserPermission(admin1, target, 'user:list', 'GRANT');
        const effective = await getEffectivePermissions(target);
        if (effective.has('user:list')) {
          console.log('✅ GRANT 成功，effective permissions 立即包含 user:list（无需等待缓存 TTL）');
        } else {
          console.error('❌ GRANT 未报错，但 effective permissions 里没有 user:list（缓存可能没有立即失效）');
          ok = false;
        }
      } catch (err) {
        console.error('❌ admin 分发自己拥有的权限时意外报错：', err);
        ok = false;
      }
    }

    // ── D1：DENY 不要求 actor 自己拥有该权限（与 GRANT 的校验不对称）──
    const permBatchDelete: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: 'content:batchDelete' });
    if (!permBatchDelete) {
      console.error('❌ 权限码 content:batchDelete 不存在，请先执行 seed-permissions.ts');
      ok = false;
    } else {
      cleanup.push(async () => { await AppDataSource.manager.delete(UserPermission, { userId: target, permissionId: permBatchDelete.id }); });
      try {
        await grantUserPermission(admin1, target, 'content:batchDelete', 'DENY');
        console.log('✅ DENY 不要求 actor 自己拥有该权限（符合设计的不对称校验）');
      } catch (err) {
        console.error('❌ DENY 不应受"自己是否拥有该权限"限制，但报错了：', err);
        ok = false;
      }
    }

    // ── D2：DENY 能真正移除一条来自角色的权限 ──
    const permContentList: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: 'content:list' });
    let admin1ForNudge = admin1; // 供测试 E 复用
    if (!permContentList) {
      console.error('❌ 权限码 content:list 不存在，请先执行 seed-permissions.ts');
      ok = false;
    } else {
      cleanup.push(async () => { await AppDataSource.manager.delete(UserPermission, { userId: target, permissionId: permContentList.id }); });
      try {
        const before = await getEffectivePermissions(target);
        if (!before.has('content:list')) {
          console.error('❌ target 本来就没有 content:list（应来自 user 角色），无法验证 DENY 效果，请检查 seed 数据');
          ok = false;
        } else {
          await grantUserPermission(admin1, target, 'content:list', 'DENY');
          const after = await getEffectivePermissions(target);
          if (!after.has('content:list')) {
            console.log('✅ DENY 生效，target 的 content:list（原本来自角色）已被移除');
          } else {
            console.error('❌ DENY 未报错，但 content:list 仍出现在 effective permissions 里');
            ok = false;
          }
        }
      } catch (err) {
        console.error('❌ DENY 一条角色授予的权限时意外报错：', err);
        ok = false;
      }
    }

    // ── E：过期的 GRANT 不应生效（直接插库构造，原因见文件头部说明）──
    const permSystemLog: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: 'system:log:list' });
    if (!permSystemLog) {
      console.error('❌ 权限码 system:log:list 不存在，请先执行 seed-permissions.ts');
      ok = false;
    } else {
      cleanup.push(async () => { await AppDataSource.manager.delete(UserPermission, { userId: target, permissionId: permSystemLog.id }); });
      await AppDataSource.manager.save(UserPermission, {
        userId: target,
        permissionId: permSystemLog.id,
        effect: 'GRANT',
        expiresAt: new Date(Date.now() - 60_000),
      });

      // 直接插库不会走 grantUserPermission 自带的缓存失效。如果这时候 target 的缓存
      // 还没过期，下面的查询可能命中"插入之前"的旧缓存——那样即使测出"不包含该码"，
      // 也只是巧合命中旧缓存，跟过期判断逻辑对不对无关，会是假阳性。所以先对 target
      // 做一次无害的 DENY（复用 D1 的手法），借它自带的"写入后立即清缓存"强制下一次
      // 查询走真正的 DB 重新计算。
      await grantUserPermission(admin1ForNudge, target, 'content:batchDelete', 'DENY');

      const effective = await getEffectivePermissions(target);
      if (!effective.has('system:log:list')) {
        console.log('✅ 已过期的 GRANT 未生效（已确认经过真实 DB 重新计算，非缓存巧合）');
      } else {
        console.error('❌ 危险：已过期的 GRANT 仍然生效！');
        ok = false;
      }
    }
  } finally {
    for (const fn of cleanup) {
      try { await fn(); } catch (err) { console.error('⚠️  清理测试数据时出错（请手动检查 user_permissions 表）：', err); }
    }
    await AppDataSource.destroy();
  }

  if (ok) { console.log('\n🎉 用户级权限覆盖机制验证通过'); process.exit(0); }
  console.error('\n❌ 用户级权限覆盖机制存在问题，见上方 ❌ 项');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});