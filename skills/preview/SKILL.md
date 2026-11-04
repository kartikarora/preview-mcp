---
name: preview
description: Share and preview live web interfaces and HTML files on isolated subdomains with immutable versioning and diffing.
---

# Previews Skill

Use this skill when deploying, sharing, inspecting, prototyping, or comparing live HTML/CSS/JS mockups, interactive prototypes, or web applications.

## Prototyping & Voice Iteration Guidelines

When building or iterating on prototypes (especially from Figma designs, screenshots, or conversational voice instructions):

1. **Autonomous Live Deployment (Zero Code Dumping)**:
   - When asked to build or show a web interface, **immediately deploy** it using `create_preview`.
   - Never output hundreds of lines of raw HTML code in the chat response when you can give the user a live, clickable URL (`https://<slug>.previews.kartikarora.me`).

2. **Iterative Updates (Maintain Stable URL)**:
   - When the user asks for adjustments ("make the button blue", "add a modal", "adjust spacing on mobile"):
     - Do **NOT** call `create_preview` again.
     - Call `update_preview` with the existing project's `slug` and a brief `changelog`.
     - This publishes version 2, 3, 4, etc. on the **same URL**, allowing the user to refresh their browser or mobile device seamlessly.

3. **Figma-to-Code Fidelity**:
   - **Typography**: Include Google Fonts (e.g. Inter, Albert Sans, Plus Jakarta Sans) matching the design.
   - **Icons**: Use CDN icon libraries (e.g. Lucide Icons or Google Material Symbols).
   - **Images**: Use realistic Unsplash photos (`https://images.unsplash.com/photo-...`) with descriptive keywords. Never reference local files that 404.
   - **Logos / Shapes**: Embed inline SVGs for crisp rendering.
   - **Responsiveness**: Always include `<meta name="viewport" content="width=device-width, initial-scale=1.0">` and responsive CSS breakpoints.
   - **Interactivity**: Add vanilla JavaScript for dynamic states (modals, dropdowns, tab switching, mobile menus, form submit toasts) so the prototype feels real.

## Available MCP Tools

1. `create_preview`:
   - Deploys a new preview project (version 1) to an isolated subdomain (`<slug>.previews.kartikarora.me`).
   - Supports passing single `html` or multi-file `files: [{ path: "index.html", content: "..." }, { path: "style.css", content: "..." }]`.
   - `password` is optional. Omit or set to `null` for public access.

2. `update_preview`:
   - Deploys a new version (v2, v3, etc.) to an existing `slug` with an optional `changelog`.
   - Preserves unified diff history automatically.

3. `get_preview_diff`:
   - Fetches the unified text diff comparing two versions (e.g. `1..2`).

4. `list_previews`:
   - Lists active preview projects owned by the authenticated user.

5. `get_preview`:
   - Retrieves project details, file assets, and version metadata.

6. `set_preview_password`:
   - Sets, updates, or removes password protection on a preview.

7. `delete_preview`:
   - Permanently deletes a preview project and its storage.

## Available MCP Prompts

- `figma_prototype`: Structured prompt translating Figma designs, layout notes, and tokens into high-fidelity live prototypes.
- `voice_iterate`: Conversational prompt processing voice dictation tweaks against an active preview slug.

## Authentication & Setup

- **Desktop App Auto-Setup**: Run `npx preview-mcp setup` to auto-configure Claude Desktop, Cursor, and sign in with Google.
- **Login / Re-authenticate**: Run `npx preview-mcp login` to authenticate with your Google account.
