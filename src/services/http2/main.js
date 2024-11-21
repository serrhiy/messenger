'use strict';

const load = require('../load.js');
const http2 = require('node:http2');
const getCookie = require('./getCookie.js');
const routing = require('../staticRouting.js');
const prepareUrl = require('../prepareUrl.js');
const buildRoutes = require('../buildRoutes.js');

const ALLOWED_DOMAIN = '127.0.0.1';

const getBody = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : null;
};

const sandbox = {
  console,
  db: require('../db.js'),
  common: {
    ...require('../hash.js'),
    generateToken: require('../generateToken.js'),
  },
};

module.exports = async (options, port, apipath) => {
  const server = http2.createSecureServer(options);
  const table = await routing('.js')(apipath);
  const controllers = await buildRoutes(table, (file) => load(file, sandbox));
  server.on('stream', async (stream, headers) => {
    const url = prepareUrl(headers[':path']);
    const method = headers[':method'].toLowerCase();
    const { origin = '' } = headers;
    const cookies = [];
    const respondHeader = {
      'content-type': 'application/json',
      'set-cookie': cookies,
    };
    if (origin.includes(ALLOWED_DOMAIN)) {
      respondHeader['access-control-allow-origin'] = origin;
      respondHeader['access-control-allow-credentials'] = true;
    }
    if (controllers.has(url)) {
      const controller = controllers.get(url);
      const body = await getBody(stream);
      const { data, type } = JSON.parse(body.toString());
      if (type in controller) {
        const cookie = getCookie(cookies, headers.cookie);
        const answer = await controller[type](data, cookie);
        respondHeader[':status'] = 200;
        stream.respond(respondHeader);
        return void stream.end(JSON.stringify(answer));
      }
    }
    respondHeader[':status'] = 404;
    stream.respond(respondHeader);
    stream.end('Not found');
  });
  server.listen(port);
};
