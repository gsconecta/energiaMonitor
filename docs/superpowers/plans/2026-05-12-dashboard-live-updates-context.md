# Dashboard Live Updates and Context Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the dashboard online indicator into the context row, auto-select the only site for an organization, and add a Reverb/Echo push path for new readings.

**Architecture:** Backend context selection stays authoritative and accepts a missing `sitio_id` only when the selected organization has one active site. New readings dispatch a private Laravel broadcast event per site, while the dashboard listens with Echo and performs an Inertia partial reload. Frontend changes are scoped to the dashboard header and context selector.

**Tech Stack:** Laravel 12, Inertia React 19, Laravel Broadcasting/Reverb, Laravel Echo, Pusher protocol client, Pest, TypeScript.

---

## Files

- Modify: `app/Http/Controllers/SeleccionarContextoController.php`
- Modify: `resources/js/pages/SeleccionarContexto/Index.tsx`
- Modify: `resources/js/pages/Dashboard/Index.tsx`
- Modify: `app/Models/Lectura.php`
- Create: `app/Events/DashboardLecturaActualizada.php`
- Create/modify via Laravel installer: `config/broadcasting.php`, `config/reverb.php`, `routes/channels.php`, `resources/js/echo.ts`, `.env.example`, `composer.json`, `composer.lock`, `package.json`, `package-lock.json`
- Modify if installer does not: `bootstrap/app.php`
- Test: `tests/Feature/SeleccionarContextoTest.php`
- Test: `tests/Unit/DashboardRealtimeTest.php`
- Test: `tests/Unit/DashboardContextHeaderDesignTest.php`

## Task 1: Single-Site Context Selection Backend

- [ ] **Step 1: Write failing backend test**

Append to `tests/Feature/SeleccionarContextoTest.php`:

```php
use App\Models\Organizacion;
use App\Models\Sitio;

it('auto-selects the only active site when storing an organization without a site id', function () {
    $user = User::factory()->create();

    $organizacion = Organizacion::create([
        'nombre' => 'Org Unica',
        'codigo' => 'org-unica',
        'activa' => true,
    ]);
    $organizacion->users()->attach($user->id, ['rol' => 'owner']);

    $sitio = Sitio::create([
        'organizacion_id' => $organizacion->id,
        'nombre' => 'Site Unico',
        'codigo' => 'site-unico',
        'activa' => true,
    ]);

    $response = $this->actingAs($user)->post(route('seleccionar-contexto.store'), [
        'organizacion_id' => $organizacion->id,
    ]);

    $response
        ->assertRedirect(route('dashboard', absolute: false))
        ->assertSessionHas('organizacion_actual_id', $organizacion->id)
        ->assertSessionHas('sitio_actual_id', $sitio->id);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/SeleccionarContextoTest.php --filter="auto-selects the only active site"`

Expected: FAIL because `sitio_id` is required.

- [ ] **Step 3: Implement backend auto-resolution**

