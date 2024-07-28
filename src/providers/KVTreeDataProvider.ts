import * as vscode from 'vscode';
import { KVItem } from '../models/KVItem';

export class KVTreeDataProvider implements vscode.TreeDataProvider<KVItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<KVItem | undefined> = new vscode.EventEmitter<KVItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<KVItem | undefined> = this._onDidChangeTreeData.event;

  constructor(private globalState: vscode.Memento) {}

  getTreeItem(element: KVItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: KVItem): Thenable<KVItem[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      const kvObject = this.globalState.get<{ [key: string]: string }>('key-value', {});
      const keys = Object.keys(kvObject);
      return Promise.resolve(keys.map(key => new KVItem(key, kvObject[key])));
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  addOrUpdateKey(key: string, value: string): void {
    const kvObject = this.globalState.get<{ [key: string]: string }>('key-value', {});
    kvObject[key] = value;
    this.globalState.update('key-value', kvObject);
    this.refresh();
  }

  deleteKey(key: string): void {
    const kvObject = this.globalState.get<{ [key: string]: string }>('key-value', {});
    delete kvObject[key];
    this.globalState.update('key-value', kvObject);
    this.refresh();
  }
}




export { KVItem };

