import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import banner from 'rollup-plugin-banner'
import nodePolyfills from 'rollup-plugin-node-polyfills'

export default [
  // Production build
  {
    input: 'index.js',
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
      nodePolyfills(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      banner('TxForge - v<%= pkg.version %>\n<%= pkg.description %>\n<%= pkg.repository %>\nCopyright © <%= new Date().getFullYear() %> Chronos Labs Ltd. Apache-2.0 License')
    ],

    // suppress eval warnings
    onwarn(warning, warn) {
      if (warning.code === 'EVAL') return
      warn(warning)
    }
  },

  // Production minimized
  {
    input: 'index.js',
    output: {
      file: 'dist/txforge.min.js',
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
      nodePolyfills(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      terser(),
      banner('TxForge - v<%= pkg.version %>\n<%= pkg.description %>\n<%= pkg.repository %>\nCopyright © <%= new Date().getFullYear() %> Chronos Labs Ltd. Apache-2.0 License')
    ],

    // suppress eval warnings
    onwarn(warning, warn) {
      if (warning.code === 'EVAL') return
      warn(warning)
    }
  },

  // Casts build
  {
    input: 'casts.js',
    output: {
      file: 'dist/txforge.casts.js',
      format: 'umd',
      name: 'casts',
      globals: {
        bsv: 'bsvjs'
      }
    },
    external: ['bsv'],
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      nodePolyfills(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      })
    ]
  },

  // Casts minimized
  {
    input: 'casts.js',
    output: {
      file: 'dist/txforge.casts.min.js',
      format: 'umd',
      name: 'casts',
      globals: {
        bsv: 'bsvjs'
      }
    },
    external: ['bsv'],
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      nodePolyfills(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      terser()
    ]
  }
]
