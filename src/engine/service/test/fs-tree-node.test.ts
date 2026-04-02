import { FsTreeNode } from "../fs-tree-node";
import { FsObjectType, FsDirectoryProperties, FsFileProperties } from "../fs-state";
import { describe, beforeEach, it, expect } from "vitest";

describe("FsTreeNode", () => {
  let rootNode: FsTreeNode<FsObjectType.DIR>;
  let childNode: FsTreeNode<FsObjectType.FILE>;

  beforeEach(() => {
    const rootProperties: FsDirectoryProperties = {
      createdBy: "user1",
      createdTimestamp: Date.now(),
      createdOpHash: "rootHash",
    };
    rootNode = new FsTreeNode("root", null, FsObjectType.DIR, "root", rootProperties);

    const fileProperties: FsFileProperties = {
      createdBy: "user2",
      createdTimestamp: Date.now(),
      createdOpHash: "fileHash",
      byteOffset: 0,
      byteLength: 100,
      finished: true,
    };
    childNode = new FsTreeNode("file1", rootNode, FsObjectType.FILE, "file1.txt", fileProperties);
  });

  it("should attach a child node", () => {
    rootNode.attachChildNode(childNode);
    expect(rootNode.childNodes).toContain(childNode);
    expect(childNode.getParentNode()).toBe(rootNode);
  });

  it("should detach a child node", () => {
    rootNode.attachChildNode(childNode);
    childNode.detach();
    expect(rootNode.childNodes).not.toContain(childNode);
    expect(childNode.getParentNode()).toBeNull();
  });

  it("should find a child node by name", () => {
    rootNode.attachChildNode(childNode);
    const foundNode = rootNode.getChildNode("file1.txt");
    expect(foundNode).toBe(childNode);
  });

  it("should return null if child node is not found", () => {
    const foundNode = rootNode.getChildNode("nonexistent.txt");
    expect(foundNode).toBeNull();
  });

  it("should clone a node", () => {
    rootNode.attachChildNode(childNode);
    const clonedNode = rootNode.clone();
    expect(clonedNode).not.toBe(rootNode);
    expect(clonedNode.childNodes.length).toBe(1);
    expect(clonedNode.childNodes[0].name).toBe("file1.txt");
  });

  it("should clone a node with new IDs", async () => {
    rootNode.attachChildNode(childNode);
    const clonedNode = await rootNode.cloneWithNewIds("newOp");
    expect(clonedNode.id).not.toBe(rootNode.id);
    expect(clonedNode.childNodes[0].id).not.toBe(rootNode.childNodes[0].id);
  });

  it("should throw an error when detaching a node without a parent", () => {
    expect(() => rootNode.detach()).toThrowError("Parent node is null. Can't detach child node");
  });
});
