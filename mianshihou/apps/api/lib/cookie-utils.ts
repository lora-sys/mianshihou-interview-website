import { serialize, parse } from '@fastify/cookie';

/**
 * 将 Fastify 的 req.cookies 对象转换为 Cookie header 格式
 * @param cookies - Fastify 的 cookies 对象
 * @returns Cookie header 字符串
 */
export function cookiesToHeader(cookies: Record<string, string> | undefined): string {
  if (!cookies || Object.keys(cookies).length === 0) {
    return '';
  }
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * 从 Cookie header 解析出 cookies 对象
 * @param cookieHeader - Cookie header 字符串
 * @returns cookies 对象
 */
export function headerToCookies(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  return parse(cookieHeader);
}

/**
 * 将 Fastify request 的 headers 包装成 Better-Auth 需要的 Headers 对象
 * This is the key decoupling function - it only uses request.headers.cookie
 * @param request - Fastify request 对象
 * @returns Better-Auth Headers 对象
 */
export function headersFromRequest(request: any): Headers {
  const headers = new Headers();

  // 复制所有 headers
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value) headers.append(key, value.toString());
  });

  // 直接从 request.headers.cookie 读取（Fastify 自动解析的 cookie 字符串）
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return headers;
}

/**
 * 手动序列化 cookie 用于设置到响应中
 * @param name - Cookie 名称
 * @param value - Cookie 值
 * @param options - Cookie 选项
 * @returns Set-Cookie header 字符串
 */
export function serializeCookie(
  name: string,
  value: string,
  options?: Parameters<typeof serialize>[2]
): string {
  return serialize(name, value, options);
}
