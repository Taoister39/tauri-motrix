export const isTest = process.env.NODE_ENV === "test";
export const isDev = process.env.NODE_ENV === "development";
export const isProd = process.env.NODE_ENV === "production";

export const isMac =
  navigator.userAgent.includes("Mac OS X") || OS_PLATFORM === "darwin";
export const isWin =
  /windows|win32/i.test(navigator.userAgent) || OS_PLATFORM === "win32";
export const isLinux =
  /linux/i.test(navigator.userAgent) || OS_PLATFORM === "linux";
