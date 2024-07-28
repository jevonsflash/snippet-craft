import * as vscode from "vscode";

export interface ISnipp {
  name: string;
  content: string;
  contentType: string;
  created: Date;
  lastUsed: Date;
}

export interface IGroup {
  name: string;
  contentType: string | undefined;
}
export class SnippItem {
  constructor(
    readonly view: string,
    private context: vscode.ExtensionContext
  ) { }

  public get roots(): Thenable<IGroup[]> {
    const snipps = this.context?.globalState?.get("snipps", []);
    const types = snipps
      .map((snipp: ISnipp) => snipp.contentType)
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((type) => ({ name: type, contentType: undefined }));
    return Promise.resolve(types);
  }

  public getChildren(node: IGroup): Thenable<ISnipp[]> {
    const snipps = this.context?.globalState
      ?.get("snipps", [])
      .filter((snipp: ISnipp) => {
        return snipp.contentType === node.name;
      })
      .sort((a: ISnipp, b: ISnipp) => a.name.localeCompare(b.name));

    return Promise.resolve(snipps);
  }

  public getContent(resource: vscode.Uri): Thenable<string> {
    return Promise.resolve('');
  }
}

export class GroupItem { }
