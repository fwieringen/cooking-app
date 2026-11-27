// Minimal static file server for local development and tests (no dependencies).
// Usage: node scripts/serve.js [port]
// Serves only what is deployed (index.html and assets/), and only on this computer.
// To test from a phone on your network, start it with HOST=0.0.0.0 (only on a network you trust).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// Same security headers as .htaccess on the real web server, so the tests run under the same rules
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

// Turns a request URL into a file to serve, or an HTTP status when it must be refused.
// Allow-list: only index.html and files inside assets/ (the same files scripts/build.sh deploys).
function resolveRequest(url, base = root) {
  let urlPath;
  try { urlPath = decodeURIComponent(String(url).split('?')[0]); } catch (e) { return { status: 400 }; }   // malformed %-encoding
  if (urlPath.includes('\0')) return { status: 400 };
  if (urlPath === '/' || urlPath === '') return { file: path.join(base, 'index.html') };
  // Normalising as a URL path first removes every "..", so the result always stays inside `base`
  const file = path.resolve(base, '.' + path.posix.normalize('/' + urlPath.replace(/\\/g, '/')));
  // Windows file names are case-insensitive (/ASSETS/ is /assets/), so compare in lower case there
  const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  const f = norm(file), index = norm(path.join(base, 'index.html')), assets = norm(path.join(base, 'assets') + path.sep);
  const ok = f === index || (f.startsWith(assets) && !/[\\/]\./.test(f.slice(assets.length - 1)));   // no hidden files in assets/
  return ok ? { file } : { status: 404 };
}

function handler(req, res) {
  const r = resolveRequest(req.url);
  if (r.status) { res.writeHead(r.status, { ...securityHeaders, 'Content-Type': 'text/plain' }); return res.end(r.status === 400 ? 'Bad request' : 'Not found'); }
  fs.readFile(r.file, (err, data) => {
    if (err) { res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { ...securityHeaders, 'Content-Type': types[path.extname(r.file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  // Listen on this computer only (IPv4 and IPv6 loopback), unless HOST is set explicitly
  const hosts = process.env.HOST ? [process.env.HOST] : ['127.0.0.1', '::1'];
  for (const host of hosts) {
    http.createServer(handler)
      .on('error', (e) => { if (host === '::1' && e.code === 'EADDRNOTAVAIL') return; throw e; })   // no IPv6 on this machine
      .listen(port, host);
  }
  console.log(`Cooking.com demo running at http://localhost:${port}`);
}

module.exports = { resolveRequest, securityHeaders };
