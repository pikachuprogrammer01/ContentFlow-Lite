// 放到：server/scripts/verify-permission-cache-timing.ts
//
// 验证 PHASE3_DESIGN.md §3.3 "主动失效" 与 "120 秒兜底 TTL" 的分工边界：
//   1) user_roles 变更（给用户摘角色）→ 应该立即失效
//   2) role_permissions 变更（编辑角色定义本身）→ 仍吃 120 秒 TTL，不做立即失效
//      （这是设计文档明确的取舍，不是遗漏）
//
// 本脚本只证明"改了 role_permissions 之后，立刻查询仍是旧值"（没有被提前失效），
// 不等到 120 秒后确认它真的变新——那样脚本要真 sleep 120+ 秒，日常校验里太慢也容易
// 因环境卡顿变 flaky，这半条留给人工在有耐心时验证一次。
//
// 安全说明：role_permissions 部分不改动任何真实权限码，而是新建一个带 __phase3_
// 前缀、没有任何路由引用的临时权限码，测完删除。user_roles 部分对 phase-gate 的
// 一次性测试账号做真实摘除+恢复，恢复直接写 user_roles 表（原因见下方：目前没有
// 对称的 assignUserRole 服务函数）。
//
// 已知缺口（非本脚本问题）：permission-service.ts 目前只展示了 removeUserRole，
// 没有对称的 assignUserRole。角色赋予现在只能绕开服务层直接写表，也就绕开了
// assertCanManageUser 这层保护——建议补一个同样支持 manager 注入、同样走层级
// 校验的 assignUserRole。
//
// 用法：tsx server/scripts/verify-permission-cache-timing.ts

import { randomUUID } from 'node:crypto';
import { AppDataSource } from '../db/client.js';
import { Role, UserRole, Permission, RolePermission } from '../entities/index.js';
import { getEffectivePermissions, removeUserRole } from '../services/permission-service.js';

const PROBE_CODE = '__phase3_cache_probe__';

async function getRoleAndUserIds(roleCode: string): Promise<{ roleId: string; userIds: string[] }> {
  const role: Role = await AppDataSource.manager.findOneByOrFail(Role, { code: roleCode });
  const rows: UserRole[] = await AppDataSource.manager.find(UserRole, { where: { roleId: role.id } });
  return { roleId: role.id, userIds: rows.map((r) => r.userId) };
}

