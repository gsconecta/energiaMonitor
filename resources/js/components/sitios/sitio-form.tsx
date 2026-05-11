import LocationPicker from '@/components/LocationPicker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Rocket,
    ShieldCheck,
} from 'lucide-react';
import {
    type FormEvent,
    type MouseEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

export interface SitioOrganizacionOption {
    id: number;
    nombre: string;
}

export type SitioFormData = {
    organizacion_id: string;
    nombre: string;
    codigo: string;
    ubicacion: string;
    latitud: string;
    longitud: string;
    codigo_municipio_aemet: string;
    descripcion: string;
    activa: boolean;
};

type SitioFormField = keyof SitioFormData;
type ClientErrors = Partial<Record<SitioFormField, string>>;

interface SitioFormProps {
    organizaciones: SitioOrganizacionOption[];
    initialValues?: Partial<SitioFormData>;
    submitUrl: string;
    method: 'post' | 'put';
    cancelUrl: string;
    submitLabel: string;
    processingLabel: string;
}

const pasos = [
    {
        id: 'datos',
        titulo: 'Datos base',
        descripcion: 'Organizacion, nombre, codigo y descripcion.',
        icon: Building2,
    },
    {
        id: 'localizacion',
        titulo: 'Localizacion',
        descripcion: 'Direccion, coordenadas y codigo AEMET.',
        icon: MapPin,
    },
    {
        id: 'revision',
        titulo: 'Revision',
        descripcion: 'Estado y resumen antes de guardar.',
        icon: Rocket,
    },
] as const;

const emptyValues: SitioFormData = {
    organizacion_id: '',
    nombre: '',
    codigo: '',
    ubicacion: '',
    latitud: '',
    longitud: '',
    codigo_municipio_aemet: '',
    descripcion: '',
    activa: true,
};

export default function SitioForm({
    organizaciones,
    initialValues = {},
    submitUrl,
    method,
    cancelUrl,
    submitLabel,
    processingLabel,
}: SitioFormProps) {
    const [pasoActual, setPasoActual] = useState(0);
    const [clientErrors, setClientErrors] = useState<ClientErrors>({});

    const defaultOrganizacionId =
        initialValues.organizacion_id ?? organizaciones[0]?.id.toString() ?? '';

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        clearErrors,
        transform,
    } = useForm<SitioFormData>({
        ...emptyValues,
        ...initialValues,
        organizacion_id: defaultOrganizacionId,
        activa: initialValues.activa ?? true,
    });
    const codigoAemetEditadoManualmenteRef = useRef(false);
    const codigoAemetActualRef = useRef(data.codigo_municipio_aemet);

    useEffect(() => {
        codigoAemetActualRef.current = data.codigo_municipio_aemet;
    }, [data.codigo_municipio_aemet]);

    const organizacionSeleccionada =
        organizaciones.find(
            (organizacion) =>
                organizacion.id.toString() === data.organizacion_id,
        ) ?? null;

    const limpiarErrorCliente = (field: SitioFormField) => {
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

    const setSitioData = <K extends SitioFormField>(
        field: K,
        value: SitioFormData[K],
    ) => {
        setData(field as never, value as never);
        limpiarErrorCliente(field);
    };

    const setCodigoAemetManual = (value: string) => {
        codigoAemetEditadoManualmenteRef.current = true;
        codigoAemetActualRef.current = value;
        setSitioData('codigo_municipio_aemet', value);
    };

    const aplicarCodigoAemetAutomatico = (codigo: string) => {
        const codigoNormalizado = codigo.trim();

        if (
            !codigoNormalizado ||
            codigoAemetEditadoManualmenteRef.current ||
            codigoAemetActualRef.current.trim()
        ) {
            return;
        }

        codigoAemetActualRef.current = codigoNormalizado;
        setSitioData('codigo_municipio_aemet', codigoNormalizado);
    };

    const errorCampo = (field: SitioFormField) =>
        clientErrors[field] ?? errors[field];

    const validarDatosBase = () => {
        const nextErrors: ClientErrors = {};

        if (!data.organizacion_id) {
            nextErrors.organizacion_id = 'Selecciona una organizacion.';
        }

        if (!data.nombre.trim()) {
            nextErrors.nombre = 'El nombre es obligatorio.';
        }

        if (!data.codigo.trim()) {
            nextErrors.codigo = 'El codigo es obligatorio.';
        }

        setClientErrors((prev) => ({
            ...prev,
            organizacion_id: nextErrors.organizacion_id,
            nombre: nextErrors.nombre,
            codigo: nextErrors.codigo,
        }));

        return Object.keys(nextErrors).length === 0;
    };

    const irAlPasoConError = (field?: string) => {
        if (!field) {
            return;
        }

        if (
            field === 'organizacion_id' ||
            field === 'nombre' ||
            field === 'codigo' ||
            field === 'descripcion'
        ) {
            setPasoActual(0);
            return;
        }

        if (
            field === 'ubicacion' ||
            field === 'latitud' ||
            field === 'longitud' ||
            field === 'codigo_municipio_aemet'
        ) {
            setPasoActual(1);
            return;
        }

        if (field === 'activa') {
            setPasoActual(2);
        }
    };

    const avanzar = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        limpiarErrores();

        if (pasoActual === 0 && !validarDatosBase()) {
            return;
        }

        setPasoActual((prev) => Math.min(prev + 1, pasos.length - 1));
    };

    const retroceder = () => {
        limpiarErrores();
        setPasoActual((prev) => Math.max(prev - 1, 0));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        limpiarErrores();

        if (!validarDatosBase()) {
            setPasoActual(0);
            return;
        }

        transform((currentData) => ({
            ...currentData,
            organizacion_id: currentData.organizacion_id.trim(),
            nombre: currentData.nombre.trim(),
            codigo: currentData.codigo.trim(),
            ubicacion: currentData.ubicacion.trim(),
            latitud: currentData.latitud.trim(),
            longitud: currentData.longitud.trim(),
            codigo_municipio_aemet: currentData.codigo_municipio_aemet.trim(),
            descripcion: currentData.descripcion.trim(),
        }));

        const options = {
            preserveScroll: true,
            onError: (serverErrors: Record<string, string>) => {
                irAlPasoConError(Object.keys(serverErrors)[0]);
            },
        };

        if (method === 'post') {
            post(submitUrl, options);
            return;
        }

        put(submitUrl, options);
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-6">
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
                                <div className="flex flex-col gap-1">
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
                <div className="flex flex-col gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="sitio-organizacion">
                            Organizacion <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.organizacion_id}
                            onValueChange={(value) =>
                                setSitioData('organizacion_id', value)
                            }
                        >
                            <SelectTrigger
                                id="sitio-organizacion"
                                aria-invalid={
                                    errorCampo('organizacion_id')
                                        ? 'true'
                                        : 'false'
                                }
                            >
                                <SelectValue placeholder="Selecciona una organizacion" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {organizaciones.map((organizacion) => (
                                        <SelectItem
                                            key={organizacion.id}
                                            value={organizacion.id.toString()}
                                        >
                                            {organizacion.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputError message={errorCampo('organizacion_id')} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sitio-nombre">
                            Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="sitio-nombre"
                            type="text"
                            value={data.nombre}
                            onChange={(event) =>
                                setSitioData('nombre', event.target.value)
                            }
                            placeholder="Nave Industrial 1"
                            required
                            aria-invalid={
                                errorCampo('nombre') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('nombre')} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sitio-codigo">
                            Codigo <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="sitio-codigo"
                            type="text"
                            value={data.codigo}
                            onChange={(event) =>
                                setSitioData('codigo', event.target.value)
                            }
                            placeholder="NAVE-001"
                            required
                            aria-invalid={
                                errorCampo('codigo') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('codigo')} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sitio-descripcion">Descripcion</Label>
                        <Textarea
                            id="sitio-descripcion"
                            value={data.descripcion}
                            onChange={(event) =>
                                setSitioData('descripcion', event.target.value)
                            }
                            rows={4}
                            placeholder="Descripcion del sitio..."
                            aria-invalid={
                                errorCampo('descripcion') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('descripcion')} />
                    </div>
                </div>
            )}

            {pasoActual === 1 && (
                <div className="flex flex-col gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="sitio-ubicacion">Ubicacion</Label>
                        <Input
                            id="sitio-ubicacion"
                            type="text"
                            value={data.ubicacion}
                            onChange={(event) =>
                                setSitioData('ubicacion', event.target.value)
                            }
                            placeholder="Calle Principal 123, Ciudad"
                            aria-invalid={
                                errorCampo('ubicacion') ? 'true' : 'false'
                            }
                        />
                        <InputError message={errorCampo('ubicacion')} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Localizacion (coordenadas)</Label>
                        <LocationPicker
                            latitud={data.latitud}
                            longitud={data.longitud}
                            onLocationChange={(lat, lng) => {
                                setSitioData('latitud', lat);
                                setSitioData('longitud', lng);
                            }}
                            onAemetCodeResolved={aplicarCodigoAemetAutomatico}
                        />
                        <InputError
                            message={
                                errorCampo('latitud') ?? errorCampo('longitud')
                            }
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sitio-codigo-aemet">
                            Codigo Municipio AEMET
                        </Label>
                        <Input
                            id="sitio-codigo-aemet"
                            type="text"
                            value={data.codigo_municipio_aemet}
                            onChange={(event) =>
                                setCodigoAemetManual(event.target.value)
                            }
                            placeholder="Ej: 07300"
                            aria-invalid={
                                errorCampo('codigo_municipio_aemet')
                                    ? 'true'
                                    : 'false'
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Codigo de municipio de AEMET OpenData (5 digitos).
                            Si no se especifica, se calculara automaticamente
                            desde las coordenadas.
                        </p>
                        <InputError
                            message={errorCampo('codigo_municipio_aemet')}
                        />
                    </div>
                </div>
            )}

            {pasoActual === 2 && (
                <div className="flex flex-col gap-5">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="sitio-activa"
                                checked={data.activa}
                                onCheckedChange={(checked) =>
                                    setSitioData('activa', checked === true)
                                }
                            />
                            <div className="flex flex-col gap-1">
                                <Label
                                    htmlFor="sitio-activa"
                                    className="cursor-pointer"
                                >
                                    Sitio activo desde el guardado
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Si lo desactivas, quedara guardado pero no
                                    disponible para operacion hasta activarlo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/20">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                <Rocket className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Revisa los datos antes de guardar el sitio
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
                            <dl className="flex flex-col gap-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Organizacion
                                    </dt>
                                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                                        {organizacionSeleccionada?.nombre ??
                                            'Sin organizacion seleccionada'}
                                    </dd>
                                </div>
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
                                Localizacion y estado
                            </div>
                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <MapPin className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Ubicacion
                                        </div>
                                        <p className="text-muted-foreground">
                                            {data.ubicacion.trim() ||
                                                'Sin ubicacion textual'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <MapPin className="mt-0.5 h-4 w-4 text-violet-600 dark:text-violet-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Coordenadas
                                        </div>
                                        <p className="text-muted-foreground">
                                            {data.latitud && data.longitud
                                                ? `${data.latitud}, ${data.longitud}`
                                                : 'Sin coordenadas seleccionadas'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            Estado
                                        </div>
                                        <p className="text-muted-foreground">
                                            {data.activa
                                                ? 'Activo y disponible.'
                                                : 'Guardado en estado inactivo.'}
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.visit(cancelUrl)}
                    >
                        Cancelar
                    </Button>
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
                            {processing ? processingLabel : submitLabel}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
