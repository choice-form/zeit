import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return [
    {
      // clean: true,
      dts: true,
      entry: ['src/index.ts'],
      // experimentalDts: true,
      format: ['cjs', 'esm', 'iife'],
      // loader: { '.jsx': 'jsx', '.tsx': 'tsx' },
      minify: !options.watch,
      sourcemap: true,
      // onSuccess:
      //   'tsc --declaration --declarationMap --emitDeclarationOnly --noEmit false --outDir dist/types',
    },
  ]
})
