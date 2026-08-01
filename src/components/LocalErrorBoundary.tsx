import React from 'react';

interface ErrorBoundaryProps {
  fallback?: (err: Error, reset: () => void) => React.ReactNode;
  children: React.ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
    (this as any).reset = () => {
      (this as any).setState({ hasError: false, error: null });
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const lbl = (this as any).props.label ? ':' + (this as any).props.label : '';
    console.error('[LocalErrorBoundary' + lbl + ']', error, info.componentStack);
  }

  render() {
    const self = this as unknown as {
      state: ErrorBoundaryState;
      props: ErrorBoundaryProps;
      reset: () => void;
    };
    const { hasError, error } = self.state;
    if (!hasError) return self.props.children;

    if (self.props.fallback && error) {
      return self.props.fallback(error, self.reset);
    }

    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 m-4 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 text-2xl font-bold">!</div>
        <h3 className="text-sm font-black text-rose-800">حدث خطأ في هذا القسم</h3>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          {self.props.label ? 'القسم: ' + self.props.label : ''}<br />
          {error?.message || 'خطأ غير معروف'}
        </p>
        <pre className="text-[10px] text-left bg-rose-100/40 border border-rose-200 rounded-lg p-2 overflow-auto max-h-32 font-mono" dir="ltr">
          {error?.stack?.split('\n').slice(0, 5).join('\n') || ''}
        </pre>
        <div className="flex gap-2 justify-center">
          <button onClick={self.reset} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl">إعادة محاولة</button>
          <button onClick={() => { try { window.location.reload(); } catch (e) {} }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl">إعادة تحميل الصفحة</button>
        </div>
      </div>
    );
  }
}