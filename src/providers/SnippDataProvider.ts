import * as vscode from "vscode";
import { join as pathJoin } from "path";
import {EditSnipp} from "../SnippService"
import { ISnipp,IGroup, SnippItem } from "../models/SnippItem";
import { ThemeIcon } from "vscode";
/**
 * Group interface
 */

export class SnippDataProvider
  implements
    vscode.TreeDataProvider<ISnipp | IGroup>,
    vscode.TextDocumentContentProvider
{
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  constructor(
    private readonly model: SnippItem,
    private context: vscode.ExtensionContext
  ) {}

  public refresh(): any {
    this._onDidChangeTreeData.fire(null);
  }

  public static isSnipp(object: any): object is IGroup {
    return "content" in object;
  }

  public getTreeItem(element: ISnipp | IGroup): vscode.TreeItem {
    const t = element.name;
    const isSnip = SnippDataProvider.isSnipp(element);
    const snippcomm = {
      command: "extension.snippetCraft.insertEntry",
      title: '',
      arguments: [element],
    };

    let snippetInfo: string = `[${element.contentType}] ${element.name}`;

    return {
      // @ts-ignore
      label: isSnip ? element.name : element.name,
      command: isSnip ? snippcomm : undefined,
      iconPath:isSnip ? new ThemeIcon("code"):new ThemeIcon("folder"),
      tooltip: isSnip
        ? new vscode.MarkdownString(
            // @ts-ignore
            `**标题：**${snippetInfo}\n\n**修改时间：**${element.created}\n\n**最近使用：**${element.lastUsed}\n\n**预览：**\n\`\`\`${element.contentType}\n${element.content}\n\`\`\``
          )
        : undefined,
      collapsibleState: !isSnip
        ? vscode.TreeItemCollapsibleState.Collapsed
        : undefined,
    };
  }

  public getChildren(
    element?: ISnipp | IGroup
  ): ISnipp[] | Thenable<ISnipp[]> | IGroup[] | Thenable<IGroup[]> {
    return element ? this.model.getChildren(element) : this.model.roots;
  }

  public provideTextDocumentContent(
    uri: vscode.Uri,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<string> {
    return this.model.getContent(uri).then((content) => {
      return content;
    });
  }
}


