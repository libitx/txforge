import nimble from '@runonbitcoin/nimble'

export { Forge, createForge, forgeTx } from './classes/forge.js'
export { Cast, isCast } from './classes/cast.js'
export { ScriptBuilder } from './classes/script-builder.js'
export { UTXO, createUTXO } from './classes/utxo.js'
export * as casts from './casts/index.js'

export const deps = {
  nimble
}