import { setupServer } from "msw/node";

import { handlers } from "./handlers";
import { studioHandlers } from "./handlers-studio";

export const server = setupServer(...handlers, ...studioHandlers);
