import sharp from 'sharp';
import { createLogger } from './logger';

const logger = createLogger('ImageProcessor');

// 图片处理选项
export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

// 默认头像处理选项
export const AVATAR_DEFAULT_OPTIONS: ImageProcessOptions = {
  width: 200,
  height: 200,
  quality: 85,
  format: 'jpeg',
  fit: 'cover',
};

// 默认附件图片处理选项
export const ATTACHMENT_DEFAULT_OPTIONS: ImageProcessOptions = {
  width: 1920,
  height: 1080,
  quality: 80,
  format: 'jpeg',
  fit: 'inside',
};

// 检查是否为图片
export function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

// 压缩和处理图片
export async function processImage(
  buffer: Buffer,
  options: ImageProcessOptions = {}
): Promise<Buffer> {
  const { width, height, quality = 85, format = 'jpeg', fit = 'cover' } = options;

  try {
    let pipeline = sharp(buffer);

    // 获取原始图片信息
    const metadata = await pipeline.metadata();

    logger.info('开始处理图片', {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      targetWidth: width,
      targetHeight: height,
      format,
      quality,
    });

    // 只有在指定了尺寸时才调整大小
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
      });
    }

    // 根据格式压缩
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality, effort: 6 });
        break;
    }

    const processedBuffer = await pipeline.toBuffer();

    // 计算压缩比例
    const originalSize = buffer.length;
    const processedSize = processedBuffer.length;
    const compressionRatio = ((1 - processedSize / originalSize) * 100).toFixed(2);

    logger.info('图片处理完成', {
      originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
      processedSize: `${(processedSize / 1024).toFixed(2)}KB`,
      compressionRatio: `${compressionRatio}%`,
    });

    return processedBuffer;
  } catch (error) {
    logger.error('图片处理失败', { error });
    throw new Error(`图片处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 处理头像图片
export async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return processImage(buffer, AVATAR_DEFAULT_OPTIONS);
}

// 处理附件图片
export async function processAttachmentImage(buffer: Buffer): Promise<Buffer> {
  return processImage(buffer, ATTACHMENT_DEFAULT_OPTIONS);
}

// 获取图片信息
export async function getImageInfo(buffer: Buffer): Promise<sharp.Metadata> {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    logger.error('获取图片信息失败', { error });
    throw new Error('无法读取图片信息');
  }
}

// 验证图片尺寸
export async function validateImageDimensions(
  buffer: Buffer,
  minWidth?: number,
  maxWidth?: number,
  minHeight?: number,
  maxHeight?: number
): Promise<boolean> {
  try {
    const metadata = await getImageInfo(buffer);
    const { width, height } = metadata;

    if (!width || !height) {
      return false;
    }

    if (minWidth && width < minWidth) return false;
    if (maxWidth && width > maxWidth) return false;
    if (minHeight && height < minHeight) return false;
    if (maxHeight && height > maxHeight) return false;

    return true;
  } catch {
    return false;
  }
}
