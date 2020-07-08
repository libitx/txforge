import { assert } from 'chai'
import bsv from 'bsv'
import Cast from '../../src/cast'
import { OpReturn } from '../../src/casts'


describe('OpReturn.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(OpReturn, { satoshis: 0, data: ['hello world'] })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 2)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 12)
  })

  it('size() correctly handles safe attribute', () => {
    const cast1 = Cast.lockingScript(OpReturn, { satoshis: 0, data: ['hello world'] })
    const cast2 = Cast.lockingScript(OpReturn, { satoshis: 0, data: ['hello world'], safe: false })

    assert.equal(cast1.size(), 12)
    assert.equal(cast2.size(), 11)
  })

  it('script() returns p2pkh locking script', () => {
    const script = cast.script(cast.params)
    assert.lengthOf(script.chunks, 3)
    assert.deepEqual(script.chunks[2].buf, Buffer.from('hello world'))
  })

  it('script() correctly parses different data types', () => {
    const script = cast.script({ data: [
      'abcd',                 // string
      '0x12345678',           // hex string
      Buffer.from('hello'),   // buffer
      bsv.OpCode.OP_0         // opcode
    ]})

    assert.equal(script.chunks[2].buf.toString(), 'abcd')
    assert.equal(script.chunks[3].buf.toString('hex'), '12345678')
    assert.equal(script.chunks[4].buf.toString(), 'hello')
    assert.equal(script.chunks[5].opCodeNum, 0)
  })

  it('script() correctly handles safe attribute', () => {
    const s1 = cast.script({ ...cast.params })
    const s2 = cast.script({ ...cast.params, safe: false })

    assert.equal(s1.chunks[0].opCodeNum, 0)
    assert.equal(s2.chunks[0].opCodeNum, 106)
  })
})