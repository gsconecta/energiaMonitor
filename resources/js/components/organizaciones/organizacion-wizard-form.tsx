import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Factory,
    House,
    Link2,
    RefreshCw,
    Rocket,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export interface OrganizacionWizardItem {
    id: number;
    nombre: string;
    codigo: string;
}

export interface CredencialShellyOption {
    id: number;
    nombre: string;
    server: string | null;
}

type WizardFormData = {
    nombre: string;
    codigo: string;
    descripcion: string;
    tipo_perfil: 'industrial' | 'residencial';
    activa: boolean;
    credencial_shelly_id: string;
};

type WizardField = keyof WizardFormData;
type ClientErrors = Partial<Record<WizardField, string>>;

interface OrganizacionWizardFormProps {
    organizaciones?: OrganizacionWizardItem[];
    credencialesShelly?: CredencialShellyOption[];
    onCancel?: () => void;
    onSuccess?: () => void;
    cancelLabel?: string;
    submitLabel?: string;
}

const pasos = [
    {
        id: 'identidad',
        titulo: 'Identidad',
        descripcion: 'Nombre, codigo y descripcion base.',
        icon: Building2,
    },
    {
        id: 'configuracion',
        titulo: 'Configuracion',
        descripcion: 'Perfil, estado e integracion opcional.',
        icon: ShieldCheck,
    },
    {
        id: 'revision',
        titulo: 'Revision',
        descripcion: 'Resumen antes de crear la organizacion.',
        icon: Rocket,
    },
] as const;

const perfiles = [
    {
        value: 'industrial',
        titulo: 'Industrial',
        descripcion:
            'Pensado para entornos trifasicos, zonas y monitorizacion tecnica.',
        icon: Factory,
    },
    {
        value: 'residencial',
        titulo: 'Residencial',
        descripcion:
            'Pensado para instalaciones monofasicas, solar y consumo domestico.',
        icon: House,
    },
] as const;

