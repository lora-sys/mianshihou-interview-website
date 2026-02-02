/**
 * 统一响应格式包装工具
 */

/**
 * 分页元数据接口
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 标准成功响应接口
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
  message: string;
}

/**
 * 包装成功响应
 * @param data 响应数据
 * @param message 成功消息
 * @returns 标准成功响应
 */
export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message: message || '操作成功',
  };
}

/**
 * 包装分页响应
 * @param items 数据项列表
 * @param pagination 分页元数据
 * @param message 成功消息
 * @returns 分页响应
 */
export function paginate<T>(
  items: T[],
  pagination: PaginationMeta,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items,
      pagination,
    },
    message: message || '查询成功',
  };
}

/**
 * 计算总页数
 * @param total 总数
 * @param pageSize 每页数量
 * @returns 总页数
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

/**
 * 创建分页元数据
 * @param page 当前页码
 * @param pageSize 每页数量
 * @param total 总数
 * @returns 分页元数据
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: calculateTotalPages(total, pageSize),
  };
}
