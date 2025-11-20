'use client'

import { useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InputPasswordProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  id?: string
}

const InputPassword = ({
  value,
  onChange,
  placeholder,
  id,
  className,
  ...props
}: InputPasswordProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const generatedId = useId()
  const inputId = id || generatedId

  const toggleVisibility = () => setIsVisible(prevState => !prevState)

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={isVisible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn('pr-9', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleVisibility}
        className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
      >
        {isVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        <span className="sr-only">{isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
      </Button>
    </div>
  )
}

export { InputPassword }

