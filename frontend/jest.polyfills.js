/**
 * Jest polyfills for missing browser APIs
 */

// TextEncoder/TextDecoder polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Blob polyfill
global.Blob = require('blob-polyfill').Blob;

// URL polyfill
const { URL, URLSearchParams } = require('url');
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Request/Response polyfill for fetch
const fetch = require('node-fetch');
global.fetch = fetch.default || fetch;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.Headers = fetch.Headers;