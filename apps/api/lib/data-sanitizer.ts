/**
 * 数据脱敏工具
 * 用于过滤敏感字段，防止敏感数据泄露到前端
 */

/**
 * 敏感字段列表（用户表）
 */
const USER_SENSITIVE_FIELDS = [
  'userPassword', // 密码哈希值
  'unionId', // 第三方登录唯一标识
  'mpOpenId', // 微信OpenID
  'lastLoginIp', // 最后登录IP
  'isDelete', // 软删除标记
];

/**
 * 敏感字段列表（会话表）
 */
const SESSION_SENSITIVE_FIELDS = [
  'token', // 会话令牌
  'ipAddress', // IP地址
  'userAgent', // 用户代理
];

/**
 * 敏感字段列表（账户表）
 */
const ACCOUNT_SENSITIVE_FIELDS = [
  'accountId', // 第三方账户ID
  'providerId', // 第三方提供商ID
  'accessToken', // OAuth访问令牌
  'refreshToken', // OAuth刷新令牌
  'idToken', // OAuth ID令牌
  'password', // OAuth密码
];

/**
 * 脱敏用户数据
 * @param user 用户对象
 * @returns 过滤后的用户对象
 */
export function sanitizeUser(user: any): any {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const sanitized: any = {};
  for (const key in user) {
    if (!USER_SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = user[key];
    }
  }

  return sanitized;
}

/**
 * 脱敏会话数据
 * @param session 会话对象
 * @returns 过滤后的会话对象
 */
export function sanitizeSession(session: any): any {
  if (!session || typeof session !== 'object') {
    return session;
  }

  const sanitized: any = {};
  for (const key in session) {
    if (!SESSION_SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = session[key];
    }
  }

  return sanitized;
}

/**
 * 脱敏账户数据
 * @param account 账户对象
 * @returns 过滤后的账户对象
 */
export function sanitizeAccount(account: any): any {
  if (!account || typeof account !== 'object') {
    return account;
  }

  const sanitized: any = {};
  for (const key in account) {
    if (!ACCOUNT_SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = account[key];
    }
  }

  return sanitized;
}

/**
 * 批量脱敏用户数据
 * @param users 用户数组
 * @returns 过滤后的用户数组
 */
export function sanitizeUsers(users: any[]): any[] {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map((user) => sanitizeUser(user));
}

/**
 * 批量脱敏会话数据
 * @param sessions 会话数组
 * @returns 过滤后的会话数组
 */
export function sanitizeSessions(sessions: any[]): any[] {
  if (!Array.isArray(sessions)) {
    return sessions;
  }

  return sessions.map((session) => sanitizeSession(session));
}

/**
 * 批量脱敏账户数据
 * @param accounts 账户数组
 * @returns 过滤后的账户数组
 */
export function sanitizeAccounts(accounts: any[]): any[] {
  if (!Array.isArray(accounts)) {
    return accounts;
  }

  return accounts.map((account) => sanitizeAccount(account));
}
