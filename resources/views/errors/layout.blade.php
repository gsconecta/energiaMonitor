@php
    $status = trim($__env->yieldContent('status', '500'));
    $title = trim($__env->yieldContent('title', 'Incidencia tecnica'));
    $eyebrow = trim($__env->yieldContent('eyebrow', 'Estado de la plataforma'));
    $message = trim($__env->yieldContent('message', 'No hemos podido completar la solicitud en este momento.'));
    $detail = trim($__env->yieldContent('detail', 'Puedes volver a intentarlo o regresar al inicio de la plataforma.'));
    $primaryLabel = trim($__env->yieldContent('primaryLabel', 'Volver al inicio'));
    $primaryHref = trim($__env->yieldContent('primaryHref', url('/')));
    $secondaryLabel = trim($__env->yieldContent('secondaryLabel', ''));
    $secondaryHref = trim($__env->yieldContent('secondaryHref', ''));
    $panelTitle = trim($__env->yieldContent('panelTitle', 'Solicitud interrumpida'));
    $panelText = trim($__env->yieldContent('panelText', 'El sistema ha detenido esta peticion para proteger la experiencia de uso.'));
    $tone = trim($__env->yieldContent('tone', 'neutral'));
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>{{ $title }} - energiaMonitor</title>
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=montserrat:400,500,600,700,800" rel="stylesheet">
        <style>
            :root {
                color-scheme: dark;
                --bg: #050b12;
                --panel: rgba(8, 20, 31, 0.86);
                --panel-strong: rgba(11, 28, 43, 0.94);
                --line: rgba(255, 255, 255, 0.12);
                --line-strong: rgba(255, 255, 255, 0.22);
                --text: #f8fafc;
                --muted: rgba(226, 232, 240, 0.7);
                --quiet: rgba(226, 232, 240, 0.48);
                --red: #ef4444;
                --green: #22c55e;
                --yellow: #eab308;
                --accent: #22c55e;
                --accent-soft: rgba(34, 197, 94, 0.14);
            }

            * {
                box-sizing: border-box;
            }

            html,
            body {
                min-height: 100%;
                margin: 0;
            }

            body {
                font-family: "Montserrat", ui-sans-serif, system-ui, sans-serif;
                background:
                    linear-gradient(135deg, rgba(34, 197, 94, 0.14), transparent 28%),
                    linear-gradient(215deg, rgba(239, 68, 68, 0.12), transparent 34%),
                    #050b12;
                color: var(--text);
            }

            body.tone-maintenance {
                --accent: var(--yellow);
                --accent-soft: rgba(234, 179, 8, 0.16);
            }

            body.tone-warning {
                --accent: var(--red);
                --accent-soft: rgba(239, 68, 68, 0.14);
            }

            body.tone-session {
                --accent: #38bdf8;
                --accent-soft: rgba(56, 189, 248, 0.14);
            }

            .page {
                position: relative;
                min-height: 100vh;
                overflow: hidden;
                padding: 32px;
            }

            .page::before {
                position: absolute;
                inset: 0;
                content: "";
                background-image:
                    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
                background-size: 44px 44px;
                mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 86%);
                pointer-events: none;
            }

            .page::after {
                position: absolute;
                inset: 0 0 0 auto;
                width: min(46vw, 660px);
                height: 100%;
                content: "";
                background: linear-gradient(
                    135deg,
                    transparent 0 44%,
                    rgba(34, 197, 94, 0.08) 44% 45%,
                    transparent 45% 58%,
                    rgba(239, 68, 68, 0.08) 58% 59%,
                    transparent 59% 72%,
                    rgba(234, 179, 8, 0.08) 72% 73%,
                    transparent 73% 100%
                );
                opacity: 0.9;
                pointer-events: none;
            }

            .shell {
                position: relative;
                z-index: 1;
                display: grid;
                min-height: calc(100vh - 64px);
                grid-template-rows: auto 1fr;
                gap: 48px;
            }

            .brand {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                width: max-content;
                color: var(--text);
                text-decoration: none;
            }

            .brand-mark {
                display: grid;
                width: 48px;
                height: 48px;
                place-items: center;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.08);
                box-shadow: 0 22px 70px rgba(0, 0, 0, 0.32);
            }

            .brand-mark img {
                width: 34px;
                height: 34px;
                display: block;
            }

            .brand-name {
                display: block;
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0;
            }

            .brand-subtitle {
                display: block;
                margin-top: 3px;
                color: var(--quiet);
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.18em;
                text-transform: uppercase;
            }

            .content {
                display: grid;
                align-items: center;
                gap: 52px;
                grid-template-columns: minmax(0, 1.03fr) minmax(320px, 0.72fr);
            }

            .copy {
                max-width: 760px;
            }

            .eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                margin: 0 0 22px;
                color: var(--muted);
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-transform: uppercase;
            }

            .eyebrow::before {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                background: var(--accent);
                box-shadow: 0 0 26px var(--accent);
                content: "";
            }

            h1 {
                max-width: 780px;
                margin: 0;
                color: var(--text);
                font-size: clamp(42px, 7vw, 88px);
                font-weight: 800;
                line-height: 0.94;
                letter-spacing: 0;
            }

            .message {
                max-width: 680px;
                margin: 24px 0 0;
                color: rgba(248, 250, 252, 0.82);
                font-size: clamp(17px, 2.1vw, 22px);
                line-height: 1.58;
            }

            .detail {
                max-width: 620px;
                margin: 16px 0 0;
                color: var(--muted);
                font-size: 15px;
                line-height: 1.8;
            }

            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 14px;
                margin-top: 34px;
            }

            .button {
                display: inline-flex;
                min-height: 46px;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                padding: 0 18px;
                border: 1px solid transparent;
                font-size: 14px;
                font-weight: 700;
                text-decoration: none;
                transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
            }

            .button:hover {
                transform: translateY(-1px);
            }

            .button-primary {
                background: var(--text);
                color: #06101a;
                box-shadow: 0 18px 55px rgba(255, 255, 255, 0.16);
            }

            .button-secondary {
                border-color: var(--line);
                background: rgba(255, 255, 255, 0.07);
                color: var(--text);
            }

            .meta-row {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 30px;
            }

            .meta-pill {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.055);
                padding: 10px 12px;
                color: var(--muted);
                font-size: 12px;
                font-weight: 600;
            }

            .meta-pill strong {
                color: var(--text);
                font-weight: 700;
            }

            .panel {
                position: relative;
                overflow: hidden;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: var(--panel);
                box-shadow: 0 32px 110px rgba(0, 0, 0, 0.42);
                backdrop-filter: blur(18px);
            }

            .panel::before {
                position: absolute;
                inset: 0;
                content: "";
                background:
                    linear-gradient(120deg, transparent 0 28%, rgba(255, 255, 255, 0.08) 29%, transparent 45%),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.07), transparent 32%);
                pointer-events: none;
            }

            .panel-inner {
                position: relative;
                padding: 24px;
            }

            .panel-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                border-bottom: 1px solid var(--line);
                padding-bottom: 22px;
            }

            .panel-title {
                margin: 0;
                color: var(--text);
                font-size: 17px;
                font-weight: 700;
            }

            .panel-text {
                margin: 8px 0 0;
                color: var(--muted);
                font-size: 13px;
                line-height: 1.7;
            }

            .status-code {
                min-width: 86px;
                border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
                border-radius: 8px;
                background: var(--accent-soft);
                padding: 10px 12px;
                color: var(--accent);
                font-size: 28px;
                font-weight: 800;
                line-height: 1;
                text-align: center;
            }

            .network {
                display: grid;
                gap: 14px;
                margin-top: 24px;
            }

            .phase {
                display: grid;
                grid-template-columns: 82px 1fr auto;
                align-items: center;
                gap: 12px;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.18);
                padding: 13px;
            }

            .phase-name {
                color: var(--muted);
                font-size: 12px;
                font-weight: 700;
            }

            .phase-track {
                height: 8px;
                overflow: hidden;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
            }

            .phase-bar {
                height: 100%;
                border-radius: inherit;
                background: var(--phase-color);
                box-shadow: 0 0 22px var(--phase-color);
            }

            .phase-state {
                color: var(--text);
                font-size: 12px;
                font-weight: 700;
            }

            .diagram {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-top: 24px;
            }

            .node {
                min-height: 112px;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: var(--panel-strong);
                padding: 14px;
            }

            .node-label {
                margin: 0;
                color: var(--quiet);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            .node-value {
                margin: 18px 0 0;
                color: var(--text);
                font-size: 18px;
                font-weight: 800;
            }

            .node-line {
                height: 2px;
                margin-top: 18px;
                background: linear-gradient(90deg, var(--red), var(--green), var(--yellow));
            }

            .footnote {
                margin: 22px 0 0;
                color: var(--quiet);
                font-size: 12px;
                line-height: 1.7;
            }

            @media (max-width: 900px) {
                .page {
                    padding: 22px;
                }

                .shell {
                    min-height: calc(100vh - 44px);
                    gap: 34px;
                }

                .content {
                    grid-template-columns: 1fr;
                }

            }

            @media (max-width: 560px) {
                .page {
                    padding: 18px;
                }

                .brand-subtitle {
                    display: none;
                }

                h1 {
                    font-size: clamp(36px, 13vw, 54px);
                }

                .message {
                    font-size: 16px;
                }

                .actions {
                    flex-direction: column;
                }

                .button {
                    width: 100%;
                }

                .panel-inner {
                    padding: 18px;
                }

                .panel-header {
                    flex-direction: column;
                }

                .status-code {
                    width: 100%;
                    text-align: left;
                }

                .phase {
                    grid-template-columns: 1fr;
                }

                .diagram {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body class="tone-{{ $tone }}">
        <main class="page">
            <div class="shell">
                <a class="brand" href="{{ url('/') }}" aria-label="Ir al inicio de energiaMonitor">
                    <span class="brand-mark">
                        <img src="/logo-sidebar.svg" alt="">
                    </span>
                    <span>
                        <span class="brand-name">energiaMonitor</span>
                        <span class="brand-subtitle">Energy Intelligence</span>
                    </span>
                </a>

                <section class="content" aria-labelledby="error-title">
                    <div class="copy">
                        <p class="eyebrow">{{ $eyebrow }}</p>
                        <h1 id="error-title">{{ $title }}</h1>
                        <p class="message">{{ $message }}</p>
                        <p class="detail">{{ $detail }}</p>

                        <div class="actions" aria-label="Acciones disponibles">
                            <a class="button button-primary" href="{{ $primaryHref }}">{{ $primaryLabel }}</a>
                            @if ($secondaryLabel !== '' && $secondaryHref !== '')
                                <a class="button button-secondary" href="{{ $secondaryHref }}">{{ $secondaryLabel }}</a>
                            @endif
                        </div>

                        <div class="meta-row" aria-label="Datos de diagnostico">
                            <span class="meta-pill"><strong>Codigo</strong> HTTP {{ $status }}</span>
                            <span class="meta-pill"><strong>Servicio</strong> energiaMonitor</span>
                            <span class="meta-pill"><strong>Estado</strong> {{ $panelTitle }}</span>
                        </div>
                    </div>

                    <aside class="panel" aria-label="Estado tecnico">
                        <div class="panel-inner">
                            <div class="panel-header">
                                <div>
                                    <p class="panel-title">{{ $panelTitle }}</p>
                                    <p class="panel-text">{{ $panelText }}</p>
                                </div>
                                <div class="status-code">{{ $status }}</div>
                            </div>

                            <div class="network" aria-hidden="true">
                                <div class="phase">
                                    <span class="phase-name">Canal L1</span>
                                    <span class="phase-track">
                                        <span class="phase-bar" style="--phase-color: var(--red); width: 72%;"></span>
                                    </span>
                                    <span class="phase-state">online</span>
                                </div>
                                <div class="phase">
                                    <span class="phase-name">Canal L2</span>
                                    <span class="phase-track">
                                        <span class="phase-bar" style="--phase-color: var(--green); width: 88%;"></span>
                                    </span>
                                    <span class="phase-state">estable</span>
                                </div>
                                <div class="phase">
                                    <span class="phase-name">Canal L3</span>
                                    <span class="phase-track">
                                        <span class="phase-bar" style="--phase-color: var(--yellow); width: 64%;"></span>
                                    </span>
                                    <span class="phase-state">revision</span>
                                </div>
                            </div>

                            <div class="diagram" aria-hidden="true">
                                <div class="node">
                                    <p class="node-label">Monitor</p>
                                    <p class="node-value">lecturas</p>
                                    <div class="node-line"></div>
                                </div>
                                <div class="node">
                                    <p class="node-label">Alertas</p>
                                    <p class="node-value">control</p>
                                    <div class="node-line"></div>
                                </div>
                                <div class="node">
                                    <p class="node-label">Usuarios</p>
                                    <p class="node-value">acceso</p>
                                    <div class="node-line"></div>
                                </div>
                            </div>

                            <p class="footnote">
                                Si el problema persiste, contacta con soporte indicando el codigo HTTP {{ $status }}.
                            </p>
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    </body>
</html>
