import { checkLanguage, getLanguage } from "@/services/i18n";

describe("checkLanguage", () => {
  it("should return false", () => {
    expect(checkLanguage("zh")).toBeFalsy();
    expect(checkLanguage("en")).toBeFalsy();
  });

  it("should retrun true", () => {
    expect(checkLanguage("en-US")).toBeTruthy();
  });
});

describe("getLanguage", () => {
  it("should default return en-US", () => {
    expect(getLanguage()).toEqual("en-US");
  });

  it("should return zh-CN", () => {
    expect(getLanguage("zh")).toEqual("zh-CN");
  });
});
