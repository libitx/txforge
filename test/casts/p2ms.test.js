import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { p2ms } from '../../src/casts'

const keyPairs = [bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom()],
      pubKeys = keyPairs.map(k => k.pubKey)


describe('p2ms.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(p2ms, { satoshis: 5000, threshold: 2, pubKeys })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 4)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 114)
  })

  it('script() returns p2ms locking script', () => {
    const script = cast.script(cast.params)
    assert.lengthOf(script.chunks, 6)
    assert.equal(script.chunks[0].opCodeNum, bsv.OpCode.OP_2)
    assert.deepEqual(script.chunks[1].buf, keyPairs[0].pubKey.toBuffer())
    assert.deepEqual(script.chunks[2].buf, keyPairs[1].pubKey.toBuffer())
    assert.deepEqual(script.chunks[3].buf, keyPairs[2].pubKey.toBuffer())
    assert.equal(script.chunks[4].opCodeNum, bsv.OpCode.OP_3)
  })

  it('script() throws error if no threshold', () => {
    cast = Cast.lockingScript(p2ms, { satoshis: 5000, pubKeys })
    assert.throws(_ => cast.script(cast.params), 'P2MS lockingScript requires threshold')
  })

  it('script() throws error if no pubKeys', () => {
    cast = Cast.lockingScript(p2ms, { satoshis: 5000, threshold: 2 })
    assert.throws(_ => cast.script(cast.params), 'P2MS lockingScript requires pubKeys')
  })
})


describe('p2ms.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(p2ms, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '5221'+ keyPairs[0].pubKey.toHex() +'21'+ keyPairs[1].pubKey.toHex() +'21'+ keyPairs[2].pubKey.toHex() +'53ae'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 2)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 189)
  })

  it('script() returns p2ms unlocking script', () => {
    const script = cast.script(forge, { keyPairs })
    assert.lengthOf(script.chunks, 4)
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[1].buf))
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[2].buf))
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[3].buf))
  })

  it('script() throws error when incorrect keyPair', () => {
    const keyPairs = [bsv.KeyPair.fromRandom()]
    assert.throws(_ => cast.script(forge, { keyPairs }), 'P2MS unlockingScript keyPairs must match lockingScript pubKeys')
  })
})
