import { UserId } from "../backend/user-backend";
import { FsOperation, FsOperationType, MkDirFsOperation, RmFsOperation, RenameFsOperation, CpFsOperation, UploadStartFsOperation, UploadFinishFsOperation, DescriptionFsOperation, MvFsOperation, FsOperationNameConflictMode } from "./fs-operation";
import { FsTreeNode, FsTreeNodeId } from "./fs-tree-node";

export const ROOT_NODE_ID = "__ROOT_NODE_ID__";
export enum FsObjectType {
  DIR,
  FILE,
}

export const MAX_DESCRIPTION_LENGTH = 1024;

interface FsObjectProperties {
  createdBy: UserId;
  createdTimestamp: number;
  modifiedBy?: UserId;
  modifiedTimestamp?: number;
  createdOpHash: string;
}

export type FsDirectoryProperties = FsObjectProperties;
export type FsFileProperties = FsObjectProperties & {
  byteOffset: number;
  byteLength: number;
  finished: boolean;
  contentHash?: string;
};

export enum PerformOpMode {
  VALIDATE_ONLY,
  DO_PERFORM,
}

export class FsState {
  private description?: string;
  private readonly rootNode: FsTreeNode<FsObjectType.DIR> = new FsTreeNode(ROOT_NODE_ID, null, FsObjectType.DIR, '');
  private readonly nodesHashMap = new Map<string, FsTreeNode<FsObjectType>>;

  public getDescription() {
    return this.description;
  }

  /**
   * Perform multiple operations on the file system state.
   *
   * This function simply calls [[performOp]] for each operation in the given array.
   * The result is an array of arrays of node IDs, where each inner array contains the
   * node IDs that were created or changed as a result of the corresponding operation.
   *
   * @param ops - the operations to perform
   * @param performOpMode - whether to validate the operations only or perform them
   * @returns the node IDs that were created or changed as a result of each operation
   */
  public async performOps(ops: FsOperation[], performOpMode: PerformOpMode): Promise<FsTreeNodeId[][]> {
    const opsRes = [] as FsTreeNodeId[][];
    for (const op of ops) {
      opsRes.push(await this.performOp(op, performOpMode));
    }
    return opsRes;
  }

  /**
   * Perform a single operation on the file system state.
   *
   * Note: normally you would call this function twice: once with VALIDATE_ONLY and then with DO_PERFORM.
   *
   * @param op - the operation to perform
   * @param performOpMode - whether to validate the operation only or perform it
   * @returns the IDs of the nodes that were created or changed as a result of the operation
   */
  public async performOp(op: FsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    switch (op.operationType) {
      case FsOperationType.MK_DIR:
        return this.performMkDirOp(op as MkDirFsOperation, performOpMode);
      case FsOperationType.RM:
        return this.performRmOp(op as RmFsOperation, performOpMode);
      case FsOperationType.RENAME:
        return this.performRenameOp(op as RenameFsOperation, performOpMode);
      case FsOperationType.CP:
        return this.performCpOrMvOp(op as CpFsOperation, performOpMode);
      case FsOperationType.MV:
        return this.performCpOrMvOp(op as MvFsOperation, performOpMode);
      case FsOperationType.START_UPLOAD:
        return this.performUploadStartOp(op as UploadStartFsOperation, performOpMode);
      case FsOperationType.FINISH_UPLOAD:
        return this.performUploadFinishOp(op as UploadFinishFsOperation, performOpMode);
      case FsOperationType.DESCRIPTION:
        return this.performDescriptionOp(op as DescriptionFsOperation, performOpMode);
    }
  }

  public serialize(): string {
    const nodeToPlain = (node: FsTreeNode<FsObjectType>): any => ({
      id: node.id,
      type: node.type,
      name: node.name,
      properties: node.properties ?? null,
      childNodes: node.childNodes.map(nodeToPlain)
    });

    const plain = {
      description: this.description ?? null,
      rootNode: nodeToPlain(this.rootNode)
    };
    return JSON.stringify(plain);
  }

