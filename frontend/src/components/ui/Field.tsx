'use client'

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const baseField =
  'w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-colors disabled:bg-surface disabled:text-zinc-500'

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
}

function FieldShell({ label, hint, error, icon, action, children }: FieldShellProps) {
  const id = useId()
  return (
    <div className="mb-4">
      {(label || action) && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {label && (
            <label htmlFor={id} className="text-[13px] font-semibold text-zinc-700">
              {label}
            </label>
          )}
          {action}
        </div>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-3 text-zinc-400">{icon}</span>}
        <div id={id}>{children}</div>
      </div>
      {error ? (
        <p className="mt-1 text-[11px] text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
}

function fieldClass(hasError: boolean, hasIcon: boolean, focused: boolean) {
  return [
    baseField,
    hasError ? 'border-error' : focused ? 'border-primary ring-2 ring-primary/20' : 'border-border',
    hasIcon ? 'pl-9' : '',
  ].join(' ')
}

export function TextField({
  label,
  hint,
  error,
  icon,
  action,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <FieldShell label={label} hint={hint} error={error} icon={icon} action={action}>
      <input
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={fieldClass(!!error, !!icon, focused)}
        {...rest}
      />
    </FieldShell>
  )
}

export function TextArea({
  label,
  hint,
  error,
  icon,
  action,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <FieldShell label={label} hint={hint} error={error} icon={icon} action={action}>
      <textarea
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`${fieldClass(!!error, !!icon, focused)} resize-y leading-relaxed`}
        {...rest}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  action,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  action?: ReactNode
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} action={action}>
      <select className={`${baseField} border-border appearance-none pr-8`} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}
