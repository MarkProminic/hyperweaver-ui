/**
 * Generate a random hex id that works in both secure (https) and insecure (http)
 * contexts.
 *
 * crypto.randomUUID() is only exposed in secure contexts, so it is undefined when
 * the app is served over plain http (e.g. an IP address without a cert).
 * crypto.getRandomValues() is available everywhere, so we build the id from it.
 * The result is an opaque 32-char hex string — used wherever we just need a unique
 * token (e.g. terminal session cookies), not a formatted UUID.
 *
 * @returns {string} 32-character random hex string
 */
export const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(
    ''
  );
