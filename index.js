#!/usr/bin/env node

import http from 'http';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

const CONFIG_DIR = path.join(os.homedir(), '.preview');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Helper to open browser cross-platform
function openBrowser(url) {
  const platform = process.platform;
  let cmd = 'open';
  if (platform === 'win32') {
    cmd = 'start ""';
  } else if (platform === 'linux') {
    cmd = 'xdg-open';
  }
  exec(`${cmd} "${url}"`, (err) => {
    if (err) {
      console.log(`Please open this URL in your browser:\n${url}`);
    }
  });
}

// 1. Resolve configuration from environment or ~/.preview/config.json
function resolveConfig() {
  let token = process.env.PREVIEWS_API_TOKEN || process.env.PREVIEW_API_TOKEN || '';
  let baseUrl = process.env.PREVIEWS_BASE_URL || process.env.PREVIEW_BASE_URL || 'https://previews.kartikarora.me';

  if (!token) {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        token = config.token || config.sessionToken || '';
        if (config.baseUrl) baseUrl = config.baseUrl;
      }
    } catch (_) {}
  }

  baseUrl = baseUrl.replace(/\/+$/, '');
  return { token, baseUrl };
}

// Save credentials to ~/.preview/config.json
function saveCredentials(token, email, baseUrl) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const data = {
      token,
      email,
      baseUrl,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err.message);
  }
}

// 2. Interactive Google OAuth Login Flow
async function handleLoginCommand() {
  const config = resolveConfig();
  console.log('Initiating Google sign-in for Previews...');

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    if (reqUrl.pathname === '/callback') {
      const token = reqUrl.searchParams.get('token');
      const email = reqUrl.searchParams.get('email') || 'Google Account';

      if (token) {
        saveCredentials(token, email, config.baseUrl);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Previews - Authenticated</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { text-align: center; max-width: 440px; padding: 40px; background: #1e293b; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h2 { color: #38bdf8; margin: 0 0 12px 0; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0; }
    .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 20px; font-weight: 500; font-size: 14px; margin-bottom: 16px; }
    .muted { color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Google Authentication</div>
    <h2>Successfully Signed In!</h2>
    <p>Logged in as <strong>${email}</strong>.<br>Claude Desktop and your MCP agents are now connected.</p>
    <div class="muted">You can safely close this browser window and return to your terminal.</div>
  </div>
</body>
</html>`);

        console.log(`\n✓ Successfully authenticated with Google as ${email}`);
        console.log(`✓ Credentials stored in ${CONFIG_FILE}`);
        console.log('\nYou can now use Previews in Claude Desktop, Claude Code, or any MCP client.');

        setTimeout(() => {
          server.close(() => process.exit(0));
        }, 1000);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Authentication failed: Missing token');
        server.close(() => process.exit(1));
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = address.port;
    const loginUrl = `${config.baseUrl}/auth/login?cli_port=${port}`;

    console.log(`Opening browser to sign in with Google:\n${loginUrl}\n`);
    openBrowser(loginUrl);
  });

  server.on('error', (err) => {
    console.error('Local server error:', err.message);
    process.exit(1);
  });
}

// 3. Stdio MCP Transport Bridge for Claude
function startStdioMcpBridge() {
  const config = resolveConfig();

  function sendResponse(responseObj) {
    process.stdout.write(JSON.stringify(responseObj) + '\n');
  }

  async function forwardRpcRequest(rpcMessage) {
    if (!config.token) {
      return {
        jsonrpc: '2.0',
        id: rpcMessage.id ?? null,
        error: {
          code: -32001,
          message:
            'Not authenticated. Please run "npx @preview/mcp login" to sign in with your Google account, or set PREVIEWS_API_TOKEN in your environment.',
        },
      };
    }

    const endpoint = `${config.baseUrl}/mcp`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(rpcMessage),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          jsonrpc: '2.0',
          id: rpcMessage.id ?? null,
          error: {
            code: -32000,
            message: `Remote MCP server error (${response.status}): ${errorText || response.statusText}`,
          },
        };
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: rpcMessage.id ?? null,
        error: {
          code: -32603,
          message: `Network error connecting to Previews at ${endpoint}: ${error.message || String(error)}`,
        },
      };
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let rpcMessage;
    try {
      rpcMessage = JSON.parse(trimmed);
    } catch {
      sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      });
      return;
    }

    const response = await forwardRpcRequest(rpcMessage);
    if (response !== null) {
      sendResponse(response);
    }
  });

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

// Main execution switch
if (process.argv.includes('login')) {
  handleLoginCommand();
} else {
  startStdioMcpBridge();
}
