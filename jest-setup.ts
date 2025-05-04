import "@testing-library/jest-dom";

import { randomFillSync } from "crypto";
import { TextDecoder, TextEncoder } from "util";
Object.assign(global, { TextEncoder, TextDecoder });

Object.defineProperty(window, "crypto", {
  value: {
    getRandomValues: (buffer) => {
      return randomFillSync(buffer);
    },
  },
});
