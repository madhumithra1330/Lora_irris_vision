import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      
      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') || 
                             this.state.error?.message?.toLowerCase().includes('fetch');
                             
      const title = isNetworkError ? t('errors.cannotConnect') : t('errors.somethingWentWrong');
      const desc = isNetworkError ? t('errors.showingLastKnown') : t('errors.smallIssue');

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 font-[Outfit] tracking-wide">{title}</h2>
          <p className="text-sm text-gray-400 mb-8 max-w-[280px] leading-relaxed">
            {desc}
          </p>
          <button
            className="px-6 py-3 rounded-xl font-semibold bg-surface-800 text-white border border-white/10 hover:bg-surface-700 active:scale-95 transition-all shadow-lg"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            aria-label={t('errors.tryAgain')}
          >
            {t('errors.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props) {
  const { t } = useTranslation();
  return <ErrorBoundaryInner t={t} {...props} />;
}
