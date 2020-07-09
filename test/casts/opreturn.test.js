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
    assert.lengthOf(cast.template, 3)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 25)
  })

  it('getSize() correctly handles safe attribute', () => {
    const cast1 = Cast.lockingScript(OpReturn, { satoshis: 0, data: ['hello world'] })
    const cast2 = Cast.lockingScript(OpReturn, { satoshis: 0, data: ['hello world'], safe: false })

    assert.equal(cast1.getSize(), 25)
    assert.equal(cast2.getSize(), 24)
  })

  it('getScript() returns opreturn script', () => {
    const script = cast.getScript(cast.params)
    assert.lengthOf(script.chunks, 3)
    assert.deepEqual(script.chunks[2].buf, Buffer.from('hello world'))
  })

  it('getScript() correctly parses different data types', () => {
    const script = cast.getScript({ data: [
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

  it('getScript() correctly handles safe attribute', () => {
    const s1 = cast.getScript({ ...cast.params })
    const s2 = cast.getScript({ ...cast.params, safe: false })

    assert.equal(s1.chunks[0].opCodeNum, 0)
    assert.equal(s2.chunks[0].opCodeNum, 106)
  })

  it('getScript() throws error if no data', () => {
    cast = Cast.lockingScript(OpReturn, { satoshis: 0 })
    assert.throws(_ => cast.getScript(cast.params), 'OP_RETURN script requires data array')
  })
})