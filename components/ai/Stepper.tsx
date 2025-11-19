import React from 'react';

interface StepperProps {
    steps: { name: string }[];
    currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    const progressPercentage = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

    return (
        <nav aria-label="Progress">
            <div className="relative">
                {/* Progress Bar */}
                <div className="absolute left-0 top-4 h-0.5 w-full bg-border-color" aria-hidden="true">
                    <div className="absolute h-full bg-primary" style={{ width: `calc(${progressPercentage}%` }} />
                </div>

                <ol role="list" className="relative flex justify-between">
                    {steps.map((step, stepIdx) => (
                        <li key={step.name} className="flex flex-col items-center text-center w-24">
                            {stepIdx < currentStep - 1 ? (
                                // Completed Step
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary z-10">
                                    <svg className="h-5 w-5 text-background" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            ) : stepIdx === currentStep - 1 ? (
                                // Current Step
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background shadow-lg shadow-primary/50 z-10" aria-current="step">
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                </div>
                            ) : (
                                // Future Step
                                <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border-color bg-background z-10">
                                </div>
                            )}
                            <div className="mt-3">
                                <span className={`text-sm font-medium ${stepIdx < currentStep - 1 ? 'text-text-primary' : stepIdx === currentStep - 1 ? 'text-primary' : 'text-text-secondary'}`}>{step.name}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
};

export default Stepper;
