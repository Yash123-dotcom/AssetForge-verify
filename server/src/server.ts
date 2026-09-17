import 'dotenv/config';
import { app } from './app.js';
import { cleanupStaleScanDirectories } from './upload/temp-storage.service.js';

export default app;

if (process.env.DEEP_SCAN_ENABLED === 'true') void cleanupStaleScanDirectories().catch(() => undefined);

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`AssetForge Verify API listening on http://localhost:${port}`));
}
