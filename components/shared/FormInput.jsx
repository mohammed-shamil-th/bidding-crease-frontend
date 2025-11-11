'use client';

export default function FormInput({
  label,
  name,
  type = 'text',
  required = false,
  error,
  touched,
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  options,
  className = '',
  disabled = false,
  ...props
}) {
  const hasError = touched && error;
  const inputClasses = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
    disabled
      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
      : hasError
      ? 'border-red-500 text-gray-900 bg-white'
      : 'border-gray-300 text-gray-900 bg-white'
  } ${className}`;

  return (
    <div>
      <label 
        htmlFor={name} 
        className={`block text-sm font-medium ${
          disabled ? 'text-gray-500' : 'text-gray-700'
        }`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={inputClasses}
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={4}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
      )}
      {hasError && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

