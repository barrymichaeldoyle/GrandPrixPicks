// Vite injects import.meta.env, and apps/web's own tsconfig picks the types up
// via `"types": ["vite/client"]`. The declaration emit for the sync runs from
// .design-sync/, which has no node_modules to resolve `vite/client` from, so a
// handful of app files would fail with "Property 'env' does not exist on type
// 'ImportMeta'" and emit `any`. This shim covers only what those files read.
interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
