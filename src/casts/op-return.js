import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'

const { OP_FALSE, OP_RETURN } = nimble.constants.opcodes

/**
 * OP_RETURN outputs are frequently used for publishing arbitrary data on-chain.
 * 
 * As this is generally used for creating unspendable outputs, no unlocking
 * script is defined on this contract.
 * 
 * ## Lock params
 * 
 * - `data` - A single buffer or string, or array of buffers/strings.
 * 
 * ## Examples
 * 
 * ```
 * OpReturn.lock(0, { data: 'hello world' })
 * 
 * OpReturn.lock(0, { data: ['hello', 'world'] })
 * ```
 */
export class OpReturn extends Cast {
  lockingScript({ data }) {
    this.script
      .push(OP_FALSE)
      .push(OP_RETURN)
      .push(data)
  }
}
