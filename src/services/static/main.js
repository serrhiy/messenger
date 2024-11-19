'use strict';

const http2 = require('node:http2');
const cacheFile = require('./cacheFile.js');
const prepareUrl = require('../prepareUrl.js');
const routing = require('../staticRouting.js');
const contentType = require('./contentType.js');
const buildRoutes = require('../buildRoutes.js');

module.exports = async (options, port, staticFolder, proxy) => {
  const table = await routing('.html')(staticFolder);
  const routes = await buildRoutes(table, cacheFile);
  const types = contentType(table);
  const server = http2.createSecureServer(options);
  const notFound = routes.get('404.html');
  server.on('stream', async (stream, headers) => {
    const url = prepareUrl(headers[':path']);
    if (!url.includes('.')) {
      const answer = await proxy(url, headers);
      if (!answer.success) {
        stream.respond({ ':status': 302, 'location': answer.path });
        return void stream.end();
      }
    }
    const exists = routes.has(url);
    const buffer = exists ? routes.get(url) : notFound;
    const code = exists ? 200 : 404;
    stream.respond({
      ':status': code,
      'content-type': types.get(url),
      'content-encoding': 'gzip',
    });
    stream.end(buffer);
  });
  server.listen(port);
};
