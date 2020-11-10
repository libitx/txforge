/**
 * This module performs a simple check on the bsv.js version to ensure
 * compatiblity. If an incorrect version is detected, a helpful error is thrown
 * instead of waiting for other weird errors to surface later.
 */
import { version } from 'bsv'
if ( !(version && version.match(/^2\./)) ) {
  throw new Error(`BSV version error. TxForge requires bsv@^2. Version ${ version } detected.`)
}