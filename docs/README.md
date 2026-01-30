# 面试后项目文档索引

本文档提供了面试后项目的所有文档索引和分类。

## 📚 文档分类

### 🚀 快速开始
- [Husky Git Hooks 指南](./getting-started/husky-guide.md) - Git hooks 管理工具配置和使用
- [Monorepo 初始化](./getting-started/first.md) - pnpm workspace 和 Turborepo 初始化

### 📖 API 文档
- [API 接口文档](./api-documentation/api-documentation.md) - 所有 API 接口的详细说明
  - 认证接口（Better-Auth Handler 和 tRPC）
  - 用户管理接口
  - 帖子接口
  - 帖子点赞接口
  - 帖子收藏接口
  - 题库接口
  - 题目接口
- [统一后端响应格式计划](./统一后端响应格式计划.md) - 后端响应格式统一和敏感字段过滤的实施计划
- [接口改造计划](./接口改造计划.md) - 接口响应格式统一和权限控制的 TDD 实施计划

### 🧪 测试文档
- [测试使用指南](./testing/testing-guide.md) - 测试框架使用和编写指南
- [本地测试指南](./testing/local-testing-guide.md) - 本地运行测试的完整指南

### 🔄 CI/CD 文档
- [CI/CD 指南](./ci-cd/ci-cd-guide.md) - CI/CD 概念和 GitHub Actions 配置
- [CI/CD 配置说明](./ci-cd/ci-cd-configuration.md) - 为什么集成测试不在 CI/CD 中运行
- [Lint-staged、Prettier 和 ESLint 配置踩坑记录](./ci-cd/lint-staged-prettier-eslint-pitfalls.md) - 代码质量工具配置和常见问题

### 🐛 错误记录
- [错误日志](./error-log/error-log.md) - 开发过程中遇到的所有错误和解决方案
- [错误处理改进](./错误处理改进.md) - 错误处理系统的改进，包括统一响应格式、Zod 错误处理优化等

### 💾 缓存文档
- [Redis 实现踩坑记录](./caching/redis-implementation.md) - Redis 缓存系统实现过程中的所有问题和解决方案
  - ioredis 方法命名不一致
- 空字符串前缀被 falsy 值覆盖
- 无法区分缓存不存在和缓存值为 null
- 空值缓存优先级配置错误
- 缓存中间件无法使用外部缓存实例
- 双重检查锁中的并发问题
- 随机 TTL 边界值问题
- 布隆过滤器误判率问题
- 熔断器状态转换逻辑错误
- 限流器算法选择问题

- [缓存防护机制踩坑记录](./caching/cache-protection-pitfalls.md) - 缓存穿透、击穿、雪崩防护机制的实现问题
  - 缓存穿透防护：无法区分缓存不存在和缓存值为 null
  - 缓存穿透防护：布隆过滤器误判率问题
  - 缓存击穿防护：双重检查锁中的并发问题
  - 缓存击穿防护：锁超时时间设置不当
  - 缓存击穿防护：热点数据永不过期导致缓存雪崩
  - 缓存雪崩防护：随机 TTL 范围设置不当
  - 缓存雪崩防护：熔断器状态转换逻辑错误
  - 缓存雪崩防护：限流器算法选择不当

- [tRPC 缓存中间件踩坑记录](./caching/trpc-cache-pitfalls.md) - tRPC 缓存中间件的实现问题
  - 缓存中间件无法识别 tRPC 类型和输入
  - 缓存键生成时机错误
  - 缓存失效策略与路由不匹配
  - 缓存键冲突
  - 缓存序列化问题
  - 缓存中间件与 tRPC Context 不兼容
  - 缓存失效时机错误
  - tRPC 中间件错误
  - Better-Auth 注册错误
  - 类型不匹配问题
  - Cookie 配置问题
  - 其他常见错误

### 🗄️ 数据库文档
- [数据库迁移](./database/second.md) - PostgreSQL 和 Drizzle ORM 配置

### 🏗️ 架构文档
- [今日认证系统架构](./architecture/今日认证系统架构.hierarchy.md) - 认证系统的架构图（Excalidraw 格式）
- [今日任务完成情况](./architecture/third.md) - 认证授权系统开发进度

### 🔧 问题记录
- [Git 子仓库问题](./problem/problem.md) - Git 子仓库未加入主仓库远程的解决方案

## 📋 推荐阅读顺序

### 新手入门
1. [Monorepo 初始化](./getting-started/first.md) - 了解项目结构
2. [Husky Git Hooks 指南](./getting-started/husky-guide.md) - 配置开发工具
3. [测试使用指南](./testing/testing-guide.md) - 了解测试框架

### API 开发
1. [API 接口文档](./api-documentation/api-documentation.md) - 了解所有接口
2. [本地测试指南](./testing/local-testing-guide.md) - 本地运行测试
3. [错误日志](./error-log/error-log.md) - 常见问题解决

### CI/CD 配置
1. [CI/CD 指南](./ci-cd/ci-cd-guide.md) - 了解 CI/CD 概念
2. [CI/CD 配置说明](./ci-cd/ci-cd-configuration.md) - 理解配置策略
3. [本地测试指南](./testing/local-testing-guide.md) - 本地测试流程

