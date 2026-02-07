/**
 * Parse device information from User-Agent string
 * @param userAgent - User-Agent header string
 * @returns Formatted device info string (e.g., "Chrome 120.0 on Windows 10")
 */
export function parseDeviceInfo(userAgent: string | undefined): string {
  if (!userAgent) {
    return 'Unknown Device';
  }

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Parse Browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/([\d.]+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (userAgent.includes('Edg')) {
    const match = userAgent.match(/Edg\/([\d.]+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/([\d.]+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/([\d.]+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    const match = userAgent.match(/(?:Opera|OPR)\/([\d.]+)/);
    browser = match ? `Opera ${match[1]}` : 'Opera';
  }

  // Parse OS
  if (userAgent.includes('Windows NT 10.0')) {
    os = 'Windows 10';
  } else if (userAgent.includes('Windows NT 6.3')) {
    os = 'Windows 8.1';
  } else if (userAgent.includes('Windows NT 6.2')) {
    os = 'Windows 8';
  } else if (userAgent.includes('Windows NT 6.1')) {
    os = 'Windows 7';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      os = `macOS ${version}`;
    } else {
      os = 'macOS';
    }
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android ([\d.]+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (
    userAgent.includes('iOS') ||
    userAgent.includes('iPhone') ||
    userAgent.includes('iPad')
  ) {
    const match = userAgent.match(/OS ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      os = `iOS ${version}`;
    } else {
      os = 'iOS';
    }
  }

  return `${browser} on ${os}`;
}