export default function OrganizacionWizardForm({
    organizaciones = [],
    credencialesShelly = [],
    onCancel,
    onSuccess,
    cancelLabel = 'Cancelar',
    submitLabel = 'Crear organizacion',
}: OrganizacionWizardFormProps) {
    const [pasoActual, setPasoActual] = useState(0);
    const [codigoEditadoManualmente, setCodigoEditadoManualmente] =
        useState(false);
    const [clientErrors, setClientErrors] = useState<ClientErrors>({});

    const { data, setData, post, processing, errors, clearErrors, transform } =
        useForm<WizardFormData>({
            nombre: '',
            codigo: '',
            descripcion: '',
            tipo_perfil: 'industrial',
            activa: true,
            credencial_shelly_id: 'none',
        });

    const credencialSeleccionada = useMemo(
        () =>
            credencialesShelly.find(
                (credencial) =>
                    credencial.id.toString() === data.credencial_shelly_id,
            ) ?? null,
        [credencialesShelly, data.credencial_shelly_id],
    );

    const perfilSeleccionado =
        perfiles.find((perfil) => perfil.value === data.tipo_perfil) ??
        perfiles[0];

    const limpiarErrorCliente = (field: WizardField) => {
        setClientErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }

            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const limpiarErrores = () => {
        setClientErrors({});
        clearErrors();
    };

    const setWizardData = <K extends WizardField>(
        field: K,
        value: WizardFormData[K],
    ) => {
        setData(field as never, value as never);
        limpiarErrorCliente(field);
    };

    const generarCodigo = (nombre: string): string => {
        if (!nombre.trim()) {
            return '';
        }

        let codigo = nombre.toLowerCase().trim();
        codigo = codigo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        codigo = codigo.replace(/[^a-z0-9]+/g, '-');
        codigo = codigo.replace(/^-+|-+$/g, '');

        if (codigo.length > 50) {
            codigo = codigo.substring(0, 50);
        }

        if (!codigo) {
            codigo = 'organizacion';
        }

        const base = codigo;
        let candidato = base;
        let contador = 1;

        while (
            organizaciones.some(
                (organizacion) =>
                    organizacion.codigo.trim().toLowerCase() ===
                    candidato.toLowerCase(),
            )
        ) {
            candidato = `${base}-${contador}`;
            contador += 1;
        }

        return candidato;
    };

    const handleNombreChange = (nombre: string) => {
        setWizardData('nombre', nombre);

        if (!codigoEditadoManualmente) {
            setData('codigo', generarCodigo(nombre));
            limpiarErrorCliente('codigo');
        }
    };

    const handleCodigoChange = (codigo: string) => {
        setCodigoEditadoManualmente(true);
        setWizardData('codigo', codigo);
    };

    const regenerarCodigo = () => {
        setCodigoEditadoManualmente(false);
        setWizardData('codigo', generarCodigo(data.nombre));
    };

    const errorCampo = (field: WizardField) =>
        clientErrors[field] ?? errors[field];

    const validarIdentidad = () => {
        const nextErrors: ClientErrors = {};
        const nombre = data.nombre.trim();
        const codigo = data.codigo.trim();

        if (!nombre) {
            nextErrors.nombre = 'El nombre es obligatorio.';
        } else if (nombre.length < 2) {
            nextErrors.nombre = 'El nombre debe tener al menos 2 caracteres.';
        }

        if (!codigo) {
            nextErrors.codigo = 'El codigo es obligatorio.';
        } else if (
            organizaciones.some(
                (organizacion) =>
                    organizacion.codigo.trim().toLowerCase() ===
                    codigo.toLowerCase(),
            )
        ) {
            nextErrors.codigo = 'Ya existe una organizacion con ese codigo.';
        }

        setClientErrors((prev) => ({
            ...prev,
            nombre: nextErrors.nombre,
            codigo: nextErrors.codigo,
        }));

        return Object.keys(nextErrors).length === 0;
    };

    const validarConfiguracion = () => {
        const nextErrors: ClientErrors = {};

        if (!perfiles.some((perfil) => perfil.value === data.tipo_perfil)) {
            nextErrors.tipo_perfil = 'Selecciona un tipo de perfil valido.';
        }

        if (
            data.credencial_shelly_id !== 'none' &&
            !credencialesShelly.some(
                (credencial) =>
                    credencial.id.toString() === data.credencial_shelly_id,
            )
        ) {
            nextErrors.credencial_shelly_id =
                'Selecciona una credencial valida.';
        }

        setClientErrors((prev) => ({
            ...prev,
            tipo_perfil: nextErrors.tipo_perfil,
            credencial_shelly_id: nextErrors.credencial_shelly_id,
        }));

        return Object.keys(nextErrors).length === 0;
    };

    const irAlPasoConError = (field?: string) => {
        if (!field) {
            return;
        }

        if (
            field === 'nombre' ||
            field === 'codigo' ||
            field === 'descripcion'
        ) {
            setPasoActual(0);
            return;
        }

        if (
            field === 'tipo_perfil' ||
            field === 'activa' ||
            field === 'credencial_shelly_id'
        ) {
            setPasoActual(1);
        }
    };

    const avanzar = () => {
        limpiarErrores();

        const pasoValido =
            pasoActual === 0
                ? validarIdentidad()
                : pasoActual === 1
                  ? validarConfiguracion()
                  : true;

        if (!pasoValido) {
            return;
        }

        setPasoActual((prev) => Math.min(prev + 1, pasos.length - 1));
    };

    const retroceder = () => {
        limpiarErrores();
        setPasoActual((prev) => Math.max(prev - 1, 0));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        limpiarErrores();

        if (!validarIdentidad()) {
            setPasoActual(0);
            return;
        }

        if (!validarConfiguracion()) {
            setPasoActual(1);
            return;
        }

        transform((currentData) => ({
            ...currentData,
            nombre: currentData.nombre.trim(),
            codigo: currentData.codigo.trim(),
            descripcion: currentData.descripcion.trim(),
            credencial_shelly_id:
                currentData.credencial_shelly_id === 'none'
                    ? null
                    : parseInt(currentData.credencial_shelly_id, 10),
        }));

        post('/organizaciones', {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess?.();
            },
            onError: (serverErrors: Record<string, string>) => {
                irAlPasoConError(Object.keys(serverErrors)[0]);
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
                {pasos.map((paso, index) => {
                    const Icon = paso.icon;
                    const activo = index === pasoActual;
                    const completado = index < pasoActual;

                    return (
                        <button
                            key={paso.id}
                            type="button"
                            onClick={() => {
                                if (index <= pasoActual) {
                                    limpiarErrores();
                                    setPasoActual(index);
                                }
                            }}
                            disabled={index > pasoActual}
                            className={cn(
                                'rounded-xl border p-4 text-left transition',
                                activo &&
                                    'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20',
                                completado &&
                                    'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20',
                                !activo &&
                                    !completado &&
                                    'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
                                index > pasoActual &&
                                    'cursor-not-allowed opacity-70',
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        'rounded-full p-2',
                                        activo &&
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                                        completado &&
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                                        !activo &&
                                            !completado &&
                                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
                                    )}
                                >
                                    {completado ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Icon className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {index + 1}. {paso.titulo}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {paso.descripcion}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {pasoActual === 0 && (
                <div className="space-y-5">
                    <div className="grid gap-2">
                        <Label htmlFor="wizard-nombre">
                            Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="wizard-nombre"
                            type="text"
                            value={data.nombre}
                            onChange={(event) =>
                                handleNombreChange(event.target.value)
                            }
                            placeholder="Mi Empresa"
                            required
                            aria-invalid={
                                errorCampo('nombre') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('nombre')} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="wizard-codigo">
                                Codigo <span className="text-red-500">*</span>
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={regenerarCodigo}
                                disabled={!data.nombre.trim()}
                                className="h-auto px-2 py-1 text-xs"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Regenerar
                            </Button>
                        </div>
                        <Input
                            id="wizard-codigo"
                            type="text"
                            value={data.codigo}
                            onChange={(event) =>
                                handleCodigoChange(event.target.value)
                            }
                            placeholder="Se generara automaticamente"
                            required
                            aria-invalid={
                                errorCampo('codigo') ? 'true' : 'false'
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Puedes aceptar la propuesta automatica o ajustar el
                            codigo manualmente.
                        </p>
                        <InputError message={errorCampo('codigo')} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="wizard-descripcion">Descripcion</Label>
                        <Textarea
                            id="wizard-descripcion"
                            value={data.descripcion}
                            onChange={(event) =>
                                setWizardData('descripcion', event.target.value)
                            }
                            rows={4}
                            placeholder="Que actividad cubre esta organizacion y para que se va a usar."
                            aria-invalid={
                                errorCampo('descripcion') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('descripcion')} />
                    </div>
                </div>
            )}

            {pasoActual === 1 && (
                <div className="space-y-5">
                    <div className="space-y-3">
                        <Label>
                            Tipo de perfil{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid gap-3 md:grid-cols-2">
                            {perfiles.map((perfil) => {
                                const Icon = perfil.icon;
                                const seleccionado =
                                    data.tipo_perfil === perfil.value;

                                return (
                                    <button
                                        key={perfil.value}
                                        type="button"
                                        onClick={() =>
                                            setWizardData(
                                                'tipo_perfil',
                                                perfil.value,
                                            )
                                        }
                                        className={cn(
                                            'rounded-xl border p-4 text-left transition',
                                            seleccionado
                                                ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                                                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600',
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    'rounded-full p-2',
                                                    seleccionado
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300',
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {perfil.titulo}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {perfil.descripcion}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <InputError message={errorCampo('tipo_perfil')} />
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="wizard-activa"
                                checked={data.activa}
                                onCheckedChange={(checked) =>
                                    setWizardData('activa', checked === true)
                                }
                            />
                            <div className="space-y-1">
                                <Label
                                    htmlFor="wizard-activa"
                                    className="cursor-pointer"
                                >
                                    Organizacion activa desde el alta
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Si la desactivas ahora, quedara creada pero
                                    no disponible para operacion hasta
                                    activarla.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="wizard-credencial">
                            Credencial de Shelly Cloud
                        </Label>
                        {credencialesShelly.length > 0 ? (
                            <>
                                <Select
                                    value={data.credencial_shelly_id}
                                    onValueChange={(value) =>
                                        setWizardData(
                                            'credencial_shelly_id',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger id="wizard-credencial">
                                        <SelectValue placeholder="Selecciona una credencial opcional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Ninguna
                                        </SelectItem>
                                        {credencialesShelly.map(
                                            (credencial) => (
                                                <SelectItem
                                                    key={credencial.id}
                                                    value={credencial.id.toString()}
                                                >
                                                    {credencial.nombre}
                                                    {credencial.server
                                                        ? ` (${credencial.server})`
                                                        : ''}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Puedes vincular la cuenta ahora o dejarlo
                                    para despues desde la edicion.
                                </p>
                            </>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-muted-foreground dark:border-gray-700">
                                No hay credenciales Shelly disponibles para
                                asignar en este momento.
                            </div>
                        )}
                        <InputError
                            message={errorCampo('credencial_shelly_id')}
                        />
                    </div>
                </div>
            )}

            {pasoActual === 2 && (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/20">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                <Rocket className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Revisa los datos antes de crear la
                                    organizacion
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Si algo no encaja, vuelve al paso anterior y
                                    ajustalo antes de guardar.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Datos base
                            </div>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Nombre
                                    </dt>
                                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {data.nombre || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Codigo
                                    </dt>
                                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {data.codigo || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Descripcion
                                    </dt>
                                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {data.descripcion.trim() ||
                                            'Sin descripcion inicial'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                            <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Configuracion inicial
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <perfilSeleccionado.icon className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Perfil {perfilSeleccionado.titulo}
                                        </div>
                                        <p className="text-muted-foreground">
                                            {perfilSeleccionado.descripcion}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Estado inicial
                                        </div>
                                        <p className="text-muted-foreground">
                                            {data.activa
                                                ? 'Activa y disponible desde el primer momento.'
                                                : 'Creada en estado inactivo.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <Link2 className="mt-0.5 h-4 w-4 text-violet-600 dark:text-violet-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Integracion Shelly
                                        </div>
                                        <p className="text-muted-foreground">
                                            {credencialSeleccionada
                                                ? `${credencialSeleccionada.nombre}${credencialSeleccionada.server ? ` (${credencialSeleccionada.server})` : ''}`
                                                : 'Sin credencial asignada.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Paso {pasoActual + 1} de {pasos.length}
                </div>
                <div className="flex gap-3">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    {pasoActual > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={retroceder}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Atras
                        </Button>
                    )}
                    {pasoActual < pasos.length - 1 ? (
                        <Button type="button" onClick={avanzar}>
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creando...' : submitLabel}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
