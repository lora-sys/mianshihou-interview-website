export default function PitfallsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">踩坑记录</h1>
        <p className="text-sm text-muted-foreground">把“为什么会坏、怎么修、以后怎么避免”写清楚。</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Better Auth + tRPC 下发 Cookie</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            症状：注册成功，但登录一直 401；或者登录接口成功但前端仍然“未登录”。
          </p>
          <p>
            原因：Better Auth 的 server API 默认只返回 JSON，不会把 Set-Cookie 自动写回你的 Fastify
            Response；需要使用 returnHeaders 并把 headers 写回到 reply。
          </p>
          <p>
            规避：封装一个“把 Better Auth Response headers 写到 ctx.res 的工具函数”，signUp/signIn/signOut
            统一走它，避免漏掉。
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Drizzle + ANY 参数陷阱</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            症状：题库里只有 1 道题时，getQuestions 报 500，日志里出现
            <code className="px-1">id = ANY(($2))</code>，参数却是 <code className="px-1">461</code> 而不是数组。
          </p>
          <p>
            原因：把 JS 数组直接塞进 sql 模板并不总能得到正确的 PG 数组参数化。
          </p>
          <p>
            修复：优先用 <code className="px-1">inArray(column, ids)</code> 生成稳定的 SQL。
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">权限与“数据归属”</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            症状：只做了登录校验（protectedProcedure），但没有限制资源 owner，会导致普通用户能读/改/删别人的题目/题库。
          </p>
          <p>
            修复思路：所有读写都基于 <code className="px-1">userId</code> 限制；管理员可绕过（admin override）。
            对外建议用“看起来像 404”的返回，避免泄露资源是否存在。
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">SSR 与客户端边界</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            目标：首页与公共页面优先 SSR，交互部分用最小 client island，避免整站被 provider/layout 拉进客户端。
          </p>
          <p>
            实践：对首页用 server component 直接 fetch tRPC，并从 request cookies 透传登录态；对需要保护的路由用 middleware
            做未登录重定向。
          </p>
        </div>
      </section>
    </main>
  );
}

