export default function AdminPlanPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">管理员规划</h1>
        <p className="text-sm text-muted-foreground">把“普通用户可用 + 管理员可治理”拆成可落地的模块。</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">权限模型（推荐）</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>最小可行：RBAC + Owner。</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              user：只能操作自己的题目/题库/资料（按 userId 过滤 + 写入校验）
            </li>
            <li>
              admin：可查看/编辑/删除任意资源；可批量操作；可禁用用户；可审计
            </li>
          </ul>
          <p>后续可升级：role + permission（细粒度能力开关），以及资源级审计日志。</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">管理员后台模块</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-6 space-y-1">
            <li>用户管理：列表/搜索/禁用/重置密码（可选）/角色变更</li>
            <li>题目管理：全局列表、按用户/题库过滤、批量删除、批量导入</li>
            <li>题库管理：全局列表、批量删除、批量导入、题库合并（可选）</li>
            <li>内容治理：软删回收站、恢复、彻底删除、敏感词（可选）</li>
            <li>审计与风控：操作日志、登录设备、异常行为（可选）</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">批量导入建议</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-6 space-y-1">
            <li>支持 CSV/JSON 两种格式；后端做严格 schema 校验</li>
            <li>导入任务异步化：生成任务 ID + 进度查询（后续）</li>
            <li>导入策略：同名去重/覆盖/跳过（可配置）</li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">前端路由（建议）</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-6 space-y-1">
            <li>/admin：总览</li>
            <li>/admin/users：用户列表与详情</li>
            <li>/admin/questions：题目列表与批量操作</li>
            <li>/admin/question-banks：题库列表与批量操作</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

