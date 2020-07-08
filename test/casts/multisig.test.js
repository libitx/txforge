import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { multisig } from '../../src/casts'

const keyPairs = [bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom()],
      pubKeys = keyPairs.map(k => k.pubKey)


describe('multisig.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(multisig, { satoshis: 5000, threshold: 2, pubKeys })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 4)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 114)
  })

  it('script() returns multisig locking script', () => {
    const script = cast.script(cast.params)
    assert.lengthOf(script.chunks, 6)
    assert.equal(script.chunks[0].opCodeNum, bsv.OpCode.OP_2)
    assert.deepEqual(script.chunks[1].buf, keyPairs[0].pubKey.toBuffer())
    assert.deepEqual(script.chunks[2].buf, keyPairs[1].pubKey.toBuffer())
    assert.deepEqual(script.chunks[3].buf, keyPairs[2].pubKey.toBuffer())
    assert.equal(script.chunks[4].opCodeNum, bsv.OpCode.OP_3)
  })

  it('script() throws error if no threshold', () => {
    cast = Cast.lockingScript(multisig, { satoshis: 5000, pubKeys })
    assert.throws(_ => cast.script(cast.params), 'Multisig lockingScript requires threshold')
  })

  it('script() throws error if no pubKeys', () => {
    cast = Cast.lockingScript(multisig, { satoshis: 5000, threshold: 2 })
    assert.throws(_ => cast.script(cast.params), 'Multisig lockingScript requires pubKeys')
  })
})