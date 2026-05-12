<?php

use Tests\TestCase;

uses(TestCase::class);

it('identifica las metricas residenciales con iconos y no con titulos visibles', function () {
    $source = file_get_contents(base_path('resources/js/pages/Dashboard/DashboardResidencial.tsx'));

    expect($source)->toContain('function MetricCard')
        ->and($source)->toContain('aria-label={label}')
        ->and($source)->toContain('title={label}')
        ->and($source)->toContain('sr-only')
        ->and($source)->toContain('HandCoins')
        ->and($source)->toContain('icon={HandCoins}')
        ->and($source)->toContain('imageSrc="/house-icon.svg"')
        ->and($source)->toContain('min-h-[112px] w-full max-w-[170px] p-2')
        ->and($source)->toContain('justify-center')
        ->and($source)->toContain('grid-cols-[repeat(auto-fit,minmax(146px,170px))]')
        ->and($source)->toContain('h-14 w-14')
        ->and($source)->toContain('text-3xl')
        ->and($source)->not->toContain('min-h-[96px] w-full max-w-[156px] rounded-lg border bg-white p-3 shadow-sm')
        ->and($source)->not->toContain('bg-yellow-50 text-yellow-500')
        ->and($source)->not->toContain('bg-green-50 text-green-500')
        ->and($source)->not->toContain('bg-gray-50 text-gray-900')
        ->and($source)->not->toContain('text-sm font-medium text-gray-500 dark:text-gray-400');
});

it('prioriza una experiencia de app de consumo electrico en movil', function () {
    $source = file_get_contents(base_path('resources/js/pages/Dashboard/DashboardResidencial.tsx'));

    expect($source)->toContain('function MobileEnergyOverview')
        ->and($source)->toContain('Consumo ahora')
        ->and($source)->toContain('sm:hidden')
        ->and($source)->toContain('hidden grid-cols-[repeat(auto-fit,minmax(146px,170px))]')
        ->and($source)->toContain('sm:grid')
        ->and($source)->toContain('pb-[calc(env(safe-area-inset-bottom)+1.5rem)]')
        ->and($source)->toContain('rounded-[2rem]')
        ->and($source)->toContain('text-5xl')
        ->and($source)->toContain('mobile-app-section')
        ->and($source)->toContain('mobile-chart-panel')
        ->and($source)->toContain('Hoy');
});
