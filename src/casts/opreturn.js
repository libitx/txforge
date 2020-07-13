import { Buffer } from 'buffer'
import {
  OpCode,
  Script,
  VarInt
} from 'bsv'

/**
 * OP_RETURN cast
 * 
 * OP_RETURNS are frequently used to create transaction outputs containing
 * arbitrary data.
 * 
 * The cast automatically handles your given data array containing strings,
 * hex-strings, buffers and OpCodes, and processes it into a Script.
 */
const OP_RETURN = {
  /**
   * OP_RETURN lockingScript
   * 
   * The expected parameters are:
   * 
   * * `data` - an array of data chunks (see below)
   * * `safe` - set to false for spendable OP_RETURNS (defaults true)
   * 
   * The data array can contain any of the following types of element:
   * 
   * * Strings
   * * Hex-encoded strings, eg: `0xfafbfcfd`
   * * Raw buffers or typed arrays
   * * OpCode numbers
   * 
   * Example:
   * 
   * ```
   * Cast.lockingScript(OP_RETURN, {
   *   satoshis: 0,
   *   data: [
   *     '0x48656c6c6f20776f726c64',
   *     'Hello world',
   *     Buffer.from('Hello world'),
   *     new Uint8Array([72, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100]),
   *     OpCode.OP_FALSE
   *   ]
   * })
   * ```
   */
  lockingScript: {
    script: [
      // 1. OP_FALSE (if safe)
      ({ safe = true }) => safe ? OpCode.OP_FALSE : undefined,

      // 2. OP_RETURN
      OpCode.OP_RETURN,

      // 3. Arbitrary data
      function({ data }) {
        // Iterates over data params and returns a Script instance
        return data.reduce((script, item) => {
          // Hex string
          if (typeof item === 'string' && /^0x/i.test(item)) {
            script.writeBuffer(Buffer.from(item.slice(2), 'hex'))
          }
          // Opcode number
          else if (typeof item === 'number' || item === null) {
            script.writeOpCode(Number.isInteger(item) ? item : 0)
          }
          // Opcode
          else if (typeof item === 'object' && item.hasOwnProperty('op')) {
            script.writeOpCode(item.op)
          }
          // All else
          else {
            script.writeBuffer(Buffer.from(item))
          }
          
          return script
        }, new Script())
      }
    ],

    /**
     * Returns the size of the script.
     * 
     * @param {Object} params Cast params
     * @returns {Number}
     */
    size(params) {
      const scriptLen = this.getScript(params).toBuffer().length
      return (params.safe ? 1 : 0) + 1 + VarInt.fromNumber(scriptLen).buf.length + scriptLen
    },

    /**
     * Validates the given params.
     * 
     * @param {Object} params Cast params
     */
    validate(params) {
      if (!(Array.isArray(params.data) && params.data.length)) {
        throw new Error('OP_RETURN script requires data array')
      }
    }
  }
}

export default OP_RETURN