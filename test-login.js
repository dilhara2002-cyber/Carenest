// Test with raw TCP to measure exact header sizes - fixed cookie extraction
const net = require('net');

function rawRequest(host, port, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = Buffer.alloc(0);
    
    client.connect(port, host, () => {
      let request = `${method} ${path} HTTP/1.1\r\nHost: ${host}:${port}\r\n`;
      for (const [key, value] of Object.entries(headers)) {
        request += `${key}: ${value}\r\n`;
      }
      request += '\r\n';
      if (body) request += body;
      client.write(request);
    });
    
    client.on('data', (data) => {
      response = Buffer.concat([response, data]);
    });
    
    client.on('end', () => {
      resolve(response.toString());
    });
    
    client.on('error', reject);
    
    // Timeout after 20s
    setTimeout(() => {
      client.destroy();
      resolve(response.toString());
    }, 20000);
  });
}

function extractCookies(headerText) {
  const cookies = [];
  const lines = headerText.split('\r\n');
  for (const line of lines) {
    if (line.toLowerCase().startsWith('set-cookie:')) {
      const value = line.substring(line.indexOf(':') + 2).split(';')[0];
      cookies.push(value);
    }
  }
  return cookies;
}

function parseChunkedBody(body) {
  try {
    const lines = body.split('\r\n');
    let result = '';
    for (let i = 0; i < lines.length; i++) {
      const size = parseInt(lines[i], 16);
      if (isNaN(size) || size === 0) break;
      result += lines[i + 1] || '';
      i++; // skip data line
    }
    return result || body;
  } catch (e) {
    return body;
  }
}

async function test() {
  try {
    // Step 1: Get CSRF
    console.log('=== Step 1: Getting CSRF token ===');
    const csrfResponse = await rawRequest('localhost', 3000, 'GET', '/api/auth/csrf', {}, '');
    
    const csrfBodyStart = csrfResponse.indexOf('\r\n\r\n');
    const csrfHeaders = csrfResponse.substring(0, csrfBodyStart);
    const csrfBodyRaw = csrfResponse.substring(csrfBodyStart + 4);
    const csrfBody = parseChunkedBody(csrfBodyRaw);
    
    const csrfData = JSON.parse(csrfBody);
    console.log('CSRF token:', csrfData.csrfToken ? 'OK' : 'MISSING');
    
    const csrfCookies = extractCookies(csrfHeaders);
    console.log('Extracted cookies:', csrfCookies.length);
    for (const c of csrfCookies) {
      console.log('  Cookie:', c.substring(0, 80) + (c.length > 80 ? '...' : ''));
    }
    const cookieHeader = csrfCookies.join('; ');
    
    // Step 2: Login
    console.log('\n=== Step 2: Logging in ===');
    const postBody = new URLSearchParams({
      email: 'admin@carenest.com',
      password: 'password123',
      csrfToken: csrfData.csrfToken,
      callbackUrl: '/dashboard',
      json: 'true',
    }).toString();
    
    const loginResponse = await rawRequest('localhost', 3000, 'POST', '/api/auth/callback/credentials', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
      'Cookie': cookieHeader,
      'Connection': 'close',
    }, postBody);
    
    console.log('\nFull response size:', loginResponse.length, 'bytes');
    console.log('Full response size (KB):', (loginResponse.length / 1024).toFixed(2), 'KB');
    
    // Parse response
    const loginBodyStart = loginResponse.indexOf('\r\n\r\n');
    if (loginBodyStart === -1) {
      console.log('\nNo header/body separator found!');
      console.log('Raw response (first 2000 chars):', loginResponse.substring(0, 2000));
      return;
    }
    
    const loginHeaders = loginResponse.substring(0, loginBodyStart);
    const loginBody = loginResponse.substring(loginBodyStart + 4);
    
    console.log('Headers size:', loginHeaders.length, 'bytes');
    console.log('Headers size (KB):', (loginHeaders.length / 1024).toFixed(2), 'KB');
    
    // Status line
    const statusLine = loginHeaders.split('\r\n')[0];
    console.log('\nStatus:', statusLine);
    
    // Count and show Set-Cookie headers
    const setCookieLines = loginHeaders.split('\r\n').filter(l => l.toLowerCase().startsWith('set-cookie:'));
    console.log('\nSet-Cookie headers count:', setCookieLines.length);
    let totalCookieSize = 0;
    for (const line of setCookieLines) {
      const value = line.substring(line.indexOf(':') + 2);
      const name = value.split('=')[0];
      totalCookieSize += value.length;
      console.log(`  ${name}: ${value.length} bytes`);
      if (name.includes('session-token')) {
        console.log(`    Token preview: ${value.substring(0, 100)}...`);
      }
    }
    console.log('\nTotal Set-Cookie size:', totalCookieSize, 'bytes');
    console.log('Total Set-Cookie size (KB):', (totalCookieSize / 1024).toFixed(2), 'KB');
    
    // Non-cookie headers
    console.log('\nOther headers:');
    for (const h of loginHeaders.split('\r\n')) {
      if (!h.toLowerCase().startsWith('set-cookie:') && h.length > 0 && !h.startsWith('HTTP/')) {
        console.log('  ', h);
      }
    }
    
    // Body
    const bodyParsed = parseChunkedBody(loginBody);
    console.log('\nBody:', bodyParsed.substring(0, 300));
    
    if (totalCookieSize > 8000) {
      console.log('\n❌ COOKIE HEADERS TOO LARGE! Will cause ERR_RESPONSE_HEADERS_TOO_BIG in browsers.');
    } else if (setCookieLines.length === 0 && statusLine.includes('200')) {
      console.log('\n⚠️  WARNING: Login returned 200 but NO session cookie was set!');
    } else {
      console.log('\n✅ Login response looks good.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
