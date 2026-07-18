import { useState, useEffect } from 'react';

export const useTypewriter = (
  text: string,
  delay: number = 1000,
  speed: number = 50
) => {
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsDone(false);

    let timeoutId: number;
    let index = 0;

    const type = () => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
        const randomSpeed = speed + Math.random() * speed;
        timeoutId = window.setTimeout(type, randomSpeed);
      } else {
        setIsDone(true);
      }
    };

    const startTimeoutId = window.setTimeout(type, delay);

    return () => {
      window.clearTimeout(startTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, [text, delay, speed]);

  return { displayText, isDone };
};
