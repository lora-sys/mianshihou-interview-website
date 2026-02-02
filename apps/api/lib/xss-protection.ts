import createDOMPurify from 'isomorphic-dompurify';
import sanitizeHtml from 'sanitize-html';
import { createLogger } from './logger';

const logger = createLogger('XSSProtection');

// DOMPurify 实例
const dompurify = createDOMPurify();

// HTML 实体编码映射
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// HTML 属性值编码映射
const ATTR_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

// JavaScript 编码映射
const JS_ENTITIES: Record<string, string> = {
  '\\': '\\\\',
  "'": "\\'",
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\v': '\\v',
  '\0': '\\0',
};

/**
 * HTML 实体编码
 */
export function encodeHTMLEntities(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * HTML 属性值编码
 */
export function encodeHTMLAttribute(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input.replace(/[&<>"]'/g, (char) => ATTR_ENTITIES[char] || char);
}

/**
 * JavaScript 编码
 */
export function encodeJavaScript(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  return input.replace(/[\\'" \n\r\t\b\f\v\0]/g, (char) => JS_ENTITIES[char] || char);
}

/**
 * URL 编码（用于防止 XSS）
 */
export function encodeURL(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  try {
    return encodeURIComponent(input);
  } catch (error) {
    logger.warn('URL 编码失败', { error, input });
    return input;
  }
}

/**
 * 使用 DOMPurify 清理 HTML
 */
export function sanitizeHTML(
  input: string,
  options: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  } = {}
): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  try {
    const clean = dompurify.sanitize(input, {
      ALLOWED_TAGS: options.allowedTags || [
        'b',
        'i',
        'u',
        'strong',
        'em',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'code',
        'pre',
        'a',
        'span',
        'div',
      ],
      ALLOWED_ATTR: options.allowedAttributes || {
        a: ['href', 'title', 'target'],
        img: ['src', 'alt', 'title', 'width', 'height'],
      },
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      FORCE_BODY: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
    });

    return clean;
  } catch (error) {
    logger.error('HTML 清理失败', { error, input });
    return encodeHTMLEntities(input);
  }
}

/**
 * 使用 sanitize-html 清理 HTML（更严格的控制）
 */
export function sanitizeHTMLStrict(input: string, options: sanitizeHtml.IOptions = {}): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  try {
    const defaultOptions: sanitizeHtml.IOptions = {
      allowedTags: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      allowedAttributes: {
        a: ['href', 'title'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {},
      allowProtocolRelative: false,
      enforceHtmlBoundary: false,
      parseStyleAttributes: false,
      ...options,
    };

    return sanitizeHtml(input, defaultOptions);
  } catch (error) {
    logger.error('HTML 严格清理失败', { error, input });
    return encodeHTMLEntities(input);
  }
}

/**
 * 检查是否包含潜在的 XSS 攻击
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // 事件处理器，如 onclick=
    /data:text\/html/gi,
    /vbscript:/gi,
    /fromCharCode/gi,
    /&#x/gi,
    /&#\d+/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * 清理对象中的所有字符串值
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    sanitizeHTML?: boolean;
    encodeHTML?: boolean;
    encodeJS?: boolean;
    excludeKeys?: string[];
  } = {}
): T {
  const {
    sanitizeHTML: shouldSanitizeHTML = false,
    encodeHTML: shouldEncodeHTML = true,
    encodeJS: shouldEncodeJS = false,
    excludeKeys = [],
  } = options;

  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      let processedValue = value;

      if (shouldSanitizeHTML) {
        processedValue = sanitizeHTML(processedValue);
      }

      if (shouldEncodeHTML) {
        processedValue = encodeHTMLEntities(processedValue);
      }

      if (shouldEncodeJS) {
        processedValue = encodeJavaScript(processedValue);
      }

      result[key] = processedValue;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitizeObject(item, options) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 清理数组中的所有字符串值
 */
export function sanitizeArray<T>(arr: T[], sanitizer: (item: T) => T): T[] {
  return arr.map(sanitizer);
}

/**
 * 创建安全的 HTML 字符串
 */
export function createSafeHTML(
  tag: string,
  content: string,
  attributes: Record<string, string> = {}
): string {
  const sanitizedContent = sanitizeHTML(content);
  const sanitizedAttrs = Object.entries(attributes)
    .map(([key, value]) => {
      const sanitizedKey = encodeHTMLAttribute(key);
      const sanitizedValue = encodeHTMLAttribute(value);
      return `${sanitizedKey}="${sanitizedValue}"`;
    })
    .join(' ');

  if (sanitizedAttrs) {
    return `<${tag} ${sanitizedAttrs}>${sanitizedContent}</${tag}>`;
  }

  return `<${tag}>${sanitizedContent}</${tag}>`;
}

/**
 * 验证 URL 是否安全
 */
export function isSafeURL(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // 只允许特定协议
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // 检查是否包含危险的协议
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
    return !dangerousProtocols.some((protocol) => url.toLowerCase().includes(protocol));
  } catch (error) {
    logger.warn('URL 解析失败', { error, url });
    return false;
  }
}

/**
 * 清理 URL
 */
export function sanitizeURL(url: string): string {
  if (!isSafeURL(url)) {
    logger.warn('检测到不安全的 URL', { url });
    return '#';
  }

  return url;
}

/**
 * 预定义的清理选项
 */
export const sanitizeOptions = {
  // 富文本编辑器（允许更多标签）
  richText: {
    allowedTags: [
      'b',
      'i',
      'u',
      'strong',
      'em',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
  },

  // 简单文本（只允许基本格式）
  simpleText: {
    allowedTags: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {},
  },

  // 纯文本（移除所有 HTML）
  plainText: {
    allowedTags: [],
    allowedAttributes: {},
  },

  // 链接文本（允许链接）
  linkText: {
    allowedTags: ['a', 'br'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
  },
};

/**
 * 使用预定义选项清理 HTML
 */
export function sanitizeHTMLWithPreset(
  input: string,
  preset: keyof typeof sanitizeOptions
): string {
  return sanitizeHTML(input, sanitizeOptions[preset]);
}
