'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'sparkle'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
  secondary: 'bg-surface border border-border text-zinc-800 hover:bg-zinc-50',
  outline: 'border border-primary text-primary hover:bg-primary/5',
  danger: 'bg-error text-white hover:bg-error/90',
  ghost: 'text-primary hover:bg-primary/10',
  sparkle: 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-[38px] px-3 py-1.5 text-[13px] rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
