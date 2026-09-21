import { createServer } from 'node:http';
import { handleCouncilRequest } from './councilRunner.mjs';

const port = Number(process.env.SPARKTANK_COUNCIL_PORT || 8787);
const allowedOrigin = process.env.SPARKTANK_ALLOWED_ORIGIN || 'http://localhost:5173';

createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (!request.url?.startsWith('/api/council')) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }
  await handleCouncilRequest(request, response);
}).listen(port, '127.0.0.1', () => {
  console.log(`SparkTank council runner listening on http://127.0.0.1:${port}/api/council`);
});
