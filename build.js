import esbuild from 'esbuild'
import GlobalsPlugin from 'esbuild-plugin-globals'

const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/ // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
}

esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/txforge.min.js',
  globalName: 'txforge',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es6',
  minify: true,
  keepNames: true,
  sourcemap: true,
  plugins: [
    GlobalsPlugin({
      '@runonbitcoin/nimble': 'nimble'
    })
  ]
})

esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/txforge.bundled.min.js',
  globalName: 'txforge',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es6',
  minify: true,
  keepNames: true,
  sourcemap: true
})

esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/txforge.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node10',
  keepNames: true,
  plugins: [
    makeAllPackagesExternalPlugin
  ]
})