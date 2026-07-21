import autocannon from "autocannon";
import { spawn } from "node:child_process";

const port = 3100;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: "ignore", shell: false });
async function waitForServer() { for (let attempt = 0; attempt < 40; attempt += 1) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error("Servidor não iniciou"); }
try { await waitForServer(); const result = await autocannon({ url: `http://127.0.0.1:${port}/api/health`, connections: 20, duration: 5 }); console.log(JSON.stringify({ p50: result.latency.p50, p95: result.latency.p97_5, p99: result.latency.p99, requestsPerSecond: result.requests.average, errors: result.errors })); if (result.errors || result.latency.p99 > 500) process.exitCode = 1; } finally { child.kill("SIGTERM"); }
