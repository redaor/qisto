import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
}

export function Input({ label, error, prefix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          className={`
            w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm
            placeholder:text-gray-400 outline-none
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
            disabled:bg-gray-50 disabled:text-gray-500
            ${prefix ? 'pl-8' : ''}
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
