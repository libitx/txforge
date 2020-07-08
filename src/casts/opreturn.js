import {
  OpCode,
  Script
} from 'bsv'

/**
 * TODO
 */
const opreturn = {
  /**
   * TODO
   */
  lockingScript: {
    // TODO
    template: [
      { name: 'opFalse', size: ({safe = true}) => safe ? 1 : 0 },
      OpCode.OP_RETURN
    ],

    /**
     * TODO
     * @param {*} forge 
     * @param {*} params
     */
    script({ data, safe = true }) {
      const script = new Script()

      if (safe) script.writeOpCode(OpCode.OP_FALSE)
      script.writeOpCode(OpCode.OP_RETURN)

      return data.reduce((script, item) => {
        // Hex string
        if (typeof item === 'string' && /^0x/i.test(item)) {
          script.writeBuffer(Buffer.from(item.slice(2), 'hex'))
        // Opcode number
        } else if (typeof item === 'number' || item === null) {
          script.writeOpCode(Number.isInteger(item) ? item : 0)
        // Opcode
        } else if (typeof item === 'object' && item.hasOwnProperty('op')) {
          script.writeOpCode(item.op)
        // All else
        } else {
          script.writeBuffer(Buffer.from(item))
        }
        return script
      }, script)
    }
  }
}

export default opreturn