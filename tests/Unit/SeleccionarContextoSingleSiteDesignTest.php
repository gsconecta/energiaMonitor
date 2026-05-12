<?php

it('posts context immediately when an organization has a single site', function () {
    $source = file_get_contents(__DIR__ . '/../../resources/js/pages/SeleccionarContexto/Index.tsx');

    expect($source)
        ->toContain('const postContexto = (organizacionId: number, sitioId: number) =>')
        ->toContain('const seleccionarOrganizacion = (organizacion: Organizacion) =>')
        ->toContain('if (organizacion.sitios.length === 1)')
        ->toContain('postContexto(organizacion.id, sitioUnico.id)')
        ->toContain('setSitioSeleccionado(null)');
});
