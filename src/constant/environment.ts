// @ts-expect-error only test
export const isTest = process.env.NODE_ENV === "test";
// @ts-expect-error only dev
export const isDev = process.env.NODE_ENV === "development";
// @ts-expect-error only prod
export const isProd = process.env.NODE_ENV === "production";
