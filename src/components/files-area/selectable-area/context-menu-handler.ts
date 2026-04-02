const longPressDuration = 1300;

export default class ContextMenuHandler {
    callback: (TouchEvent: React.TouchEvent | React.MouseEvent) => void;
    longPressCountdown: ReturnType<typeof setTimeout> | null;
    contextMenuPossible: boolean;

    constructor(callback: (TouchEvent: React.TouchEvent | React.MouseEvent) => void) {
        this.callback = callback;
        this.longPressCountdown = null;
        this.contextMenuPossible = false;
    }

    onTouchStart = (e: React.TouchEvent) => {
        this.contextMenuPossible = true;
        this.longPressCountdown = setTimeout(() => {
            this.contextMenuPossible = false;
            this.callback(e);
        }, longPressDuration);
    };

    onTouchMove = () => {
        if (this.longPressCountdown) {
            clearTimeout(this.longPressCountdown);
        }
    };

    onTouchCancel = () => {
        this.contextMenuPossible = false;
        if (this.longPressCountdown) {
            clearTimeout(this.longPressCountdown);
        }
    };

    onTouchEnd = () => {
        this.contextMenuPossible = false;
        if (this.longPressCountdown) {
            clearTimeout(this.longPressCountdown);
        }
    };

    onContextMenu = (e: React.MouseEvent) => {
        this.contextMenuPossible = false;

        if (this.longPressCountdown) {
            clearTimeout(this.longPressCountdown);
        }

        this.callback(e);
        e.preventDefault();
    };
}
