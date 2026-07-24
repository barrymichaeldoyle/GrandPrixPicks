import { createServer, getServerPort } from '@devvit/web/server';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { api } from './routes/api';
import { menu } from './routes/menu';

const app = new Hono();

app.route('/api', api);
app.route('/internal/menu', menu);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
