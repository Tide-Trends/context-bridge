#!/bin/bash
# Context Bridge — One-command setup
# Works with: Antigravity, Cursor, VS Code (Copilot), OpenCode

set -e

INSTALL_DIR="$HOME/.context-bridge"
REPO_URL="https://github.com/Tide-Trends/context-bridge.git"

echo "🔌 Installing Context Bridge..."

# Clone or update
if [ -d "$INSTALL_DIR/server" ]; then
  echo "  Updating existing installation..."
  cd "$INSTALL_DIR/server" && git pull --quiet
else
  mkdir -p "$INSTALL_DIR"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR/server"
fi

# Install dependencies
cd "$INSTALL_DIR/server"
npm install --silent 2>/dev/null

SERVER_PATH="$INSTALL_DIR/server/src/index.js"
echo "  ✅ Server installed at: $SERVER_PATH"

# Configure Cursor
CURSOR_CONFIG="$HOME/.cursor/mcp.json"
mkdir -p "$(dirname "$CURSOR_CONFIG")"
if [ -f "$CURSOR_CONFIG" ]; then
  # Check if context-bridge already exists
  if grep -q "context-bridge" "$CURSOR_CONFIG" 2>/dev/null; then
    echo "  ✅ Cursor already configured"
  else
    # Add to existing config using node
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('$CURSOR_CONFIG','utf8'));
      cfg.mcpServers = cfg.mcpServers || {};
      cfg.mcpServers['context-bridge'] = { command: 'node', args: ['$SERVER_PATH'], env: {} };
      fs.writeFileSync('$CURSOR_CONFIG', JSON.stringify(cfg, null, 2));
    "
    echo "  ✅ Cursor configured"
  fi
else
  echo '{"mcpServers":{"context-bridge":{"command":"node","args":["'$SERVER_PATH'"],"env":{}}}}' > "$CURSOR_CONFIG"
  echo "  ✅ Cursor configured"
fi

# Configure VS Code (Instructions)
echo "  ℹ️ VS Code configuration (for Cline / Roo Code):"
echo "    Add this to your MCP settings file:"
echo "    {"
echo "      \"mcpServers\": {"
echo "        \"context-bridge\": {"
echo "          \"command\": \"node\","
echo "          \"args\": [\"$SERVER_PATH\"],"
echo "          \"disabled\": false"
echo "        }"
echo "      }"
echo "    }"
echo ""

echo "🎉 Done! Context Bridge is ready."
echo ""
echo "📋 Paste the prompt from PROMPTS.md into each tool to activate."
echo "   $INSTALL_DIR/server/PROMPTS.md"
echo ""
echo "📂 OpenCode users: add this to your config:"
echo '   {"mcp":{"context-bridge":{"type":"stdio","command":"node","args":["'$SERVER_PATH'"]}}}'
echo ""
