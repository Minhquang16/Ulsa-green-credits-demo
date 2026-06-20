import * as React from "react"
import { cn } from "../../lib/utils"

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <style>{`
        .custom-scroll-area::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll-area::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scroll-area:hover::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
        }
      `}</style>
      <div 
        className="custom-scroll-area h-full w-full rounded-[inherit] overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
      >
        {children}
      </div>
    </div>
  )
})
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef((props, ref) => <div ref={ref} className="hidden" />)
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
