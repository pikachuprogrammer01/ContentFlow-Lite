// 放到：server/scripts/verify-level-hierarchy-guard.ts
//
// 验证 assertCanManageUser 的 level 层级规则：
// actor 不能操作与自己同级或更高级别的用户（actorLevel <= targetLevel 应被拒绝）。
// 对应 PHASE3_DESIGN.md §3.8 "level 层级规则生效"——目前没有任何脚本覆盖这条。
//
// 本脚本不写任何数据（assertCanManageUser 是纯读取+校验函数，无副作用），
// 用系统里已存在的真实用户测试，不需要事务/回滚。
// 前提：系统内至少有 2 个 admin 角色用户 + 至少 1 个 super_admin。
// admin 不足 2 个时会直接判失败并提示怎么补（跑一下 promote-admin.ts 造一个测试 admin），
// 不做"静默跳过"——level 规则是核心安全保证，不应该允许在测试环境缺数据的情况下被绕过验收。
//
// 用法：tsx server/scripts/verify-level-hierarchy-guard.ts

import { AppDataSource } from '../db/client.js';
import { Role, UserRole } from '../entities';
import { assertCanManageUser, ForbiddenError } from '../services/permission-service';

async function main() {
  await AppDataSource.initialize();

  const adminRole = await AppDataSource.manager.findOneBy(Role, { code: 'admin' });
  const superAdminRole = await AppDataSource.manager.findOneBy(Role, { code: 'super_admin' });

  if (!adminRole || !superAdminRole) {
    console.error('❌ 找不到 admin 或 super_admin 系统角色，请先执行 seed-permissions');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const admins = await AppDataSource.manager.find(UserRole, { where: { roleId: adminRole.id } });
  const superAdmins = await AppDataSource.manager.find(UserRole, { where: { roleId: superAdminRole.id } });

  let ok = true;

  // 场景一：admin 操作同级 admin —— 应被拒绝
  if (admins.length < 2) {
    console.error('❌ 系统内 admin 角色用户不足 2 个，无法验证"同级拒绝"。请先: tsx scripts/promote-admin.ts <某用户名> admin');
    ok = false;
  } else {
    try {
      await assertCanManageUser(admins[0].userId, admins[1].userId);
      console.error('❌ 危险：admin 操作同级 admin 未被拒绝！');
      ok = false;
    } catch (err) {
      if (err instanceof ForbiddenError) {
        console.log('✅ 同级 admin 互相操作被正确拒绝');
      } else {
        console.error('❌ 抛出了非预期的错误：', err);
        ok = false;
      }
    }
  }

  // 场景二：super_admin 操作 admin（更高操作更低）—— 应该放行
  // 用来确认场景一不是"随便传两个 id 就无脑抛错误"的假阳性
  if (superAdmins.length < 1 || admins.length < 1) {
    console.error('⚠️  缺少 super_admin 或 admin 用户，跳过"更高层级放行"测试（不计入失败）');
  } else {
    try {
      await assertCanManageUser(superAdmins[0].userId, admins[0].userId);
      console.log('✅ super_admin 操作 admin（更高层级）被正确放行');
    } catch (err) {
      console.error('❌ super_admin 操作 admin 被意外拒绝（层级判断可能有 bug）：', err);
      ok = false;
    }
  }

  await AppDataSource.destroy();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});