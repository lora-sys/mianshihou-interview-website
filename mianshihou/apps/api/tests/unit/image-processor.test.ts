import { describe, it, expect, beforeAll } from 'bun:test';
import sharp from 'sharp';
import {
  processImage,
  processAvatar,
  processAttachmentImage,
  isImage,
  getImageInfo,
  validateImageDimensions,
  AVATAR_DEFAULT_OPTIONS,
  ATTACHMENT_DEFAULT_OPTIONS,
} from '../../lib/image-processor';

// 创建测试图片缓冲区
let testPNGBuffer: Buffer;
let testJPEGBuffer: Buffer;

beforeAll(async () => {
  // 创建一个 100x100 的测试 PNG
  testPNGBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  // 创建一个 100x100 的测试 JPEG
  testJPEGBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
});

describe('Image Processor', () => {
  describe('isImage', () => {
    it('应该识别图片 MIME 类型', () => {
      expect(isImage('image/jpeg')).toBe(true);
      expect(isImage('image/png')).toBe(true);
      expect(isImage('image/gif')).toBe(true);
      expect(isImage('image/webp')).toBe(true);
      expect(isImage('image/svg+xml')).toBe(true);
    });

    it('应该拒绝非图片 MIME 类型', () => {
      expect(isImage('application/pdf')).toBe(false);
      expect(isImage('text/plain')).toBe(false);
      expect(isImage('application/msword')).toBe(false);
      expect(isImage('video/mp4')).toBe(false);
    });
  });

  describe('AVATAR_DEFAULT_OPTIONS', () => {
    it('应该定义正确的默认头像处理选项', () => {
      expect(AVATAR_DEFAULT_OPTIONS.width).toBe(200);
      expect(AVATAR_DEFAULT_OPTIONS.height).toBe(200);
      expect(AVATAR_DEFAULT_OPTIONS.quality).toBe(85);
      expect(AVATAR_DEFAULT_OPTIONS.format).toBe('jpeg');
      expect(AVATAR_DEFAULT_OPTIONS.fit).toBe('cover');
    });
  });

  describe('ATTACHMENT_DEFAULT_OPTIONS', () => {
    it('应该定义正确的默认附件处理选项', () => {
      expect(ATTACHMENT_DEFAULT_OPTIONS.width).toBe(1920);
      expect(ATTACHMENT_DEFAULT_OPTIONS.height).toBe(1080);
      expect(ATTACHMENT_DEFAULT_OPTIONS.quality).toBe(80);
      expect(ATTACHMENT_DEFAULT_OPTIONS.format).toBe('jpeg');
      expect(ATTACHMENT_DEFAULT_OPTIONS.fit).toBe('inside');
    });
  });

  describe('getImageInfo', () => {
    it('应该获取 PNG 图片信息', async () => {
      const metadata = await getImageInfo(testPNGBuffer);

      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('应该获取 JPEG 图片信息', async () => {
      const metadata = await getImageInfo(testJPEGBuffer);

      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it('应该处理无效的图片数据', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(getImageInfo(invalidBuffer)).rejects.toThrow('无法读取图片信息');
    });
  });

  describe('validateImageDimensions', () => {
    it('应该验证图片尺寸在范围内', async () => {
      // 100x100 的图片应该在 50x50 到 2000x2000 之内
      const result = await validateImageDimensions(
        testPNGBuffer,
        50, // minWidth
        2000, // maxWidth
        50, // minHeight
        2000 // maxHeight
      );

      expect(result).toBe(true);
    });

    it('应该拒绝超出尺寸范围的图片', async () => {
      // 100x100 的图片不在 150x150 到 2000x2000 之内
      const result = await validateImageDimensions(
        testPNGBuffer,
        150, // minWidth
        2000, // maxWidth
        150, // minHeight
        2000 // maxHeight
      );

      expect(result).toBe(false);
    });

    it('应该处理无效的图片数据', async () => {
      const invalidBuffer = Buffer.from('not an image');

      const result = await validateImageDimensions(invalidBuffer, 64, 2000, 64, 2000);

      expect(result).toBe(false);
    });
  });

  describe('processImage', () => {
    it('应该使用默认选项处理图片', async () => {
      const processed = await processImage(testPNGBuffer);

      expect(processed).toBeInstanceOf(Buffer);
      expect(processed.length).toBeGreaterThan(0);
    });

    it('应该调整图片大小', async () => {
      const processed = await processImage(testPNGBuffer, {
        width: 50,
        height: 50,
      });

      const metadata = await getImageInfo(processed);
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it('应该支持 JPEG 格式输出', async () => {
      const processed = await processImage(testPNGBuffer, {
        format: 'jpeg',
        quality: 90,
      });

      const metadata = await getImageInfo(processed);
      expect(metadata.format).toBe('jpeg');
    });

    it('应该支持 PNG 格式输出', async () => {
      const processed = await processImage(testJPEGBuffer, {
        format: 'png',
        quality: 90,
      });

      const metadata = await getImageInfo(processed);
      expect(metadata.format).toBe('png');
    });

    it('应该支持 WebP 格式输出', async () => {
      const processed = await processImage(testPNGBuffer, {
        format: 'webp',
        quality: 85,
      });

      const metadata = await getImageInfo(processed);
      expect(metadata.format).toBe('webp');
    });

    it('应该处理无效的图片数据', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(processImage(invalidBuffer)).rejects.toThrow('图片处理失败');
    });
  });

  describe('processAvatar', () => {
    it('应该使用默认头像选项处理图片', async () => {
      const processed = await processAvatar(testPNGBuffer);

      expect(processed).toBeInstanceOf(Buffer);
      expect(processed.length).toBeGreaterThan(0);

      const metadata = await getImageInfo(processed);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });
  });

  describe('processAttachmentImage', () => {
    it('应该使用默认附件选项处理图片', async () => {
      const processed = await processAttachmentImage(testPNGBuffer);

      expect(processed).toBeInstanceOf(Buffer);
      expect(processed.length).toBeGreaterThan(0);

      const metadata = await getImageInfo(processed);
      expect(metadata.format).toBe('jpeg');
      // 图片会根据 fit: 'inside' 调整，100x100 放大到 1080x1080 以保持比例
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1080);
    });
  });
});
