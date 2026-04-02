export class DialogClosedError extends Error {
  constructor() {
    super("Dialog was closed without a result");
    this.name = "DialogClosedError";
  }
}

// Thrown when attempting to open a dialog while another is already open.
// Must distinguish from DialogClosedError, since React's Strict Mode may trigger double-opening,
// which could incorrectly simulate a user canceling the password input
export class ConcurrentDialogOpen extends Error {
  constructor() {
    super("Dialog was closed due to opening another dialog");
    this.name = "DialogClosedError";
  }
}