### 架构理解
1. [今日认证系统架构](./architecture/今日认证系统架构.hierarchy.md) - 系统架构图
2. [今日任务完成情况](./architecture/third.md) - 开发进度
3. [错误日志](./error-log/error-log.md) - 技术细节

## 🎯 按主题查找

### 认证相关
- [API 接口文档 - 认证接口](./api-documentation/api-documentation.md#1-认证接口-auth)
- [错误日志 - Cookie 配置问题](./error-log/error-log.md#错误-8-cookie-未正确设置)
- [今日认证系统架构](./architecture/今日认证系统架构.hierarchy.md)

### 测试相关
- [测试使用指南](./testing/testing-guide.md)
- [本地测试指南](./testing/local-testing-guide.md)
- [CI/CD 配置说明](./ci-cd/ci-cd-configuration.md)

### Git 相关
- [Husky Git Hooks 指南](./getting-started/husky-guide.md)
- [Git 子仓库问题](./problem/problem.md)
- [CI/CD 指南](./ci-cd/ci-cd-guide.md)

### 数据库相关
- [数据库迁移](./database/second.md)
- [错误日志 - 类型不匹配问题](./error-log/error-log.md#错误-4-better-auth-注册错误---userid-类型不匹配)

## 📊 文档统计

| 分类 | 文档数量 |
|------|---------|
| 快速开始 | 2 |
| API 文档 | 2 |
| 测试文档 | 2 |
| CI/CD 文档 | 3 |
| 错误记录 | 2 |
| 数据库文档 | 1 |
| 架构文档 | 2 |
| 问题记录 | 1 |
| 缓存文档 | 3 |
| **总计** | **18** |

## 🔍 快速搜索

### 按关键词搜索

**认证**
- [API 接口文档](./api-documentation/api-documentation.md) - signUp, signIn, signOut, me
- [错误日志](./error-log/error-log.md) - Better-Auth 配置问题

**测试**
- [测试使用指南](./testing/testing-guide.md) - 单元测试、集成测试
- [本地测试指南](./testing/local-testing-guide.md) - 本地运行测试
- [CI/CD 配置说明](./ci-cd/ci-cd-configuration.md) - 测试策略

**CI/CD**
- [CI/CD 指南](./ci-cd/ci-cd-guide.md) - GitHub Actions 配置
- [CI/CD 配置说明](./ci-cd/ci-cd-configuration.md) - 集成测试策略

**Git**
- [Husky Git Hooks 指南](./getting-started/husky-guide.md) - Git hooks 配置
- [Git 子仓库问题](./problem/problem.md) - Git 子模块问题

**错误**
- [错误日志](./error-log/error-log.md) - 所有错误记录
- [错误处理改进](./错误处理改进.md) - 统一错误响应格式、Zod 错误处理优化

**缓存**
- [Redis 实现踩坑记录](./caching/redis-implementation.md) - Redis 缓存系统实现问题
- [缓存防护机制踩坑记录](./caching/cache-protection-pitfalls.md) - 缓存防护机制实现问题
- [tRPC 缓存中间件踩坑记录](./caching/trpc-cache-pitfalls.md) - tRPC 缓存中间件实现问题

## 💡 使用建议

### 日常开发
1. 遇到问题时，先查看 [错误日志](./error-log/error-log.md)
2. 需要调用 API 时，查看 [API 接口文档](./api-documentation/api-documentation.md)
3. 提交代码前，参考 [Husky Git Hooks 指南](./getting-started/husky-guide.md)

### 新人入职
1. 先阅读 [Monorepo 初始化](./getting-started/first.md) 了解项目结构
2. 阅读 [API 接口文档](./api-documentation/api-documentation.md) 了解系统功能
3. 阅读 [测试使用指南](./testing/testing-guide.md) 了解测试流程
4. 阅读 [错误日志](./error-log/error-log.md) 了解常见问题

### 架构设计
1. 查看 [今日认证系统架构](./architecture/今日认证系统架构.hierarchy.md) 了解系统架构
2. 查看 [数据库迁移](./database/second.md) 了解数据库设计
3. 查看 [今日任务完成情况](./architecture/third.md) 了解开发进度

## 📝 文档维护

### 如何添加新文档？

1. 在 `docs/` 目录下创建新的 `.md` 文件
2. 在本文档中添加相应的索引
3. 更新文档统计
4. 提交并推送

### 如何更新文档？

1. 直接编辑对应的 `.md` 文件
2. 确保文档内容准确、清晰
3. 提交并推送

### 文档命名规范

- 使用小写字母和连字符：`husky-guide.md`
- 使用描述性名称：`api-documentation.md`
- 避免使用特殊字符和空格

## 🔗 外部资源

- [Husky 官方文档](https://typicode.github.io/husky/)
- [Better-Auth 官方文档](https://www.better-auth.com/)
- [tRPC 官方文档](https://trpc.io/)
- [Drizzle ORM 官方文档](https://orm.drizzle.team/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

## 📮 反馈

如果发现文档有错误或需要补充，请：
1. 创建 Issue
2. 提交 Pull Request
3. 联系维护者

---

**最后更新**: 2026-01-29
**维护者**: lora-sys
