import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    Gauge,
    Leaf,
    ShieldCheck,
    Smartphone,
    SunMedium,
    Wifi,
    Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

const phaseColors = ['#ef4444', '#22c55e', '#eab308'] as const;

const featureCards = [
    {
        icon: BarChart3,
        title: 'Vision energetica en tiempo real',
        description:
            'Sigue la generacion fotovoltaica, los consumos y el intercambio con red con una lectura clara y accionable.',
    },
    {
        icon: Gauge,
        title: 'Supervision para vivienda e industria',
        description:
            'Desde hogares residenciales hasta grandes consumidores, la plataforma adapta la visualizacion al contexto de uso.',
    },
    {
        icon: Smartphone,
        title: 'Alertas que ayudan a reaccionar',
        description:
            'Detecta desviaciones, consumos anormales y eventos relevantes antes de que se conviertan en un problema.',
    },
    {
        icon: ShieldCheck,
        title: 'Simulacion de gastos y consumos',
        description:
            'Explora escenarios de consumo y coste para tomar mejores decisiones operativas y economicas.',
    },
];

const signals = [
    {
        label: 'Fase L1',
        value: '232 V',
        detail: 'Carga estable',
        color: phaseColors[0],
    },
    {
        label: 'Fase L2',
        value: '228 V',
        detail: 'Optimo',
        color: phaseColors[1],
    },
    {
        label: 'Fase L3',
        value: '230 V',
        detail: 'Balanceada',
        color: phaseColors[2],
    },
];

