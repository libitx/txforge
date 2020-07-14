// Entry for rollup
// If needed, attach Buffer to window scope
import { Buffer } from 'buffer'
if (typeof window !== 'undefined' && !window.Buffer) window.Buffer = Buffer

export * from './src'