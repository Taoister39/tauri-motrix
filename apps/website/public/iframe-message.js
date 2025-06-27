/**
 *
 * @param {MessageEvent<{ type: string; data: unknown }>} e
 */
window.onmessage = (e) => {
  const payload = e.data;

  if (payload.type === "update_theme") {
    console.log("iframe sync_theme", payload);

    /**
     * @type {Record<string,string> | undefined}
     */
    const newTheme = payload.data;
    const rootEle = document.documentElement;

    for (const key in newTheme) {
      rootEle.style.setProperty(`--${key}`, newTheme[key]);
    }
  }
};
