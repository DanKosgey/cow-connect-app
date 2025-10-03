import { useState, useRef, useCallback } from 'react';

interface LongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void;
  onLongPressEnd?: (e: React.TouchEvent | React.MouseEvent) => void;
  threshold?: number;
}

const useLongPress = ({
  onLongPress,
  onClick,
  onLongPressEnd,
  threshold = 500
}: LongPressOptions) => {
  const [action, setAction] = useState<'click' | 'longpress'>('click');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressed = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) return;

    isLongPressed.current = false;

    timerRef.current = setTimeout(() => {
      isLongPressed.current = true;
      setAction('longpress');
      onLongPress(e);
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((e: React.TouchEvent | React.MouseEvent, isClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isLongPressed.current && onLongPressEnd) {
      onLongPressEnd(e);
    } else if (isClick && onClick) {
      onClick(e);
    }

    isLongPressed.current = false;
  }, [onClick, onLongPressEnd]);

  const touchStart = useCallback((e: React.TouchEvent) => {
    start(e);
  }, [start]);

  const touchEnd = useCallback((e: React.TouchEvent) => {
    clear(e, false);
  }, [clear]);

  const mouseDown = useCallback((e: React.MouseEvent) => {
    start(e);
  }, [start]);

  const mouseUp = useCallback((e: React.MouseEvent) => {
    clear(e);
  }, [clear]);

  const click = useCallback((e: React.MouseEvent) => {
    if (action === 'longpress') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [action]);

  const contextMenu = useCallback((e: React.MouseEvent) => {
    // Prevent the default context menu on long press
    if (isLongPressed.current) {
      e.preventDefault();
    }
  }, []);

  return {
    touchStart,
    touchEnd,
    mouseDown,
    mouseUp,
    click,
    contextMenu
  };
};

export default useLongPress;