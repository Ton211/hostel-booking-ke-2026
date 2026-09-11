import { Check } from 'lucide-react';

export default function ProgressBar({ steps, currentStep }) {
  return (
    <div className="w-full px-2 py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className="flex items-center w-full">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm font-semibold transition-all duration-300 shrink-0
                    ${isCompleted ? 'bg-emerald-600 text-white' : ''}
                    ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : ''}
                    ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 sm:mx-2">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </div>
              <span
                className={`
                  mt-2 text-[10px] sm:text-xs text-center leading-tight
                  ${isCurrent ? 'text-indigo-600 font-semibold' : ''}
                  ${isCompleted ? 'text-emerald-600 font-medium' : ''}
                  ${isUpcoming ? 'text-gray-400' : ''}
                `}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
