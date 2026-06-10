const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const http = require('http');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Sandboxed browsers (Claude preview, some tunnels) can only reach the Metro
// port, so web clients talk to the Firebase emulators through same-origin URLs
// and Metro forwards by path prefix (see getAuthEmulatorUrl in src/config/firebase.ts).
const EMULATOR_PROXY_ROUTES = [
  { prefix: '/identitytoolkit.googleapis.com', port: 9099 },
  { prefix: '/securetoken.googleapis.com', port: 9099 },
  { prefix: '/emulator', port: 9099 },
  { prefix: '/google.firestore.v1.Firestore', port: 8088 },
  { prefix: '/v1/projects', port: 8088 },
];

const defaultEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  if (defaultEnhanceMiddleware) {
    metroMiddleware = defaultEnhanceMiddleware(metroMiddleware, server);
  }
  return (req, res, next) => {
    const route = EMULATOR_PROXY_ROUTES.find((r) => req.url.startsWith(r.prefix));
    if (!route) return metroMiddleware(req, res, next);

    const proxyReq = http.request(
      {
        host: '127.0.0.1',
        port: route.port,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${route.port}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Emulator proxy error (port ${route.port}): ${err.message}`);
    });
    req.pipe(proxyReq);
  };
};

// react-native-maps has no web implementation. On web, resolve the package to
// the dev shim (src/dev/fakeMaps.tsx — dark pane + lat/lng→pixel projection)
// so the REAL native map screens render in the browser for self-testing.
const path = require('path');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src', 'dev', 'fakeMaps.tsx'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
