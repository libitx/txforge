import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import banner from 'rollup-plugin-banner'
import nodePolyfills from 'rollup-plugin-polyfill-node'

export default [
  /**
   * Entry: TxForge Web
   */
  {
    input: 'src/index.js',
    output: [
      // 1: Full build
      {
        file: 'dist/txforge.js',
        format: 'iife',
        name: 'TxForge',
        globals: {
          bsv: 'bsvjs'
        }
      },
      // 2: Minimised
      {
        file: 'dist/txforge.min.js',
        format: 'iife',
        name: 'TxForge',
        globals: {
          bsv: 'bsvjs'
        },
        plugins: [
          terser({
            keep_classnames: true
          })
        ]
      }
    ],
    external: ['bsv'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      nodePolyfills(),
      json(),
      banner('TxForge - v<%= pkg.version %>\n<%= pkg.description %>\n<%= pkg.repository %>\nCopyright © <%= new Date().getFullYear() %> Chronos Labs Ltd. Apache-2.0 License')
    ],

    // suppress eval warnings
    onwarn(warning, warn) {
      if (warning.id && warning.id.match(/cast\.js$/) && warning.code === 'EVAL') return
      warn(warning)
    }
  },

  /**
   * Entry: TxForge CJS
   */
  {
    input: 'src/index.js',
    output: {
      file: 'dist/txforge.cjs.js',
      format: 'cjs'
    },
    external: ['bsv', 'buffer'],
    plugins: [
      resolve(),
      commonjs(),
      json()
    ],

    // suppress eval warnings
    onwarn(warning, warn) {
      if (warning.id && warning.id.match(/cast\.js$/) && warning.code === 'EVAL') return
      warn(warning)
    }
  },

  /**
   * Entry: Casts Web
   */
  {
    input: 'src/casts/index.js',
    output: [
      // 1: Full build
      {
        file: 'dist/txforge.casts.js',
        format: 'iife',
        name: 'TxForge.casts',
        globals: {
          bsv: 'bsvjs'
        }
      },
      // 2: Minimised
      {
        file: 'dist/txforge.casts.min.js',
        format: 'iife',
        name: 'TxForge.casts',
        globals: {
          bsv: 'bsvjs'
        },
        plugins: [
          terser({
            keep_classnames: true
          })
        ]
      }
    ],
    external: ['bsv'],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled'
      }),
      nodePolyfills()
    ],
  },

  /**
   * Entry: Casts CJS
   */
  {
    input: 'src/casts/index.js',
    output: {
      file: 'dist/txforge.casts.cjs.js',
      format: 'cjs'
    },
    external: ['bsv', 'buffer'],
    plugins: [
      resolve(),
      commonjs()
    ]
  }
]