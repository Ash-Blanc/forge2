# Forge MCP Server

An MCP server that interacts with Excalidraw files, the local codebase, GitHub Actions, and GitHub issues.

## Setup

1. Install dependencies:
   ```bash
   cd mcp-server
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Set your GitHub token:
   Set the `GITHUB_TOKEN` environment variable so the MCP server can authenticate with the GitHub API.

## Tools Provided

- `read_excalidraw`: Provide the path to a `.excalidraw` file to extract and read its text elements.
- `search_codebase`: Allows the AI to search the code structure recursively via grep.
- `read_file`: Fetches the precise code contents inside a particular file path.
- `list_directory`: Lists the directories and files within a given path.
- `github_dispatch_action`: Triggers a GitHub Actions workflow manually.
- `github_create_issue`: Creates a GitHub issue in a specified repository.
- `github_add_comment`: Adds a comment to an existing GitHub issue or pull request.
- `save_idea`: Saves a thought or note locally as a markdown file, supporting tags and links (similar to Obsidian).
- `get_ideas_graph`: Returns a graph representation of all saved ideas and their connections based on explicit links and shared tags.

## Using with Claude Desktop or Cursor

To run this server in your local AI assistants, add it to your configuration (e.g., in `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "forge-mcp": {
      "command": "node",
      "args": ["/Users/medow/Documents/forge/mcp-server/build/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-github-personal-access-token"
      }
    }
  }
}
```
