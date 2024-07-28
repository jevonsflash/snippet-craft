
import * as vscode from 'vscode';

export class KVItem extends vscode.TreeItem {
    constructor(
      public readonly key: string,
      public readonly value: string | undefined
    ) {
      super(key, vscode.TreeItemCollapsibleState.None);
      this.tooltip = `${this.key}: ${this.value}`;
      this.description = this.value;
      this.contextValue = 'kvItem';
    }
  }