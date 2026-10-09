import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DisplaySetting from "@/business/setting/DisplaySetting";
import { useMotrix } from "@/hooks/motrix";

jest.mock("@/hooks/motrix");
jest.mock("swr", () => ({
  __esModule: true,
  default: () => ({ data: undefined, mutate: jest.fn() }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));
jest.mock("@/services/i18n", () => ({ getLanguage: (value: string) => value }));

it.each([false, true])(
  "saves the tray preference independently of auto launch (initially %s)",
  async (enabled) => {
    const patchMotrix = jest.fn().mockResolvedValue(undefined);
    jest.mocked(useMotrix).mockReturnValue({
      motrix: {
        enable_auto_launch: false,
        minimize_to_tray_on_auto_launch: enabled,
        language: "en-US",
      } as MotrixConfig,
      patchMotrix,
      mutateMotrix: jest.fn(),
    });

    render(<DisplaySetting />);
    const toggle = screen.getByRole("checkbox", {
      name: "setting.MinimizeToTrayOnAutoLaunch",
    });
    expect(toggle).toHaveProperty("checked", enabled);
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(patchMotrix).toHaveBeenCalledWith({
        minimize_to_tray_on_auto_launch: !enabled,
      }),
    );
  },
);
