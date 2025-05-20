export const arrayAddOrRemove = <T>(array: T[], value: T) => {
  const set = new Set(array);

  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }

  return Array.from(set);
};
