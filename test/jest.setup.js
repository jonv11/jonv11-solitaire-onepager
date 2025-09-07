import { TextEncoder, TextDecoder } from 'node:util';

// Polyfill TextEncoder/TextDecoder for environments that lack them (e.g., jsdom)
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder;
}
