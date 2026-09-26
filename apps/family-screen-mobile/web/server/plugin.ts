import type { Connect, Plugin } from 'vite';
import { router } from './routes';

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url?.startsWith('/api/')) return next();
  void router.handle(req, res);
};

/** Serves the Family Screen REST API from the Vite dev and preview servers. */
export function familyScreenApi(): Plugin {
  return {
    name: 'family-screen-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
