import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  generateUniqueFilename,
  validateMimeType,
  validateExtension,
  validateFileSize,
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  saveFile,
  deleteFile,
  fileExists,
  getFileInfo
} from '../../lib/file-storage';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('File Storage', () => {
  describe('generateUniqueFilename', () => {
    it('应该生成唯一的文件名', () => {
      const filename1 = generateUniqueFilename('test.jpg');
      const filename2 = generateUniqueFilename('test.jpg');

      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/\d+_[a-z0-9]+\.jpg/);
    });

    it('应该保留原始文件扩展名', () => {
      const filename = generateUniqueFilename('document.pdf');
      expect(filename).toMatch(/\.pdf$/);
    });

    it('应该处理没有扩展名的文件', () => {
      const filename = generateUniqueFilename('noextension');
      expect(filename).toMatch(/^\d+_[a-z0-9]+$/);
    });
  });

  describe('validateMimeType', () => {
    it('应该验证有效的图片类型', () => {
      expect(validateMimeType('image/jpeg')).toBe(true);
      expect(validateMimeType('image/png')).toBe(true);
      expect(validateMimeType('image/gif')).toBe(true);
      expect(validateMimeType('image/webp')).toBe(true);
    });

    it('应该验证有效的文档类型', () => {
      expect(validateMimeType('application/pdf')).toBe(true);
      expect(validateMimeType('application/msword')).toBe(true);
      expect(validateMimeType('text/plain')).toBe(true);
    });

    it('应该拒绝无效的 MIME 类型', () => {
      expect(validateMimeType('application/x-shockwave-flash')).toBe(false);
      expect(validateMimeType('video/mp4')).toBe(false);
      expect(validateMimeType('audio/mpeg')).toBe(false);
    });

    it('应该支持自定义允许的 MIME 类型', () => {
      expect(validateMimeType('image/jpeg', {
        allowedMimeTypes: ['image/jpeg']
      })).toBe(true);

      expect(validateMimeType('image/png', {
        allowedMimeTypes: ['image/jpeg']
      })).toBe(false);
    });
  });

  describe('validateExtension', () => {
    it('应该验证有效的扩展名', () => {
      expect(validateExtension('test.jpg')).toBe(true);
      expect(validateExtension('test.png')).toBe(true);
      expect(validateExtension('test.pdf')).toBe(true);
      expect(validateExtension('test.docx')).toBe(true);
    });

    it('应该拒绝无效的扩展名', () => {
      expect(validateExtension('test.exe')).toBe(false);
      expect(validateExtension('test.bat')).toBe(false);
      expect(validateExtension('test.sh')).toBe(false);
    });

    it('应该不区分大小写', () => {
      expect(validateExtension('test.JPG')).toBe(true);
      expect(validateExtension('test.PNG')).toBe(true);
      expect(validateExtension('test.PDF')).toBe(true);
    });

    it('应该支持自定义允许的扩展名', () => {
      expect(validateExtension('test.jpg', {
        allowedExtensions: ['.jpg']
      })).toBe(true);

      expect(validateExtension('test.png', {
        allowedExtensions: ['.jpg']
      })).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('应该验证文件大小在限制内', () => {
      expect(validateFileSize(1024, 2048)).toBe(true);
      expect(validateFileSize(2048, 2048)).toBe(true);
    });

    it('应该拒绝超过限制的文件大小', () => {
      expect(validateFileSize(2049, 2048)).toBe(false);
      expect(validateFileSize(10 * 1024 * 1024, 5 * 1024 * 1024)).toBe(false);
    });

    it('应该使用默认限制', () => {
      expect(validateFileSize(FILE_SIZE_LIMITS.default)).toBe(true);
      expect(validateFileSize(FILE_SIZE_LIMITS.default + 1)).toBe(false);
    });
  });

  describe('saveFile and deleteFile', () => {
    const testDir = join(process.cwd(), 'uploads', 'test');
    const testFilename = 'test-file.txt';
    const testData = Buffer.from('test file content');

    beforeEach(async () => {
      // 确保测试目录存在
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      // 清理测试文件
      try {
        await fs.unlink(join(testDir, testFilename));
      } catch {
        // 文件可能不存在，忽略错误
      }
    });

    it('应该成功保存文件', async () => {
      const fileInfo = await saveFile(
        {
          filename: testFilename,
          data: testData,
          mimetype: 'text/plain',
          size: testData.length
        },
        'test'
      );

      expect(fileInfo.filename).toBeDefined();
      expect(fileInfo.originalName).toBe(testFilename);
      expect(fileInfo.size).toBe(testData.length);
      expect(fileInfo.mimetype).toBe('text/plain');
      expect(fileInfo.path).toBeDefined();
      expect(fileInfo.url).toBeDefined();
    });

    it('应该拒绝无效的 MIME 类型', async () => {
      await expect(saveFile(
        {
          filename: testFilename,
          data: testData,
          mimetype: 'application/x-shockwave-flash',
          size: testData.length
        },
        'test'
      )).rejects.toThrow('不支持的文件类型');
    });

    it('应该拒绝超过大小限制的文件', async () => {
      const largeData = Buffer.alloc(10 * 1024 * 1024 + 1); // 10MB + 1 byte

      await expect(saveFile(
        {
          filename: testFilename,
          data: largeData,
          mimetype: 'text/plain',
          size: largeData.length
        },
        'test',
        {
          maxSize: 10 * 1024 * 1024
        }
      )).rejects.toThrow('文件大小超过限制');
    });

    it('应该成功删除文件', async () => {
      const fileInfo = await saveFile(
        {
          filename: testFilename,
          data: testData,
          mimetype: 'text/plain',
          size: testData.length
        },
        'test'
      );

      const deleted = await deleteFile(fileInfo.filename, 'test');
      expect(deleted).toBe(true);

      const exists = await fileExists(fileInfo.filename, 'test');
      expect(exists).toBe(false);
    });

    it('删除不存在的文件应该返回 false', async () => {
      const deleted = await deleteFile('nonexistent-file.txt', 'test');
      expect(deleted).toBe(false);
    });
  });

  describe('fileExists', () => {
    const testDir = join(process.cwd(), 'uploads', 'test');
    const testFilename = 'exists-test.txt';
    const testData = Buffer.from('test content');
    let savedFilename: string;

    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const fileInfo = await saveFile(
        {
          filename: testFilename,
          data: testData,
          mimetype: 'text/plain',
          size: testData.length
        },
        'test'
      );
      savedFilename = fileInfo.filename;
    });

    afterEach(async () => {
      try {
        await fs.unlink(join(testDir, savedFilename));
      } catch {
        // 文件可能不存在
      }
    });

    it('应该返回 true 对于存在的文件', async () => {
      const exists = await fileExists(savedFilename, 'test');
      expect(exists).toBe(true);
    });

    it('应该返回 false 对于不存在的文件', async () => {
      const exists = await fileExists('nonexistent.txt', 'test');
      expect(exists).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    const testDir = join(process.cwd(), 'uploads', 'test');
    const testFilename = 'info-test.jpg';
    const testData = Buffer.from('fake image data');
    let savedFilename: string;

    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const fileInfo = await saveFile(
        {
          filename: testFilename,
          data: testData,
          mimetype: 'image/jpeg',
          size: testData.length
        },
        'test'
      );
      savedFilename = fileInfo.filename;
    });

    afterEach(async () => {
      try {
        await fs.unlink(join(testDir, savedFilename));
      } catch {
        // 文件可能不存在
      }
    });

    it('应该返回正确的文件信息', async () => {
      const fileInfo = await getFileInfo(savedFilename, 'test');

      expect(fileInfo).not.toBeNull();
      expect(fileInfo?.filename).toBe(savedFilename);
      expect(fileInfo?.size).toBe(testData.length);
      expect(fileInfo?.mimetype).toBe('image/jpeg');
      expect(fileInfo?.path).toBeDefined();
      expect(fileInfo?.url).toBeDefined();
    });

    it('应该返回 null 对于不存在的文件', async () => {
      const fileInfo = await getFileInfo('nonexistent.jpg', 'test');
      expect(fileInfo).toBeNull();
    });
  });

  describe('FILE_SIZE_LIMITS', () => {
    it('应该定义正确的文件大小限制', () => {
      expect(FILE_SIZE_LIMITS.avatar).toBe(5 * 1024 * 1024); // 5MB
      expect(FILE_SIZE_LIMITS.attachment).toBe(10 * 1024 * 1024); // 10MB
      expect(FILE_SIZE_LIMITS.default).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('应该包含图片类型', () => {
      expect(ALLOWED_MIME_TYPES['image/jpeg']).toEqual(['.jpg', '.jpeg']);
      expect(ALLOWED_MIME_TYPES['image/png']).toEqual(['.png']);
      expect(ALLOWED_MIME_TYPES['image/gif']).toEqual(['.gif']);
      expect(ALLOWED_MIME_TYPES['image/webp']).toEqual(['.webp']);
    });

    it('应该包含文档类型', () => {
      expect(ALLOWED_MIME_TYPES['application/pdf']).toEqual(['.pdf']);
      expect(ALLOWED_MIME_TYPES['application/msword']).toEqual(['.doc']);
      expect(ALLOWED_MIME_TYPES['text/plain']).toEqual(['.txt']);
    });
  });
});