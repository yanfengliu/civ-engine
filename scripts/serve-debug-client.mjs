import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const entryPath = '/examples/debug-client/';
const preferredPort = Number.parseInt(process.env.PORT ?? '4173', 10);
const urlFile = path.join(process.env.TEMP ?? root, 'civ-engine-debug-client-url.txt');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
]);

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      response.writeHead(400);
      response.end('Missing request URL');
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    if (requestUrl.pathname === '/') {
      response.writeHead(302, { Location: entryPath });
      response.end();
      return;
    }

    const resolved = resolvePath(requestUrl.pathname);
    if (!resolved) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const file = await fs.readFile(resolved);
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(path.extname(resolved)) ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'GET') {
      response.end(file);
    } else {
      response.end();
    }
  } catch (error) {
    if (isNotFound(error)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(500);
    response.end(String(error));
  }
});

const port = await listenOnAvailablePort(server, preferredPort);
const url = `http://127.0.0.1:${port}${entryPath}`;
await fs.writeFile(urlFile, `${url}\n`, 'utf8');
process.stdout.write(`Debug client available at ${url}\n`);

function resolvePath(pathname) {
  let relative = decodeURIComponent(pathname);
  if (relative.endsWith('/')) {
    relative += 'index.html';
  }

  const candidate = path.resolve(root, `.${relative}`);
  if (!candidate.startsWith(root)) {
    return null;
  }
  return candidate;
}

async function listenOnAvailablePort(serverInstance, startingPort) {
  let port = startingPort;

  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => reject(error);
        serverInstance.once('error', onError);
        serverInstance.listen(port, '127.0.0.1', () => {
          serverInstance.off('error', onError);
          resolve();
        });
      });
      return port;
    } catch (error) {
      if (error?.code !== 'EADDRINUSE') {
        throw error;
      }
      port++;
    }
  }
}

function isNotFound(error) {
  return error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}
