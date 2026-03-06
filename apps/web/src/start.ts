import { createStart } from '@tanstack/react-start';

// Avoid Clerk's TanStack server adapter on Cloudflare Pages. Its current
// server bundle pulls in keyless filesystem code (`node:fs`), which causes the
// worker to fail during startup before any request is handled.
export const startInstance = createStart(() => {
  return {};
});
