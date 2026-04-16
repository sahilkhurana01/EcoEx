import { Request, Response, NextFunction } from 'express';

const LASA_SERVER = process.env.LASA_SERVER_URL || 'http://localhost:5000';
const AGENT_TOKEN = process.env.LASA_AGENT_TOKEN || '';
const ENDPOINT_ID = process.env.LASA_ENDPOINT_ID || '';

let logBuffer: any[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// Flush logs to LASA every 5 seconds
async function flushLogs() {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0, logBuffer.length);
  
  // Determine endpoint ID from token if not set explicitly
  let endpointId = ENDPOINT_ID;
  if (!endpointId && AGENT_TOKEN) {
    try {
      const payload = JSON.parse(Buffer.from(AGENT_TOKEN.split('.')[1], 'base64').toString());
      endpointId = payload.endpointId;
    } catch {}
  }

  if (!endpointId || !AGENT_TOKEN) {
    console.warn('[LASA] Missing LASA_AGENT_TOKEN or LASA_ENDPOINT_ID — skipping');
    return;
  }

  try {
    const res = await fetch(`${LASA_SERVER}/api/ingest/${endpointId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_TOKEN}`,
      },
      body: JSON.stringify({ logs: batch }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      console.log(`[LASA] ✅ Sent ${batch.length} logs → ${data.processed} processed`);
    } else {
      console.warn(`[LASA] ⚠️ API returned ${res.status}`);
      // Put logs back if failed
      logBuffer.unshift(...batch);
    }
  } catch (err: any) {
    console.error(`[LASA] ❌ Failed to send logs: ${err.message}`);
    // Put logs back — they'll retry on next flush
    logBuffer.unshift(...batch.slice(0, 100)); // Cap to prevent memory leak
  }
}

// Start periodic flushing
if (!flushTimer) {
  flushTimer = setInterval(flushLogs, 5000);
}

/**
 * Express middleware — captures every request and queues it for LASA analysis.
 * Zero performance impact on your app (async, non-blocking).
 */
function lasaMonitor(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture when response finishes
  const originalEnd = res.end;
  res.end = function(this: any, ...args: any[]): any {
    const duration = Date.now() - startTime;

    // Extract real client IP (handles proxies/load balancers)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.headers['x-real-ip'] as string
      || req.socket?.remoteAddress
      || req.ip
      || 'unknown';

    logBuffer.push({
      ip,
      method: req.method,
      path: req.originalUrl || req.url || '/',
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'] || '',
      timestamp: new Date().toISOString(),
      rawLog: `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms from ${ip}`,
    });

    // If buffer is large, flush immediately
    if (logBuffer.length >= 20) {
      flushLogs().catch(() => {});
    }

    return originalEnd.apply(this, args as any);
  };

  next();
}

export default lasaMonitor;
