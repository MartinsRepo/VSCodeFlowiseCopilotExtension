# Flowise-CoPilot

Flowise-CoPilot brings your Flowise chatflows into the VS Code chat experience. It lets you store a Flowise project ID once, reuse it across sessions, and send prompts from the VS Code chat UI to your Flowise instance.

## Features

- Adds a chat participant named `@flowise` for running prompts against a Flowise chatflow.
- Stores a Flowise project ID in extension state for reuse.
- Falls back to a workspace-local `.flowise.json` file for project configuration.
- Adds commands to set or clear the saved Flowise project ID.

## Requirements

- VS Code `1.116.0` or newer.
- A reachable Flowise instance.
- A valid Flowise chatflow or project ID.

## Setup

You can configure the extension in either of these ways:

1. Run the command `Insert Flowise Project ID` from the Command Palette.
2. Create a `.flowise.json` file in the workspace root.

Example `.flowise.json`:

```json
{
	"flowiseId": "your-flowise-id",
	"baseUrl": "http://localhost:3000"
}
```

If `baseUrl` is omitted, the extension uses `http://localhost:3000`.

## Usage

1. Open the VS Code chat view.
2. Address the participant with `@flowise`.
3. Enter your prompt.

The extension sends the prompt to `POST /api/v1/prediction/{flowiseId}` on your configured Flowise instance and returns the response in chat.

## Commands

- `Insert Flowise Project ID`: saves or updates the Flowise project ID.
- `Clear Flowise Project ID`: removes the saved ID from extension storage.

## Known Limitations

- Responses are currently requested in non-streaming mode.
- The extension expects the Flowise prediction endpoint to be available without additional custom authentication handling.
- If no saved project ID exists and no `.flowise.json` file is present, requests cannot be sent.

## Release Notes

### 0.0.1

Initial public release.
