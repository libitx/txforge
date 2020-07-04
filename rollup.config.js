import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import banner from 'rollup-plugin-banner'
import merge from 'deepmerge'

// Production build
const base = {
  input: 'src/index.js',
  output: {
    file: 'dist/txforge.js',
    format: 'umd',
    name: 'TxForge',
    globals: {
      bsv: 'bsvjs'
    }
  },
  external: ['bsv'],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled'
    }),
    banner('TxForge - v<%= pkg.version %>\n<%= pkg.description %>\n<%= pkg.repository %>\nCopyright © <%= new Date().getFullYear() %> Chronos Labs Ltd. Apache-2.0 License')
  ]
}

// Production build minimised
const mini = merge(base, {
  output: {
    file: 'dist/txforge.min.js',
  }
})
mini.plugins.splice(-2, 0, terser())

export default [
  base,
  mini,
]
