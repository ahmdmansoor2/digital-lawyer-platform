import {Component, ErrorInfo, ReactNode, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { OfficeProfileProvider } from './contexts/OfficeProfileContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { AuthProvider } from './contexts/AuthContext';
import FirebaseAuthGate from './components/FirebaseAuthGate';
import App from './App';
import './index.css';

// ── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as unknown as { state: ErrorBoundaryState }).state = {hasError: false, error: null};
    (this as unknown as { handleReset: () => void }).handleReset = (): void => {
      (this as unknown as { setState: (s: Partial<ErrorBoundaryState>) => void }).setState({hasError: false, error: null});
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[GlobalErrorBoundary] خطأ غير متوقع:', error, info.componentStack);
  }

  render(): ReactNode {
    const self = this as unknown as {
      state: ErrorBoundaryState;
      props: ErrorBoundaryProps;
      handleReset: () => void;
    };
    if (self.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 text-center">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 max-w-lg shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto mb-4 text-red-400 font-bold text-xl">!</div>
            <h2 className="text-base font-bold text-white mb-2">عذراً، حدث خطأ غير متوقع في البرنامج</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              تم اعتراض الخطأ وحماية بياناتك. يمكنك إعادة المحاولة وإن استمرّ الخطأ فيُرجى إعادة تحميل الصفحة.
            </p>
            {self.state.error && (
              <pre className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-left overflow-auto max-h-32 mb-4 font-mono" dir="ltr">
                {self.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={self.handleReset} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-xs font-bold transition">
                إعادة المحاولة
              </button>
              <button onClick={() => window.location.reload()} className="bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg px-4 py-2 text-xs font-bold transition">
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return self.props.children;
  }
}

// ── نقطة الدخول ────────────────────────────────────────────────────────────
// v2.9.11: بوابة المصادقة الجديدة — شاشة دخول بحساب Google فقط (FirebaseAuthGate)
// في وضع Electron (حيث يُعطَّل Firebase) تستمر شاشة الدخول المحلية القديمة.
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <OfficeProfileProvider>
          <ConfirmProvider>
            {isElectron ? <App /> : <FirebaseAuthGate />}
          </ConfirmProvider>
        </OfficeProfileProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
