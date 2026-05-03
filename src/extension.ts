import * as vscode from 'vscode';
import axios from 'axios';

const FLOWISE_PROJECT_ID_KEY = 'flowise.projectId';

function getStoredFlowiseProjectId(context: vscode.ExtensionContext): string | undefined {
    return context.globalState.get<string>(FLOWISE_PROJECT_ID_KEY);
}

async function setStoredFlowiseProjectId(context: vscode.ExtensionContext, flowiseId: string): Promise<void> {
    await context.globalState.update(FLOWISE_PROJECT_ID_KEY, flowiseId);
}

function getWorkspaceConfigPath(): vscode.Uri | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }

    return vscode.Uri.joinPath(folders[0].uri, '.flowise.json');
}

async function readWorkspaceFlowiseConfig(): Promise<{ flowiseId?: string; baseUrl?: string } | undefined> {
    const configPath = getWorkspaceConfigPath();
    if (!configPath) {
        return undefined;
    }

    try {
        const fileData = await vscode.workspace.fs.readFile(configPath);
        const parsed = JSON.parse(Buffer.from(fileData).toString()) as { flowiseId?: string; baseUrl?: string };
        return parsed;
    } catch {
        return undefined;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

    const updateStatusBarTooltip = (): void => {
        const storedId = getStoredFlowiseProjectId(context);
        statusBarItem.tooltip = storedId
            ? `Flowise Project ID is set: ${storedId}`
            : 'No Flowise Project ID saved yet. Click to set one.';
    };

    const insertProjectIdCommand = vscode.commands.registerCommand('flowise.insertProjectId', async () => {
        const existingId = getStoredFlowiseProjectId(context) ?? '';

        const input = await vscode.window.showInputBox({
            title: 'Insert Flowise Project ID',
            prompt: 'Paste your Flowise Project ID and press Enter.',
            value: existingId,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value.trim()) {
                    return 'Flowise Project ID cannot be empty.';
                }
                return null;
            }
        });

        if (input === undefined) {
            return;
        }

        const trimmedId = input.trim();
        await setStoredFlowiseProjectId(context, trimmedId);
        updateStatusBarTooltip();
        vscode.window.showInformationMessage('Flowise Project ID saved and will be reused.');
    });

    const clearProjectIdCommand = vscode.commands.registerCommand('flowise.clearProjectId', async () => {
        const existingId = getStoredFlowiseProjectId(context);
        if (!existingId) {
            vscode.window.showInformationMessage('No saved Flowise Project ID to clear.');
            return;
        }

        await context.globalState.update(FLOWISE_PROJECT_ID_KEY, undefined);
        updateStatusBarTooltip();
        vscode.window.showInformationMessage('Saved Flowise Project ID cleared. Falling back to .flowise.json if available.');
    });

    context.subscriptions.push(insertProjectIdCommand);
    context.subscriptions.push(clearProjectIdCommand);

    statusBarItem.command = 'flowise.insertProjectId';
    statusBarItem.text = '$(key) Insert Flowise Project ID';
    updateStatusBarTooltip();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Definition des Chat-Handlers
    const handler: vscode.ChatRequestHandler = async (request, _chatContext, stream, _token) => {
        
        // 1. Konfiguration aus Datei lesen
        const flowiseConfig = await readWorkspaceFlowiseConfig();
        const storedFlowiseId = getStoredFlowiseProjectId(context);
        const flowiseId = storedFlowiseId ?? flowiseConfig?.flowiseId;
        const baseUrl = flowiseConfig?.baseUrl ?? "http://localhost:3000";

        if (!flowiseId) {
            stream.markdown('❌ Fehler: Es ist keine Flowise Project ID gesetzt. Klicke auf "Insert Flowise Project ID" oder füge `flowiseId` in `.flowise.json` ein.');
            return;
        }

        // 2. API Call an Flowise
        stream.progress("Flowise denkt nach...");
        
        try {
            const response = await axios.post(`${baseUrl}/api/v1/prediction/${flowiseId}`, {
                question: request.prompt,
                streaming: false // Für den Anfang simpel
            });

            stream.markdown(response.data.text || "Keine Antwort erhalten.");
        } catch (error: any) {
            stream.markdown(`🔴 API Fehler: ${error.message}`);
        }

        return;
    };

    // Chat Participant registrieren
    const flowiseParticipant = vscode.chat.createChatParticipant("flowise.chat", handler);
    
    // Icon hinzufügen (optional)
    flowiseParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'flowise.png');
}

export function deactivate() {}
