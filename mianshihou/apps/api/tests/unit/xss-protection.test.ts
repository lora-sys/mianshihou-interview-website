import { describe, it, expect } from 'bun:test';
import {
  encodeHTMLEntities,
  encodeHTMLAttribute,
  encodeJavaScript,
  encodeURL,
  sanitizeHTML,
  sanitizeHTMLStrict,
  containsXSS,
  sanitizeObject,
  createSafeHTML,
  isSafeURL,
  sanitizeURL,
  sanitizeHTMLWithPreset,
  sanitizeOptions,
} from '../../lib/xss-protection';

describe('XSS Protection', () => {
  describe('HTML 实体编码', () => {
    it('应该编码基本 HTML 实体', () => {
      expect(encodeHTMLEntities('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('应该编码所有特殊字符', () => {
      const input = '<div class="test">Test & "value"</div>';
      const result = encodeHTMLEntities(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&amp;');
    });

    it('应该处理非字符串输入', () => {
      expect(encodeHTMLEntities(123 as any)).toBe('123');
      expect(encodeHTMLEntities(null as any)).toBe('null');
    });
  });

  describe('HTML 属性值编码', () => {
    it('应该编码属性值中的特殊字符', () => {
      expect(encodeHTMLAttribute('test"quote')).toBe('test&quot;quote');
      expect(encodeHTMLAttribute("test'quote")).toBe('test&#x27;quote');
    });

    it('应该编码 & 符号', () => {
      expect(encodeHTMLAttribute('test&value')).toBe('test&amp;value');
    });

    it('应该编码 < 和 > 符号', () => {
      expect(encodeHTMLAttribute('<test>')).toBe('&lt;test&gt;');
    });
  });

  describe('JavaScript 编码', () => {
    it('应该编码引号', () => {
      expect(encodeJavaScript("test'quote")).toBe("test\\'quote");
      expect(encodeJavaScript('test"quote')).toBe('test\\"quote');
    });

    it('应该编码换行符', () => {
      expect(encodeJavaScript('test\nvalue')).toBe('test\\nvalue');
    });

    it('应该编码反斜杠', () => {
      expect(encodeJavaScript('test\\value')).toBe('test\\\\value');
    });

    it('应该编码制表符', () => {
      expect(encodeJavaScript('test\tvalue')).toBe('test\\tvalue');
    });
  });

  describe('URL 编码', () => {
    it('应该编码 URL 特殊字符', () => {
      expect(encodeURL('test value')).toBe('test%20value');
      expect(encodeURL('test&value')).toBe('test%26value');
    });

    it('应该处理非字符串输入', () => {
      expect(encodeURL(123 as any)).toBe('123');
    });
  });

  describe('HTML 清理', () => {
    it('应该移除 script 标签', () => {
      const input = '<div><script>alert("XSS")</script>content</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert("XSS")');
      expect(result).toContain('content');
    });

    it('应该移除 iframe 标签', () => {
      const input = '<iframe src="malicious.html"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe>');
    });

    it('应该保留安全的标签', () => {
      const input = '<p><strong>bold</strong> <em>italic</em></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
    });

    it('应该移除事件处理器', () => {
      const input = '<div onclick="alert(\'XSS\')">click me</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('应该移除 javascript: 协议', () => {
      const input = '<a href="javascript:alert(\'XSS\')">link</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('严格 HTML 清理', () => {
    it('应该更严格地清理 HTML', () => {
      const input = '<div><img src="x" onerror="alert(\'XSS\')">test</div>';
      const result = sanitizeHTMLStrict(input);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('onerror');
    });

    it('应该只保留允许的标签', () => {
      const input = '<p><b>bold</b> <h1>heading</h1></p>';
      const result = sanitizeHTMLStrict(input);
      expect(result).toContain('<b>');
      expect(result).not.toContain('<h1>');
    });
  });

  describe('XSS 检测', () => {
    it('应该检测 script 标签', () => {
      expect(containsXSS('<script>alert("XSS")</script>')).toBe(true);
    });

    it('应该检测 iframe 标签', () => {
      expect(containsXSS('<iframe src="malicious.html"></iframe>')).toBe(true);
    });

    it('应该检测 javascript: 协议', () => {
      expect(containsXSS('javascript:alert("XSS")')).toBe(true);
    });

    it('应该检测事件处理器', () => {
      expect(containsXSS('<div onclick="alert(\'XSS\')">')).toBe(true);
    });

    it('应该检测 HTML 实体编码', () => {
      expect(containsXSS('&#60;script&#62;')).toBe(true);
    });

    it('应该接受安全的字符串', () => {
      expect(containsXSS('normal text')).toBe(false);
      expect(containsXSS('<p>safe content</p>')).toBe(false);
    });
  });

  describe('对象清理', () => {
    it('应该清理对象中的字符串', () => {
      const input = {
        name: '<script>alert("XSS")</script>',
        age: 25,
        email: 'test@example.com',
      };

      const result = sanitizeObject(input, { encodeHTML: true });
      expect(result.name).toContain('&lt;');
      expect(result.name).not.toContain('<script>');
      expect(result.age).toBe(25);
      expect(result.email).toBe('test@example.com');
    });

    it('应该清理嵌套对象', () => {
      const input = {
        user: {
          name: '<script>alert("XSS")</script>',
          bio: 'Test bio',
        },
      };

      const result = sanitizeObject(input, { encodeHTML: true });
      expect(result.user.name).toContain('&lt;');
      expect(result.user.bio).toBe('Test bio');
    });

    it('应该清理数组', () => {
      const input = {
        items: ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>'],
      };

      const result = sanitizeObject(input, { encodeHTML: true });
      expect(result.items[0]).toContain('&lt;');
      expect(result.items[1]).toContain('&lt;');
    });

    it('应该排除指定的键', () => {
      const input = {
        name: '<script>alert("XSS")</script>',
        html: '<b>safe</b>',
        content: 'normal',
      };

      const result = sanitizeObject(input, { encodeHTML: true, excludeKeys: ['html'] });
      expect(result.name).toContain('&lt;');
      expect(result.html).toBe('<b>safe</b>');
      expect(result.content).toBe('normal');
    });
  });

  describe('安全 HTML 创建', () => {
    it('应该创建安全的 HTML 元素', () => {
      const result = createSafeHTML('div', 'content', { class: 'test' });
      expect(result).toContain('<div');
      expect(result).toContain('class="test"');
      expect(result).toContain('content');
      expect(result).toContain('</div>');
    });

    it('应该清理内容和属性', () => {
      const result = createSafeHTML('div', '<script>alert(1)</script>', {
        title: '<img src=x onerror=alert(1)>',
      });
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert(1)');
    });
  });

  describe('URL 安全验证', () => {
    it('应该接受安全的 URL', () => {
      expect(isSafeURL('https://example.com')).toBe(true);
      expect(isSafeURL('http://example.com')).toBe(true);
      expect(isSafeURL('mailto:test@example.com')).toBe(true);
      expect(isSafeURL('tel:+1234567890')).toBe(true);
    });

    it('应该拒绝危险的 URL', () => {
      expect(isSafeURL('javascript:alert("XSS")')).toBe(false);
      expect(isSafeURL('vbscript:msgbox("XSS")')).toBe(false);
      expect(isSafeURL('data:text/html,<script>alert("XSS")</script>')).toBe(false);
      expect(isSafeURL('file:///etc/passwd')).toBe(false);
    });

    it('应该处理无效的 URL', () => {
      expect(isSafeURL('not a url' as any)).toBe(false);
    });
  });

  describe('URL 清理', () => {
    it('应该返回安全的 URL', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
    });

    it('应该返回 # 对于危险的 URL', () => {
      expect(sanitizeURL('javascript:alert("XSS")')).toBe('#');
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('#');
    });
  });

  describe('预定义清理选项', () => {
    it('应该提供富文本选项', () => {
      expect(sanitizeOptions.richText).toBeDefined();
      expect(sanitizeOptions.richText.allowedTags).toContain('table');
    });

    it('应该提供简单文本选项', () => {
      expect(sanitizeOptions.simpleText).toBeDefined();
      expect(sanitizeOptions.simpleText.allowedTags.length).toBeGreaterThan(0);
      expect(sanitizeOptions.simpleText.allowedTags).not.toContain('script');
    });

    it('应该提供纯文本选项', () => {
      expect(sanitizeOptions.plainText).toBeDefined();
      expect(sanitizeOptions.plainText.allowedTags).toHaveLength(0);
    });

    it('应该使用预定义选项清理 HTML', () => {
      const input = '<div><script>alert(1)</script><b>bold</b></div>';
      const result = sanitizeHTMLWithPreset(input, 'richText');
      expect(result).not.toContain('<script>');
      expect(result).toContain('<b>');
    });
  });
});
