import React, { createContext, useContext, useState } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', visible: false })

  const showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2800)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast" className={toast.visible ? 'show' : ''}>{toast.msg}</div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
