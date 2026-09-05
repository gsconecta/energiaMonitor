import { type CampoConexion } from '@/components/dispositivos/campos-conexion';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { router, useForm } from '@inertiajs/react';

export interface OpcionDriver {
    value: string;
    label: string;
    disponible: boolean;
    campos_conexion: CampoConexion[];
}

export interface OpcionesFormulario {
    drivers: OpcionDriver[];
    modos: { value: string; label: string }[];
    magnitudes: { value: string; label: string }[];
}

export interface ModeloDispositivo {
    id: number;
    codigo: string;
    fabricante: string;
    familia: string | null;
    nombre: string;
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    num_canales: number;
    modo_canales_por_defecto: string;
    modo_canales_configurable: boolean;
    magnitudes: string[];
    activo: boolean;
    notas: string | null;
    dispositivos_count: number;
}

type DatosFormulario = {
    codigo: string;
    fabricante: string;
    familia: string;
    nombre: string;
    driver: string;
    num_canales: number;
    modo_canales_por_defecto: string;
    modo_canales_configurable: boolean;
    magnitudes: string[];
    activo: boolean;
    notas: string;
};

interface Props {
    opciones: OpcionesFormulario;
    modelo?: ModeloDispositivo;
}

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

// Quita acentos (vía NFD + rango de marcas diacríticas combinantes U+0300-U+036F) para que el código propuesto sea siempre ASCII.
function proponerCodigo(fabricante: string, nombre: string): string {
    return `${fabricante} ${nombre}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function FormularioModelo({ opciones, modelo }: Props) {
    const modoEdicion = modelo !== undefined;
    const { data, setData, post, put, processing, errors } = useForm<DatosFormulario>({
        codigo: modelo?.codigo ?? '',
        fabricante: modelo?.fabricante ?? '',
        familia: modelo?.familia ?? '',
        nombre: modelo?.nombre ?? '',
        driver: modelo?.driver ?? opciones.drivers[0]?.value ?? '',
        num_canales: modelo?.num_canales ?? 3,
        modo_canales_por_defecto: modelo?.modo_canales_por_defecto ?? 'fases',
        modo_canales_configurable: modelo?.modo_canales_configurable ?? false,
        magnitudes: modelo?.magnitudes ?? [],
        activo: modelo?.activo ?? true,
        notas: modelo?.notas ?? '',
    });

    const driverElegido = opciones.drivers.find((driver) => driver.value === data.driver);

    const actualizarIdentidad = (campo: 'fabricante' | 'nombre', valor: string) => {
        const siguiente = { ...data, [campo]: valor };
        setData({
            ...siguiente,
            codigo: modoEdicion ? data.codigo : proponerCodigo(siguiente.fabricante, siguiente.nombre),
        });
    };

    const alternarMagnitud = (valor: string, marcada: boolean) => {
        setData(
            'magnitudes',
            marcada ? [...data.magnitudes, valor] : data.magnitudes.filter((m) => m !== valor),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modoEdicion) {
            put(`/admin/modelos-dispositivo/${modelo.id}`);
        } else {
            post('/admin/modelos-dispositivo');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="fabricante">
                        Fabricante <span className="text-red-500">*</span>
                    </Label>
                    <Input id="fabricante" value={data.fabricante} onChange={(e) => actualizarIdentidad('fabricante', e.target.value)} required placeholder="Shelly" />
                    <InputError message={errors.fabricante} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="nombre">
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input id="nombre" value={data.nombre} onChange={(e) => actualizarIdentidad('nombre', e.target.value)} required placeholder="Shelly Pro 3EM" />
                    <InputError message={errors.nombre} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="familia">Familia</Label>
                    <Input id="familia" value={data.familia} onChange={(e) => setData('familia', e.target.value)} placeholder="Pro EM" />
                    <InputError message={errors.familia} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="codigo">
                        Código <span className="text-red-500">*</span>
                    </Label>
                    <Input id="codigo" value={data.codigo} onChange={(e) => setData('codigo', e.target.value)} readOnly={modoEdicion} required className="font-mono" />
                    <p className="text-xs text-muted-foreground">
                        {modoEdicion ? 'El código no se puede cambiar: lo usan seeders y logs.' : 'Se propone a partir de fabricante y nombre; puedes ajustarlo antes de guardar.'}
                    </p>
                    <InputError message={errors.codigo} />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="driver">
                        Driver <span className="text-red-500">*</span>
                    </Label>
                    <select id="driver" value={data.driver} onChange={(e) => setData('driver', e.target.value)} className={selectClassName} required>
                        {opciones.drivers.map((driver) => (
                            <option key={driver.value} value={driver.value}>
                                {driver.label} {driver.disponible ? '' : '(pendiente de lector)'}
                            </option>
                        ))}
                    </select>
                    {driverElegido && !driverElegido.disponible && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">Este driver aún no tiene lector: los dispositivos de este modelo se darán de alta pero no se leerán.</p>
                    )}
                    <InputError message={errors.driver} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="num_canales">
                        Nº de canales <span className="text-red-500">*</span>
                    </Label>
                    <select id="num_canales" value={data.num_canales} onChange={(e) => setData('num_canales', parseInt(e.target.value))} className={selectClassName}>
                        {[1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.num_canales} />
                </div>
            </div>

            <div className="grid gap-3 rounded-md border p-4">
                <Label>Modo de canales por defecto</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                    {opciones.modos.map((modo) => (
                        <label key={modo.value} className="flex items-center gap-2 text-sm">
                            <input type="radio" name="modo_canales_por_defecto" value={modo.value} checked={data.modo_canales_por_defecto === modo.value} onChange={() => setData('modo_canales_por_defecto', modo.value)} />
                            {modo.label}
                        </label>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={data.modo_canales_configurable} onCheckedChange={(v) => setData('modo_canales_configurable', v === true)} />
                    El instalador puede cambiar el modo en cada dispositivo
                </label>
                <InputError message={errors.modo_canales_por_defecto} />
            </div>

            <div className="grid gap-3 rounded-md border p-4">
                <Label>Magnitudes que aporta</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {opciones.magnitudes.map((magnitud) => (
                        <label key={magnitud.value} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={data.magnitudes.includes(magnitud.value)} onCheckedChange={(v) => alternarMagnitud(magnitud.value, v === true)} />
                            {magnitud.label}
                        </label>
                    ))}
                </div>
                <InputError message={errors.magnitudes} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" value={data.notas} onChange={(e) => setData('notas', e.target.value)} rows={3} />
                <InputError message={errors.notas} />
            </div>

            <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={data.activo} onCheckedChange={(v) => setData('activo', v === true)} />
                Activo (seleccionable al dar de alta dispositivos)
            </label>

            <div className="flex gap-3">
                <Button type="submit" disabled={processing} className="flex-1">
                    {processing ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Crear modelo'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/modelos-dispositivo')} className="flex-1">
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
