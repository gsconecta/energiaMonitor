import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Cloud,
    Shield,
    TrendingUp,
    Zap,
} from 'lucide-react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Sistema de Monitorización Solar">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-2">
                            <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                Energía Monitor
                            </span>
                        </div>
                        <nav className="flex items-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                >
                                    Ir al Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Iniciar Sesión
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                                    >
                                        Registrarse
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
                        <div className="flex flex-col justify-center">
                            <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
                                Monitoriza tu energía solar en{' '}
                                <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                                    tiempo real
                                </span>
                            </h1>
                            <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                                Sistema completo de monitorización para
                                instalaciones fotovoltaicas. Controla
                                producción, consumo y optimiza tu energía solar.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {!auth.user && (
                                    <>
                                        <Link
                                            href={register()}
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg"
                                        >
                                            <Zap className="h-5 w-5" />
                                            Comenzar Ahora
                                        </Link>
                                        <Link
                                            href={login()}
                                            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 transition-all hover:border-gray-400 hover:shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500"
                                        >
                                            Ver Demo
                                        </Link>
                                    </>
                                )}
                                {auth.user && (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg"
                                    >
                                        <BarChart3 className="h-5 w-5" />
                                        Ir al Dashboard
                                    </Link>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="mt-12 grid grid-cols-3 gap-4">
                                <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        100%
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Tiempo Real
                                    </div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        24/7
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Monitorización
                                    </div>
                                </div>
                                <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        ∞
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Dispositivos
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 p-1 shadow-2xl">
                                <div className="rounded-xl bg-gray-900 p-8">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-400">
                                            Producción Solar
                                        </div>
                                        <Activity className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div className="mb-2 text-4xl font-bold text-white">
                                        3.2 kW
                                    </div>
                                    <div className="mb-6 text-sm text-green-400">
                                        +12% vs ayer
                                    </div>

                                    {/* Gráfica simulada */}
                                    <div className="flex h-32 items-end gap-1">
                                        {[
                                            40, 65, 45, 80, 70, 90, 85, 95, 75,
                                            88, 92, 100,
                                        ].map((height, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-green-400 transition-all hover:opacity-80"
                                                style={{ height: `${height}%` }}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-700 pt-4">
                                        <div>
                                            <div className="text-xs text-gray-400">
                                                Consumo
                                            </div>
                                            <div className="text-lg font-semibold text-white">
                                                1.8 kW
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">
                                                Vertido
                                            </div>
                                            <div className="text-lg font-semibold text-white">
                                                1.4 kW
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">
                                                Ahorro
                                            </div>
                                            <div className="text-lg font-semibold text-green-400">
                                                €24
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="border-t border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-16 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
                                Funcionalidades Principales
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300">
                                Todo lo que necesitas para gestionar tu
                                instalación solar
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            <FeatureCard
                                icon={<TrendingUp className="h-6 w-6" />}
                                title="Monitorización en Tiempo Real"
                                description="Visualiza la producción, consumo y vertido de energía al instante con gráficas interactivas."
                                color="blue"
                            />
                            <FeatureCard
                                icon={<BarChart3 className="h-6 w-6" />}
                                title="Históricos y Estadísticas"
                                description="Accede a datos históricos y analiza el rendimiento de tu instalación por día, semana o mes."
                                color="green"
                            />
                            <FeatureCard
                                icon={<Zap className="h-6 w-6" />}
                                title="Múltiples Dispositivos"
                                description="Gestiona varios medidores Shelly y dispositivos de forma centralizada desde un solo panel."
                                color="purple"
                            />
                            <FeatureCard
                                icon={<Activity className="h-6 w-6" />}
                                title="Alertas Inteligentes"
                                description="Recibe notificaciones cuando detectemos anomalías o dispositivos offline."
                                color="orange"
                            />
                            <FeatureCard
                                icon={<Cloud className="h-6 w-6" />}
                                title="Acceso desde Cualquier Lugar"
                                description="Monitoriza tu instalación desde cualquier dispositivo con conexión a internet."
                                color="cyan"
                            />
                            <FeatureCard
                                icon={<Shield className="h-6 w-6" />}
                                title="Datos Seguros"
                                description="Tus datos están protegidos con encriptación y almacenados de forma segura."
                                color="red"
                            />
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                {!auth.user && (
                    <section className="border-t border-gray-200 py-20 dark:border-gray-700">
                        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
                                ¿Listo para optimizar tu energía solar?
                            </h2>
                            <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                                Comienza a monitorizar tu instalación en minutos
                            </p>
                            <Link
                                href={register()}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg"
                            >
                                <Zap className="h-5 w-5" />
                                Crear Cuenta Gratis
                            </Link>
                        </div>
                    </section>
                )}

                {/* Footer */}
                <footer className="border-t border-gray-200 bg-white py-12 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                Made with{' '}
                                <svg
                                    className="h-4 w-4 text-red-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                        clipRule="evenodd"
                                    />
                                </svg>{' '}
                                by{' '}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    GS Conecta
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red';
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div
                className={`mb-4 inline-flex rounded-lg p-3 ${colorClasses[color]}`}
            >
                {icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </div>
    );
}
