import nimble from '@runonbitcoin/nimble'
import { Cast } from '../classes/cast.js'

const { Script } = nimble.classes

export class Raw extends Cast {
  init(params) {
    if (typeof params.script === 'string') {
      this.params.script = Script.fromString(params.script)
    }

    if (typeof this.params?.script?.toBuffer !== 'function') {
      throw new Error('Raw cast must be created with valid `script`')
    }
  }

  lockingScript({ script }) {
    this.script.push(script)
  }

  unlockingScript({ script }) {
    this.script.push(script)
  }
}

