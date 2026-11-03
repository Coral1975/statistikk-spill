/* Ofuscacion LIGERA de soluciones (no es seguridad real).
   - enc/dec: XOR con una clave + base64, para que "ver codigo" no muestre soluciones por accidente.
   - h: hash FNV-1a de 'clave|valor', para comprobar respuestas sin guardar el indice correcto en claro.
   LIMITACION: todo esto corre en el navegador del alumnado; quien abra la consola de desarrollo y llame a
   TLLock.dec(...) o lea la memoria puede obtener las soluciones. Los juegos no cuentan para la nota. */
(function (root) {
  'use strict';
  const KEY = 'treningslaben.nok-2025';
  function bytesOf(s) { return new TextEncoder().encode(s); }
  function xor(arr) { const k = bytesOf(KEY), out = new Uint8Array(arr.length); for (let i = 0; i < arr.length; i++) out[i] = arr[i] ^ k[i % k.length] ^ ((i * 7) & 255); return out; }
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')); }
  function unb64(t) { const s = (typeof atob === 'function' ? atob(t) : Buffer.from(t, 'base64').toString('binary')), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function enc(str) { return b64(xor(bytesOf(str))); }
  function dec(t) { return new TextDecoder().decode(xor(unb64(t))); }
  function h(s) { let x = 0x811c9dc5; const b = bytesOf(String(s)); for (let i = 0; i < b.length; i++) { x ^= b[i]; x = Math.imul(x, 16777619) >>> 0; } return x.toString(36); }
  root.TLLock = { enc, dec, h };
  if (typeof module !== 'undefined') module.exports = root.TLLock;
})(typeof window !== 'undefined' ? window : globalThis);
