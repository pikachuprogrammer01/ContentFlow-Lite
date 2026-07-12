// 放到：server/scripts/verify-generate-seeded.ts
//
// 确认 content:generate 权限码在 3 个系统角色上都有 GRANT（验证 seed-permissions.ts 是否正确执行）。
// 对应 PHASE3_DESIGN.md §3.8 "POST /api/generate 纳入权限码体系...三个内置角色默认均 GRANT"。
// 只做数据库直查，不需要服务运行，跟 verify-phase3-integrity.ts 的定位一致。
//
// 用法：tsx server/scripts/verify-generate-seeded.ts

import { AppDataSource } from '../db/client.js';
import { Role, Permission, RolePermission } from '../entities/index.js';

async function main() {
  await AppDataSource.initialize();

  const perm: Permission | null = await AppDataSource.manager.findOneBy(Permission, { code: 'content:generate' });
  if (!perm) {
    console.error('❌ 权限码 content:generate 不存在，请先执行 seed-permissions.ts');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const roles: Role[] = await AppDataSource.manager.find(Role, { where: { isSystem: true } });
  const missing: string[] = [];

  for (const role of roles) {
    const rp = await AppDataSource.manager.findOneBy(RolePermission, { roleId: role.id, permissionId: perm.id });
    if (!rp) missing.push(role.code);
  }

  await AppDataSource.destroy();

  if (missing.length === 0) {
    console.log('✅ content:generate 在全部系统角色上均已授予');
    process.exit(0);
  }
  console.error(`❌ content:generate 缺少以下角色的授权：${missing.join(', ')}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});