# Dashboard Live Updates and Context Selection Design

## Scope

This change covers three dashboard/context behaviors:

- Move the connection status indicator into the current context row, immediately after the active site name.
- Add a real push path for new readings so an open dashboard refreshes only dashboard data when relevant readings arrive.
- Auto-enter a site from `/seleccionar-contexto` when the selected organization has exactly one active site.

## UI Behavior

The dashboard context row remains the single place that shows the active organization and site. The status pill/dot moves into that row after the site name, before the "Cambiar" action. The device selector stays below the context row when there is more than one device.

In the context selector, clicking an organization with one active site immediately posts the context selection with that organization and site. Organizations with zero sites still show the create-site state. Organizations with multiple sites keep the current second-step site selection.

## Push Architecture

Use Laravel Broadcasting with Laravel Reverb and Echo.

When a `Lectura` is created, Laravel dispatches a broadcast event for the affected site. The event channel is private and scoped as `dashboard.site.{sitioId}`. Authorization checks that the authenticated user has access to the organization that owns the site.

The dashboard subscribes to the active site's private channel. When it receives a new reading event for the current site, it calls an Inertia partial reload for only the dashboard props that can change from a reading: `dispositivo`, `dispositivos`, `metricas`, `datos_grafica`, `datos_meteorologicos`, `verificacion_meteorologica`, and `sinDispositivos`. This avoids a full page reload while reusing the existing controller calculations.

## Error Handling

If Echo/Reverb environment variables are missing in a local environment, the dashboard should render normally and skip the realtime subscription. The user still has normal navigation and manual refresh behavior.

If an organization has one site but the backend rejects it, the selector clears the processing state and displays the existing Inertia validation behavior.

## Testing

Add backend feature coverage for selecting an organization with one active site without explicitly sending a site id. Add event coverage that creating a reading dispatches the dashboard update event with the site id. Add lightweight frontend source tests for the header layout and the selector's single-site auto-submit branch.
