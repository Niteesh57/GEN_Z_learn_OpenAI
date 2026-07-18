import React from 'react';

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  pulseGlow?: boolean;
}

export const RetroButton: React.FC<RetroButtonProps> = ({
  children,
  pulseGlow = false,
  className = '',
  ...props
}) => {
  const pulseClass = pulseGlow ? 'pulse-glow' : '';
  return (
    <button
      className={`bevel-raised bevel-active bg-primary-fixed-dim text-on-primary-fixed px-6 py-2 font-label-caps text-label-caps flex items-center justify-center gap-2 cursor-pointer transition-transform duration-75 select-none ${pulseClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};

export default RetroButton;
