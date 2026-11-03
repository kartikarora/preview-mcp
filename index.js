#!/usr/bin/env node

import http from 'http';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

const CONFIG_DIR = path.join(os.homedir(), '.preview');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Helper to escape HTML characters for safe template interpolation
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  let baseUrl = process.env.PREVIEWS_BASE_URL || process.env.PREVIEW_BASE_URL || '';

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!token) token = config.token || config.sessionToken || '';
      if (!baseUrl && config.baseUrl) baseUrl = config.baseUrl;
    }
  } catch (_) {}

  if (!baseUrl) {
    baseUrl = 'https://previews.kartikarora.me';
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
  // Login target defaults to production unless explicitly set via environment variable
  const targetBaseUrl = (
    process.env.PREVIEWS_BASE_URL ||
    process.env.PREVIEW_BASE_URL ||
    'https://previews.kartikarora.me'
  ).replace(/\/+$/, '');

  console.log('Initiating Google sign-in for Previews (' + targetBaseUrl + ')...');

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    if (reqUrl.pathname === '/callback') {
      const token = reqUrl.searchParams.get('token');
      const email = reqUrl.searchParams.get('email') || 'Google Account';

      if (token) {
        saveCredentials(token, email, targetBaseUrl);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Previews - Authenticated</title>

  <!-- Brand Identity CSS -->
  <link href="https://distribute.kartikarora.me/css/kartikarora.css" rel="stylesheet">

  <!-- Required Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <!-- Brand Interaction JS -->
  <script src="https://distribute.kartikarora.me/js/kartikarora.js"></script>
</head>
<body style="min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: var(--space-md); box-sizing: border-box;">
  <div class="card-glass" style="max-width: 480px; width: 100%; border-radius: var(--border-radius); padding: var(--space-2xl) var(--space-xl); text-align: center; box-shadow: 0 12px 40px var(--shadow);">
    <div style="margin-bottom: var(--space-md);">
      <span class="badge badge-win" style="display: inline-flex; align-items: center; gap: var(--space-xs); padding: 4px 12px; font-size: 0.85rem;">
        <span class="material-symbols-outlined" style="font-size: 1rem;">verified_user</span>
        Google Authentication
      </span>
    </div>

    <div style="margin-bottom: var(--space-md);">
      <span class="material-symbols-outlined" style="font-size: var(--icon-size-feature); color: var(--accent);">check_circle</span>
    </div>

    <h1 style="margin: 0 0 var(--space-sm) 0; font-size: clamp(1.6rem, 4vw, 2.2rem); letter-spacing: -0.02em;">Successfully Signed In!</h1>

    <p style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--secondary); line-height: 1.5;">
      Logged in as <strong style="color: var(--primary);">${escapeHtml(email)}</strong>.<br>
      Your MCP agents (Antigravity, Gemini, Codex, Cursor, Claude) are now connected.
    </p>

    <p class="text-muted" style="margin: 0; font-size: 0.875rem;">
      You can safely close this browser window and return to your terminal.
    </p>
  </div>
</body>
</html>`);

        console.log(`\n✓ Successfully authenticated with Google as ${email}`);
        console.log(`✓ Credentials stored in ${CONFIG_FILE}`);
        console.log('\nYou can now use Previews in Antigravity, Gemini, Codex, Cursor, Claude, or any MCP client.');

        setTimeout(() => {
          server.close(() => process.exit(0));
        }, 1000);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Previews - Authentication Failed</title>

  <!-- Brand Identity CSS -->
  <link href="https://distribute.kartikarora.me/css/kartikarora.css" rel="stylesheet">

  <!-- Required Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <!-- Brand Interaction JS -->
  <script src="https://distribute.kartikarora.me/js/kartikarora.js"></script>
</head>
<body style="min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: var(--space-md); box-sizing: border-box;">
  <div class="card-glass" style="max-width: 480px; width: 100%; border-radius: var(--border-radius); padding: var(--space-2xl) var(--space-xl); text-align: center; box-shadow: 0 12px 40px var(--shadow);">
    <div style="margin-bottom: var(--space-md);">
      <span class="badge badge-loss" style="display: inline-flex; align-items: center; gap: var(--space-xs); padding: 4px 12px; font-size: 0.85rem;">
        <span class="material-symbols-outlined" style="font-size: 1rem;">error</span>
        Authentication Failed
      </span>
    </div>

    <div style="margin-bottom: var(--space-md);">
      <span class="material-symbols-outlined" style="font-size: var(--icon-size-feature); color: var(--secondary);">cancel</span>
    </div>

    <h1 style="margin: 0 0 var(--space-sm) 0; font-size: clamp(1.6rem, 4vw, 2.2rem); letter-spacing: -0.02em;">Authentication Failed</h1>

    <p style="margin: 0 0 var(--space-md) 0; font-size: 1rem; color: var(--secondary); line-height: 1.5;">
      Missing or invalid authentication token.
    </p>

    <p class="text-muted" style="margin: 0; font-size: 0.875rem;">
      Please return to your terminal and run <code>npx preview-mcp login</code> to retry.
    </p>
  </div>
</body>
</html>`);
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
    const loginUrl = `${targetBaseUrl}/auth/login?cli_port=${port}`;

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
            'Not authenticated. Please run "npx preview-mcp login" to sign in with your Google account, or set PREVIEWS_API_TOKEN in your environment.',
        },
      };
    }

    const endpoint = `${config.baseUrl}/mcp`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`
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
