import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../src/forge'
import Cast from '../src/cast'
import { P2PKH } from '../src/casts'


describe('new Forge()', () => {
  it('sets given inputs and outputs', () => {
    const forge = new Forge({
      inputs: [{
        txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
        vout: 0,
        satoshis: 2000,
        script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
      }],
      outputs: [{ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 2000 }]
    })
    assert.lengthOf(forge.inputs, 1)
    assert.lengthOf(forge.outputs, 1)
  })

  it('sets given change address', () => {
    const forge = new Forge({
      changeTo: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq'
    })
    assert.equal(forge.changeTo, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
    assert.instanceOf(forge.changeScript, bsv.Script)
  })

  it('sets given change script', () => {
    const forge = new Forge({
      changeScript: bsv.Address.fromString('1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq').toTxOutScript()
    })
    assert.equal(forge.changeTo, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
    assert.instanceOf(forge.changeScript, bsv.Script)
  })

  it('sets given miner rates', () => {
    const forge = new Forge({
      options: {
        rates: {
          data: 0.1,
          standard: 0.25
        }
      }
    })
    assert.equal(forge.options.rates.data, 0.1)
    assert.equal(forge.options.rates.standard, 0.25)
  })
})


describe('Forge#changeTo', () => {
  let forge1, forge2;
  beforeEach(() => {
    forge1 = new Forge()
    forge2 = new Forge({ changeTo: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq' })
  })

  it('is undefined when no changeScript', () => {
    assert.isUndefined(forge1.changeScript)
    assert.isUndefined(forge1.changeTo)
  })

  it('returns address when changeScript exists', () => {
    assert.instanceOf(forge2.changeScript, bsv.Script)
    assert.equal(forge2.changeTo, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
  })

  it('can be changed with getters and setters', () => {
    forge1.changeTo = '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq'
    assert.instanceOf(forge1.changeScript, bsv.Script)
    assert.equal(forge1.changeTo, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
  })
})


describe('Forge#inputSum', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('returns 0 when no inputs', () => {
    assert.equal(forge.inputSum, 0)
  })

  it('returns sum of all inputs', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 1,
      satoshis: 555,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.equal(forge.inputSum, 2555)
  })
})


describe('Forge#outputSum', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('returns 0 when no outputs', () => {
    assert.equal(forge.outputSum, 0)
  })

  it('returns sum of all outputs', () => {
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 })
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 5000 })
    forge.addOutput({ data: ['foo', 'bar', 'baz'] })
    assert.equal(forge.outputSum, 55000)
  })
})


describe('Forge#addInput()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('adds a valid cast instance to the tx', () => {
    const input = Cast.unlockingScript(P2PKH, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    forge.addInput(input)
    assert.lengthOf(forge.inputs, 1)
  })

  it('adds paramaters as a P2PKH cast', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.lengthOf(forge.inputs, 1)
  })

  it('throws error with invalid params', () => {
    assert.throws(_ => forge.addInput({}), /^Cast type .+ requires/)
  })
})


describe('Forge#addOutput()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('adds output script params to the tx', () => {
    forge.addOutput({
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac',
      satoshis: 15399
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('adds output data params to the tx', () => {
    forge.addOutput({
      data: ['0xeeefef', 'foo', 'bar']
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('adds output P2PKH params to the tx', () => {
    forge.addOutput({
      to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq',
      satoshis: 50000
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('throws error with invalid params', () => {
    assert.throws(_ => forge.addOutput({}), 'Invalid TxOut params')
  })
})


describe('Forge#build()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('builds the inputs into the tx', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.equal(forge.tx.toHex(), '01000000000000000000')
    forge.build()
    assert.equal(forge.tx.toBuffer().length, 159)
  })

  it('builds the outputs into the tx', () => {
    forge.addOutput([
      { to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 },
      { data: ['0x1234567890'] }
    ])
    assert.equal(forge.tx.toHex(), '01000000000000000000')
    forge.build()
    assert.match(forge.tx.toHex(), /76a914[a-f0-9]{40}88ac/)
    assert.match(forge.tx.toHex(), /006a051234567890/)
  })
})


describe('Forge#sign()', () => {
  let keyPair, forge;
  beforeEach(() => {
    keyPair = bsv.KeyPair.fromRandom()
    const pubKeyHash = bsv.Address.fromPubKey(keyPair.pubKey).hashBuf.toString('hex')
    forge = new Forge({
      inputs: [{
        txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
        vout: 0,
        satoshis: 5000,
        script: '76a914'+ pubKeyHash +'88ac'
      }],
      outputs: [
        { to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 5000 }
      ]
    })
  })

  it('builds and signs inputs when build params given', () => {
    forge.build()
    assert.match(forge.tx.toHex(), /(00){72}.*(00){33}/)
    forge.sign({keyPair})
    assert.notMatch(forge.tx.toHex(), /(00){72}.*(00){33}/)
  })

  it('throws an error if build() is not called first', () => {
    assert.throws(_ => forge.sign({keyPair}), 'TX not built')
  })
})


describe('Forge#estimateFee()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('assumes 1 P2PKH input, event when empty', () => {
    assert.equal(forge.estimateFee(), 79)
  })

  it('uses specified rates if provided', () => {
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 })
    forge.addOutput({ data: ['foo', 'bar', 'baz'] })
    assert.equal(forge.estimateFee(), 108)
    assert.equal(forge.estimateFee({ standard: 0.50, data: 0.25 }), 102)
    assert.equal(forge.estimateFee({ standard: 0.25, data: 0.25 }), 54)
  })
})
