# TxForge

![Industrial strength transaction builder](https://raw.githubusercontent.com/libitx/txforge/v2/media/txforge-poster.jpg)

[![npm](https://img.shields.io/npm/v/txforge/beta?color=informational)](https://www.npmjs.com/package/txforge)
![License](https://img.shields.io/github/license/libitx/txforge?color=informational)
![Build Status](https://img.shields.io/github/workflow/status/libitx/txforge/Node.js%20CI/v2)


TxForge is an industrial strength transaction builder. Re-built on top of [nimble](https://github.com/runonbitcoin/nimble), TxForge 2.0 is an ultra-lightweight, ultra-flexible, essential part of any respectable Bitcoin builders' toolkit.

- simple, human-friendly declarative API for composing transactions
- extendable and flexible - can forge transactions with any script template imaginable
- under the hood it's powered by nimble, less that 1/5 the size of [moneybutton/bsv v2](https://github.com/moneybutton/bsv) and up to 4 times as fast!
- a robust library using well-tested, modern javascript

## Sponsors

<p align="center">Supported by:</p>
<p align="center">
  <a href="https://coingeek.com" target="_blank" rel="noopener noreferrer">
    <img src="https://www.chronoslabs.net/img/badges/coingeek.png" width="180" alt="Coingeek">
  </a>
</p>

Your sponsorship will help us continue to release and maintain software that Bitcoin businesses and developers depend on.

#### 👉 [Sponsor Chronos Labs' open source work](https://www.chronoslabs.net/sponsor/)

## Upgrading

If you've used previous versions of TxForge, conceptually everything is the same. However, v2.0 is a rewrite from top to bottom, powered by a new Bitcoin library, and incorporates some API changes, most notably with how Casts are defined and used.

Full more details, check out the [TxForge 2 upgrade notes](https://github.com/libitx/txforge/wiki/Installing-and-upgrading-TxForge#txforge-2-upgrade-notes).

## Quick start

Install TxForge with `npm` or `yarn`:

```shell
npm install txforge@beta
# or
yarn add txforge@beta
```

Alternatively use in a browser via CDN:

```html
<script src="https://unpkg.com/@runonbitcoin/nimble"></script>
<script src="https://unpkg.com/txforge@beta/dist/txforge.min.js"></script>

<!-- or use the bundled version which includes nimble -->
<script src="https://unpkg.com/txforge@beta/dist/txforge.bundled.min.js"></script>
```

Grab your tools and put on your safety googles. Lets forge a transaction... it's hammer time!

```js
import { forgeTx, toUTXO, casts } from 'txforge'

// We'll use these Casts in our transaction
const { P2PKH, OpReturn } = casts

// You'll need UTXOs to fund a transaction. Use the `toUTXO` helper to turn
// your UTXO data into the required objects.
const utxo = toUTXO({
  txid,       // utxo transaction id
  vout,       // utxo output index
  satoshis,   // utxo amount
  script      // utxo lock script
})

// Forge a transaction
const tx = forgeTx({
  inputs: [
    P2PKH.unlock(utxo, { privkey: myPrivateKey })
  ],
  outputs: [
    P2PKH.lock(5000, { address: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq' }),
    OpReturn.lock(0, { data: ['meta', '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', txid] })
  ],
  change: { address: '1Nro9WkpaKm9axmcfPVp79dAJU1Gx7VmMZ' }
})

// And behold! Forged by the Gods and found by a King - a transaction is born.
console.log(tx.toHex())
```

And that's it. Really. One function that returns a fully built and signed transaction, ready to send off to your favourite transaction processor.

But there's more, much more. When you're ready, grab a coffee and dive into the following to discover how TxForge can be used to lock and unlock any combination of script template you can imagine.

- [Understanding Casts](https://github.com/libitx/txforge/wiki/Understanding-Casts)
- [Creating custom Casts](https://github.com/libitx/txforge/wiki/Creating-custom-Casts)
- [Building Scripts with TxForge](https://github.com/libitx/txforge/wiki/Building-scripts-with-the-Tape-API)

## License

TxForge is open source and released under the [Apache-2 License](https://github.com/libitx/txforge/blob/master/LICENSE).

Copyright (c) 2020-2022 Chronos Labs Ltd.
