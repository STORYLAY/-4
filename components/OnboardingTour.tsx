import React, { useState, useEffect, useCallback } from 'react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    
    const step = steps[currentStep];
    const element = document.getElementById(step.targetId);
    
    if (element) {
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTargetRect(element.getBoundingClientRect());
    } else {
      // Fallback if element not found (e.g. might be hidden)
      setTargetRect(null);
    }
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [updateTargetRect]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      setTimeout(() => setCurrentStep(0), 300); // Reset for next time
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  // If we can't find the element, just show centered (fallback)
  const styleBox = targetRect ? {
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
  } : {};

  // Determine tooltip position
  const isRightSide = targetRect && targetRect.left < window.innerWidth / 2;
  const isBottomHalf = targetRect && targetRect.top > window.innerHeight / 2;
  const isWide = targetRect && targetRect.width > 400;

  let tooltipStyle: React.CSSProperties = {};
  let arrowClass = '';
  
  if (targetRect) {
    if (isWide) {
        // Position Above or Below for wide elements (like the input bar)
        const centeredLeft = targetRect.left + (targetRect.width / 2) - 160; // Center the 320px tooltip
        const safeLeft = Math.max(16, Math.min(window.innerWidth - 336, centeredLeft));

        if (isBottomHalf) {
            // Position ABOVE
            tooltipStyle = { 
                left: safeLeft, 
                bottom: window.innerHeight - targetRect.top + 16,
                top: 'auto'
            };
            arrowClass = 'bottom-[-6px] left-1/2 -ml-1.5 border-r border-b border-gray-100 transform rotate-45';
        } else {
            // Position BELOW
            tooltipStyle = { 
                left: safeLeft, 
                top: targetRect.bottom + 16 
            };
             arrowClass = 'top-[-6px] left-1/2 -ml-1.5 border-l border-t border-gray-100 transform rotate-45';
        }
    } else {
        // Position Side for smaller elements (like buttons)
        if (isRightSide) {
           tooltipStyle = { left: targetRect.right + 12, top: targetRect.top };
           arrowClass = '-left-1.5 border-l border-b border-gray-100 transform rotate-45';
        } else {
           tooltipStyle = { right: window.innerWidth - targetRect.left + 12, top: targetRect.top };
           arrowClass = '-right-1.5 border-r border-t border-gray-100 transform rotate-45';
        }
        
        // Adjust vertical alignment if close to bottom edge
        if (isBottomHalf) {
           tooltipStyle.top = 'auto';
           tooltipStyle.bottom = window.innerHeight - targetRect.bottom;
           // If utilizing bottom alignment, align arrow to bottom of tooltip
           if (isRightSide) arrowClass += ' top-auto bottom-6';
           else arrowClass += ' top-auto bottom-6';
        } else {
           // Default top alignment
           arrowClass += ' top-6';
        }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Interaction blocker/Backdrop */}
      <div className="absolute inset-0 bg-transparent cursor-default" onClick={onClose} />

      {/* The Highlight Box with Box Shadow acting as overlay */}
      {targetRect && (
        <div 
          className="absolute rounded-lg transition-all duration-300 ease-in-out pointer-events-none"
          style={{
            ...styleBox,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
          }}
        >
           {/* Animated border for focus */}
           <div className="absolute inset-0 rounded-lg ring-2 ring-white ring-offset-2 ring-offset-transparent animate-pulse" />
        </div>
      )}

      {/* Tooltip Card */}
      {targetRect && (
        <div 
          className="absolute w-80 bg-white rounded-xl shadow-2xl p-6 transition-all duration-300 animate-fade-in border border-gray-100"
          style={tooltipStyle}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
              步骤 {currentStep + 1} / {steps.length}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {step.description}
          </p>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
             <button 
               onClick={onClose}
               className="text-gray-500 text-sm hover:text-gray-800"
             >
               跳过
             </button>
             <div className="flex space-x-2">
                {currentStep > 0 && (
                  <button 
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    上一步
                  </button>
                )}
                <button 
                  onClick={handleNext}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors font-bold"
                >
                  {isLastStep ? '完成' : '下一步'}
                </button>
             </div>
          </div>
          
          {/* Arrow Indicator */}
          <div 
            className={`absolute w-3 h-3 bg-white ${arrowClass}`}
          />
        </div>
      )}
    </div>
  );
};

export default OnboardingTour;