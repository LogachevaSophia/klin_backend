import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import processRouter from './routes/process';

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/v1/process', processRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ detail: 'Internal server error' });
});

export default app;
