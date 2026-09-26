import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface RequestContext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  sessionToken: string | null;
  setCookie: (value: string) => void;
}

export type RouteResult =
  | { json: unknown; status?: number }
  | { file: string; filename: string; contentType: string }
  | { status: 204 };

type Handler = (ctx: RequestContext) => RouteResult | Promise<RouteResult>;

interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
  public: boolean;
}

export class Router {
  private routes: Route[] = [];

  constructor(private isAuthorized: (token: string | null) => boolean) {}

  on(method: string, path: string, handler: Handler, opts: { public?: boolean } = {}) {
    const keys: string[] = [];
    const pattern = path.replace(/:(\w+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, regex: new RegExp(`^${pattern}$`), keys, handler, public: !!opts.public });
    return this;
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = this.match(req.method ?? 'GET', url.pathname);
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };

    if (!match) return send(404, { error: 'Not found' });

    const sessionToken = parseCookies(req.headers.cookie).fs_session ?? null;
    if (!match.route.public && !this.isAuthorized(sessionToken)) return send(401, { error: 'Not paired' });

    try {
      const result = await match.route.handler({
        params: match.params,
        query: url.searchParams,
        body: await readJson(req),
        sessionToken,
        setCookie: (value) => res.setHeader('Set-Cookie', value),
      });
      if ('file' in result) {
        res.statusCode = 200;
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.end(result.file);
      }
      if (!('json' in result)) {
        res.statusCode = 204;
        return res.end();
      }
      send(result.status ?? 200, result.json);
    } catch (err) {
      if (err instanceof HttpError) return send(err.status, { error: err.message });
      console.error('[api]', err);
      send(500, { error: 'Internal server error' });
    }
  }

  private match(method: string, pathname: string) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(pathname);
      if (!m) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return { route, params };
    }
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [k, ...v] = part.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }),
  );
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 100_000) throw new HttpError(413, 'Payload too large');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}
