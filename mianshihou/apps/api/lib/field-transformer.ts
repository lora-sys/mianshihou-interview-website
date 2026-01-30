/**
 * 字段转换工具
 * 用于统一字段命名规范，转换为 camelCase 格式
 */

/**
 * 转换用户字段命名
 * @param user 用户对象
 * @returns 转换后的用户对象
 */
export function transformUser(user: any): any {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const transformed: any = {
    ...user,
    // 转换为新字段名
    account: user.userAccount,
    name: user.userName,
    avatar: user.userAvatar,
    profile: user.userProfile,
    role: user.userRole,
    createdAt: user.createTime,
    updatedAt: user.updateTime,
  };

  // 删除旧字段名
  delete transformed.userAccount;
  delete transformed.userName;
  delete transformed.userAvatar;
  delete transformed.userProfile;
  delete transformed.userRole;
  delete transformed.createTime;
  delete transformed.updateTime;

  return transformed;
}

/**
 * 转换帖子字段命名
 * @param post 帖子对象
 * @returns 转换后的帖子对象
 */
export function transformPost(post: any): any {
  if (!post || typeof post !== 'object') {
    return post;
  }

  const transformed: any = {
    ...post,
    // 转换为新字段名
    thumbCount: post.thumbNum,
    favourCount: post.favourNum,
    createdAt: post.createTime,
    updatedAt: post.updateTime,
  };

  // 删除旧字段名
  delete transformed.thumbNum;
  delete transformed.favourNum;
  delete transformed.createTime;
  delete transformed.updateTime;

  return transformed;
}

/**
 * 批量转换用户字段命名
 * @param users 用户数组
 * @returns 转换后的用户数组
 */
export function transformUsers(users: any[]): any[] {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map((user) => transformUser(user));
}

/**
 * 批量转换帖子字段命名
 * @param posts 帖子数组
 * @returns 转换后的帖子数组
 */
export function transformPosts(posts: any[]): any[] {
  if (!Array.isArray(posts)) {
    return posts;
  }

  return posts.map((post) => transformPost(post));
}
