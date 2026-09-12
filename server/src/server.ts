import 'dotenv/config';
import { app } from './app.js';

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`AssetForge Verify API listening on http://localhost:${port}`));
}
