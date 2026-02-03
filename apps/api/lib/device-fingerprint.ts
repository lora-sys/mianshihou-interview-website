import crypto from 'crypto';

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  platform: string;
  browser: string;
}

/**
 * 生成设备指纹（优先使用客户端 deviceId，否则基于 IP 和 User-Agent）
 */
export function generateDeviceFingerprint(
  ip: string,
  userAgent: string,
  deviceId?: string | null
): string {
  const raw = deviceId ? `device:${deviceId}` : `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

/**
 * 解析设备信息
 */
export function parseDeviceInfo(userAgent: string): Omit<DeviceInfo, 'fingerprint'> {
  const ua = userAgent.toLowerCase();

  // 提取设备名称 - 顺序很重要，先检测更具体的设备
  let deviceName = 'Unknown Device';
  if (ua.includes('iphone') || ua.includes('ipad')) deviceName = 'iOS Device';
  else if (ua.includes('android')) deviceName = 'Android Device';
  else if (ua.includes('tablet')) deviceName = 'Tablet';
  else if (ua.includes('mobile')) deviceName = 'Mobile Device';
  else if (ua.includes('mac')) deviceName = 'Macintosh';
  else if (ua.includes('windows')) deviceName = 'Windows PC';
  else if (ua.includes('linux')) deviceName = 'Linux PC';

  // 提取平台
  let platform = 'Unknown';
  if (ua.includes('android')) platform = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) platform = 'iOS';
  else if (ua.includes('mac os')) platform = 'macOS';
  else if (ua.includes('windows')) platform = 'Windows';
  else if (ua.includes('linux')) platform = 'Linux';

  // 提取浏览器 - 顺序很重要
  let browser = 'Unknown';
  if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera/')) {
    browser = 'Opera';
  } else if (ua.includes('chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/')) {
    browser = 'Safari';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  }

  return { deviceName, platform, browser };
}

/**
 * 生成完整设备信息
 */
export function generateDeviceInfo(
  ip: string,
  userAgent: string,
  deviceId?: string | null
): DeviceInfo {
  const fingerprint = generateDeviceFingerprint(ip, userAgent, deviceId);
  const { deviceName, platform, browser } = parseDeviceInfo(userAgent);

  return { fingerprint, deviceName, platform, browser };
}
