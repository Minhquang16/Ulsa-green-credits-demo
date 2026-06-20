import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function TooltipPortal({ children, content, disabled }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && !disabled) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 10
      });
    }
  }, [isVisible, disabled]);

  const child = React.Children.only(children);
  const clone = React.cloneElement(child, {
    ref: (node) => {
      triggerRef.current = node;
      if (child.ref) {
        if (typeof child.ref === 'function') child.ref(node);
        else child.ref.current = node;
      }
    },
    onMouseEnter: (e) => {
      setIsVisible(true);
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e) => {
      setIsVisible(false);
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
    }
  });

  return (
    <>
      {clone}
      {isVisible && !disabled && createPortal(
        <div 
          className="fixed z-[100] px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md shadow-md pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: 'translateY(-50%)'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