  public static deserialize(serialized: string): FsState {
    const parsed = JSON.parse(serialized);
    const state = new FsState();
    state.description = parsed.description ?? undefined;

    const rebuild = (nodeObj: any, parentNode: FsTreeNode<FsObjectType>) => {
      if (!nodeObj || !Array.isArray(nodeObj.childNodes)) return;
      for (const childObj of nodeObj.childNodes) {
        const child = new FsTreeNode(childObj.id, parentNode, childObj.type, childObj.name, childObj.properties ?? undefined);
        // attachChildNode will set up parent's childNodes list and child's parent
        parentNode.attachChildNode(child);
        // populate hash map
        state.nodesHashMap.set(child.id, child);
        // recurse for directories
        if (child.type === FsObjectType.DIR) {
          rebuild(childObj, child);
        } else {
          // still recurse in case file nodes have childNodes in serialized input (defensive)
          rebuild(childObj, child);
        }
      }
    };
    // root in class instance already exists (ROOT_NODE_ID). Rebuild children under it.
    rebuild(parsed.rootNode, state.rootNode);
    return state;
  }

  private async performMkDirOp(op: MkDirFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    const { parentNode, lastPathComponent } = this.getParentNodeAndLastPathComponent(op.path);
    this.validateCreation(parentNode, lastPathComponent);
    const createdOpHash = await op.hashCode();
    const properties: FsDirectoryProperties = {
      createdBy: op.createdBy,
      createdTimestamp: op.timestamp!,
      createdOpHash
    };
    const newNode = new FsTreeNode(createdOpHash, parentNode, FsObjectType.DIR, lastPathComponent, properties);
    if (performOpMode === PerformOpMode.DO_PERFORM) {
      parentNode?.attachChildNode(newNode);
      this.nodesHashMap.set(properties.createdOpHash, newNode);
      return [newNode.id];
    }
    return [];
  }

  private joinPath(path1: string, path2: string): string {
    const pathComponents = path1.split('/');
    pathComponents.push(...path2.split('/'));
    return '/' + pathComponents.filter(Boolean).join('/');
  }

  private async performRmOp(op: RmFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    const changedNodeIds = [] as FsTreeNodeId[];
    const nodesToRemove = op.fileNames.map(fname => this.getNodeByPath(this.joinPath(op.basePath, fname)));
    for (let node of nodesToRemove) {
      this.validateChange(node);
      if (performOpMode === PerformOpMode.DO_PERFORM) {
        node!.detach();
        changedNodeIds.push(node!.id);
      }
    }
    return changedNodeIds;
  }

  // checks if parentNode is nodeToMove or child of nodeToMove
  private isEqualOrChildOf(parentNode: FsTreeNode<FsObjectType>, nodeToMove: FsTreeNode<FsObjectType>): boolean {
    if (parentNode == nodeToMove) {
      return true;
    }
    if (parentNode.getParentNode() == null) {
      return false;
    }
    return this.isEqualOrChildOf(parentNode.getParentNode()!, nodeToMove);
  }

  private async performRenameOp(op: RenameFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    const nodeToRename = this.getNodeByPath(op.pathSrc);
    this.validateChange(nodeToRename);
    const { parentNode, lastPathComponent } = this.getParentNodeAndLastPathComponent(op.pathDest);
    this.validateCreation(parentNode, lastPathComponent);
    if (this.isEqualOrChildOf(parentNode!, nodeToRename!)) {
      throw new MoveIntoItselfError("Can\'t move directory into itself");
    }
    if (performOpMode === PerformOpMode.DO_PERFORM) {
      nodeToRename!.name = lastPathComponent;
      nodeToRename!.properties!.modifiedBy = op.createdBy;
      nodeToRename!.properties!.modifiedTimestamp = op.timestamp!;
      nodeToRename!.detach();
      parentNode!.attachChildNode(nodeToRename as FsTreeNode<FsObjectType>);
      return [nodeToRename!.id];
    }
    return [];
  }

  private generateUniqueName(destDirNode: FsTreeNode<FsObjectType.DIR>, fileName: string): string {
    let newName = fileName;
    let counter = 1;
    const extensionIndex = fileName.lastIndexOf('.');
    const baseName = extensionIndex !== -1 ? fileName.substring(0, extensionIndex) : fileName;
    const extension = extensionIndex !== -1 ? fileName.substring(extensionIndex) : '';

    while (destDirNode.getChildNode(newName)) {
      newName = `${baseName} (${counter++})${extension}`;
    }

    return newName;
  }

