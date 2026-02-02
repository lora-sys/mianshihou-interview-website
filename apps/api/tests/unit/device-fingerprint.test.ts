import { describe, expect, test } from 'bun:test';
import {
  generateDeviceFingerprint,
  generateDeviceInfo,
  parseDeviceInfo,
} from '../../lib/device-fingerprint';

describe('Device Fingerprint', () => {
  describe('generateDeviceFingerprint', () => {
    test('相同IP和UA应该生成相同指纹', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const ip = '192.168.1.1';
      const fp1 = generateDeviceFingerprint(ip, ua);
      const fp2 = generateDeviceFingerprint(ip, ua);

      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(16);
    });

    test('不同IP应该生成不同指纹', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const fp1 = generateDeviceFingerprint('192.168.1.1', ua);
      const fp2 = generateDeviceFingerprint('192.168.1.2', ua);

      expect(fp1).not.toBe(fp2);
    });

    test('不同UA应该生成不同指纹', () => {
      const ip = '192.168.1.1';
      const fp1 = generateDeviceFingerprint(ip, 'Mozilla/5.0 Chrome');
      const fp2 = generateDeviceFingerprint(ip, 'Mozilla/5.0 Firefox');

      expect(fp1).not.toBe(fp2);
    });

    test('应该处理空值', () => {
      const fp = generateDeviceFingerprint('', '');
      expect(fp).toBeDefined();
      expect(fp.length).toBe(16);
    });
  });

  describe('parseDeviceInfo', () => {
    test('应该正确解析iOS设备', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('iOS Device');
      expect(info.platform).toBe('iOS');
      expect(info.browser).toBe('Safari');
    });

    test('应该正确解析Android设备', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 Chrome/120.0.0.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Android Device');
      expect(info.platform).toBe('Android');
      expect(info.browser).toBe('Chrome');
    });

    test('应该正确解析Windows PC Chrome', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Windows PC');
      expect(info.platform).toBe('Windows');
      expect(info.browser).toBe('Chrome');
    });

    test('应该正确解析Mac Safari', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Macintosh');
      expect(info.platform).toBe('macOS');
      expect(info.browser).toBe('Safari');
    });

    test('应该正确解析Linux PC Firefox', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Linux PC');
      expect(info.platform).toBe('Linux');
      expect(info.browser).toBe('Firefox');
    });

    test('应该正确解析Edge浏览器', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120.0.0.0';
      const info = parseDeviceInfo(ua);

      expect(info.browser).toBe('Edge');
    });

    test('应该正确解析移动设备', () => {
      const ua = 'Mozilla/5.0 (Mobile; rv:120.0) Gecko/120.0 Firefox/120.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Mobile Device');
    });

    test('应该正确解析平板设备', () => {
      const ua = 'Mozilla/5.0 (Tablet; rv:120.0) Gecko/120.0 Firefox/120.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Tablet');
    });

    test('应该处理未知的User-Agent', () => {
      const ua = 'UnknownBrowser/1.0';
      const info = parseDeviceInfo(ua);

      expect(info.deviceName).toBe('Unknown Device');
      expect(info.platform).toBe('Unknown');
      expect(info.browser).toBe('Unknown');
    });
  });

  describe('generateDeviceInfo', () => {
    test('应该生成完整的设备信息', () => {
      const info = generateDeviceInfo(
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      );

      expect(info.fingerprint).toBeDefined();
      expect(info.fingerprint.length).toBe(16);
      expect(info.deviceName).toBe('Windows PC');
      expect(info.platform).toBe('Windows');
      expect(info.browser).toBe('Chrome');
    });

    test('相同IP和UA应该生成相同指纹', () => {
      const info1 = generateDeviceInfo('192.168.1.1', 'Chrome/120');
      const info2 = generateDeviceInfo('192.168.1.1', 'Chrome/120');

      expect(info1.fingerprint).toBe(info2.fingerprint);
    });
  });
});
