import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { Tape, toScript } from '../../src/classes/tape.js'
import { num } from '../../src/helpers/index.js'
import { getVarint, readVarint, trimVarint } from '../../src/macros/index.js'
import { verifyScript } from '../../src/extra/verify-script.js'

const { BufferWriter } = nimble.classes
const { writeVarint } = nimble.functions

test('getVarint() gets the varint from the top stack element and puts on top', t => {
  for (let bytes of [32, 320, 320000]) {
    const data = new Uint8Array(bytes).fill(1)
    const buf = new BufferWriter()
    writeVarint(buf, data.length)
    buf.write(data)
    const b = new Tape()
    b.push(buf).apply(getVarint)

    const script = toScript(b)
    const { stack } = verifyScript([], script)

    const expected = [Array.from(buf.toBuffer()), num(bytes)]
    t.deepEqual(stack, expected)
  }
})

test.only('readVarint() reads the varint from the top stack item and puts the encoded data on top', t => {
  for (let bytes of [32, 320, 320000]) {
    const data = new Uint8Array(bytes).fill(1)
    const buf = new BufferWriter()
    writeVarint(buf, data.length)
    buf.write(data)
    buf.write([1,2,3,4])
    const b = new Tape()
    b.push(buf).apply(readVarint)

    const script = toScript(b)
    const { stack } = verifyScript([], script)

    const expected = [[1, 2, 3, 4], Array.from(data)]
    t.deepEqual(stack, expected)
  }
})

test.only('trimVarint() trims the varint from the leading bytes of the top stack item', t => {
  for (let bytes of [32, 320, 320000]) {
    const data = new Uint8Array(bytes).fill(1)
    const buf = new BufferWriter()
    writeVarint(buf, data.length)
    buf.write(data)
    const b = new Tape()
    b.push(buf).apply(trimVarint)

    const script = toScript(b)
    const { stack } = verifyScript([], script)

    const expected = [Array.from(data)]
    t.deepEqual(stack, expected)
  }
})
