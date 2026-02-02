import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../api/trpc/router/index";

export const trpc = createTRPCReact<AppRouter>();
