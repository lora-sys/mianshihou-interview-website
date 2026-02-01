import { z } from 'zod';
import { t } from '../index';
import { adminProcedure, protectedProcedure } from '../middleware/auth';
import {
  saveFile,
  deleteFile,
  fileExists,
  getFileInfo,
  ALLOWED_MIME_TYPES,
  FILE_SIZE_LIMITS
} from '../../lib/file-storage';
import {
  processAvatar,
  processAttachmentImage,
  isImage,
  validateImageDimensions
} from '../../lib/image-processor';
import { createLogger } from '../../lib/logger';

const logger = createLogger('UploadRouter');

// 文件上传 tRPC 路由
export const uploadRouter = t.router({
  // 上传头像
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        data: z.string().base64(), // Base64 编码的文件数据
        mimetype: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.user;
      const { filename, data, mimetype } = input;

      try {
        // 转换 Base64 为 Buffer
        const buffer = Buffer.from(data, 'base64');

        // 验证文件类型
        if (!isImage(mimetype)) {
          throw new Error('头像必须是图片文件');
        }

        // 验证 MIME 类型
        if (!ALLOWED_MIME_TYPES[mimetype as keyof typeof ALLOWED_MIME_TYPES]) {
          throw new Error(`不支持的文件类型: ${mimetype}`);
        }

        // 验证文件大小
        if (buffer.length > FILE_SIZE_LIMITS.avatar) {
          throw new Error(
            `头像文件大小不能超过 ${FILE_SIZE_LIMITS.avatar / 1024 / 1024}MB`
          );
        }

        // 验证图片尺寸（最小 64x64）
        const isValidDimensions = await validateImageDimensions(
          buffer,
          64, // minWidth
          2000, // maxWidth
          64, // minHeight
          2000 // maxHeight
        );

        if (!isValidDimensions) {
          throw new Error('图片尺寸必须在 64x64 到 2000x2000 之间');
        }

        // 处理图片（压缩和调整大小）
        const processedBuffer = await processAvatar(buffer);

        // 保存文件
        const fileInfo = await saveFile(
          {
            filename,
            data: processedBuffer,
            mimetype,
            size: processedBuffer.length
          },
          'avatar',
          {
            allowedMimeTypes: Object.keys(ALLOWED_MIME_TYPES).filter((k) =>
              k.startsWith('image/')
            ),
            maxSize: FILE_SIZE_LIMITS.avatar
          }
        );

        logger.info('头像上传成功', {
          userId,
          filename: fileInfo.filename,
          size: fileInfo.size
        });

        return {
          success: true,
          file: fileInfo
        };
      } catch (error) {
        logger.error('头像上传失败', {
          userId,
          filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw new Error(
          `头像上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // 上传附件
  uploadAttachment: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        data: z.string().base64(),
        mimetype: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.user;
      const { filename, data, mimetype } = input;

      try {
        // 转换 Base64 为 Buffer
        let buffer = Buffer.from(data, 'base64');

        // 验证 MIME 类型
        if (!ALLOWED_MIME_TYPES[mimetype as keyof typeof ALLOWED_MIME_TYPES]) {
          throw new Error(`不支持的文件类型: ${mimetype}`);
        }

        // 验证文件大小
        if (buffer.length > FILE_SIZE_LIMITS.attachment) {
          throw new Error(
            `附件文件大小不能超过 ${FILE_SIZE_LIMITS.attachment / 1024 / 1024}MB`
          );
        }

        // 如果是图片，进行压缩处理
        if (isImage(mimetype)) {
          buffer = await processAttachmentImage(buffer);
        }

        // 保存文件
        const fileInfo = await saveFile(
          {
            filename,
            data: buffer,
            mimetype,
            size: buffer.length
          },
          'attachment',
          {
            maxSize: FILE_SIZE_LIMITS.attachment
          }
        );

        logger.info('附件上传成功', {
          userId,
          filename: fileInfo.filename,
          size: fileInfo.size
        });

        return {
          success: true,
          file: fileInfo
        };
      } catch (error) {
        logger.error('附件上传失败', {
          userId,
          filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw new Error(
          `附件上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // 删除文件
  deleteFile: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        type: z.enum(['avatar', 'attachment'])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.user;
      const { filename, type } = input;

      try {
        // 检查文件是否存在
        const exists = await fileExists(filename, type);
        if (!exists) {
          throw new Error('文件不存在');
        }

        // 删除文件
        const success = await deleteFile(filename, type);

        if (success) {
          logger.info('文件删除成功', {
            userId,
            filename,
            type
          });

          return {
            success: true,
            message: '文件删除成功'
          };
        } else {
          throw new Error('文件删除失败');
        }
      } catch (error) {
        logger.error('文件删除失败', {
          userId,
          filename,
          type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw new Error(
          `文件删除失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // 获取文件信息
  getFileInfo: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        type: z.enum(['avatar', 'attachment'])
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx.user;
      const { filename, type } = input;

      try {
        const fileInfo = await getFileInfo(filename, type);

        if (!fileInfo) {
          throw new Error('文件不存在');
        }

        return {
          success: true,
          file: fileInfo
        };
      } catch (error) {
        logger.error('获取文件信息失败', {
          userId,
          filename,
          type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw new Error(
          `获取文件信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // 管理员：批量删除文件
  batchDeleteFiles: adminProcedure
    .input(
      z.object({
        files: z.array(
          z.object({
            filename: z.string(),
            type: z.enum(['avatar', 'attachment'])
          })
        ).min(1).max(100)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.user;
      const { files } = input;

      const results = {
        success: [] as string[],
        failed: [] as { filename: string; type: string; error: string }[]
      };

      for (const file of files) {
        try {
          const deleted = await deleteFile(file.filename, file.type);
          if (deleted) {
            results.success.push(file.filename);
          } else {
            results.failed.push({
              filename: file.filename,
              type: file.type,
              error: '删除失败'
            });
          }
        } catch (error) {
          results.failed.push({
            filename: file.filename,
            type: file.type,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('批量删除文件', {
        userId,
        total: files.length,
        success: results.success.length,
        failed: results.failed.length
      });

      return {
        success: true,
        results
      };
    })
});