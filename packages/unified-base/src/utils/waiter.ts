export function sleep(delay: number) {
  const p = new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
  return p;
}
