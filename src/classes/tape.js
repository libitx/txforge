import nimble from '@runonbitcoin/nimble'

const { BufferWriter, Script } = nimble.classes
const { opcodes } = nimble.constants
const { isBuffer } = nimble.functions

/**
 * TODO
 */
export class Tape {
  constructor(cast) {
    this.cast = cast ? cast : { script: this }
    this.chunks = []
  }

  /**
   * TODO
   */
  apply(fn, args = []) {
    if (typeof fn !== 'function') {
      throw new Error(`invalid argument. callback must be a function.`)
    }

    fn.apply(this.cast, args)
    return this
  }

  /**
   * TODO
   */
  push(data, args = []) {
    if (typeof data === 'object' && (Number.isInteger(data.opcode) || isBuffer(data.buf))) {
      this.chunks.push(data)
      return this
    }

    if (isBuffer(data)) return this.push({ buf: data });

    if (Array.isArray(data)) {
      data.forEach(chunk => this.push(chunk))
      return this
    }

    if (typeof data?.toBuffer === 'function') {
      return this.push(data.toBuffer())
    }

    switch(typeof data) {
      case 'number': return this.push(opcode(data));
      case 'string': return this.push(string(data));
    }

    throw new Error(`invalid push value. type ${typeof data} not supported.`)
  }

  /**
   * TODO
   */
  each(elements, callback) {
    if (!Array.isArray(elements)) {
      throw new Error(`invalid each. first argument must be an array.`)
    }

    for (let i = 0; i < elements.length; i++) this.apply(callback, [elements[i], i])
    return this
  }

  /**
   * TODO
   */
  repeat(n, callback) {
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(`invalid repeat. first argument must be non-negative integer.`)
    }

    for (let i = 0; i < n; i++) this.apply(callback, [i])
    return this
  }
}

/**
 * TODO
 */
export function toScript(tape) {
  const buf = new BufferWriter()

  for (let i = 0; i < tape.chunks.length; i++) {
    const chunk = tape.chunks[i]

    if (Number.isInteger(chunk.opcode)) {
      buf.write([chunk.opcode])
    } else if (chunk.buf.length > 0 && chunk.buf.length < 76) {
      buf.write([chunk.buf.length])
      buf.write(chunk.buf)
    } else if (chunk.buf.length < 0x100) {
      buf.write([76])
      buf.write(uint8(chunk.buf.length))
      buf.write(chunk.buf)
    } else if (chunk.buf.length < 0x10000) {
      buf.write([77])
      buf.write(uint16(chunk.buf.length))
      buf.write(chunk.buf)
    } else if (chunk.buf.length < 0x100000000) {
      buf.write([78])
      buf.write(uint32(chunk.buf.length))
      buf.write(chunk.buf)
    } else {
      throw new Error('pushdata cannot exceed 4,294,967,296 bytes')
    }
  }

  return new Script(buf.toBuffer())
}

function opcode(byte) {
  if (!Number.isInteger(byte) || !Object.values(opcodes).includes(byte)) {
    throw new Error('Invalid push value. Must be valid OP CODE byte value.')
  }

  return { opcode: byte }
}

function string(str) {
  const enc = new TextEncoder()
  return enc.encode(str)
}

function uint8(num) {
  const buf = new ArrayBuffer(1)
  const view = new DataView(buf)
  view.setUint8(0, num)
  return new Uint8Array(view.buffer)
}

function uint16(num) {
  const buf = new ArrayBuffer(2)
  const view = new DataView(buf)
  view.setUint16(0, num, true)
  return new Uint8Array(view.buffer)
}

function uint32(num) {
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setUint32(0, num, true)
  return new Uint8Array(view.buffer)
}
