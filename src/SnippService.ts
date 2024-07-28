import {
  ExtensionContext,
  commands,
  window,
  languages,
  TextDocument,
  Position,
  CancellationToken,
  CompletionContext,
  CompletionItem,
  ViewColumn,
  workspace,
  env
} from "vscode";
import { ISnipp } from "./models/SnippItem";
import { SnippDataProvider } from "./providers/SnippDataProvider";
import path = require("path");

export async function AddSnipp(context: ExtensionContext, state: Partial<ISnipp>) {
  const content = await getSnippText();
  _addOrUpdateSnipp(context, state, content)
}
export async function InsertSnipp(context: ExtensionContext, snipp: ISnipp) {
  const editor = window.activeTextEditor;
  if (editor && SnippDataProvider.isSnipp(snipp)) {
    const position = editor?.selection.active;
    const replacedContentText = await ReplacePlaceholders(snipp.content, context);

    editor.edit(async (edit) => {

      edit.insert(position, replacedContentText || '');
    });
  } else if (editor && !SnippDataProvider.isSnipp(snipp)) {
    window.showErrorMessage(
      `请选择一个Snippet`
    );
  } else if (!editor) {
    window.showErrorMessage(`插入Snippet失败，请打开一个文件`);
  } else {
    window.showErrorMessage(`插入Snippet失败`);
  }
}
export async function AddSnippFromEditor(context: ExtensionContext, state: Partial<ISnipp>) {
  const content = await showInputBoxWithMultiline(context, '请输入Snippet内容', '');
  if (content) {
    _addOrUpdateSnipp(context, state, { text: content, type: "TEXT" })

  }
}

export async function EditSnipp(context: ExtensionContext, state: Partial<ISnipp>, snippIndex: number) {
  const content = await showInputBoxWithMultiline(context, '请输入Snippet内容', state.content ?? '');
  if (content) {
    _addOrUpdateSnipp(context, state, { text: content, type: state.contentType ?? "TEXT" }, snippIndex)

  }
}

export async function EditSnippTitle(context: ExtensionContext, state: Partial<ISnipp>, snippIndex: number) {
  const name = await window.showInputBox({ prompt: '键入Snippet标题', value: state.name ?? '' });
  if (name) {
    _addOrUpdateSnipp(context, { ...state, name }, undefined, snippIndex)

  }
}

async function _addOrUpdateSnipp(context: ExtensionContext, state: Partial<ISnipp>, content?: {
  text: string | undefined;
  type: string | undefined;
}, snippIndex?: number) {

  if (content !== undefined) {
    const trimmedName = content?.text?.trim().substring(0, 20) || '';
    state.name = trimmedName;
    state.content = content?.text;
    state.contentType = content?.type;
  }


  const existingSnipps = context.globalState.get("snipps", []);

  let updatedSnipps: Partial<ISnipp>[];
  if (snippIndex === undefined || snippIndex < 0) {

    updatedSnipps = [...existingSnipps, state];

  } else {

    updatedSnipps = existingSnipps.map(
      (exsnip: ISnipp, index) => {
        if (index === snippIndex) {
          return state;
        } else {
          return exsnip;
        }
      }
    );
  }



  context.globalState.update("snipps", updatedSnipps);
  const extensionContext = context;

  if (content?.type && state.name) {
    languages.registerCompletionItemProvider(content.type, {
      provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext
      ) {
        return new Promise<CompletionItem[]>((resolve, reject) => {
          ReplacePlaceholders(state.content || '', extensionContext).then(res => {
            const replacedContentText = res;
            const commandCompletion = new CompletionItem(state.name || '');
            commandCompletion.insertText = replacedContentText || '';
            resolve([commandCompletion]);
          });


        });
      }
    });
  }

  window.showInformationMessage("Snippet保存成功");

  commands.executeCommand("extension.snippetCraft.refreshEntry");
}

async function getSnippText() {
  const editor = window.activeTextEditor;

  let text = editor?.document.getText(editor.selection);
  return { text, type: editor?.document.languageId };
}




export async function SearchSnippForm(context: ExtensionContext) {
  const snipps = context?.globalState?.get("snipps", []);
  const result = await window.showQuickPick(
    snipps.map((sn: ISnipp) => ({
      label: sn.name,
      description: sn.content,
      snipp: sn
    })),
    {
      placeHolder: "Search snipps",
      matchOnDescription: true,
      matchOnDetail: true
    }
  );

  if (result && result.snipp) {
    commands.executeCommand('extension.snippetCraft.insertEntry', result.snipp);
  }
}


