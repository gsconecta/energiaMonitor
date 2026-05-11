<?php

it('uses the shared sitio form with organization-style shadcn controls', function () {
    $resourcePath = dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'resources';
    $createPage = file_get_contents($resourcePath.'/js/pages/Sitios/Create.tsx');
    $editPage = file_get_contents($resourcePath.'/js/pages/Sitios/Edit.tsx');
    $formPath = $resourcePath.'/js/components/sitios/sitio-form.tsx';

    expect($createPage)->toContain('@/components/sitios/sitio-form');
    expect($editPage)->toContain('@/components/sitios/sitio-form');
    expect($createPage)->toContain('@/components/ui/card');
    expect($editPage)->toContain('@/components/ui/card');
    expect(file_exists($formPath))->toBeTrue();

    $form = file_get_contents($formPath);

    expect($form)->toContain('@/components/ui/button');
    expect($form)->toContain('@/components/ui/checkbox');
    expect($form)->toContain('@/components/ui/input');
    expect($form)->toContain('@/components/ui/label');
    expect($form)->toContain('@/components/ui/select');
    expect($form)->toContain('@/components/ui/textarea');
    expect($form)->toContain('pasos');
    expect($form)->toContain('LocationPicker');
});

it('prevents the next button from submitting when it advances to review', function () {
    $resourcePath = dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'resources';
    $form = file_get_contents($resourcePath.'/js/components/sitios/sitio-form.tsx');

    expect((bool) preg_match(
        '/const avanzar = \(event: [^)]+\) => \{\s*event\.preventDefault\(\);/s',
        $form,
    ))->toBeTrue();
    expect($form)->toContain('onClick={avanzar}');
});

it('auto-fills the aemet code from the location picker without overwriting manual input', function () {
    $resourcePath = dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'resources';
    $form = file_get_contents($resourcePath.'/js/components/sitios/sitio-form.tsx');
    $locationPicker = file_get_contents($resourcePath.'/js/components/LocationPicker.tsx');

    expect($locationPicker)->toContain('onAemetCodeResolved?: (codigo: string) => void');
    expect($locationPicker)->toContain('/api/location/aemet-code?lat=');
    expect($locationPicker)->toContain('onAemetCodeResolved(String(data.codigo_municipio_aemet))');

    expect($form)->toContain('codigoAemetEditadoManualmenteRef');
    expect($form)->toContain('const setCodigoAemetManual = (value: string) =>');
    expect($form)->toContain('const aplicarCodigoAemetAutomatico = (codigo: string) =>');
    expect($form)->toContain('onAemetCodeResolved={aplicarCodigoAemetAutomatico}');
});

it('does not leave debug console logs in the location picker', function () {
    $resourcePath = dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'resources';
    $locationPicker = file_get_contents($resourcePath.'/js/components/LocationPicker.tsx');

    expect($locationPicker)->not->toContain('console.log');
});
