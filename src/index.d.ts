import { OpCode, Script, TxOut } from 'bsv';

declare interface CastTemplate {
  lockingScript?: {
    script: [number, Buffer, () => number, () => Buffer];

    /**
     * Returns the size of the script.
     * 
     * @param params Cast params
     */
    size: ((params: object) => number) | number;

    setup?<T extends object, U extends T>(params: T): U;

    /**
     * Validates the given params.
     * 
     * @param params Cast params
     */
    validate?: (params: object) => void;
  };
  unlockingScript?: {
    script: [number, Buffer, (ctx: object) => number, (ctx: object) => Buffer];

    /**
     * Returns the size of the script.
     * 
     * @param params Cast params
     */
    size: ((ctx: object, params: object) => number) | number;

    /**
     * Generats a random bsv KeyPair if not already defined
     * 
     * @param params Cast params
     */
    setup?<T extends object, U extends T>(ctx: object, params: T): U;

    /**
     * Validates the given params.
     * 
     * @param params Cast params
     */
    validate?: (ctx: object, params: object) => void;
  }
}

/**
 * Forge transaction builder class.
 */
declare class Forge {
  /**
   * Instantiates a new Forge instance.
   * 
   * The accepted params are:
   * 
   * * `inputs` - list of input objects or cast instances
   * * `outputs` - list of output objects or cast instances
   * * `changeTo` - address to send change to
   * * `changeScript` - bsv Script object to send change to
   * * `options` - set `rates` or `debug` options
   * 
   * @param params Tx parameters
   * @constructor
   */
  constructor(params?: Partial<{
    inputs: object[] | Cast[];
    outputs: object[] | Cast[];
    changeTo: string;
    changeScript: Script;
    nLockTime: number;
    options: Partial<{
      rates: {
        mine: {
          data: number;
          standard: number;
        };
        relay: {
          data: number;
          standard: number;
        }
      };
      debug: boolean;
    }>;
  }>);

  /**
   * Returns the tx change address.
   */
  get changeTo(): string;

  /**
   * Sets the given address as the change address.
   */
  set changeTo(address: string);

  /**
   * Returns the tx nLockTime.
   */
  get nLockTime(): number;

  /**
   * Sets the given nLockTime on the tx.
   * 
   * If nLockTime < 500000000 it specifies the block number after which the tx
   * can be included in a block. Otherwise it specifies UNIX timestamp after
   * which it can be included in a block.
   */
  set nLockTime(lockTime: number);

  /**
   * The sum of all inputs.
   */
  get inputSum(): number;

  /**
   * The sum of all outputs.
   */
  get outputSum(): number;

  /**
   * Adds the given input to the tx.
   * 
   * The input should be a Cast instance, otherwise the given params will be
   * used to instantiate a P2PKH Cast.
   * 
   * @param input Input Cast or P2PKH UTXO params
   */
  addInput(input: Cast[] | object[]): this;

  /**
   * Adds the given output params to the tx.
   * 
   * The params object should contain one of the following properties:
   * 
   * * `to` - Bitcoin address to create P2PKH output
   * * `script` - hex encoded output script
   * * `data` - array of chunks which will be automatically parsed into an OP_RETURN script
   * 
   * Unless the output is an OP_RETURN data output, the params must contain a
   * `satoshis` property reflecting the number of satoshis to send.
   * 
   * For advanced use, Cast instances can be given as outputs. This allows
   * sending to non-standard and custom scripts.
   * 
   * @param {Object} output Output params
   */
  addOutput(output: Partial<{
    to: string;
    script: string;
    data: string[] | number[] | OpCode[] | Buffer[];
  }>[]): this;

  /**
   * Builds the transaction on the forge instance.
   * 
   * `build()` must be called first before attempting to sign. The
   * `unlockingScripts` are generated with signatures and other dynamic push
   * data zeroed out.
   */
  build(): this;

  /**
   * Iterates over the inputs and generates the `unlockingScript` for each TxIn.
   * Must be called after `build()`.
   * 
   * The given `params` will be passed to each Cast instance. For most standard
   * transactions this is all that is needed. For non-standard transaction types
   * try calling `signTxIn(vin, params)` on individual inputs.
   * 
   * @param {Object} params unlockingScript params
   */
  sign(params: object): this;

  /**
   * Generates the `unlockingScript` for the TxIn specified by the given index.
   * 
   * The given `params` will be passed to each Cast instance. This is useful for
   * non-standard transaction types as tailored `unlockingScript` params can be
   * passed to each Cast instance.
   * 
   * @param {Number} vin Input index
   * @param {Object} params unlockingScript params
   */
  signTxIn(vin: number, params: object): this;