async function main() {
  await AppDataSource.initialize();
  let ok = true;

  // ══════════════════ 第一部分：user_roles 变更 → 立即失效 ══════════════════
  let p1Target: string | null = null;
  let p1UserRoleId: string | null = null;
  let p1Removed = false;

  try {
    const { userIds: adminIds } = { userIds: (await getRoleAndUserIds('admin')).userIds };
    const { roleId: userRoleId, userIds: plainUsers } = await getRoleAndUserIds('user');
    const target = plainUsers.find((id) => !adminIds.includes(id));

    if (adminIds.length < 1 || !target) {
      console.error('❌ 缺少 admin 或仅有 user 角色的测试账号，跳过 user_roles 失效时机验证');
      ok = false;
    } else {
      p1Target = target;
      p1UserRoleId = userRoleId;

      const before = await getEffectivePermissions(target);
      if (!before.has('content:generate')) {
        console.error('❌ target 本来就没有 content:generate（应来自 user 角色），无法验证摘除效果，请检查 seed 数据');
        ok = false;
      } else {
        await removeUserRole(adminIds[0], target, userRoleId);
        p1Removed = true;

        const after = await getEffectivePermissions(target);
        if (!after.has('content:generate')) {
          console.log('✅ 摘除角色后，effective permissions 立即不再包含来自该角色的权限（无需等待 TTL）');
        } else {
          console.error('❌ 摘除角色未报错，但 content:generate 仍出现——缓存可能没有立即失效');
          ok = false;
        }
      }
    }
  } catch (err) {
    console.error('❌ user_roles 失效时机验证过程出错：', err);
    ok = false;
  } finally {
    if (p1Removed && p1Target && p1UserRoleId) {
      try {
        await AppDataSource.manager.save(UserRole, { userId: p1Target, roleId: p1UserRoleId });
        await getEffectivePermissions(p1Target); // 触发重新计算，避免残留摘除后的缓存状态
        console.log('↷ 已恢复 target 的 user 角色分配');
      } catch (err) {
        console.error('⚠️  恢复 target 角色分配失败，请手动检查 user_roles 表：', err);
        ok = false;
      }
    }
  }

  // ═══════════════ 第二部分：role_permissions 变更 → 不立即失效 ═══════════════
  let probePermId: string | null = null;
  let probeRoleId: string | null = null;

  try {
    const { roleId, userIds } = await getRoleAndUserIds('user');
    const target = userIds[0];
    if (!target) {
      console.error('❌ 找不到 user 角色用户，跳过 role_permissions 失效时机验证');
      ok = false;
    } else {
      probeRoleId = roleId;
      let probePerm: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: PROBE_CODE });
      if (!probePerm) {
        probePerm = await AppDataSource.manager.save(Permission, {
          id: randomUUID(),
          code: PROBE_CODE,
          name: '[Phase3测试临时权限码，脚本结束会自动删除]',
          type: 'api',
          status: true,
          sort: 9999,
        });
      }
      probePermId = probePerm.id;

      const before = await getEffectivePermissions(target);
      if (before.has(PROBE_CODE)) {
        console.error('⚠️  target 已经有这个 probe 码了（不应发生），结果可能不可靠');
      }

      // 直接改 role_permissions（模拟"编辑角色定义"），刻意不经过任何主动失效路径
      await AppDataSource.manager.save(RolePermission, { roleId, permissionId: probePermId, dataScope: 'SELF' });

      const immediately = await getEffectivePermissions(target);
      if (!immediately.has(PROBE_CODE)) {
        console.log('✅ role_permissions 变更后立即查询仍是旧值，符合"不做主动失效，吃120秒兜底"的设计');
      } else {
        console.log('ℹ️  role_permissions 变更后立即反映了新值——如果这是有意调整过缓存策略，' +
          '需要回头更新 PHASE3_DESIGN.md §3.3 的"覆盖范围"说明；如果不是有意的，是缓存策略变了但没同步文档。');
      }

      // 独立于缓存，直接查库确认这条写入本身是真实的，排除"旧值是因为写入失败"的可能
      if (!probePermId) {
        console.error('❌ probePermId 为 null，无法验证写入');
        ok = false;
      } else {
        const rowInDb = await AppDataSource.manager.findOneBy(RolePermission, { roleId, permissionId: probePermId });
        if (rowInDb) {
          console.log('✅ role_permissions 写入本身确认成功');
        } else {
          console.error('❌ role_permissions 写入未生效，上面"仍是旧值"可能只是写入失败导致的假阳性');
          ok = false;
        }
      }
    }
  } catch (err) {
    console.error('❌ role_permissions 失效时机验证过程出错：', err);
    ok = false;
  } finally {
    if (probeRoleId && probePermId) {
      try { await AppDataSource.manager.delete(RolePermission, { roleId: probeRoleId, permissionId: probePermId }); }
      catch (err) { console.error('⚠️  清理 role_permissions 测试数据失败：', err); }
    }
    if (probePermId) {
      try { await AppDataSource.manager.delete(Permission, { id: probePermId }); }
      catch { console.error('⚠️  清理临时权限码失败，请手动检查 permissions 表里的', PROBE_CODE); }
    }
  }

  await AppDataSource.destroy();

  if (ok) { console.log('\n🎉 缓存失效时机验证通过'); process.exit(0); }
  console.error('\n❌ 缓存失效时机验证发现问题，见上方 ❌ 项');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});