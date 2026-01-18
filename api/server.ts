import express from 'express';
import proxyHandler from './proxy';

const app = express();
const port = 3001;

// VercelRequest and VercelResponse are compatible enough with Express req/res
// for the purposes of our proxyHandler. A small adapter might be needed if we add complexity.
app.get('/api/proxy', (req, res) => {
  proxyHandler(req as any, res as any);
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
