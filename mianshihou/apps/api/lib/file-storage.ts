import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from './logger';

const logger = createLogger('FileStorage');

// 允许的文件类型
export const ALLOWED_MIME_TYPES = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // 文档
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

// 文件大小限制（字节）
export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5MB
  attachment: 10 * 1024 * 1024, // 10MB
  default: 5 * 1024 * 1024, // 5MB
};

// 文件存储选项
export interface StorageOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

// 文件信息接口
export interface FileInfo {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string;
  url: string;
}

// 生成唯一文件名
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = originalName.includes('.') 
    ? originalName.substring(originalName.lastIndexOf('.'))
    : '';
  return `${timestamp}_${random}${ext}`;
}

// 验证文件类型
export function validateMimeType(
  mimetype: string,
  options: StorageOptions = {}
): boolean {
  const allowedMimeTypes = options.allowedMimeTypes || Object.keys(ALLOWED_MIME_TYPES);
  return allowedMimeTypes.includes(mimetype);
}

// 验证文件扩展名
export function validateExtension(
  filename: string,
  options: StorageOptions = {}
): boolean {
  const ext = filename.includes('.') 
    ? filename.substring(filename.lastIndexOf('.'))
    : '';
  
  const allowedExtensions = options.allowedExtensions || 
    Object.values(ALLOWED_MIME_TYPES).flat();
  
  return allowedExtensions.includes(ext.toLowerCase());
}

// 验证文件大小
export function validateFileSize(
  size: number,
  maxSize: number = FILE_SIZE_LIMITS.default
): boolean {
  return size <= maxSize;
}

// 获取文件 URL
export function getFileUrl(filename: string, type: 'avatar' | 'attachment' = 'attachment'): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${type}/${filename}`;
}

// 保存文件
export async function saveFile(
  file: {
  filename: string;
  data: Buffer;
  mimetype: string;
  size: number;
  },
  type: 'avatar' | 'attachment' = 'attachment',
  options: StorageOptions = {}
): Promise<FileInfo> {
  const { filename, data, mimetype, size } = file;
  
  // 验证文件
  if (!validateMimeType(mimetype, options)) {
    throw new Error(`不支持的文件类型: ${mimetype}`);
  }
  
  if (!validateExtension(filename, options)) {
    throw new Error(`不支持的文件扩展名: ${filename}`);
  }
  
  const maxSize = options.maxSize || FILE_SIZE_LIMITS[type] || FILE_SIZE_LIMITS.default;
  if (!validateFileSize(size, maxSize)) {
    throw new Error(`文件大小超过限制: ${(size / 1024 / 1024).toFixed(2)}MB / ${maxSize / 1024 / 1024}MB}`);
  }
  
  // 生成唯一文件名
  const uniqueFilename = generateUniqueFilename(filename);
  
  // 创建存储目录
  const uploadDir = join(process.cwd(), 'uploads', type);
  await fs.mkdir(uploadDir, { recursive: true });
  
  // 保存文件
  const filePath = join(uploadDir, uniqueFilename);
  await fs.writeFile(filePath, data);
  
  logger.info('文件保存成功', {
    filename: uniqueFilename,
    originalName: filename,
    size,
    mimetype,
    type
  });
  
  return {
    filename: uniqueFilename,
    originalName: filename,
    size,
    mimetype,
    path: filePath,
    url: getFileUrl(uniqueFilename, type)
  };
}

// 删除文件
export async function deleteFile(
  filename: string,
  type: 'avatar' | 'attachment' = 'attachment'
): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), 'uploads', type, filename);
    
    // 检查文件是否存在
    await fs.access(filePath);
    
    // 删除文件
    await fs.unlink(filePath);
    
    logger.info('文件删除成功', { filename, type });
    
    return true;
  } catch (error) {
    logger.warn('文件删除失败', { filename, type, error });
    return false;
  }
}

// 检查文件是否存在
export async function fileExists(
  filename: string,
  type: 'avatar' | 'attachment' = 'attachment'
): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), 'uploads', type, filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 获取文件信息
export async function getFileInfo(
  filename: string,
  type: 'avatar' | 'attachment' = 'attachment'
): Promise<FileInfo | null> {
  try {
    const filePath = join(process.cwd(), 'uploads', type, filename);
    const stats = await fs.stat(filePath);
    
    // 根据 filename 推断 mimetype
    const ext = filename.includes('.') 
      ? filename.substring(filename.lastIndexOf('.'))
      : '';
    const mimetype = Object.entries(ALLOWED_MIME_TYPES)
      .find(([_, extensions]) => extensions.includes(ext))
      ?.[0] || 'application/octet-stream';
    
    return {
      filename,
      originalName: filename,
      size: stats.size,
      mimetype,
      path: filePath,
      url: getFileUrl(filename, type)
    };
  } catch (error) {
    logger.warn('获取文件信息失败', { filename, type, error });
    return null;
  }
}