const timelineBars = [34, 52, 47, 72, 58, 81, 66, 89, 76, 93, 71, 85];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="energiaMonitor">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=montserrat:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#163045_0%,#08141f_45%,#050b12_100%)] text-white">
                <div className="welcome-grid pointer-events-none absolute inset-0 opacity-40" />
                <div className="welcome-orb absolute top-[-8rem] left-[-6rem] h-72 w-72 rounded-full bg-[#ef4444]/20 blur-3xl" />
                <div className="welcome-orb welcome-orb-delay absolute top-32 right-[-4rem] h-80 w-80 rounded-full bg-[#22c55e]/20 blur-3xl" />
                <div className="welcome-orb absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-[#eab308]/15 blur-3xl" />

                <header className="relative z-10">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                        <Link
                            href={auth.user ? dashboard() : '/'}
                            className="group inline-flex items-center gap-3"
                        >
                            <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                                <img
                                    src="/logo-sidebar.svg"
                                    alt="energiaMonitor"
                                    className="h-9 w-9 sm:h-10 sm:w-10"
                                />
                            </div>
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.38em] text-white/55">
                                    Energy Intelligence
                                </div>
                                <div className="text-lg font-semibold tracking-tight text-white transition-opacity group-hover:opacity-90">
                                    energiaMonitor
                                </div>
                            </div>
                        </Link>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition-transform duration-300 hover:-translate-y-0.5"
                                >
                                    Ir al dashboard
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-xl transition-colors hover:bg-white/12"
                                    >
                                        Iniciar sesion
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(255,255,255,0.15)] transition-transform duration-300 hover:-translate-y-0.5"
                                    >
                                        Crear cuenta
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="relative z-10">
                    <section className="mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12 lg:px-8 lg:pt-16 lg:pb-28">
                        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="max-w-2xl">
                                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-sm text-white/80 backdrop-blur-xl">
                                    <SunMedium className="h-4 w-4 text-[#eab308]" />
                                    Monitorizacion fotovoltaica, consumos y
                                    alertas inteligentes
                                </div>

                                <h1 className="max-w-4xl text-5xl leading-none font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl">
                                    Entiende en segundos como produce, consume
                                    y cuesta tu energia.
                                </h1>

                                <p className="mt-6 max-w-xl text-base leading-8 text-white/[0.72] sm:text-lg">
                                    energiaMonitor ofrece una visualizacion
                                    clara del estado de la generacion
                                    fotovoltaica y de los consumos, tanto en
                                    viviendas residenciales como en entornos
                                    industriales de gran demanda. Supervisa en
                                    tiempo real, recibe alertas y simula gastos
                                    y escenarios de consumo desde una sola
                                    plataforma.
                                </p>

                                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                    {auth.user ? (
                                        <Link
                                            href={dashboard()}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_20px_70px_rgba(255,255,255,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
                                        >
                                            Abrir dashboard
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={register()}
                                                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_20px_70px_rgba(255,255,255,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
                                            >
                                                Empezar ahora
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={login()}
                                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-7 py-3.5 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/12"
                                            >
                                                Acceder
                                                <Wifi className="h-4 w-4 text-[#22c55e]" />
                                            </Link>
                                        </>
                                    )}
                                </div>

                                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                    <StatCard
                                        value="24/7"
                                        label="supervision continua"
                                    />
                                    <StatCard
                                        value="Alertas"
                                        label="deteccion temprana"
                                    />
                                    <StatCard
                                        value="Simulacion"
                                        label="costes y consumos"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <div className="welcome-float relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6">
                                    <div className="welcome-sheen pointer-events-none absolute inset-0 opacity-70" />

                                    <div className="relative z-10 rounded-[1.6rem] border border-white/10 bg-[#07111b]/85 p-5 sm:p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
                                                    Live Energy Canvas
                                                </p>
                                                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                                                    Estado energetico general
                                                </h2>
                                            </div>
                                            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                                                Sistema operativo
                                            </div>
                                        </div>

                                        <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                                            <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/5 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-white/55">
                                                            Balance instantaneo
                                                        </p>
                                                        <p className="mt-1 text-4xl font-semibold tracking-tight">
                                                            18.4 kW
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl bg-white/[0.08] p-3">
                                                        <Zap className="h-6 w-6 text-[#eab308]" />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex h-44 items-end gap-2">
                                                    {timelineBars.map(
                                                        (height, index) => (
                                                            <div
                                                                key={index}
                                                                className="group relative flex-1 overflow-hidden rounded-t-full bg-white/[0.06]"
                                                            >
                                                                <div
                                                                    className="absolute right-0 bottom-0 left-0 rounded-t-full transition-transform duration-500 group-hover:scale-y-105"
                                                                    style={{
                                                                        height: `${height}%`,
                                                                        background:
                                                                            index % 3 ===
                                                                            0
                                                                                ? 'linear-gradient(180deg, rgba(239,68,68,0.95) 0%, rgba(239,68,68,0.25) 100%)'
                                                                                : index %
                                                                                        3 ===
                                                                                      1
                                                                                    ? 'linear-gradient(180deg, rgba(34,197,94,0.95) 0%, rgba(34,197,94,0.25) 100%)'
                                                                                    : 'linear-gradient(180deg, rgba(234,179,8,0.95) 0%, rgba(234,179,8,0.22) 100%)',
                                                                    }}
                                                                />
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                                                    <MetricTile
                                                        label="Generacion FV"
                                                        value="9.7 kW"
                                                        accent="text-[#eab308]"
                                                    />
                                                    <MetricTile
                                                        label="Consumo"
                                                        value="6.2 kW"
                                                        accent="text-white"
                                                    />
                                                    <MetricTile
                                                        label="Coste estimado"
                                                        value="EUR 42"
                                                        accent="text-[#22c55e]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/5 p-4">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <p className="text-sm text-white/55">
                                                            Estado por fases
                                                        </p>
                                                        <Leaf className="h-4 w-4 text-[#22c55e]" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        {signals.map((signal) => (
                                                            <div
                                                                key={signal.label}
                                                                className="rounded-2xl border border-white/[0.08] bg-black/20 p-3"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span
                                                                            className="h-2.5 w-2.5 rounded-full shadow-[0_0_20px_currentColor]"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    signal.color,
                                                                                color: signal.color,
                                                                            }}
                                                                        />
                                                                        <div>
                                                                            <p className="text-sm font-medium">
                                                                                {signal.label}
                                                                            </p>
                                                                            <p className="text-xs text-white/45">
                                                                                {signal.detail}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm font-semibold">
                                                                        {signal.value}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                                                    <GlassKpi
                                                        title="Alertas"
                                                        value="3 activas"
                                                        helper="seguimiento en curso"
                                                        icon={Wifi}
                                                    />
                                                    <GlassKpi
                                                        title="Simulacion"
                                                        value="-18%"
                                                        helper="ahorro potencial detectado"
                                                        icon={BadgeCheck}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
                        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
                                    Sistema cromatico
                                </p>
                                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                                    Una lectura visual pensada para decidir mas
                                    rapido.
                                </h3>
                                <p className="mt-3 max-w-lg text-sm leading-7 text-white/65">
                                    Los colores de fase conectan la identidad de
                                    la landing con dashboards, informes y
                                    paneles de operacion para facilitar la
                                    interpretacion del sistema de un vistazo.
                                </p>

                                <div className="mt-6 flex flex-wrap gap-3">
                                    <PhaseChip
                                        name="Canal 1"
                                        hex="#ef4444"
                                        meaning="Fase L1"
                                    />
                                    <PhaseChip
                                        name="Canal 2"
                                        hex="#22c55e"
                                        meaning="Fase L2"
                                    />
                                    <PhaseChip
                                        name="Canal 3"
                                        hex="#eab308"
                                        meaning="Fase L3"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {featureCards.map((feature) => (
                                    <FeatureCard key={feature.title} {...feature} />
                                ))}
                            </div>
                        </div>
                    </section>

                    {!auth.user && (
                        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
                            <div className="overflow-hidden rounded-[2.2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-8 shadow-[0_30px_110px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-10">
                                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">
                                            Nueva experiencia welcome
                                        </p>
                                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                                            Controla generacion, consumo y coste
                                            desde una sola vista.
                                        </h2>
                                        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/[0.68] sm:text-base">
                                            Pensada para instalaciones
                                            residenciales y grandes consumidores,
                                            con supervision continua, alertas y
                                            simulacion para mejorar cada
                                            decision energetica.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                                        <Link
                                            href={register()}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 transition-transform duration-300 hover:-translate-y-0.5"
                                        >
                                            Crear cuenta
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Link
                                            href={login()}
                                            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/12"
                                        >
                                            Iniciar sesion
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}

function StatCard({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl">
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            <div className="mt-1 text-sm text-white/[0.58]">{label}</div>
        </div>
    );
}

function MetricTile({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
            <p className="text-xs text-white/45">{label}</p>
            <p className={`mt-1 text-lg font-semibold tracking-tight ${accent}`}>
                {value}
            </p>
        </div>
    );
}

function GlassKpi({
    title,
    value,
    helper,
    icon: Icon,
}: {
    title: string;
    value: string;
    helper: string;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-white/55">{title}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-white/[0.42]">{helper}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.08] p-3">
                    <Icon className="h-5 w-5 text-white/80" />
                </div>
            </div>
        </div>
    );
}

function PhaseChip({
    name,
    hex,
    meaning,
}: {
    name: string;
    hex: string;
    meaning: string;
}) {
    return (
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 backdrop-blur-xl">
            <span
                className="h-3 w-3 rounded-full shadow-[0_0_24px_currentColor]"
                style={{ backgroundColor: hex, color: hex }}
            />
            <span className="text-sm font-medium text-white">{name}</span>
            <span className="text-xs text-white/45">{meaning}</span>
        </div>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="group rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-white/[0.09]">
            <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-black/20 p-3">
                <Icon className="h-5 w-5 text-white/85" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
                {description}
            </p>
        </div>
    );
}
