/**
 * Searches the given parameters and returns the first value found from the
 * array of keys. Optionally a default value can be set in case none of the keys
 * exist.
 * 
 * @param {object} params Parameters object
 * @param {string[]} keys List of keys
 * @param {any} defaultVal Default value
 */
export function getOpt(params = {}, keys = [], defaultVal) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i], val = params[key]
    if (typeof val !== 'undefined') return val;
  }

  return defaultVal
}