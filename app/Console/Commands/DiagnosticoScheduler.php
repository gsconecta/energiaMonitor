<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;

class DiagnosticoScheduler extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'schedule:diagnostico';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Diagnostica problemas con el scheduler de Laravel';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Diagnóstico del Scheduler de Laravel');
        $this->newLine();

        // 1. Verificar entorno
        $this->checkEnvironment();

        // 2. Verificar configuración del scheduler
        $this->checkSchedulerConfig();

        // 3. Verificar permisos
        $this->checkPermissions();

        // 4. Verificar cron job
        $this->checkCronJob();

        // 5. Verificar comando
        $this->checkCommand();

        $this->newLine();
        $this->info('✅ Diagnóstico completado. Revisa las recomendaciones arriba.');
        
        return Command::SUCCESS;
    }

    private function checkEnvironment()
    {
        $this->info('1️⃣  Verificando entorno...');
        
        $env = app()->environment();
        $this->line("   Entorno actual: <fg=yellow>{$env}</>");
        
        if ($env === 'local') {
            $this->warn('   ⚠️  El scheduler solo se ejecuta si APP_ENV NO es "local"');
            $this->line('   📝 Revisa routes/console.php línea 13');
        } else {
            $this->info('   ✅ Entorno correcto para ejecutar el scheduler');
        }
        
        $this->newLine();
    }

    private function checkSchedulerConfig()
    {
        $this->info('2️⃣  Verificando configuración del scheduler...');
        
        try {
            $events = Schedule::events();
            
            if (count($events) === 0) {
                $this->error('   ❌ No se encontraron tareas programadas');
                $this->line('   📝 Verifica routes/console.php');
            } else {
                $this->info('   ✅ Tareas programadas encontradas:');
                foreach ($events as $event) {
                    $command = $event->command ?? 'Closure';
                    $expression = $event->expression;
                    $this->line("      • {$command}");
                    $this->line("        Expresión: <fg=cyan>{$expression}</>");
                    $this->line("        Próxima ejecución: <fg=cyan>{$event->nextRunDate()}</>");
                }
            }
        } catch (\Exception $e) {
            $this->error('   ❌ Error al obtener eventos del scheduler: ' . $e->getMessage());
        }
        
        $this->newLine();
    }

    private function checkPermissions()
    {
        $this->info('3️⃣  Verificando permisos...');
        
        $logsDir = storage_path('logs');
        
        if (!is_dir($logsDir)) {
            $this->error('   ❌ El directorio storage/logs no existe');
        } elseif (!is_writable($logsDir)) {
            $this->error('   ❌ El directorio storage/logs no tiene permisos de escritura');
            $this->line('   💡 Ejecuta: chmod -R 775 storage/logs/');
        } else {
            $this->info('   ✅ Permisos correctos en storage/logs/');
        }
        
        $this->newLine();
    }

    private function checkCronJob()
    {
        $this->info('4️⃣  Verificando cron job...');
        
        if (PHP_OS_FAMILY === 'Windows') {
            $this->warn('   ⚠️  Sistema Windows detectado');
            $this->line('   📝 En Windows, configura una Tarea Programada manualmente');
            $this->line('   📝 O usa: php artisan schedule:work (para desarrollo)');
        } else {
            // Intentar verificar si hay un cron job configurado
            $projectPath = base_path();
            $phpPath = PHP_BINARY;
            
            $this->line("   Ruta del proyecto: <fg=cyan>{$projectPath}</>");
            $this->line("   Ruta de PHP: <fg=cyan>{$phpPath}</>");
            $this->newLine();
            
            $this->warn('   ⚠️  No se puede verificar automáticamente si el cron está configurado');
            $this->line('   💡 Verifica manualmente con: crontab -l');
            $this->newLine();
            $this->line('   El cron job debería ser:');
            $this->line("   <fg=yellow>* * * * * cd {$projectPath} && {$phpPath} artisan schedule:run >> /dev/null 2>&1</>");
        }
        
        $this->newLine();
    }

    private function checkCommand()
    {
        $this->info('5️⃣  Verificando comando shelly:obtener-lecturas...');
        
        if ($this->commandExists('shelly:obtener-lecturas')) {
            $this->info('   ✅ Comando encontrado');
            $this->line('   💡 Puedes probarlo con: php artisan shelly:obtener-lecturas');
        } else {
            $this->error('   ❌ Comando shelly:obtener-lecturas no encontrado');
            $this->line('   📝 Verifica app/Console/Commands/ObtenerLecturasShelly.php');
        }
        
        $this->newLine();
    }

    private function commandExists($command)
    {
        try {
            \Artisan::find($command);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}