  /**
   * Estimates the fee of the current inputs and outputs.
   * 
   * Will use the given miner rates, assuming they are in the Minercraft rates
   * format. If not given. will use the default rates set on the Forge instance.
   * 
   * @param {Object} rates Miner Merchant API rates
   * @returns {Number}
   */
  estimateFee(rates?: object): number;
}

/**
 * Cast class
 * 
 * Casts are an abstraction over transaction input and outputs. A cast provides
 * a simple, unified way for developers to define self contained modules
 * representing `lockingScript` and `unlockingScript` templates.
 * 
 * The templates defined within a Cast are dynamic and allow complex scripts to
 * be build when given specific parameters.
 */
declare class Cast {
  /**
   * Instantiates a new Cast instance.
   * 
   * @param cast Cast template object
   * @constructor
   */
  constructor(cast?: Cast);

  script: Script;
  size: number;

  /**
   * Instantiates a `lockingScript` Cast instance.
   * 
   * The following parameters are required:
   * 
   * * `satoshis` - the amount to send in the output (also accepts `amount`)
   * 
   * Additional parameters may be required, depending on the Cast template.
   * 
   * @param cast Cast template object
   * @param params Cast parameters
   * @constructor
   */
  static lockingScript<T extends CastTemplate>(cast: T, params?: object): LockingScript<T>;

  /**
   * Instantiates an `unlockingScript` Cast instance.
   * 
   * The following parameters are required:
   * 
   * * `txid` - txid of the UTXO
   * * `script` - hex encoded script of the UTXO
   * * `satoshis` - the amount in the UTXO (also accepts `amount`)
   * * `vout` - the UTXO output index (also accepts `outputIndex` and `txOutNum`)
   * 
   * Additional parameters may be required, depending on the Cast template.
   * 
   * @param cast Cast template object
   * @param params Cast parameters
   * @constructor
   */
  static unlockingScript<T extends CastTemplate>(cast: T, params: object): UnlockingScript<T>;

  /**
   * Returns the full generated script.
   * 
   * Iterrates over the template and builds the script chunk by chunk.
   */
  getScript(ctx: unknown, params: object): Script;

  /**
   * Returns the estimated size of the script, based on the Cast template.
   */
  getSize(): number;
}

/**
 * LockingScript Cast sub-class
 */
declare class LockingScript<T extends CastTemplate> extends Cast {
  /**
   * Instantiates a new LockingScript instance.
   * 
   * @param cast Cast template object
   * @param satoshis Amount to send
   * @param params Other parameters
   * @constructor
   */
  constructor(cast: T, satoshis: number, params?: object);

  satoshis: number;
  params: object;

  /**
   * Returns the estimated size of the entire TxOut object
   */
  getSize(): number;
}

/**
 * UnlockingScript Cast sub-class
 */
declare class UnlockingScript<T extends CastTemplate> extends Cast {
  /**
   * Instantiates a new UnlockingScript instance.
   * 
   * @param cast Cast template object
   * @param txid UTXO transaction id
   * @param txOutNum UTXO output index
   * @param txOut UTXO TxOut object
   * @param nSequence nSequence number
   * @constructor
   */
  constructor(cast: T, txid: string, txOutNum: number, txOut: TxOut, nSequence: number, params?: object);

  /**
   * Returns the estimated size of the entire TxIn object
   */
  getSize(): number;

  /**
   * Returns the full generated script.
   * 
   * Adds a context object which is passed to each of the `unlockingScript`
   * template build functions.
   */
  getScript(forge: Forge, params: object): Script;
}

/**
 * OP_RETURN cast
 * 
 * OP_RETURNS are frequently used to create transaction outputs containing
 * arbitrary data.
 * 
 * The cast automatically handles your given data array containing strings,
 * hex-strings, buffers and OpCodes, and processes it into a Script.
 */
interface OP_RETURN extends CastTemplate {
  /**
   * OP_RETURN lockingScript
   * 
   * The expected parameters are:
   * 
   * * `data` - an array of data chunks (see below)
   * * `safe` - set to false for spendable OP_RETURNS (defaults true)
   * 
   * The data array can contain any of the following types of element:
   * 
   * * Strings
   * * Hex-encoded strings, eg: `0xfafbfcfd`
   * * Raw buffers or typed arrays
   * * OpCode numbers
   * 
   * Example:
   * 
   * ```
   * Cast.lockingScript(OP_RETURN, {
   *   satoshis: 0,
   *   data: [
   *     '0x48656c6c6f20776f726c64',
   *     'Hello world',
   *     Buffer.from('Hello world'),
   *     new Uint8Array([72, 101, 108, 108, 111,  32, 119, 111, 114, 108, 100]),
   *     OpCode.OP_FALSE
   *   ]
   * })
   * ```
   */
  lockingScript: CastTemplate["lockingScript"]
}

