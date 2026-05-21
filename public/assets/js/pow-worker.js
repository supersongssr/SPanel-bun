// SPanel-bun Asynchronous Web Worker POW Hashing Engine
// Computes SHA-256 nonces in the background to keep the main UI thread buttery smooth.

self.onmessage = async function (e) {
  const { salt, difficulty } = e.data;
  let nonce = 0;
  const prefix = '0'.repeat(difficulty);

  try {
    while (true) {
      const data = salt + nonce;
      const msgUint8 = new TextEncoder().encode(data);
      
      // Utilize high-speed hardware-accelerated Web SubtleCrypto inside Worker
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex.startsWith(prefix)) {
        self.postMessage({ status: 'success', nonce: nonce.toString() });
        break;
      }
      nonce++;

      // Prevent potential stack overflows by yielding control periodically if needed
      if (nonce % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  } catch (err) {
    self.postMessage({ status: 'error', error: err.message });
  }
};
