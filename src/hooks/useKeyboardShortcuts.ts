
import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          event.ctrlKey === (shortcut.ctrlKey || false) &&
          event.altKey === (shortcut.altKey || false) &&
          event.shiftKey === (shortcut.shiftKey || false)
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
