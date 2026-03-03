import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react'; // Changed to Eye/EyeOff as EyeIcon might be an alias or deprecated depending on version, generic is safer or we check what's installed. Usage in snippet showed EyeIcon but file likely has lucide-react. I'll stick to Eye/EyeOff which are standard.
import * as React from 'react';

// Use standard input props but omit 'type' as we handle it
type InputPasswordProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

const InputPassword = React.forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-9 px-3 py-2 text-muted-foreground hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword
              ? 'Ocultar contraseña'
              : 'Mostrar contraseña'}
          </span>
        </Button>
      </div>
    );
  },
);
InputPassword.displayName = 'InputPassword';

export { InputPassword };
