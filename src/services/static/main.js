'use strict';

const path = require('node:path');
const http2 = require('node:http2');
const cacheFile = require('./cacheFile.js');
const prepareUrl = require('../prepareUrl.js');
const resolvePaths = require('../../resolvePaths.js');
const contentType = require('./contentType.js');
const mapValues = require('../../mapValues.js');
const buildStaticUrls = require('../../buildStaticUrls.js');

const ishtml = (url) => path.extname(url) === '';

module.exports = async (options, port, staticFolder, proxy) => {
  const paths = await resolvePaths(staticFolder);
  const staticUrls = buildStaticUrls(paths, ['.html']);
  const routes = await mapValues(staticUrls, cacheFile);
  const types = contentType(paths);
  const server = http2.createSecureServer(options);
  const notFound = routes.get('404');
  server.on('stream', async (stream, headers) => {
    const url = prepareUrl(headers[':path']);
    const exists = routes.has(url);
    const buffer = exists ? routes.get(url) : notFound;
    const code = exists ? 200 : 404;
    if (ishtml(url) && exists) {
      const answer = await proxy(url, headers);
      if (!answer.success) {
        stream.respond({ ':status': 302, location: answer.path });
        return void stream.end();
      }
    }
    stream.respond({
      ':status': code,
      'content-type': types.get(url),
      'content-encoding': 'gzip',
    });
    stream.end(buffer);
  });
  server.listen(port);
};
