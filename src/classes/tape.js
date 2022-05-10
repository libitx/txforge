import nimble from '@runonbitcoin/nimble'

const { BufferWriter, Script } = nimble.classes
const { opcodes } = nimble.constants
const { isBuffer } = nimble.functions

/**
 * The Tape class is a Bitcoin Script builder. Each Cast instance has a Tape
 * instance on the `script` property.
 * 
 * Tape provides a simple API for pushing new cells containing Op Codes or data
 * vectors onto the tape. Tape functions can be chained together.
 * 
 * The tape is later compiled to a Script instance.
 */
export class Tape {
  constructor(cast) {
    this.cast = cast ? cast : { script: this }
    this.cells = []
  }

  /**
   * Applies the macro function with the given array of arguments. The function
   * will be invoked with the Cast instance as the `this` context.
   * 
   * ## Example
   * 
   * ```
   * // Define a macro
   * function hello(data) {
   *   this.script.push('hello').push(data)
   * }
   * 
   * // Apply the macro
   * tape.apply(hello, ['world'])
   * ```
   * 
   * @param {function} macro Macro function
   * @param {any[]} args Array of arguments
   * @return {Tape}
   */
  apply(macro, args = []) {
    if (typeof macro !== 'function') {
      throw new Error(`invalid argument. callback must be a function.`)
    }
    if (!Array.isArray(args)) {
      throw new Error(`invalid args. must be an array of arguments.`)
    }

    macro.apply(this.cast, args)
    return this
  }

  /**
   * Pushes the given data onto the Tape. `data` can be an Op Code, string or
   * byte vector, or an array of these types.
   * 
   * To push integers onto the stack, first convert to a Script Num using the
   * {@link num `num()` helper}.
   * 
   * @param {any | any[]} data Push data
   * @return {Tape}
   */
  push(data) {
    if (typeof data === 'object' && (Number.isInteger(data.opcode) || isBuffer(data.buf))) {
      this.cells.push(data)
      return this
    }

    if (isBuffer(data)) return this.push({ buf: data });

    if (Array.isArray(data)) {
      data.forEach(part => this.push(part))
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
   * Iterates over the given elements invoking the callback on each. The
   * callback will be invoked with the Cast instance as the `this` context.
   * 
   * ## Example
   * 
   * ```
   * tape.each(['foo', 'bar'], (el, i) => {
   *   tape.push(el)
   * })
   * ```
   * 
   * @param {any[]} elements Iterable elements
   * @param {function} callback Callback function
   * @return {Tape}
   */
  each(elements, callback) {
    if (!Array.isArray(elements)) {
      throw new Error(`invalid each. first argument must be an array.`)
    }

    for (let i = 0; i < elements.length; i++) this.apply(callback, [elements[i], i])
    return this
  }

  /**
   * Iterates the given number of times invoking the callback on each loop. The
   * callback will be invoked with the Cast instance as the `this` context.
   * 
   * ## Example
   * 
   * ```
   * tape.repeat(15, (i) => {
   *   tape.push(OP_1)
   *   tape.push(OP_SPLIT)
   * })
   * ```
   * 
   * @param {any[]} elements Iterable elements
   * @param {function} callback Callback function
   * @return {Tape}
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
 * Compiles the given tape and returns a Bitcoin Script instance.
 * 
 * @param {Tape} tape Tape instance
 * @returns {nimble.Script}
 */
export function toScript(tape) {
  if (!Array.isArray(tape?.cells)) {
    throw new Error('invalid argument. `toScript()` must be given a Tape instance.')
  }

  const buf = new BufferWriter()

  for (let i = 0; i < tape.cells.length; i++) {
    const cell = tape.cells[i]

    if (cell.buf?.length) {
      if (cell.buf.length < 76) {
        buf.write([cell.buf.length])
        buf.write(cell.buf)
      } else if (cell.buf.length < 0x100) {
        buf.write([76])
        buf.write(uint8(cell.buf.length))
        buf.write(cell.buf)
      } else if (cell.buf.length < 0x10000) {
        buf.write([77])
        buf.write(uint16(cell.buf.length))
        buf.write(cell.buf)
      } else if (cell.buf.length < 0x100000000) {
        buf.write([78])
        buf.write(uint32(cell.buf.length))
        buf.write(cell.buf)
      } else {
        throw new Error('pushdata cannot exceed 4,294,967,296 bytes')
      }
    } else if (Number.isInteger(cell.opcode)) {
      buf.write([cell.opcode])
    }
  }

  return new Script(buf.toBuffer())
}

// Casts byte as an opcode object
function opcode(byte) {
  if (!Number.isInteger(byte) || !Object.values(opcodes).includes(byte)) {
    throw new Error('Invalid push value. Must be valid OP CODE byte value.')
  }

  return { opcode: byte }
}

// Casts string as a utf8 buffer
function string(str) {
  const enc = new TextEncoder()
  return enc.encode(str)
}

// Casts integer as a Uint8Array
function uint8(num) {
  const buf = new ArrayBuffer(1)
  const view = new DataView(buf)
  view.setUint8(0, num)
  return new Uint8Array(view.buffer)
}

// Casts integer as a Uint16Array
function uint16(num) {
  const buf = new ArrayBuffer(2)
  const view = new DataView(buf)
  view.setUint16(0, num, true)
  return new Uint8Array(view.buffer)
}

// Casts integer as a Uint32Array
function uint32(num) {
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setUint32(0, num, true)
  return new Uint8Array(view.buffer)
}
