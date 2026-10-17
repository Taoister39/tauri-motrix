jest.mock("../apps/extensions/src/App", () => ({ App: () => null }));
jest.mock("react-dom/client", () => ({
  createRoot: () => ({ render: jest.fn() }),
}));

const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");

afterEach(() => {
  document.documentElement.className = "";
  document.body.innerHTML = "";
  if (originalChrome)
    Object.defineProperty(globalThis, "chrome", originalChrome);
  else Reflect.deleteProperty(globalThis, "chrome");
});

it("keeps viewport-based preview constraints out of extension views", () => {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: { runtime: { id: "motrix-companion" } },
  });
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.className = "browser-preview";
  jest.isolateModules(() => {
    jest.requireActual("../apps/extensions/src/popup");
  });
  expect(document.documentElement).not.toHaveClass("browser-preview");
});

it("enables responsive viewport constraints for a regular browser preview", () => {
  Reflect.deleteProperty(globalThis, "chrome");
  document.body.innerHTML = '<div id="root"></div>';
  jest.isolateModules(() => {
    jest.requireActual("../apps/extensions/src/popup");
  });
  expect(document.documentElement).toHaveClass("browser-preview");
});
