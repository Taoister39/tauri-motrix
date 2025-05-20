export const compactUndefined = <T extends object>(obj: T): Partial<T> => {
  if (typeof obj !== "object" || obj === null) return obj;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const cleanedValue = compactUndefined(value);
    if (cleanedValue !== undefined) {
      // @ts-expect-error dynamic assignment
      acc[key] = cleanedValue;
    }
    return acc;
  }, {} as Partial<T>);
};
