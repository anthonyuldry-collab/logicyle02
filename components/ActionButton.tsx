import React, { useState } from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  size = 'md',
  className, 
  style: propStyle, // Allow passing custom styles
  ...props 
}) => {
  const baseStyle = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out flex items-center justify-center gap-2 disabled:opacity-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none";
  
  let variantStyleClasses = "";
  let dynamicStyles: React.CSSProperties = {};

  switch (variant) {
    case 'primary':
      // Dynamic styles will be applied for primary
      dynamicStyles = {
        backgroundColor: 'var(--theme-primary-bg)',
        color: 'var(--theme-primary-text)',
      };
      // Tailwind focus ring remains for accessibility, color will be default blue
      // We can't easily make focus ring color dynamic without more complex setup
      variantStyleClasses = "focus:ring-blue-500"; 
      break;
    case 'secondary':
      variantStyleClasses =
        'bg-slate-700 hover:bg-slate-600 disabled:hover:bg-slate-700 text-white border border-slate-500 focus:ring-indigo-400/40 shadow-none';
      break;
    case 'danger':
      variantStyleClasses = "bg-red-500 hover:bg-red-600 disabled:hover:bg-slate-700 text-white focus:ring-red-400";
      break;
    case 'warning':
        variantStyleClasses = "bg-yellow-500 hover:bg-yellow-600 disabled:hover:bg-slate-700 text-black focus:ring-yellow-400";
        break;
    default:
      dynamicStyles = {
        backgroundColor: 'var(--theme-primary-bg)',
        color: 'var(--theme-primary-text)',
      };
      variantStyleClasses = "focus:ring-blue-500";
  }

  let sizeStyle = "";
  switch(size) {
    case 'sm':
      sizeStyle = "px-3 py-1.5 text-xs";
      break;
    case 'md':
      sizeStyle = "px-4 py-2 text-sm";
      break;
    case 'lg':
      sizeStyle = "px-6 py-3 text-base";
      break;
  }
  
  const [isHovered, setIsHovered] = React.useState(false);
  const isDisabled = Boolean(props.disabled);
  const finalStyles = { ...dynamicStyles, ...propStyle };

  if (isHovered && !isDisabled) {
    if (variant === 'primary') {
        finalStyles.backgroundColor = 'var(--theme-primary-hover-bg)';
    } 
    // Hover effect for secondary is now handled by Tailwind classes like hover:bg-gray-300
  }

  if (isDisabled) {
    finalStyles.backgroundColor = undefined;
    finalStyles.color = undefined;
  }

  return (
    <button
      className={`${baseStyle} ${variantStyleClasses} ${sizeStyle} ${className || ''}`}
      style={finalStyles}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export default ActionButton;