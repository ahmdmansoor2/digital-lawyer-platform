import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>(null!);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        message,
        title: options?.title || 'تأكيد',
        confirmLabel: options?.confirmLabel || 'تأكيد',
        cancelLabel: options?.cancelLabel || 'إلغاء',
        danger: options?.danger ?? false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-[100] p-4" onClick={handleCancel}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-sm text-slate-900 mb-2">{state.title}</h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">{state.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancel} className="text-xs font-bold bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 transition">
                {state.cancelLabel}
              </button>
              <button onClick={handleConfirm} className={`text-xs font-bold px-4 py-2 rounded-xl text-white transition ${state.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextType['confirm'] {
  return useContext(ConfirmContext).confirm;
}
