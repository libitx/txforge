import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { p2pkh } from '../../src/casts'

const keyPair = bsv.KeyPair.fromRandom(),
      address = bsv.Address.fromPubKey(keyPair.pubKey)


describe('p2pkh.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(p2pkh, { satoshis: 5000, address })
  })

  it('template is correct length', () => {
    assert.lengthOf(cast.template, 5)
  })

  it('size() returns correct txOut size', () => {
    assert.equal(cast.size(), 34)
  })

  it('script() returns p2pkh locking script', () => {
    const script = cast.script(cast.params)
    assert.lengthOf(script.chunks, 5)
    assert.deepEqual(script.chunks[2].buf, address.hashBuf)
  })

  it('script() throws error if no address', () => {
    cast = Cast.lockingScript(p2pkh, { satoshis: 5000 })
    assert.throws(_ => cast.script(cast.params), 'P2PKH lockingScript requires address')
  })
})


describe('p2pkh.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(p2pkh, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a914'+ address.hashBuf.toString('hex') +'88ac'
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

  it('script() returns p2pkh unlocking script', () => {
    const script = cast.script(forge, { keyPair })
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[1].buf, keyPair.pubKey.toBuffer())
  })

  it('script() throws error when incorrect keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    assert.throws(_ => cast.script(forge, { keyPair }), 'P2PKH unlockingScript requires valid keyPair')
  })
})
