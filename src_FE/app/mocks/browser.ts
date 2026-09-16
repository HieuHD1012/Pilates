import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";
import { studioHandlers } from "./handlers-studio";

export const worker = setupWorker(...handlers, ...studioHandlers);
