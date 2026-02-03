# 开发坑点

## 1. middleware 仅检查 cookie 是否存在

- 问题：cookie 存在但会话失效时，middleware 放行但页面又会重定向，导致闪烁。
- 处理：关键分组用 server guard 做最终判定。

## 2. tRPC 返回 BigInt 序列化问题

- 问题：list 类接口返回了 BigInt（如 id/count），导致 `JSON.stringify` 报错。
- 处理：返回前把 BigInt 转为 string/number，避免在 tRPC 输出层爆炸。

## 3. 并发登录指纹不要用 ip+ua

- 问题：NAT/代理/移动网络导致 ip 变化，误判新设备。
- 处理：前端生成并持久化 deviceId，通过 `x-device-id` 传给后端。

## 4. 踢下线必须删除 DB session

- 问题：只删 Redis key 并不能让 Better-Auth 的 DB session 失效。
- 处理：按 token 删除 `session` 表记录，确保被踢端下线。

## 5. E2E 环境变量需要在 turbo.json 声明

- 问题：eslint 的 `turbo/no-undeclared-env-vars` 会因为未声明 env 而失败。
- 处理：把 E2E 相关 env 加到 `turbo.json.globalEnv`。