In `SeleccionarContextoController::store`, make `sitio_id` nullable, resolve a single active site after access checks, and return validation errors when there are zero or multiple active sites.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/SeleccionarContextoTest.php --filter="auto-selects the only active site"`

Expected: PASS.

## Task 2: Single-Site Context Selection Frontend

- [ ] **Step 1: Write failing source test**

Create `tests/Unit/SeleccionarContextoSingleSiteDesignTest.php` that asserts the selector contains a helper for selecting an organization, posts immediately when `organizacion.sitios.length === 1`, and still resets the site when there are multiple sites.

- [ ] **Step 2: Run test to verify it fails**

Run: `vendor/bin/pest tests/Unit/SeleccionarContextoSingleSiteDesignTest.php`

Expected: FAIL because the helper/branch does not exist.

- [ ] **Step 3: Implement frontend helper**

In `SeleccionarContexto/Index.tsx`, add `postContexto(organizacionId, sitioId)` and `seleccionarOrganizacion(organizacion)`. Use the helper in organization buttons. For one active site, set both selected ids and immediately post context. For multiple sites, keep the current site-selection flow.

- [ ] **Step 4: Run test to verify it passes**

Run: `vendor/bin/pest tests/Unit/SeleccionarContextoSingleSiteDesignTest.php`

Expected: PASS.

## Task 3: Dashboard Header Layout

- [ ] **Step 1: Write failing source test**

Create `tests/Unit/DashboardContextHeaderDesignTest.php` that asserts the status label appears inside the context block and there is no separate status row before the device selector.

- [ ] **Step 2: Run test to verify it fails**

Run: `vendor/bin/pest tests/Unit/DashboardContextHeaderDesignTest.php`

Expected: FAIL because the status indicator is currently in its own row.

- [ ] **Step 3: Move status indicator**

In `Dashboard/Index.tsx`, extract the online indicator into a small render helper or inline block next to `sitioActual.nombre`, then remove the standalone status row. Keep the device selector below.

- [ ] **Step 4: Run test to verify it passes**

Run: `vendor/bin/pest tests/Unit/DashboardContextHeaderDesignTest.php`

Expected: PASS.

## Task 4: Reverb/Echo Installation and Event

- [ ] **Step 1: Install broadcasting scaffolding**

Run: `php artisan install:broadcasting --reverb --composer=composer --no-interaction`

Expected: creates broadcasting config, Reverb config, channels route, Echo setup, and installs required Composer/NPM packages.

- [ ] **Step 2: Write failing event test**

Create `tests/Unit/DashboardRealtimeTest.php` with manual schema setup and assert that `Lectura::create()` dispatches `App\Events\DashboardLecturaActualizada` with the correct `sitioId`.

- [ ] **Step 3: Run test to verify it fails**

Run: `vendor/bin/pest tests/Unit/DashboardRealtimeTest.php`

Expected: FAIL because the event class/model dispatch does not exist.

- [ ] **Step 4: Implement event dispatch**

Create `DashboardLecturaActualizada` implementing `ShouldBroadcast`. Add `protected $dispatchesEvents = ['created' => DashboardLecturaActualizada::class];` to `Lectura`. Add private channel authorization for `dashboard.site.{sitioId}`.

- [ ] **Step 5: Run test to verify it passes**

Run: `vendor/bin/pest tests/Unit/DashboardRealtimeTest.php`

Expected: PASS.

## Task 5: Dashboard Echo Subscription

- [ ] **Step 1: Write failing source test**

Extend `tests/Unit/DashboardContextHeaderDesignTest.php` to assert `Dashboard/Index.tsx` imports `useEffect`, imports the Echo setup, listens on `dashboard.site.${sitioActual.id}`, and calls `router.reload` with an `only` list.

- [ ] **Step 2: Run test to verify it fails**

Run: `vendor/bin/pest tests/Unit/DashboardContextHeaderDesignTest.php`

Expected: FAIL because there is no realtime subscription.

- [ ] **Step 3: Implement subscription**

Import Echo setup in `Dashboard/Index.tsx`. Add a `useEffect` that exits if there is no active site or no `window.Echo`, subscribes to `private('dashboard.site.' + sitioActual.id)`, listens for `.lectura.actualizada`, and calls `router.reload({ only: [...] })`. Leave the channel on cleanup.

- [ ] **Step 4: Run test to verify it passes**

Run: `vendor/bin/pest tests/Unit/DashboardContextHeaderDesignTest.php`

Expected: PASS.

## Task 6: Full Verification

- [ ] **Step 1: Run focused PHP tests**

Run: `php artisan test tests/Feature/SeleccionarContextoTest.php tests/Unit/DashboardRealtimeTest.php tests/Unit/DashboardContextHeaderDesignTest.php tests/Unit/SeleccionarContextoSingleSiteDesignTest.php`

Expected: PASS.

- [ ] **Step 2: Run TypeScript check**

Run: `npm run types`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.