  private async performCpOrMvOp(op: CpFsOperation | MvFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    if (op.mode !== "REPLACE" && op.mode !== "RENAME" && op.mode !== "FIXED") {
      throw new Error(`Invalid operation mode: ${op.mode}`);
    }
    if (op.mode === "FIXED") {
      // check that op.destFileNames have the same length as op.fileNames
      if (!op.destFileNames || op.destFileNames.length !== op.fileNames.length) {
        throw new Error('destFileNames must have the same length as fileNames');
      }
      // check that op.destFileNames have only unique names
      if (new Set(op.destFileNames).size !== op.destFileNames.length) {
        throw new Error('destFileNames must have unique names');
      }
    }
    const changedNodeIds = [] as FsTreeNodeId[];
    const sourceDirNode = this.getNodeByPath(op.pathSrc);
    if (!sourceDirNode || sourceDirNode.type !== FsObjectType.DIR) {
      throw new TargetDoesNotExistError('Source does not exist');
    }
    const destDirNode = this.getNodeByPath(op.pathDest);
    if (!destDirNode || destDirNode.type !== FsObjectType.DIR) {
      throw new TargetDoesNotExistError('Destination does not exist');
    }
    let i = 0;
    for (const fileName of op.fileNames) {
      let nodeToMove = sourceDirNode.getChildNode(fileName);
      if (!nodeToMove) {
        throw new TargetDoesNotExistError(`File or directory "${fileName}" does not exist in source path`);
      }

      // Check if the source directory is being moved into itself
      if (this.isEqualOrChildOf(destDirNode, nodeToMove)) {
        throw new MoveIntoItselfError('Cannot move or copy a directory into itself or its subdirectory');
      }

      if (op instanceof CpFsOperation) {
        nodeToMove = await nodeToMove.cloneWithNewIds(await op.hashCode());
      }
      let newName = fileName;
      const existingNode = destDirNode.getChildNode(fileName);
      if (op.mode === "REPLACE" && existingNode) {
        this.validateChange(existingNode);
        this.validateCreation(destDirNode, nodeToMove.name, op.mode);
        if (performOpMode === PerformOpMode.DO_PERFORM) {
          existingNode.detach();
        }
      } else if (op.mode === "RENAME" && existingNode) {
        newName = this.generateUniqueName(destDirNode, fileName);
      } else if (op.mode === "FIXED") {
        if (!op.destFileNames?.[i]) {
          throw new Error(`Destination file name is not provided for index ${i}`);
        }
        newName = op.destFileNames?.[i];
      }

      if (performOpMode === PerformOpMode.DO_PERFORM) {
        nodeToMove.name = newName;
        if (op instanceof MvFsOperation) {
          nodeToMove.detach();
        }
        destDirNode.attachChildNode(nodeToMove as FsTreeNode<FsObjectType>);
        this.nodesHashMap.set(nodeToMove.id, nodeToMove);
        changedNodeIds.push(nodeToMove.id);
      }
      i++;
    }
    return changedNodeIds;
  }

  private async performUploadStartOp(op: UploadStartFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    if (op.mode !== "REPLACE" && op.mode !== "RENAME") { // only REPLACE and RENAME modes are supported for upload start
      throw new Error(`Invalid operation mode: ${op.mode}`);
    }
    const { parentNode, lastPathComponent } = this.getParentNodeAndLastPathComponent(op.path);
    let fileName = lastPathComponent;
    if (!parentNode || parentNode.type !== FsObjectType.DIR) {
      throw new TargetDoesNotExistError('Destination does not exist');
    }
    const existingNode = parentNode.getChildNode(fileName);
    if (op.mode === "REPLACE" && existingNode) {
      this.validateChange(existingNode);
      this.validateCreation(parentNode, fileName, op.mode);
      if (performOpMode === PerformOpMode.DO_PERFORM) {
        existingNode.detach();
      }
    } else if (op.mode === "RENAME" && existingNode) {
      fileName = this.generateUniqueName(parentNode, fileName);
      this.validateCreation(parentNode, fileName);
    }
    const createdOpHash = await op.hashCode();
    const properties: FsFileProperties = {
      createdBy: op.createdBy,
      createdTimestamp: op.timestamp!,
      createdOpHash,
      byteOffset: op.byteOffset,
      byteLength: op.byteLength,
      finished: false
    };
    const newNode = new FsTreeNode(createdOpHash, parentNode, FsObjectType.FILE, fileName, properties);
    if (performOpMode === PerformOpMode.DO_PERFORM) {
      parentNode?.attachChildNode(newNode);
      this.nodesHashMap.set(properties.createdOpHash, newNode);
      return [newNode.id];
    }
    return [];
  }

