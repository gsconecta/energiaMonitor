<?php

use Tests\TestCase;

uses(TestCase::class);

it('declares an installable mobile web app manifest', function () {
    $manifestPath = public_path('manifest.webmanifest');

    expect($manifestPath)->toBeFile();

    $manifest = json_decode(
        file_get_contents($manifestPath),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    expect($manifest)
        ->toHaveKey('name', 'Energía Monitor')
        ->toHaveKey('short_name', 'Energía')
        ->toHaveKey('start_url', '/dashboard')
        ->toHaveKey('scope', '/')
        ->toHaveKey('display', 'standalone')
        ->toHaveKey('orientation', 'portrait')
        ->toHaveKey('theme_color')
        ->toHaveKey('background_color')
        ->and($manifest['icons'])->toContain(
            [
                'src' => '/icons/icon-192x192.png',
                'sizes' => '192x192',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => '/icons/icon-512x512.png',
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => '/icons/maskable-icon-512x512.png',
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'maskable',
            ],
        );
});

it('provides correctly sized pwa icons', function () {
    $icons = [
        public_path('icons/icon-192x192.png') => [192, 192],
        public_path('icons/icon-512x512.png') => [512, 512],
        public_path('icons/maskable-icon-192x192.png') => [192, 192],
        public_path('icons/maskable-icon-512x512.png') => [512, 512],
    ];

    foreach ($icons as $path => $expectedSize) {
        expect($path)->toBeFile();

        [$width, $height] = getimagesize($path);

        expect([$width, $height])->toBe($expectedSize);
    }
});

it('adds mobile app metadata to the base html shell', function () {
    $html = file_get_contents(resource_path('views/app.blade.php'));

    expect($html)
        ->toContain('content="width=device-width, initial-scale=1, viewport-fit=cover"')
        ->toContain('<link rel="manifest" href="/manifest.webmanifest">')
        ->toContain('name="mobile-web-app-capable" content="yes"')
        ->toContain('name="apple-mobile-web-app-capable" content="yes"')
        ->toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"')
        ->toContain('name="apple-mobile-web-app-title"')
        ->toContain('name="theme-color"');
});

it('registers a conservative service worker for static assets only', function () {
    $app = file_get_contents(resource_path('js/app.tsx'));
    $registration = file_get_contents(resource_path('js/register-service-worker.ts'));
    $worker = file_get_contents(public_path('service-worker.js'));

    expect($app)
        ->toContain("import './register-service-worker';")
        ->and($registration)
        ->toContain("navigator.serviceWorker")
        ->toContain(".register('/service-worker.js')")
        ->toContain('import.meta.env.PROD')
        ->and($worker)
        ->toContain('CACHE_NAME')
        ->toContain('/manifest.webmanifest')
        ->toContain("request.mode === 'navigate'")
        ->toContain("pathname.startsWith('/dashboard')")
        ->toContain("pathname.startsWith('/api')");
});

it('mounts a small install prompt banner when the browser can install the app', function () {
    $app = file_get_contents(resource_path('js/app.tsx'));
    $bannerPath = resource_path('js/components/install-app-banner.tsx');

    expect($bannerPath)->toBeFile();

    $banner = file_get_contents($bannerPath);

    expect($app)
        ->toContain("import InstallAppBanner from './components/install-app-banner';")
        ->toContain('<InstallAppBanner />')
        ->and($banner)
        ->toContain('beforeinstallprompt')
        ->toContain('appinstalled')
        ->toContain('display-mode: standalone')
        ->toContain('navigatorWithStandalone.standalone')
        ->toContain('energia-monitor-install-banner-dismissed')
        ->toContain('localStorage')
        ->toContain("import AppLogoIcon from '@/components/app-logo-icon';")
        ->toContain('Instala Energía Monitor')
        ->toContain('Instalar')
        ->toContain('Añadir a inicio')
        ->toContain('className="flex size-10 shrink-0 items-center justify-center"')
        ->toContain('fixed inset-x-4')
        ->toContain('bottom-[calc(env(safe-area-inset-bottom)+1rem)]');

    expect($banner)
        ->not->toContain('Abre el dashboard desde tu pantalla de inicio.')
        ->not->toContain('Download')
        ->not->toContain('ring-slate-200')
        ->not->toContain('dark:ring-slate-700')
        ->not->toContain('shadow-sm');
});

it('declares the webmanifest mime type for apache deployments', function () {
    $htaccess = file_get_contents(public_path('.htaccess'));

    expect($htaccess)->toContain('AddType application/manifest+json .webmanifest');
});
