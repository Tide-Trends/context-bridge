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

# Detect OS
OS="$(uname)"
case $OS in
  'Linux')
    GLOBAL_VSCODE_CONFIG="$HOME/.config/Code/User/settings.json"
    CLINE_SETTINGS="$HOME/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    ROO_SETTINGS="$HOME/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json"
    ;;
  'Darwin')
    GLOBAL_VSCODE_CONFIG="$HOME/Library/Application Support/Code/User/settings.json"
    CLINE_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    ROO_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json"
    ;;
  *) # Default to Mac paths just in case, or Windows WSL
    GLOBAL_VSCODE_CONFIG="$HOME/.vscode/settings.json"
    CLINE_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    ROO_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json"
    ;;
esac

# Configure VS Code (Global Settings for Copilot Chat)
mkdir -p "$(dirname "$GLOBAL_VSCODE_CONFIG")"
if [ -f "$GLOBAL_VSCODE_CONFIG" ]; then
  if grep -q "context-bridge" "$GLOBAL_VSCODE_CONFIG" 2>/dev/null; then
    echo "  ✅ VS Code Copilot Chat already configured"
  else
    node -e "
      const fs = require('fs');
      try {
        const cfg = JSON.parse(fs.readFileSync('$GLOBAL_VSCODE_CONFIG','utf8'));
        cfg['github.copilot.chat.mcp.enabled'] = true;
        cfg['github.copilot.chat.mcp.servers'] = cfg['github.copilot.chat.mcp.servers'] || {};
        cfg['github.copilot.chat.mcp.servers']['context-bridge'] = { 'command': 'node', 'args': ['$SERVER_PATH'] };
        fs.writeFileSync('$GLOBAL_VSCODE_CONFIG', JSON.stringify(cfg, null, 2));
      } catch (e) {
        console.error('    Error writing to VS Code config:', e.message);
      }
    "
    echo "  ✅ VS Code Copilot Chat configured"
  fi
else
  # Create a valid minimal JSON
  echo '{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "context-bridge": {
      "command": "node",
      "args": ["'"$SERVER_PATH"'"]
    }
  }
}' > "$GLOBAL_VSCODE_CONFIG"
  echo "  ✅ VS Code Copilot Chat configured"
fi

# Configure Cline
if [ -d "$(dirname "$CLINE_SETTINGS")" ]; then
  if [ -f "$CLINE_SETTINGS" ]; then
    if grep -q "context-bridge" "$CLINE_SETTINGS" 2>/dev/null; then
      echo "  ✅ VS Code Cline extension already configured"
    else
      node -e "
        const fs = require('fs');
        try {
          const cfg = JSON.parse(fs.readFileSync('$CLINE_SETTINGS','utf8'));
          cfg.mcpServers = cfg.mcpServers || {};
          cfg.mcpServers['context-bridge'] = { 'command': 'node', 'args': ['$SERVER_PATH'], 'disabled': false };
          fs.writeFileSync('$CLINE_SETTINGS', JSON.stringify(cfg, null, 2));
        } catch (e) {
           // Ignore
        }
      "
      echo "  ✅ VS Code Cline extension configured"
    fi
  else
    echo '{
  "mcpServers": {
    "context-bridge": {
      "command": "node",
      "args": ["'"$SERVER_PATH"'"],
      "disabled": false
    }
  }
}' > "$CLINE_SETTINGS"
    echo "  ✅ VS Code Cline extension configured"
  fi
fi

# Configure Roo Code
if [ -d "$(dirname "$ROO_SETTINGS")" ]; then
  if [ -f "$ROO_SETTINGS" ]; then
    if grep -q "context-bridge" "$ROO_SETTINGS" 2>/dev/null; then
      echo "  ✅ VS Code Roo extension already configured"
    else
      node -e "
        const fs = require('fs');
        try {
          const cfg = JSON.parse(fs.readFileSync('$ROO_SETTINGS','utf8'));
          cfg.mcpServers = cfg.mcpServers || {};
          cfg.mcpServers['context-bridge'] = { 'command': 'node', 'args': ['$SERVER_PATH'], 'disabled': false };
          fs.writeFileSync('$ROO_SETTINGS', JSON.stringify(cfg, null, 2));
        } catch (e) {
           // Ignore
        }
      "
      echo "  ✅ VS Code Roo extension configured"
    fi
  else
    echo '{
  "mcpServers": {
    "context-bridge": {
      "command": "node",
      "args": ["'"$SERVER_PATH"'"],
      "disabled": false
    }
  }
}' > "$ROO_SETTINGS"
    echo "  ✅ VS Code Roo extension configured"
  fi
fi

echo "🎉 Done! Context Bridge is ready."
echo ""
echo "📋 Paste the prompt from PROMPTS.md into each tool to activate."
echo "   $INSTALL_DIR/server/PROMPTS.md"
echo ""
echo "📂 OpenCode users: add this to your config:"
echo '   {"mcp":{"context-bridge":{"type":"stdio","command":"node","args":["'$SERVER_PATH'"]}}}'
echo ""
