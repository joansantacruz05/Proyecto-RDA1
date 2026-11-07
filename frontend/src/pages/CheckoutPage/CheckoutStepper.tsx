import React from 'react';
import { Check } from 'lucide-react';
import styles from './CheckoutStepper.module.css';

interface StepDefinition {
  number: number;
  label: string;
  sublabel: string;
}

const STEPS: StepDefinition[] = [
  { number: 1, label: 'Paso 1', sublabel: 'Facturación' },
  { number: 2, label: 'Paso 2', sublabel: 'Pago seguro' },
  { number: 3, label: 'Paso 3', sublabel: 'Confirmación' },
];

interface CheckoutStepperProps {
  currentStep: number;
}

export const CheckoutStepper: React.FC<CheckoutStepperProps> = ({ currentStep }) => {
  return (
    <nav aria-label="Progreso del proceso de reserva" className={styles.stepperContainer}>
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;

        return (
          <React.Fragment key={step.number}>
            <div
              className={styles.stepItem}
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className={`${styles.stepCircle} ${
                  isCompleted
                    ? styles.stepCircleCompleted
                    : isActive
                    ? styles.stepCircleActive
                    : ''
                }`}
              >
                {isCompleted ? <Check size={18} strokeWidth={2.5} /> : step.number}
              </div>

              <div className={styles.stepTexts}>
                <span className={styles.stepNumber}>{step.label}</span>
                <span
                  className={`${styles.stepTitle} ${
                    isActive ? styles.stepTitleActive : ''
                  }`}
                >
                  {step.sublabel}
                </span>
              </div>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`${styles.stepDivider} ${
                  currentStep > step.number ? styles.stepDividerCompleted : ''
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
