# TxForge

![Modern Bitcoin transaction builder](https://github.com/libitx/txforge/raw/master/media/poster.jpg)

![npm](https://img.shields.io/npm/v/txforge?color=informational)
![License](https://img.shields.io/github/license/libitx/txforge?color=informational)
![Build Status](https://img.shields.io/github/workflow/status/libitx/txforge/Node.js%20CI)

TxForge is a modern Bitcoin transaction builder, built on top of [bsv2](https://github.com/moneybutton/bsv/) and capable of supporting *any* non-standard and custom script type.

* Offers a simple and familiar declarative API for composing transactions.
* Can be used for building **any** type of transaction with the power of [Casts](#introducing-casts).
* Build for future Bitcoin and future JavaScript. Built on top of `bsv2` and with ES modules.
* A robust library with solidly tested codebase.

## Getting started

Install TxForge with `npm` or `yarn`:

```shell
npm install txforge
# or
yarn add txforge
```

Alternatively use in a browser via CSN:

```html
<script src="https://unpkg.com/txforge/dist/txforge.min.js"></script>
<!-- optional: adds casts to TxForge.casts -->
<script src="https://unpkg.com/txforge/dist/txforge.casts.min.js"></script>
```

TxForge has a peer dependency on **version 2** the `bsv` library which must also be installed in your project.

## Simple example

Whilst TxForge can be used to build complex transactions, for simple and common use cases such as sending a `P2PKH` payment or data output, TxForge has sensible defaults that makes this painless:

```javascript
import { Forge } from 'txforge'

// You'll need UTXOs to fund a transaction. Where you store or fetch UTXO data
// from is application specific, but they should confirm to this structure as
// minimum:
const utxo = {
  txid,     // UTXO transaction id
  vout,     // UTXO output index (also accepts `outputIndex` or `txOutNum`)
  satoshis, // UTXO amount (also accepts `amount`)
  script    // Hex-encoded UTXO script
}

// Instantiate a Forge instance
const forge = new Forge({
  inputs: [utxo],
  outputs: [
    // Create one P2PKH output
    { to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 5000 },
    // A second data output
    { data: ['meta', '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', txid] }
  ],
  // Set the change address
  changeTo: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ'
})

// As we only have a single UTXO to sign, the transaction can be built and
// signed with a bsv KeyPair
forge
  .build()
  .sign({ keyPair })

// And voila, we have a tx
console.log(forge.tx.toHex())
```

## Introducing Casts

The above example is all well and good, but there are already libraries that do this for us. What makes TxForge different, and very powerful, are **Casts**.

A Cast is an abstraction over input and output scripts, that provides a way for defining script templates an a single module. TxForge ships with a few Casts built-in (`P2PK`, `P2PKH`, `P2MS`, `P2RPH`, and `OP_RETURN`), but developers can also create and share their own casts, for their own application specific smart contracts and custom scripts.

Lets look at some examples.

### So, you want R-Puzzles, huh?

TxForge ships with a `P2RPH` (Pay to R-Puzzle Hash) Cast. The approach for R-Puzzles is pulled directly from Dean Little's superb [rpuzzle](https://github.com/deanmlittle/rpuzzle) library (much respect - I learnt a lot from reading this code).

To create and redeem an R-Puzzle, you will need to know your K value and R value. TxForge doesn't provide a way to generate these, it assumes you have them already. Look at Dean's code if you want examples of how to do this.

Lets create two transactions. One creating an R-Puzzle, the second unlocking it and sending the value to a normal address.

```javascript
// We need to import the Cast class and the P2RPH cast
import { Forge, Cast } from 'txforge'
import { P2RPH } from 'txforge/casts'

// First we'll create an R-Puzzle locking script. We'll need to give our
// R value (rBuf) to the Cast 
const forge1 = new Forge({
  inputs: [utxo],
  outputs: [
    Cast.lockingScript(P2RPH, { satoshis: 5000, rBuf })
  ],
  changeTo: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ'
})

// Assuming the UTXO is a P2PKH input, we can sign it as we did before
forge1
  .build()
  .sign({ keyPair })

// After we've broadcast the above transaction, we can unlock and spend
// the R-Puzzle
const forge2 = new Forge({
  inputs: [
    Cast.unlockingScript(P2RPH, utxo)
  ],
  // In this tx we'll just send the entire amount to the change address
  changeTo: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ'
})

// As our UTXO is an R-Puzzle, we unlock it with our K value (kBuf)
// We can provide and KeyPair for signing (if not, a random one is created)
forge2
  .build()
  .sign({ kBuf, keyPair })
```

And there we have it. In the code above, which I hope you'll agree is succinct and elegant, we have created an R-Puzzle in one transaction, and then spent it in another. Easy.

### So, you want Multisig, huh?

TxForge has you covered here too, with its `P2MS` Cast. To create a multisig locking script you need to give a `threshold` (number of sigs required to unlock) and then an array of bsv PubKey's.

In this example we'll create a few different locking scripts so we can see how to unlock different types of Casts in the same transaction.

```javascript
import { Forge, Cast } from 'txforge'
import { P2MS, P2RPH } from 'txforge/casts'

const forge1 = new Forge({
  inputs: [utxo],
  outputs: [
    // The P2MS locking script is created with 3 PubKeys and a threshold of 2
    Cast.lockingScript(P2MS, { satoshis: 5000, threshold: 2, pubKeys: [pk1, pk2, pk3] })
    // Lets chuck an R-Puzzle in to the mix too
    Cast.lockingScript(P2RPH, { satoshis: 5000, rBuf })
  ],
  changeTo: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ'
})

// Assuming the UTXO is a P2PKH input, we can sign it with a KeyPair
forge1
  .build()
  .sign({ keyPair })

// OK, once broadcast we can spend both inputs in the same transaction
const forge2 = new Forge({
  inputs: [
    Cast.unlockingScript(P2MS, utxo1),
    Cast.unlockingScript(P2RPH, utxo2)
  ],
  changeTo: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ'
})

// In this transaction the two UTXO require different parameters to unlock
// The multisig requires at least two KeyPairs whilst the R-Puzzle needs the kBuf
forge2
  .build()
  .signTxIn(0, { keyPairs: [kp1, kp2] })  // Sign vin 0 with at least 2 KeyPairs
  .signTxIn(1, { kBuf })                  // Unlock vin 1 with the kBuf
```

Depending on the Cast, it is also possible to give other advanced signing params such as `sigHashType` and `flags` to customise further the bahaviour and signing rules of your transactions.

### So, you want to create your own Cast, huh?

Bitcoin's scripting language is rich and diverse and allows developers to craft any number of new innovative transaction types. The five Casts this library ships with today will barely scratch the surface of the different transaction types on an un-f\*ckened Bitcoin soon.

Developers can create their own Casts, which they can either keep within their own organisation and private codebase, or distribute and share with other developers. By creating a Cast, your complex and custom transactions can be created and redeemed with the same simplicity shown in the examples above.

A Cast is just a JavaScript object with two top level properties: `lockingScript` and `unlockingScript`. These are also objects with the following properties: `script`, `size`, `setup` and `validate`.

Lets take a look.

```javascript
const MyCast = {

  lockingScript: {
    // `script` must be an array of data items that will make up the Script.
    // Each element can either be an OpCode, Buffer, or a function.
    // When the element is a function, it is called with the params that are
    // given when the unlockingScript cast is created.
    script: [
      OpCode.OP_DUP,
      OpCode.OP_HASH160,
      ({ address }) => address.hashBuf,
      OpCode.OP_EQUALVERIFY,
      OpCode.OP_CHECKSIG
    ],

    // `size` is used so TxForge can estimate the size of a transaction without
    // building it. It can be either a number, or a function which is passed the
    // Cast parameters and must return a number.
    size: 25,

    // `setup` must be a function and is optional. When present, it is called
    // before the script is generated. If an object is returned, it's properties
    // will be available to all functions in the script array
    setup(params) {
      return { foo: 'bar' }
    },

    // `validate` must be a function and is optional. When present, it is called
    // after `setup()` but before the script is generated. This provides a way
    // to throw an error with a useful error message.
    validate(params) {
      if (!params.address) throw new Error('Och!')
    }
  },

  // The unlockingScript side of things works in much the same way but there is
  // a crucial difference. Each of the functions in `script` receive two
  // variables. The first `ctx` is a context object containing the bsv Tx and 
  // TxOut objects, as well as the TxOutNum value.
  unlockingScript: {
    script: [
      function(ctx, {
        keyPair,
        sighashType = Sig.SIGHASH_ALL | Sig.SIGHASH_FORKID,
        flags = Tx.SCRIPT_ENABLE_SIGHASH_FORKID
      }) {
        const {tx, txOutNum, txOut} = ctx
        const sig = tx.sign(keyPair, sighashType, txOutNum, txOut.script, txOut.valueBn, flags)
        return sig.toTxFormat()
      },

      (_ctx, { keyPair }) => keyPair.pubKey.toBuffer()
    ],

    size: 107,

    // Notice that `setup` does not receive the ctx
    setup(params) {
      return { foo: 'bar' }
    },

    // But `validate` does receive the ctx, allowing us to validate the parameters
    // against the context transaction.
    validate(ctx, params) {
      if (!(params.keyPair && verifyKeyPair(params.keyPair, ctx.txOut))) {
        throw new Error('UnlockingScript requires valid keyPair')
      }
    }
  }
}
```

To learn more about how Casts work, read through the source code in the example the this repository:

* [P2MS - Pay to Multisig](https://github.com/libitx/txforge/blob/master/src/casts/p2ms.js)
* [P2PK - Pay to PubKey](https://github.com/libitx/txforge/blob/master/src/casts/p2pk.js)
* [P2PKH - Pay to PubKeyHash](https://github.com/libitx/txforge/blob/master/src/casts/p2pkh.js)
* [P2RPH - Pay to R-Puzzle Hash](https://github.com/libitx/txforge/blob/master/src/casts/p2rph.js)

## License

TxForge is open source and released under the [Apache-2 License](https://github.com/libitx/txforge/blob/master/LICENSE).

Copyright (c) 2020 libitx.
