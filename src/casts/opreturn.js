import {
  OpCode,
  Script
} from 'bsv'

/**
 * TODO
 */
const OpReturn = {
  /**
   * TODO
   */
  lockingScript: {
    // TODO
    template: [
      // opFalse
      {
        size: ({ safe = true }) => safe ? 1 : 0,
        data: ({ safe = true }) => safe ? OpCode.OP_FALSE : undefined
      },
      OpCode.OP_RETURN,
      // data
      {
        size(params) { return this.data(params).toBuffer().length },
        data({ data }) {
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
      }
    ],

    /**
     * TODO
     * @param {*} params
     */
    validate(params) {
      if (!(Array.isArray(params.data) && params.data.length)) {
        throw new Error('OP_RETURN script requires data array')
      }
    }
  }
}

export default OpReturn