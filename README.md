# Universal Model Context Protocol (MCP) Setup for Previews

Previews provides a universal **Model Context Protocol (MCP)** server supporting:
1. **Local Stdio Transport**: Standard stdio subprocess bridge (`npx preview-mcp`) for all AI coding environments, IDEs, and CLI tools.
2. **Remote Transports**: Direct **SSE** (`/mcp/sse`) and **HTTP JSON-RPC** (`/mcp`) hosted on Cloudflare Workers edge for remote agents, cloud runtimes, and webhook integrations.

Authentication is powered entirely by your **Google Account**, reusing the existing session flow without custom token tables or passwords.

---

## 1. Quick Authentication & Re-authentication (Google Login)

Run this command from any terminal to sign in or re-authenticate:
```bash
npx preview-mcp login
```
*(Or alias `npx preview-mcp reauthenticate`)*

This opens your browser to sign in with Google. Once verified, credentials are automatically saved to `~/.preview/config.json`.

Alternatively, if you're already logged into the Previews web dashboard, click **"MCP / AI Agents"** in the top navigation bar to copy your Google session token directly.

---

## 2. Agent & IDE Configurations

All tools support the standard MCP JSON configuration format.

### Antigravity / Gemini Code Assist
Add to your project's `.gemini/settings.json` or workspace MCP configuration:
```json
{
  "mcpServers": {
    "preview": {
      "command": "npx",
      "args": ["-y", "preview-mcp"],
      "env": {
        "PREVIEWS_BASE_URL": "https://previews.kartikarora.me"
      }
    }
  }
}
```
*Or connect directly to the remote SSE endpoint without a local Node.js process:*
```json
{
  "mcpServers": {
    "preview": {
      "url": "https://previews.kartikarora.me/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_GOOGLE_SESSION_TOKEN"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json` or Settings → MCP)
```json
{
  "mcpServers": {
    "preview": {
      "command": "npx",
      "args": ["-y", "preview-mcp"],
      "env": {
        "PREVIEWS_BASE_URL": "https://previews.kartikarora.me"
      }
    }
  }
}
```

### OpenAI Codex / ChatGPT Desktop
Add to your client configuration:
```json
{
  "mcpServers": {
    "preview": {
      "command": "npx",
      "args": ["-y", "preview-mcp"],
      "env": {
        "PREVIEWS_BASE_URL": "https://previews.kartikarora.me"
      }
    }
  }
}
```

### Windsurf (`~/.codeium/windsurf/mcp_config.json`)
```json
{
  "mcpServers": {
    "preview": {
      "command": "npx",
      "args": ["-y", "preview-mcp"],
      "env": {
        "PREVIEWS_BASE_URL": "https://previews.kartikarora.me"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "preview": {
      "command": "npx",
      "args": ["-y", "preview-mcp"],
      "env": {
        "PREVIEWS_BASE_URL": "https://previews.kartikarora.me"
      }
    }
  }
}
```

### Claude Code (`.mcp.json` or CLI)
Claude Code supports both standard HTTP transport with native **Authenticate / Re-authenticate** prompts, and local stdio:

```bash
# Direct HTTP transport with OAuth discovery:
claude mcp add --transport http preview https://previews.kartikarora.me/mcp

# Or stdio CLI transport:
claude mcp add preview -- npx -y preview-mcp
```
Inside your Claude Code session, type `/mcp` and select **Authenticate** or **Re-authenticate** to sign in directly with Google in your browser.

### Zed Editor (`~/.config/zed/settings.json`)
```json
{
  "experimental.features": {
    "model_context_protocol": true
  },
  "context_servers": {
    "preview": {
      "command": {
        "path": "npx",
        "args": ["-y", "preview-mcp"]
      }
    }
  }
}
```

---

## 3. Remote Cloud Agents (Direct Network / SSE)

For automated cloud agents (Antigravity, Gemini, OpenAI Codex, LangChain, LlamaIndex, Anthropic SDK, or custom scripts), no Node.js process is required. Connect directly over HTTP:

- **SSE Endpoint**: `https://previews.kartikarora.me/mcp`
- **HTTP POST Endpoint**: `https://previews.kartikarora.me/mcp`
- **Header**:
  ```http
  Authorization: Bearer <GOOGLE_SESSION_TOKEN>
  ```
  *(Or query parameter `?token=<GOOGLE_SESSION_TOKEN>` on SSE connection)*

---

## 4. Available MCP Tools

| Tool | Description |
| :--- | :--- |
| `authenticate` | Check status or get instructions to authenticate/re-authenticate with Google. |
| `create_preview` | Deploy v1 preview. Accepts `html` or multi-file `files` array. Password optional. |
| `update_preview` | Deploy new version (v2, v3, etc.) with optional changelog. |
| `get_preview_diff` | Get plain-text unified diff between any two versions (e.g. `1..2`). |
| `list_previews` | List active preview projects owned by the authenticated Google user. |
| `get_preview` | Inspect project details, status, files, and versions. |
| `set_preview_password` | Set, update, or remove password protection. |
| `delete_preview` | Delete preview project and clean up R2 storage. |
