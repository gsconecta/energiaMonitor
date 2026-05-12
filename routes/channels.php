<?php

use App\Models\Sitio;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('dashboard.site.{sitioId}', function ($user, $sitioId) {
    $sitio = Sitio::with('organizacion')->find($sitioId);

    return $sitio !== null && $sitio->organizacion?->tieneUsuario($user) === true;
});
