import express from 'express';
import cors from 'cors';
import { HttpError } from './lib.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import logRoutes from './routes/logs.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// Everything below requires a signed-in user.
app.use('/api', requireAuth);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = Number(process.env.PORT) || 4100;
app.listen(port, () => console.log(`WorkTrack API running on http://localhost:${port}`));
