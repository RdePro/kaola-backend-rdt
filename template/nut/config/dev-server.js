// eslint-disable-next-line import/no-unresolved
/* eslint-disable @typescript-eslint/no-var-requires */
const variables = require('../../../.cache/rdc.variables.js');
const mock = require('./mock');

const DEV_SERVER_HOST = process.env.HOST || '127.0.0.1';
const DEV_SERVER_PORT = process.env.PORT || 8080;

const args = process.argv.slice(2);
let proxyArgv = null;
args.forEach((arg) => {
  if (['test', 'pre', 'online'].includes(arg)) {
    proxyArgv = arg;
  }
});

const gateway = {
  test: 'http://commongw.kaola.taobao.net',
  pre: '',
  online: '',
};
const proxyTarget = gateway[proxyArgv];

if (!variables.proxy) {
  module.exports = {};
} else {
  const proxy = variables.proxy || {};
  const rules = proxy.rules || [];
  const host = proxy.host || '';

  const devServer = {
    https: true,
    host: DEV_SERVER_HOST,
    port: DEV_SERVER_PORT,
    before: (app) => {
      if (!proxyArgv) {
        mock(app);
      }
    },
  };

  if (host) {
    devServer.allowedHosts = [
      host,
    ];
  }

  if (proxyArgv) {
    devServer.proxy = rules.map((rule) => {
      const prefix = rule.prefix || '';

      let context = [];
      if (prefix instanceof Array) {
        context = prefix.filter(item => !!item);
      } else {
        context = [].concat(prefix);
      }

      return {
        context,
        target: rule.target || proxyTarget,
        changeOrigin: true,
        headers: {
          'X-Gateway-Host': host,
          'X-Dev-Host': `${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`,
        },
      };
    });
  }

  module.exports = devServer;
}
