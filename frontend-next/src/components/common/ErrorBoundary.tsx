import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    /** [AR] اسم الوحدة لسهولة التشخيص - [EN] Module name for easier debugging */
    moduleName?: string;
    isAr?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { moduleName = 'Unknown' } = this.props;
        console.error(`[ErrorBoundary:${moduleName}] Caught error:`, error.message);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.setState({ error, errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        const { hasError, error, errorInfo } = this.state;
        const { fallback, moduleName = 'Module', isAr = false } = this.props;

        if (!hasError) return this.props.children;
        if (fallback) return fallback;

        return (
            <div className="min-h-[40vh] flex items-center justify-center p-8" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-10 text-center space-y-6">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-10 h-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    {/* Module Badge */}
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                        {moduleName}
                    </span>

                    {/* Title */}
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        {isAr ? 'حدث خطأ غير متوقع' : 'An Unexpected Error Occurred'}
                    </h2>

                    {/* Description */}
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {isAr
                            ? `حدث خطأ في وحدة "${moduleName}". يمكنك المحاولة مجدداً أو الإبلاغ عن المشكلة للدعم الفني.`
                            : `An error occurred in the "${moduleName}" module. You can try again or contact technical support.`
                        }
                    </p>

                    {/* Error Details (collapsible, dev-only) */}
                    <details className="text-left bg-slate-100 dark:bg-slate-900 rounded-xl p-4">
                        <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                            {isAr ? 'تفاصيل الخطأ (للمطورين)' : 'Error Details (Developers)'}
                        </summary>
                        <pre className="text-xs text-rose-600 dark:text-rose-400 overflow-auto mt-3 max-h-40 whitespace-pre-wrap">
                            {error?.message}
                            {'\n'}
                            {errorInfo?.componentStack?.slice(0, 500)}
                        </pre>
                    </details>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm"
                        >
                            {isAr ? 'إعادة المحاولة' : 'Try Again'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl transition-colors text-sm"
                        >
                            {isAr ? 'إعادة تحميل الصفحة' : 'Reload Page'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
