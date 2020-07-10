// Entry for rollup
// If needed, attach Buffer to window scope
import { Buffer } from 'buffer'
if (!(window && window.Buffer)) window.Buffer = Buffer

export * from './src/casts'