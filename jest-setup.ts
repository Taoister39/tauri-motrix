import "@testing-library/jest-dom";

import { randomFillSync, randomUUID } from "crypto";
import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

Object.defineProperty(window, "crypto", {
  value: {
    getRandomValues: randomFillSync,
    randomUUID,
  },
});
