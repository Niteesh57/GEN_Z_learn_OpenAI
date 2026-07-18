import React from 'react';

interface BevelContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'sunken';
  children: React.ReactNode;
}

export const BevelContainer: React.FC<BevelContainerProps> = ({
  variant = 'sunken',
  children,
  className = '',
  ...props
}) => {
  const bevelClass = variant === 'raised' ? 'bevel-raised' : 'bevel-sunken';
  return (
    <div className={`${bevelClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
export default BevelContainer;
