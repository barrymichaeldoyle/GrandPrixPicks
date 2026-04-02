declare module '@rolldown/plugin-babel' {
  import type { PluginOption } from 'vite';

  export interface RolldownBabelPluginOptions {
    presets?: unknown[];
    [key: string]: unknown;
  }

  export default function babel(
    options: RolldownBabelPluginOptions,
  ): PluginOption | Promise<PluginOption>;
}
