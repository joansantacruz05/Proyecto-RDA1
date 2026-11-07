import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.container}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={32} />
          </div>
          <h2 className={styles.title}>Ocurrió un problema inesperado</h2>
          <p className={styles.description}>
            Lo sentimos, la aplicación encontró un error al procesar esta vista. Por favor reintenta recargar la página.
          </p>
          <Button variant="primary" icon={<RotateCcw size={16} />} onClick={this.handleReset}>
            Reintentar y recargar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