  private async performUploadFinishOp(op: UploadFinishFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    const fileNode = this.nodesHashMap.get(op.uploadStartOperationHash);
    this.validateChange(fileNode);
    const fileProperties = fileNode!.properties as FsFileProperties;
    if (performOpMode === PerformOpMode.DO_PERFORM) {
      fileProperties.contentHash = op.fileContentHash;
      fileProperties.finished = true;
      return [fileNode!.id];
    }
    return [];
  }

  private async performDescriptionOp(op: DescriptionFsOperation, performOpMode: PerformOpMode): Promise<FsTreeNodeId[]> {
    this.validateDescription(op.description);
    if (performOpMode === PerformOpMode.DO_PERFORM) {
      this.description = op.description;
      return [this.rootNode.id];
    }
    return [];
  }

  private validateDescription(description: string) {
    if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error("Invalid description: " + description);
    }
  }

  private validateCreation(parentNode: FsTreeNode<FsObjectType.DIR> | null, name: string, fsOperationMode: FsOperationNameConflictMode = "RENAME") {
    if (parentNode == null || parentNode.type !== FsObjectType.DIR) {
      throw new ParentDirDoesNotExistError('Parent directory does not exist');
    }
    if (fsOperationMode !== "REPLACE" && parentNode.getChildNode(name) != null) {
      throw new NameAlreadyUsed('File or directory with target name already exists: ' + name);
    }
    if (!this.validateName(name)) {
      throw new InvalidObjectNameError('Invalid name: ' + name);
    }
  }

  private validateChange(node: FsTreeNode<FsObjectType> | null | undefined) {
    if (node == null) {
      throw new TargetDoesNotExistError('Target does not exist');
    }
    if (node.getParentNode() == null) {
      throw new TargetImmutableError('Target cannot be changed');
    }
  }

  private getNodeByPathComponents(pathComponents: string[]): FsTreeNode<FsObjectType> | null {
    let root: FsTreeNode<FsObjectType> | null = this.rootNode;
    if (pathComponents.length === 0) {
      return root;
    }
    for (let i = 0; i < pathComponents.length; i++) {
      root = root.getChildNode(pathComponents[i]);
      if (!root) {
        return null;
      }
    }
    return root;
  }

  public getNodeByPath(path: string): FsTreeNode<FsObjectType> | null {
    const pathComponents = path.split('/').filter(Boolean);
    return this.getNodeByPathComponents(pathComponents);
  }

  public getNodeById(id: string, root?: FsTreeNode<FsObjectType.DIR>): FsTreeNode<FsObjectType> | null {
    if (!root) {
      root = this.rootNode;
    }
    if (root.id === id) {
      return root;
    }
    for (let child of root.childNodes) {
      if (child.id === id) {
        return child;
      }
      if (child.type === FsObjectType.DIR) {
        let node = this.getNodeById(id, child);
        if (node) {
          return node;
        }
      }
    }
    return null;
  }

  public getNodeAbsolutePath(node: FsTreeNode<FsObjectType>) {
    if (node.getParentNode == null) {
      return "/";
    }
    let path = "/" + node.name;
    while (node.getParentNode() != null) {
      node = node.getParentNode()!;
      if (node.name) {
        path = "/" + node.name + path;
      }
    }
    return path;
  }

  private getParentNodeAndLastPathComponent(path: string) {
    const pathComponents = path.split('/').filter(Boolean);
    const parentPathComponents = pathComponents.slice(0, pathComponents.length - 1);
    const lastPathComponent = pathComponents[pathComponents.length - 1];
    const parentNode = this.getNodeByPathComponents(parentPathComponents);
    return { parentNode, lastPathComponent };
  }

  public validateName(name: string) {
    const MIN_LENGTH = 1;
    const MAX_LENGTH = 100;
    if (!name || name.length < MIN_LENGTH || name.length > MAX_LENGTH) {
      return false;
    }
    // TODO: rewrite
    const isValid = (function () {
      const rg1 = /^[^\\/:\*\?"<>\|]+$/; // forbidden characters \ / : * ? " < > |
      const rg2 = /^\./; // cannot start with dot (.)
      const rg3 = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
      return function isValid(fname: string) {
        return rg1.test(fname) && !rg2.test(fname) && !rg3.test(fname);
      };
    })();
    return isValid(name);
  }
}

export class FsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ParentDirDoesNotExistError extends FsError { }

export class NameAlreadyUsed extends FsError { }

export class TargetDoesNotExistError extends FsError { }

export class InvalidObjectNameError extends FsError { }

export class TargetImmutableError extends FsError { }

export class MoveIntoItselfError extends FsError { }
