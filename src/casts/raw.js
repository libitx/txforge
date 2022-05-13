import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'

const { Script } = nimble.classes

/**
 * The Raw cast provides a way to use an existing script with TxForge.
 * 
 * * ## Lock params
 * 
 * - `script` - Script instance or hex-encoded string
 * 
 * ## Unlock params
 * 
 * - `script` - Script instance or hex-encoded string
 * 
 * ## Examples
 * 
 * ```
 * Raw.lock(1000, { script: '76a91412ab8dc588ca9d5787dde7eb29569da63c3a238c88ac' })
 * ```
 */
export class Raw extends Cast {
  init(params) {
    if (typeof params.script === 'string') {
      this.params.script = Script.fromString(params.script)
    }

    if (!(this.params.script && typeof this.params.script.toBuffer === 'function')) {
      throw new Error('Raw cast must be created with valid `script`')
    }
  }

  lockingScript({ script }) {
    this.script.push(script.chunks)
  }

  unlockingScript({ script }) {
    this.script.push(script.chunks)
  }
}