/**
 * P2MS (multisig) cast
 * 
 * Build and spend multisig transactions, using the locking and unlocking
 * scripts available in this cast.
 */
interface P2MS extends CastTemplate {
  /**
   * P2MS lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `threshold` - the number of signatures required to unlock the UTXO
   * * `pubKeys` - array of bsv PubKey objects 
   * 
   * Example:
   * 
   * ```
   * // Creates 2 of 3 multisig lockingScript
   * Cast.lockingScript(P2MS, { satoshis: 1000, threshold: 2, pubKeys: [pk1, pk2, pk3] })
   * ```
   */
  lockingScript: CastTemplate["lockingScript"];

  /**
   * P2MS unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPairs` - array of bsv KeyPair objects
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2MS, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript with 2 keyPairs (assuming vin 0)
   * forge.signTxIn(0, { keyPairs: [k1, k2] })
   * ```
   */
  unlockingScript: CastTemplate["unlockingScript"];
}

/**
 * P2PK (pay-to-pubKey) cast
 * 
 * Build and spend pay-to-pubKey transactions, using the locking and unlocking
 * scripts available in this cast.
 */
interface P2PK extends CastTemplate {
  /**
   * P2PK lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `pubKey` - the bsv PubKey object to pay to
   * 
   * Example:
   * 
   * ```
   * // Creates P2PK lockingScript
   * Cast.lockingScript(P2PK, { satoshis: 1000, pubKey })
   * ```
   */
  lockingScript: CastTemplate["lockingScript"];

  /**
   * P2PK unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPair` - bsv KeyPair object
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2PK, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript a keyPair (assuming vin 0)
   * forge.signTxIn(0, { keyPair })
   * ```
   */
  unlockingScript: CastTemplate["unlockingScript"];
}

/**
 * P2PKH (pay-to-pubKeyHash) cast
 * 
 * Build and spend pay-to-pubKeyHash transactions, using the locking and
 * unlocking scripts available in this cast.
 */
interface P2PKH extends CastTemplate {
  /**
   * P2PKH lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `address` - the bsv Address object to pay to
   * 
   * Example:
   * 
   * ```
   * // Creates P2PK lockingScript
   * Cast.lockingScript(P2PKH, { satoshis: 1000, address })
   * ```
   */
  lockingScript: CastTemplate["lockingScript"];

  /**
   * P2PKH unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `keyPair` - bsv KeyPair object
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2PKH, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript a keyPair (assuming vin 0)
   * forge.signTxIn(0, { keyPair })
   * ```
   */
  unlockingScript: CastTemplate["unlockingScript"];
}

/**
 * P2RPH (R-Puzzle) cast
 * 
 * Build and spend R-Puzzles, using the locking and unlocking scripts available
 * in this cast.
 * 
 * This cast wouldn't be possible without Dean Little revealing how R-Puzzles
 * actually work in his library, [rpuzzle](https://github.com/deanmlittle/rpuzzle).
 * Much of the code in this module is adapted from Dean's work.
 */
interface P2RPH extends CastTemplate {
  /**
   * P2RPH lockingScript
   * 
   * The expected lock parameters are:
   * 
   * * `type` - the hash algorithm to use (defaults to 'PayToRHASH160')
   * * `rBuf` - the R value in a Buffer or typed array
   * 
   * Example:
   * 
   * ```
   * // Creates R-Puzzle lockingScript
   * Cast.lockingScript(P2RPH, { satoshis: 0, rBuf })
   * ```
   */
  lockingScript: CastTemplate["lockingScript"];

  /**
   * P2RPH unlockingScript
   * 
   * The expected unlock parameters are:
   * 
   * * `kBuf` - the K value in a Buffer or typed array
   * * `keyPair` - the bsv KeyPair to sign with (will generate ephemeral key if blank)
   * 
   * Example:
   * 
   * ```
   * // Creates unlockingScript from UTXO
   * Cast.unlockingScript(P2RPH, { txid, txOutNum, txOut, nSequence })
   * 
   * // Sign the unlockingScript with kBuf and keyPair (assuming vin 0)
   * forge.signTxIn(0, { kBuf, keyPair })
   * ```
   */
  unlockingScript: CastTemplate["unlockingScript"];
}

declare module 'txforge' {
  export { Cast, Forge };
  export const version: string;
}

declare module 'txforge/casts' {
  export const OP_RETURN: OP_RETURN;
  export const P2MS: P2MS;
  export const P2PK: P2PK;
  export const P2PKH: P2PKH;
  export const P2RPH: P2RPH;
}
