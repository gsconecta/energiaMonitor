import { HandCoins, Leaf, Sun, Zap } from 'lucide-react';

interface Props {
    produccionSolar: number; // kW
    redElectrica: number; // kW (puede ser positivo o negativo)
    exportacion: number; // kW (solo positivo cuando red es negativa)
    consumoTotal: number; // kW
}

export default function FlujoEnergetico({
    produccionSolar,
    redElectrica,
    exportacion,
    consumoTotal,
}: Props) {
    // Calcular independencia energética
    const independenciaEnergetica =
        consumoTotal > 0
            ? Math.min(100, (produccionSolar / consumoTotal) * 100)
            : 0;

    // Determinar estado: consumiendo red o exportando
    const estaExportando = redElectrica < 0;

    // Calcular porcentajes para el arco
    const porcentajeSolar = estaExportando
        ? 100 // Si está exportando, el arco es completamente amarillo
        : consumoTotal > 0
          ? (produccionSolar / consumoTotal) * 100
          : 0;
    const porcentajeRed =
        consumoTotal > 0 && redElectrica > 0 && !estaExportando
            ? (redElectrica / consumoTotal) * 100
            : 0;

    // Formatear valores: convertir kW a W y agregar separadores de miles
    const formatearValor = (valorKw: number): string => {
        const valorW = Math.round(valorKw * 1000);
        return valorW.toLocaleString('es-ES') + ' W';
    };

    // Parámetros para el arco semicircular
    const radio = 150;
    const centroX = 200;
    const centroY = 150;
    const grosor = 20;

    // Calcular el arco (de izquierda a derecha, curvándose hacia abajo)
    const calcularArco = (porcentaje: number, offset: number = 0): string => {
        // El arco va de 180° (izquierda) hacia 0° (derecha), curvándose hacia abajo
        // En coordenadas SVG: 0° = derecha, 90° = abajo, 180° = izquierda
        // Usamos dirección horaria (sweep-flag = 1) para que se curve hacia abajo
        const anguloInicio = Math.PI + offset; // Empieza desde la izquierda (180°)
        const anguloFin = Math.PI + offset + (Math.PI * porcentaje) / 100; // Se mueve hacia la derecha

        const x1 = centroX + radio * Math.cos(anguloInicio);
        const y1 = centroY + radio * Math.sin(anguloInicio);
        const x2 = centroX + radio * Math.cos(anguloFin);
        const y2 = centroY + radio * Math.sin(anguloFin);

        // Calcular largeArcFlag basándose en el ángulo total del arco
        // El arco va desde anguloInicio hasta anguloFin
        // Si la diferencia es mayor a 180° (π radianes), usar large arc
        // Para un semicírculo (0 a 180°), siempre usamos el arco pequeño (largeArcFlag = 0)
        const diferenciaAngular = (Math.PI * porcentaje) / 100;
        const largeArcFlag = diferenciaAngular > Math.PI ? 1 : 0;

        // Cambiar sweep-flag a 1 para dirección horaria (curva hacia abajo)
        // Usar el mismo radio para ambos ejes para asegurar un círculo perfecto
        return `M ${x1} ${y1} A ${radio} ${radio} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    };

    return (
        <div className="mobile-app-section mx-auto w-full max-w-[500px] rounded-[1.75rem] bg-white p-4 shadow-sm shadow-slate-200/60 sm:rounded-lg sm:border sm:border-sidebar-border/70 sm:p-6 dark:bg-gray-900 dark:shadow-none dark:sm:border-sidebar-border dark:sm:bg-gray-800">
            {/* Título Independencia Energética */}
            <div className="mb-4 text-center sm:mb-6">
                <h3 className="inline-flex items-center justify-center gap-2 text-xl font-bold text-green-600 sm:text-2xl dark:text-green-500">
                    <Leaf
                        className="h-6 w-6 shrink-0 text-green-500 sm:h-7 sm:w-7 dark:text-green-300"
                        aria-hidden="true"
                    />
                    <span>
                        Independencia Energética{' '}
                        {independenciaEnergetica.toFixed(0)}%
                    </span>
                </h3>
            </div>

            {/* Contenedor principal con posición relativa */}
            <div className="relative flex min-h-[330px] flex-col items-center justify-between py-3 sm:min-h-[450px] sm:py-4">
                {/* Arco semicircular */}
                <div className="absolute top-5 left-1/2 h-[150px] w-[min(100%,320px)] -translate-x-1/2 sm:top-4 sm:h-[200px] sm:w-[400px]">
                    <svg
                        viewBox="0 0 400 200"
                        className="h-full w-full overflow-visible"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* Arco amarillo (producción solar) - desde la izquierda */}
                        {porcentajeSolar > 0 && (
                            <path
                                d={calcularArco(porcentajeSolar)}
                                stroke="rgb(251, 191, 36)"
                                strokeWidth={grosor}
                                fill="none"
                                strokeLinecap={
                                    porcentajeRed > 0 ? 'butt' : 'round'
                                }
                                strokeLinejoin="round"
                            />
                        )}
                        {/* Arco azul (red eléctrica) - solo si está consumiendo, continúa desde donde termina el amarillo */}
                        {!estaExportando && porcentajeRed > 0 && (
                            <path
                                d={calcularArco(
                                    porcentajeRed,
                                    (Math.PI * porcentajeSolar) / 100,
                                )}
                                stroke="rgb(59, 130, 246)"
                                strokeWidth={grosor}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}
                    </svg>
                </div>

                {/* Contenedor horizontal para iconos laterales */}
                <div className="relative z-10 mt-32 flex w-full items-center justify-between px-1 sm:mt-40 sm:px-8">
                    {/* Lado izquierdo - Producción Solar */}
                    <div className="flex flex-col items-center">
                        <div className="mb-3 flex flex-col items-center">
                            <Sun className="h-10 w-10 text-yellow-500 sm:h-14 sm:w-14" />
                            <div className="mt-2 h-1.5 w-20 bg-yellow-500 sm:mt-3 sm:w-32"></div>
                        </div>
                        <p className="mb-1 text-center text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
                            Producción Solar
                        </p>
                        <p className="text-lg font-bold text-yellow-500 sm:text-2xl">
                            {formatearValor(produccionSolar)}
                        </p>
                    </div>

                    {/* Icono de casa central */}
                    <div className="flex flex-col items-center">
                        <img
                            src="/house-icon.svg"
                            alt="Casa"
                            className="h-16 w-16 drop-shadow-lg sm:h-24 sm:w-24"
                        />
                    </div>

                    {/* Lado derecho - Red Eléctrica o Exportación */}
                    <div className="flex flex-col items-center">
                        {estaExportando ? (
                            <>
                                <div className="mb-3 flex flex-col items-center">
                                    <HandCoins className="h-10 w-10 text-green-500 sm:h-14 sm:w-14" />
                                    <div className="mt-2 h-1.5 w-20 bg-green-500 sm:mt-3 sm:w-32"></div>
                                </div>
                                <p className="mb-1 text-center text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
                                    Exportación
                                </p>
                                <p className="text-lg font-bold text-green-500 sm:text-2xl">
                                    {formatearValor(exportacion)}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mb-3 flex flex-col items-center">
                                    <Zap className="h-10 w-10 text-blue-500 sm:h-14 sm:w-14" />
                                    <div className="mt-2 h-1.5 w-20 bg-blue-500 sm:mt-3 sm:w-32"></div>
                                </div>
                                <p className="mb-1 text-center text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
                                    Red Eléctrica
                                </p>
                                <p className="text-lg font-bold text-blue-500 sm:text-2xl">
                                    {formatearValor(Math.abs(redElectrica))}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Consumo Total debajo de la casa */}
                <div className="mt-5 flex flex-col items-center sm:mt-6">
                    <p className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
                        {formatearValor(consumoTotal)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 sm:mt-2 sm:text-base dark:text-gray-400">
                        Consumo
                    </p>
                </div>
            </div>
        </div>
    );
}
