import React from 'react';

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const MobileForm: React.FC<MobileFormProps> = ({ 
  children, 
  onSubmit,
  className = "" 
}) => {
  return (
    <form 
      onSubmit={onSubmit}
      className={`space-y-6 ${className}`}
    >
      {children}
    </form>
  );
};

interface MobileFormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormGroup: React.FC<MobileFormGroupProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
};

interface MobileFormLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export const MobileFormLabel: React.FC<MobileFormLabelProps> = ({ 
  children, 
  htmlFor,
  className = "",
  required = false
}) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

interface MobileFormInputProps {
  type?: string;
  id?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export const MobileFormInput: React.FC<MobileFormInputProps> = ({
  type = "text",
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  error
}) => {
  const baseClasses = "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors";
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  
  return (
    <div className="space-y-1">
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${baseClasses} ${errorClasses} ${className}`}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

interface MobileFormTextareaProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
  error?: string;
}

export const MobileFormTextarea: React.FC<MobileFormTextareaProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  className = "",
  error
}) => {
  const baseClasses = "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors resize-vertical";
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  
  return (
    <div className="space-y-1">
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`${baseClasses} ${errorClasses} ${className}`}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

interface MobileFormSelectProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  children: React.ReactNode;
}

export const MobileFormSelect: React.FC<MobileFormSelectProps> = ({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  error,
  children
}) => {
  const baseClasses = "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors appearance-none bg-white";
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "";
  
  return (
    <div className="space-y-1 relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`${baseClasses} ${errorClasses} ${className}`}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}; 