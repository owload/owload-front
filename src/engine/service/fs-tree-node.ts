import { uint8ArrayToBase64 } from "../core/stream-utils";
import { FsObjectType, FsDirectoryProperties, FsFileProperties } from "./fs-state";

export type FsTreeNodeId = string;

export class FsTreeNode<T extends FsObjectType> {
  public id: FsTreeNodeId;
  private parentNode: FsTreeNode<FsObjectType> | null;
  public readonly type: FsObjectType;
  public name: string;
  public readonly childNodes: FsTreeNode<FsObjectType>[] = [];
  public readonly properties: T extends FsObjectType.DIR ? FsDirectoryProperties : FsFileProperties;

  constructor(
    id: string,
    parentNode: FsTreeNode<FsObjectType> | null,
    type: FsObjectType,
    name: string,
    properties?: FsDirectoryProperties | FsFileProperties) {
    this.id = id;
    this.parentNode = parentNode;
    this.type = type;
    this.name = name;
    this.properties = properties as T extends FsObjectType.DIR ? FsDirectoryProperties : FsFileProperties;

  }

  public getChildNode(name: string): FsTreeNode<FsObjectType> | null {
    return this.childNodes.find((e) => e.name === name) ?? null;
  }

  public attachChildNode(node: FsTreeNode<FsObjectType>): void {
    node.parentNode = this;
    this.childNodes.push(node);
  }

  public detach() {
    const i = this.parentNode?.childNodes.findIndex((e) => e.name === this.name);
    if (this.parentNode == null) {
      throw new Error("Parent node is null. Can't detach child node");
    }
    this.parentNode.childNodes.splice(i ?? 0, 1);
    this.parentNode = null;
  }

  public clone(): FsTreeNode<FsObjectType> {
    const copyNode = new FsTreeNode(this.id, this.parentNode, this.type, this.name, this.cloneProperties());
    for (const child of this.childNodes) {
      copyNode.attachChildNode(child.clone());
    }
    return copyNode;
  }

  public async cloneWithNewIds(modifyingOpId: FsTreeNodeId): Promise<FsTreeNode<FsObjectType>> {
    const newId = await this.genereateNewId(this.id, modifyingOpId);
    const copyNode = new FsTreeNode(newId, this.parentNode, this.type, this.name, this.cloneProperties());
    for (const child of this.childNodes) {
      copyNode.attachChildNode(await child.cloneWithNewIds(modifyingOpId));
    }
    return copyNode;
  }

  private async genereateNewId(opId: FsTreeNodeId, modifyingOpId: FsTreeNodeId): Promise<string> {
    const hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${opId}-${modifyingOpId}`));
    return uint8ArrayToBase64(new Uint8Array(hashBytes));
  }

  private cloneProperties() {
    return JSON.parse(JSON.stringify(this.properties));
  }

  public getParentNode() {
    return this.parentNode;
  }
}
