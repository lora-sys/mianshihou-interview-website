/** @type {import('next').NextConfig} */
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, "../..");

const nextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  // 启用 Next.js 16 的 Cache Components 功能
  cacheComponents: true,
  // 自定义缓存生命周期配置
  cacheLife: {
    default: {
      stale: 300, // 5分钟客户端缓存
      revalidate: 900, // 15分钟服务器端重新验证
      expire: 86400, // 24小时后过期
    },
    short: {
      stale: 60, // 1分钟
      revalidate: 300, // 5分钟
      expire: 3600, // 1小时
    },
    long: {
      stale: 1800, // 30分钟
      revalidate: 3600, // 1小时
      expire: 604800, // 7天
    },
  },
};

export default nextConfig;
