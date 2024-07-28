import {
  ExtensionContext,
  commands,
  workspace,
  window,
  OpenDialogOptions,
  Uri,
  languages,
  TextDocument,
  Position,
  CancellationToken,
  CompletionContext,
  CompletionItem,
} from "vscode";
import { AddSnipp, EditSnipp, InsertSnipp, SearchSnippForm,ReplacePlaceholders, EditSnippTitle } from "./SnippService";
import { KVTreeDataProvider } from "./providers/KVTreeDataProvider";
import { ISnipp, SnippItem } from "./models/SnippItem";
import { KVItem } from './models/KVItem';
import { SnippDataProvider } from "./providers/SnippDataProvider";

export function activate(context: ExtensionContext) {


  // 初始化时设置初始值
  const initialSnippets:ISnipp[] =[ 
    {
      name: "Variable Test Sample",
      content: `Selected text: \${TM_SELECTED_TEXT}
  Current line: \${TM_CURRENT_LINE}
  Current word: \${TM_CURRENT_WORD}
  Line index: \${TM_LINE_INDEX}
  Line number: \${TM_LINE_NUMBER}
  Filename: \${TM_FILENAME}
  Filename base: \${TM_FILENAME_BASE}
  Directory: \${TM_DIRECTORY}
  Filepath: \${TM_FILEPATH}
  Relative filepath: \${RELATIVE_FILEPATH}
  Clipboard: \${CLIPBOARD}
  Workspace name: \${WORKSPACE_NAME}
  Workspace folder: \${WORKSPACE_FOLDER}
  Cursor index: \${CURSOR_INDEX}
  Cursor number: \${CURSOR_NUMBER}
  Current year: \${CURRENT_YEAR}
  Current year (short): \${CURRENT_YEAR_SHORT}
  Current month: \${CURRENT_MONTH}
  Current month name: \${CURRENT_MONTH_NAME}
  Current month name (short): \${CURRENT_MONTH_NAME_SHORT}
  Current date: \${CURRENT_DATE}
  Current day name: \${CURRENT_DAY_NAME}
  Current day name (short): \${CURRENT_DAY_NAME_SHORT}
  Current hour: \${CURRENT_HOUR}
  Current minute: \${CURRENT_MINUTE}
  Current second: \${CURRENT_SECOND}
  Current seconds since Unix epoch: \${CURRENT_SECONDS_UNIX}
  Current timezone offset: \${CURRENT_TIMEZONE_OFFSET}
  Random (Base-10): \${RANDOM}
  Random (Base-16): \${RANDOM_HEX}
  UUID: \${UUID}
`,
      contentType: "TEXT",
      lastUsed:new Date(),
      created: new Date(),
    },
    {
      name: "JavaScript Brief Code Comments Sample",
      content: `// \${CURRENT_YEAR}-\${CURRENT_MONTH}-\${CURRENT_DATE} \${author}：修改`,
      contentType: "javascript",
      lastUsed:new Date(),
      created: new Date(),
    },
    {
      name: "JavaScript File Header Description Sample",
      content: `<!--
 * @Author: \${author}
 * @Date: \${CURRENT_YEAR}-\${CURRENT_MONTH}-\${CURRENT_DATE} \${CURRENT_HOUR}:\${CURRENT_MINUTE}:\${CURRENT_SECOND}
 * @LastEditTime: \${CURRENT_YEAR}-\${CURRENT_MONTH}-\${CURRENT_DATE} \${CURRENT_HOUR}:\${CURRENT_MINUTE}:\${CURRENT_SECOND}
 * @LastEditors: \${author}
 * @Description: 程序描述
 * @FileName: \${TM_FILENAME}
 * @Company:  \${company}
-->`,
      contentType: "html",
      lastUsed:new Date(),
      created: new Date(),
    },
    
  ];
  const snippetsObject = context.globalState.get<{ [key: string]: any }>('snipps');
  if (!snippetsObject||snippetsObject.length===0) {
    context.globalState.update("snipps", initialSnippets);
  }

  const snippModel = new SnippItem("recent", context);

  const snippDataProvider = new SnippDataProvider(snippModel, context);


  var snippViewer = window.createTreeView("view.snippetCraft.snippsView", {
    treeDataProvider: snippDataProvider,
  });

  commands.registerCommand("extension.snippetCraft.refreshEntry", () => {
    snippDataProvider.refresh();
  });

  commands.registerCommand("extension.snippetCraft.addEntry", () => {
  });

  commands.registerCommand(
    "extension.snippetCraft.deleteEntry",
    (snippToDelete: ISnipp) => {
      if (!snippToDelete.content) {
        window.showErrorMessage(`无法删除分组`);
        return;
      }
      const existingSnipps = context.globalState.get("snipps", []);

      const updatedSnipps = existingSnipps.filter((snipp: ISnipp) => {
        return JSON.stringify(snipp) !== JSON.stringify(snippToDelete);
      });

      context.globalState.update("snipps", updatedSnipps);

      window.showInformationMessage(`已删除Snippet`);
      snippDataProvider.refresh();
    }
  );

  commands.registerCommand("extension.snippetCraft.insertEntry", async (snipp: ISnipp) => {
    await InsertSnipp(context, snipp);

  });

  commands.registerCommand("extension.snippetCraft.editEntry", (snipp: ISnipp) => {
    if (!snipp.content) {
      window.showErrorMessage(`无法编辑分组`);
      return;
    }

    let existingSnipps = context.globalState.get("snipps", []);
    const snipIndex = existingSnipps.findIndex(
      (snipp1: ISnipp) => JSON.stringify(snipp1) === JSON.stringify(snipp)
    );


    EditSnipp(context, { ...snipp, created: new Date() }, snipIndex);


    const updatedSnipps = existingSnipps.map(
      (exsnip: ISnipp, index) => {
        if (index === snipIndex) {
          return snipp;
        } else {
          return exsnip;
        }
      }
    );
    context.globalState.update("snipps", updatedSnipps);

    snippDataProvider.refresh();

    window.showInformationMessage(`已更新Snippet`);

  });

  commands.registerCommand("extension.snippetCraft.editTitle", (snipp: ISnipp) => {
    if (!snipp.content) {
      window.showErrorMessage(`无法编辑分组`);
      return;
    }

    let existingSnipps = context.globalState.get("snipps", []);
    const snipIndex = existingSnipps.findIndex(
      (snipp1: ISnipp) => JSON.stringify(snipp1) === JSON.stringify(snipp)
    );


    EditSnippTitle(context, { ...snipp, created: new Date() }, snipIndex);


    const updatedSnipps = existingSnipps.map(
      (exsnip: ISnipp, index) => {
        if (index === snipIndex) {
          return snipp;
        } else {
          return exsnip;
        }
      }
    );
    context.globalState.update("snipps", updatedSnipps);

    snippDataProvider.refresh();

    window.showInformationMessage(`已更新Snippet`);

  });


  const snipps = context?.globalState?.get("snipps", []);
  const contentTypes = snipps.map((snipp: ISnipp) => snipp.contentType);
  const extensionContext=context;
  const providers = contentTypes
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(type =>
      languages.registerCompletionItemProvider(type, {
        provideCompletionItems(
          document: TextDocument,
          position: Position,
          token: CancellationToken,
          context: CompletionContext
        ) {
          return new Promise<CompletionItem[]>((resolve, reject) => {

          var result= snipps
            .filter((snipp: ISnipp) => {
              return snipp.contentType === type;
            })
            .map(async (snipp: ISnipp) => {
              const replacedContentText = await ReplacePlaceholders(snipp.content, extensionContext);

              const commandCompletion = new CompletionItem(snipp.name);
              commandCompletion.insertText = replacedContentText || '';
              return commandCompletion;
            });

            Promise.all(result).then(resolve);
          });
        }
      })
    );

  context.subscriptions.push(...providers);

  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.createSnipp", async () => {
      await AddSnipp(context, { created: new Date() });
    })
  );


  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.searchSnipps", async () => {
      SearchSnippForm(context);
    })
  );


  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.insertSnipps", async () => {
      SearchSnippForm(context);
    })
  );


  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.exportSnipps", async () => {
      workspace
        .openTextDocument(Uri.parse("snippet-export:snippets.json"))
        .then((doc) => {
          window.showTextDocument(doc, {
            preview: false,
          });
        });
    })
  );



  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.deleteAllSnippets", async () => {
      window
        .showInformationMessage(
          "确定删除全部的 snippet 吗？",
          "是",
          "取消"
        )
        .then((answer) => {
          if (answer === "是") {
            // Run function
            context.globalState.update("snipps", []);
            commands.executeCommand("extension.snippetCraft.refreshEntry");
            window.showInformationMessage(`已清空所有的
              snippet`);
          }
        });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("extension.snippetCraft.importSnipps", async () => {
      const options: OpenDialogOptions = {
        canSelectMany: false,
        canSelectFiles: true,
        canSelectFolders: false,
        openLabel: "Choose file",
      };

      window.showOpenDialog(options).then((fileUri) => {
        if (fileUri && fileUri[0]) {
          workspace.openTextDocument(fileUri[0].fsPath).then((doc) => {
            try {
              const validSnippets: ISnipp[] = [];
              const snippetsToImportRaw = JSON.parse(doc.getText());

              snippetsToImportRaw.forEach((snipp: ISnipp) => {
                let valid = true;

                if (!snipp.content) {
                  valid = false;
                  console.log("no content");
                }

                if (!snipp.created) {
                  valid = false;
                  console.log("no ccreated");
                }
                

                if (!snipp.contentType) {
                  valid = false;
                  console.log("no tags");
                }

                if (valid) {
                  validSnippets.push(snipp);
                } else {
                  throw new Error("Snippet is invalid");
                }
              });

              const existingSnipps = context.globalState.get("snipps", []);

              const updatedSnipps = [...existingSnipps, ...validSnippets];

              context.globalState.update("snipps", updatedSnipps);
              commands.executeCommand("extension.snippetCraft.refreshEntry");
              window.showInformationMessage(`Snippets导入成功`);
            } catch (error) {
              window.showErrorMessage(
                `导入失败`
              );
            }
          });
        }
      });
    })
  );

  // 初始化时设置初始值
  const initialKV = {
    "author": "林晓lx",
    "company": "my-company",
    "email": "jevonsflash@qq.com"
  };
  const kvObject = context.globalState.get<{ [key: string]: string }>('key-value');
  if (!kvObject) {
    context.globalState.update('key-value', initialKV);
  }
  const kvProvider = new KVTreeDataProvider(context.globalState);

  var dictionaryViewer = window.createTreeView("view.snippetCraft.dictionaryView", {
    treeDataProvider: kvProvider,
  });


  context.subscriptions.push(
    commands.registerCommand('extension.snippetCraft.addKv', async () => {
      const key = await window.showInputBox({ prompt: '键入 key' });
      if (key) {
        const value = await window.showInputBox({ prompt: '键入 value' });
        if (value) {
          kvProvider.addOrUpdateKey(key, value);
        }
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.snippetCraft.editKv', async (item: KVItem) => {
      const value = await window.showInputBox({ prompt: '键入 value', value: item.value });
      if (value) {
        kvProvider.addOrUpdateKey(item.key, value);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.snippetCraft.deleteKv', (item: KVItem) => {
      kvProvider.deleteKey(item.key);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.snippetCraft.refreshKv', () => {
      kvProvider.refresh();
    })
  );
}

export function deactivate() { }
