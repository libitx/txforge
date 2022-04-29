import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'

const { OP_FALSE, OP_RETURN } = nimble.constants.opcodes

export class OpReturn extends Cast {
  lockingScript({ data }) {
    this.script
      .push(OP_FALSE)
      .push(OP_RETURN)
      .push(data)
  }
}
