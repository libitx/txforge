import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2RPH } from '../../src/casts'

const rBuf = Buffer.from('3d324ce134fef197a82015508aa9950da57273fe4dc4abf5ab4c50c9d06be90b', 'hex'),
      kBuf = Buffer.from('ed7d04e7ec6de2d550992479ad9f52e941049a68cd5b7a24b15659204c78b338', 'hex')


describe('P2RPH.lockingScript', () => {
  let cast1, cast2, cast3;
  beforeEach(() => {
    cast1 = Cast.lockingScript(P2RPH, { satoshis: 5000, rBuf })
    cast2 = Cast.lockingScript(P2RPH, { satoshis: 5000, type: 'PayToR', rBuf })
    cast3 = Cast.lockingScript(P2RPH, { satoshis: 5000, type: 'PayToRSHA256', rBuf })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast1.template, 13)
    assert.lengthOf(cast2.template, 13)
    assert.lengthOf(cast3.template, 13)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast1.size(), 43)
    assert.equal(cast2.size(), 54)
    assert.equal(cast3.size(), 55)
  })

  it('script() returns P2RPH locking script', () => {
    const script1 = cast1.script(cast1.params)
    const script2 = cast2.script(cast2.params)
    assert.lengthOf(script1.chunks, 13)
    assert.lengthOf(script2.chunks, 12)
    assert.deepEqual(script1.chunks[10].buf, bsv.Hash.sha256Ripemd160(rBuf))
    assert.deepEqual(script2.chunks[9].buf, rBuf)
  })

  it('script() throws error if no rBuf', () => {
    const cast = Cast.lockingScript(P2RPH, { satoshis: 5000 })
    assert.throws(_ => cast.script(cast.params), 'P2RPH lockingScript requires rBuf')
  })
})


describe('P2RPH.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2RPH, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '78537f77517f7c7f75a914de7bacce2f3bb02f03773483096ce4a61c28537a88ac'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 2)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 148)
  })

  it('script() returns P2RPH unlocking script', () => {
    const script = cast.script(forge, { kBuf })
    assert.lengthOf(script.chunks, 2)
  })

  it('script() signs with given keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    const script = cast.script(forge, { kBuf, keyPair })
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[1].buf, keyPair.pubKey.toBuffer())
  })

  it('script() throws error when incorrect kBuf', () => {
    const kBuf = bsv.Random.getRandomBuffer(32)
    assert.throws(_ => cast.script(forge, { kBuf }), 'P2RPH unlockingScript requires valid kBuf')
  })
})