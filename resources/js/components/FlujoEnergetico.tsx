import { Sun, Zap, HandCoins } from 'lucide-react';

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
    const calcularArco = (
        porcentaje: number,
        offset: number = 0
    ): string => {
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
        <div className="mx-auto w-full max-w-[500px] rounded-lg border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border dark:bg-gray-800">
            {/* Título Independencia Energética */}
            <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-500">
                    Independencia Energética {independenciaEnergetica.toFixed(0)}%
                </h3>
            </div>

            {/* Contenedor principal con posición relativa */}
            <div className="relative flex min-h-[450px] flex-col items-center justify-between py-4">
                {/* Arco semicircular */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2" style={{ width: '400px', height: '200px' }}>
                    <svg
                        width="400"
                        height="200"
                        viewBox="0 0 400 200"
                        className="overflow-visible"
                    >
                        {/* Arco amarillo (producción solar) - desde la izquierda */}
                        {porcentajeSolar > 0 && (
                            <path
                                d={calcularArco(porcentajeSolar)}
                                stroke="rgb(251, 191, 36)"
                                strokeWidth={grosor}
                                fill="none"
                                strokeLinecap={porcentajeRed > 0 ? "butt" : "round"}
                                strokeLinejoin="round"
                            />
                        )}
                        {/* Arco azul (red eléctrica) - solo si está consumiendo, continúa desde donde termina el amarillo */}
                        {!estaExportando && porcentajeRed > 0 && (
                            <path
                                d={calcularArco(
                                    porcentajeRed,
                                    (Math.PI * porcentajeSolar) / 100
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
                <div className="relative z-10 mt-40 flex w-full items-center justify-between px-8">
                    {/* Lado izquierdo - Producción Solar */}
                    <div className="flex flex-col items-center">
                        <div className="mb-3 flex flex-col items-center">
                            <Sun className="h-14 w-14 text-yellow-500" />
                            <div className="mt-3 h-1.5 w-32 bg-yellow-500"></div>
                        </div>
                        <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Producción Solar
                        </p>
                        <p className="text-2xl font-bold text-yellow-500">
                            {formatearValor(produccionSolar)}
                        </p>
                    </div>

                    {/* Icono de casa central */}
                    <div className="flex flex-col items-center">
                        <img
                            src="/house-icon.svg"
                            alt="Casa"
                            className="h-24 w-24 drop-shadow-lg"
                        />
                    </div>

                    {/* Lado derecho - Red Eléctrica o Exportación */}
                    <div className="flex flex-col items-center">
                        {estaExportando ? (
                            <>
                                <div className="mb-3 flex flex-col items-center">
                                    <HandCoins className="h-14 w-14 text-green-500" />
                                    <div className="mt-3 h-1.5 w-32 bg-green-500"></div>
                                </div>
                                <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Exportación
                                </p>
                                <p className="text-2xl font-bold text-green-500">
                                    {formatearValor(exportacion)}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mb-3 flex flex-col items-center">
                                    <Zap className="h-14 w-14 text-blue-500" />
                                    <div className="mt-3 h-1.5 w-32 bg-blue-500"></div>
                                </div>
                                <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Red Eléctrica
                                </p>
                                <p className="text-2xl font-bold text-blue-500">
                                    {formatearValor(Math.abs(redElectrica))}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Consumo Total debajo de la casa */}
                <div className="mt-6 flex flex-col items-center">
                    <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                        {formatearValor(consumoTotal)}
                    </p>
                    <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                        Consumo
                    </p>
                </div>
            </div>
        </div>
    );
}
