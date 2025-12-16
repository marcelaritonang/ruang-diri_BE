import { UAParser } from 'ua-parser-js';

export interface ParsedDeviceInfo {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
}

export function parseUserAgent(userAgent: string): ParsedDeviceInfo {
  const { browser, device, os } = UAParser(userAgent);

  return {
    browserName: browser.name || 'Unknown',
    browserVersion: browser.version || 'Unknown',
    osName: os.name || 'Unknown',
    osVersion: os.version || 'Unknown',
    deviceType: device.type || 'desktop',
  };
}
