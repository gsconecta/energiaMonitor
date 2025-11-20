<?php

namespace App\Providers;

use App\Models\Organizacion;
use App\Models\Sitio;
use App\Policies\OrganizacionPolicy;
use App\Policies\SitioPolicy;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Organizacion::class, OrganizacionPolicy::class);
        Gate::policy(Sitio::class, SitioPolicy::class);
    }
}
