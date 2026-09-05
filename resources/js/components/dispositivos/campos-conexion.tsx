import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CampoConexion {
    nombre: string;
    etiqueta: string;
    tipo: 'texto' | 'entero';
    requerido: boolean;
    default: number | string | null;
    /** Reglas de validación Laravel (p.ej. `['required', 'integer', 'between:1,247']`), informativas: no se aplican en el cliente. */
    reglas: string[];
}

interface Props {
    campos: CampoConexion[];
    valores: Record<string, string | number>;
    onChange: (valores: Record<string, string | number>) => void;
    errors?: Record<string, string>;
    avisoCredencial?: string | null;
}

/** Valores iniciales de conexión para un driver: los `default` de sus campos. */
export function conexionPorDefecto(
    campos: CampoConexion[],
): Record<string, string | number> {
    return Object.fromEntries(
        campos
            .filter((c) => c.default !== null)
            .map((c) => [c.nombre, c.default as string | number]),
    );
}

export default function CamposConexion({
    campos,
    valores,
    onChange,
    errors,
    avisoCredencial,
}: Props) {
    if (campos.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Este modelo se lee desde Shelly Cloud con el Device ID y la
                credencial de la organización.
                {avisoCredencial && (
                    <span className="ml-1 text-red-600 dark:text-red-400">
                        {avisoCredencial}
                    </span>
                )}
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {campos.map((campo) => (
                <div key={campo.nombre} className="relative grid gap-2">
                    <Label
                        htmlFor={`conexion_${campo.nombre}`}
                        className="text-xs"
                    >
                        {campo.etiqueta}{' '}
                        {campo.requerido && (
                            <span className="text-red-500">*</span>
                        )}
                    </Label>
                    <Input
                        id={`conexion_${campo.nombre}`}
                        type={campo.tipo === 'entero' ? 'number' : 'text'}
                        value={valores[campo.nombre] ?? ''}
                        onChange={(e) =>
                            onChange({
                                ...valores,
                                [campo.nombre]:
                                    campo.tipo === 'entero' &&
                                    e.target.value !== ''
                                        ? parseInt(e.target.value)
                                        : e.target.value,
                            })
                        }
                        required={campo.requerido}
                        className="h-9 text-sm"
                    />
                    {errors?.[`conexion.${campo.nombre}`] && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {errors[`conexion.${campo.nombre}`]}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
