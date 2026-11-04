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

// 2. Interactive Google OAuth Login / Re-authentication Flow
function promptLogin(targetBaseUrl) {
  return new Promise((resolve, reject) => {
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

          setTimeout(() => {
            server.close(() => resolve({ token, email }));
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
          server.close(() => reject(new Error('Missing or invalid authentication token')));
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
      reject(err);
    });
  });
}

async function handleLoginCommand() {
  const targetBaseUrl = (
    process.env.PREVIEWS_BASE_URL ||
    process.env.PREVIEW_BASE_URL ||
    'https://previews.kartikarora.me'
  ).replace(/\/+$/, '');

  try {
    await promptLogin(targetBaseUrl);
    process.exit(0);
  } catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  }
}

// 3. Zero-Friction Desktop App Auto-Configuration
function getKnownAppConfigs() {
  const home = os.homedir();
  const platform = process.platform;
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';

  const configs = [];

  // 1. Claude Desktop
  let claudeDir;
  if (isMac) {
    claudeDir = path.join(home, 'Library', 'Application Support', 'Claude');
  } else if (isWin) {
    claudeDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Claude');
  } else {
    claudeDir = path.join(home, '.config', 'Claude');
  }
  const claudePath = path.join(claudeDir, 'claude_desktop_config.json');

  configs.push({
    id: 'claude',
    name: 'Claude Desktop',
    dir: claudeDir,
    path: claudePath,
    isInstalled: fs.existsSync(claudeDir),
    defaultEnable: true,
  });

  // 2. Cursor (Global User Settings)
  let cursorDir;
  if (isMac) {
    cursorDir = path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'cursor.mcp');
  } else if (isWin) {
    cursorDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Cursor', 'User', 'globalStorage', 'cursor.mcp');
  } else {
    cursorDir = path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'cursor.mcp');
  }
  const cursorGlobalPath = path.join(cursorDir, 'mcp.json');

  configs.push({
    id: 'cursor',
    name: 'Cursor (Global)',
    dir: cursorDir,
    path: cursorGlobalPath,
    isInstalled: fs.existsSync(cursorDir),
    defaultEnable: false,
  });

  // 3. Windsurf
  const windsurfDir = path.join(home, '.codeium', 'windsurf');
  const windsurfPath = path.join(windsurfDir, 'mcp_config.json');

  configs.push({
    id: 'windsurf',
    name: 'Windsurf',
    dir: windsurfDir,
    path: windsurfPath,
    isInstalled: fs.existsSync(windsurfDir),
    defaultEnable: false,
  });

  return configs;
}

function updateMcpConfigFile(filePath, targetBaseUrl) {
  let json = {};
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    try {
      json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      const backupPath = `${filePath}.bak-${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.warn(`⚠️ Warning: Existing config at ${filePath} was invalid JSON. Backed up to ${backupPath}`);
      json = {};
    }
  }

  if (!json.mcpServers || typeof json.mcpServers !== 'object') {
    json.mcpServers = {};
  }

  json.mcpServers.preview = {
    command: 'npx',
    args: ['-y', 'preview-mcp'],
    env: {
      PREVIEWS_BASE_URL: targetBaseUrl,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

async function handleSetupCommand() {
  const targetBaseUrl = (
    process.env.PREVIEWS_BASE_URL ||
    process.env.PREVIEW_BASE_URL ||
    'https://previews.kartikarora.me'
  ).replace(/\/+$/, '');

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Previews MCP Desktop Setup

Usage:
  npx preview-mcp setup [app] [options]

Supported Apps:
  claude      Configure Claude Desktop (default)
  cursor      Configure Cursor (Global MCP)
  windsurf    Configure Windsurf
  all         Configure all detected desktop apps

Options:
  --login     Force browser Google sign-in even if already authenticated
  --help, -h  Show this help message
`);
    process.exit(0);
  }

  console.log('\n======================================================');
  console.log('  🚀 Previews MCP Zero-Friction Desktop Setup');
  console.log('======================================================\n');

  const apps = getKnownAppConfigs();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const requestedApp = args.find((a) => ['claude', 'cursor', 'windsurf', 'all'].includes(a.toLowerCase()));

  let configuredCount = 0;

  for (const app of apps) {
    const shouldConfigure =
      requestedApp === 'all' ||
      (requestedApp && requestedApp.toLowerCase() === app.id) ||
      (!requestedApp && (app.isInstalled || app.defaultEnable));

    if (shouldConfigure) {
      try {
        updateMcpConfigFile(app.path, targetBaseUrl);
        console.log(`✓ Configured ${app.name}`);
        console.log(`  Path: ${app.path}\n`);
        configuredCount++;
      } catch (err) {
        console.error(`✗ Failed to configure ${app.name} (${app.path}):`, err.message);
      }
    }
  }

  if (configuredCount === 0) {
    const claudeApp = apps.find((a) => a.id === 'claude');
    if (claudeApp) {
      updateMcpConfigFile(claudeApp.path, targetBaseUrl);
      console.log(`✓ Configured ${claudeApp.name}`);
      console.log(`  Path: ${claudeApp.path}\n`);
      configuredCount++;
    }
  }

  // Check authentication
  const existingConfig = resolveConfig();
  let userEmail = '';
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      userEmail = saved.email || '';
    }
  } catch (_) {}

  const forceLogin = process.argv.includes('--login') || process.argv.includes('--auth');

  if (existingConfig.token && !forceLogin) {
    console.log(`✓ Authenticated with Google${userEmail ? ` as ${userEmail}` : ''}`);
    console.log(`  Credentials found in ~/.preview/config.json\n`);
  } else {
    console.log('Authenticating with your Google Account for Previews...');
    try {
      const loginResult = await promptLogin(targetBaseUrl);
      userEmail = loginResult.email;
    } catch (err) {
      console.error('\nAuthentication failed:', err.message);
      console.log('You can sign in later by running: npx preview-mcp login\n');
    }
  }

  console.log('======================================================');
  console.log('  🎉 Previews is ready for frictionless prototyping!');
  console.log('======================================================');
  console.log('\nNext steps:');
  console.log('1. Restart your desktop app (e.g. Cmd+Q Claude Desktop).');
  console.log('2. In your desktop app chat:');
  console.log('   "Create an interactive prototype of a SaaS landing page"');
  console.log('   or use voice dictation alongside your Figma designs.');
  console.log('3. Previews will automatically deploy and return your live preview link!\n');

  process.exit(0);
}

// 4. Stdio MCP Transport Bridge for Claude
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
            'Not authenticated. Please run "npx preview-mcp login" or "npx preview-mcp reauthenticate" to sign in with your Google account, or set PREVIEWS_API_TOKEN in your environment.',
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
const isVersionCommand =
  process.argv.includes('--version') ||
  process.argv.includes('-v') ||
  process.argv.includes('version');

if (isVersionCommand) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    );
    console.log(`preview-mcp v${pkg.version}`);
  } catch {
    console.log('preview-mcp (version unknown)');
  }
  process.exit(0);
}

const isSetupCommand =
  process.argv.includes('setup') ||
  process.argv.includes('install') ||
  process.argv.includes('configure') ||
  process.argv.includes('init');

const isAuthCommand =
  process.argv.includes('login') ||
  process.argv.includes('authenticate') ||
  process.argv.includes('reauthenticate') ||
  process.argv.includes('auth');

if (isSetupCommand) {
  handleSetupCommand();
} else if (isAuthCommand) {
  handleLoginCommand();
} else {
  startStdioMcpBridge();
}
