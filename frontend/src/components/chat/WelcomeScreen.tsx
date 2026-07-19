import React from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';

export const WelcomeScreen: React.FC = () => {
  const { displayText, isDone } = useTypewriter('What should we plan today?', 1000, 40);

  return (
    <div className="mb-12 text-center font-mono select-none">
      <h2 className="welcome-prompt font-headline-lg text-headline-lg mb-4 min-h-[40px] transition-all">
        {displayText}
        {isDone ? <span className="cursor-blink"></span> : <span className="cursor-blink"></span>}
      </h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto text-flicker">
        Learning shouldn't adapt to the teacher. It should adapt to the learner.
      </p>
    </div>
  );
};

export default WelcomeScreen;