async function showInputBoxWithMultiline(context: ExtensionContext, placeholder: string, initialValue: string): Promise<string | undefined> {
  const panel = window.createWebviewPanel(
    'multilineInput',
    'Multiline Input',
    ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = getWebviewContent(placeholder, initialValue);

  return new Promise<string | undefined>((resolve) => {
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'submit':
            resolve(message.text);
            panel.dispose();
            return;
          case 'cancel':
            resolve(undefined);
            panel.dispose();
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  });
}

function getWebviewContent(placeholder: string, initialValue: string): string {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multiline Input</title>
      </head>
      <body>
        <textarea id="inputBox" rows="10" cols="50" placeholder="${placeholder}">${initialValue}</textarea>
        <br>
        <button onclick="submitText()">提交</button>
        <button onclick="cancel()">取消</button>
        <script>
          const vscode = acquireVsCodeApi();
          function submitText() {
            const text = document.getElementById('inputBox').value;
            vscode.postMessage({ command: 'submit', text: text });
          }
          function cancel() {
            vscode.postMessage({ command: 'cancel' });
          }
        </script>
      </body>
      </html>
    `;
}

export async function ReplacePlaceholders(text: string, context: ExtensionContext): Promise<string> {
  const editor = window.activeTextEditor;
  const clipboard = await env.clipboard.readText();
  const workspaceFolders = workspace.workspaceFolders;
  const currentDate = new Date();
  const kvObject = context.globalState.get<{ [key: string]: string }>('key-value', {});

  const replacements: { [key: string]: string } = {
    '${TM_SELECTED_TEXT}': editor?.document.getText(editor.selection) || '',
    '${TM_CURRENT_LINE}': editor?.document.lineAt(editor.selection.active.line).text || '',
    '${TM_CURRENT_WORD}': editor?.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active)) || '',
    '${TM_LINE_INDEX}': (editor?.selection.active.line ?? 0).toString(),
    '${TM_LINE_NUMBER}': ((editor?.selection.active.line ?? 0) + 1).toString(),
    '${TM_FILENAME}': editor ? path.basename(editor.document.fileName) : '',
    '${TM_FILENAME_BASE}': editor ? path.basename(editor.document.fileName, path.extname(editor.document.fileName)) : '',
    '${TM_DIRECTORY}': editor ? path.dirname(editor.document.fileName) : '',
    '${TM_FILEPATH}': editor?.document.fileName || '',
    '${RELATIVE_FILEPATH}': editor && workspaceFolders ? path.relative(workspaceFolders[0].uri.fsPath, editor.document.fileName) : '',
    '${CLIPBOARD}': clipboard,
    '${WORKSPACE_NAME}': workspaceFolders ? workspaceFolders[0].name : '',
    '${WORKSPACE_FOLDER}': workspaceFolders ? workspaceFolders[0].uri.fsPath : '',
    '${CURSOR_INDEX}': (editor?.selections.indexOf(editor.selection) ?? 0).toString(),
    '${CURSOR_NUMBER}': ((editor?.selections.indexOf(editor.selection) ?? 0) + 1).toString(),
    '${CURRENT_YEAR}': currentDate.getFullYear().toString(),
    '${CURRENT_YEAR_SHORT}': currentDate.getFullYear().toString().slice(-2),
    '${CURRENT_MONTH}': (currentDate.getMonth() + 1).toString().padStart(2, '0'),
    '${CURRENT_MONTH_NAME}': currentDate.toLocaleString('default', { month: 'long' }),
    '${CURRENT_MONTH_NAME_SHORT}': currentDate.toLocaleString('default', { month: 'short' }),
    '${CURRENT_DATE}': currentDate.getDate().toString().padStart(2, '0'),
    '${CURRENT_DAY_NAME}': currentDate.toLocaleString('default', { weekday: 'long' }),
    '${CURRENT_DAY_NAME_SHORT}': currentDate.toLocaleString('default', { weekday: 'short' }),
    '${CURRENT_HOUR}': currentDate.getHours().toString().padStart(2, '0'),
    '${CURRENT_MINUTE}': currentDate.getMinutes().toString().padStart(2, '0'),
    '${CURRENT_SECOND}': currentDate.getSeconds().toString().padStart(2, '0'),
    '${CURRENT_SECONDS_UNIX}': Math.floor(currentDate.getTime() / 1000).toString(),
    '${CURRENT_TIMEZONE_OFFSET}': formatTimezoneOffset(currentDate.getTimezoneOffset()),
    '${RANDOM}': Math.random().toString().slice(2, 8),
    '${RANDOM_HEX}': Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
    '${UUID}': generateUUID()
  };

  Object.keys(kvObject).forEach(key => {
    replacements[`$\{${key}\}`] = kvObject[key];
  });

  return text.replace(/\$\{(\w+)\}/g, (match, key) => {
    return replacements[match] || match;
  });
}

function formatTimezoneOffset(offset: number): string {
  const sign = offset > 0 ? '-' : '+';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
  const minutes = (absOffset % 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

function generateUUID(): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}