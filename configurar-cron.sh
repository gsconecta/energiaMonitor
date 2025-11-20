#!/bin/bash

# Script para configurar el cron job del scheduler de Laravel
# Uso: ./configurar-cron.sh

PROJECT_PATH="/home/cloudmallorca-monitor/htdocs/energiaMonitor"
PHP_PATH="/usr/bin/php8.4"
CRON_COMMAND="* * * * * cd ${PROJECT_PATH} && ${PHP_PATH} artisan schedule:run >> /dev/null 2>&1"

echo "🔧 Configurando cron job para Laravel Scheduler"
echo ""
echo "Ruta del proyecto: ${PROJECT_PATH}"
echo "Ruta de PHP: ${PHP_PATH}"
echo ""
echo "Comando a agregar:"
echo "${CRON_COMMAND}"
echo ""

# Verificar si ya existe un cron job con schedule:run
if crontab -l 2>/dev/null | grep -q "schedule:run"; then
    echo "⚠️  Ya existe un cron job con schedule:run"
    echo ""
    echo "Cron jobs actuales:"
    crontab -l | grep "schedule:run"
    echo ""
    read -p "¿Quieres agregarlo de todas formas? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Operación cancelada"
        exit 1
    fi
fi

# Agregar el cron job
(crontab -l 2>/dev/null; echo "${CRON_COMMAND}") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job configurado correctamente"
    echo ""
    echo "Cron jobs actuales:"
    crontab -l
    echo ""
    echo "✅ El scheduler debería comenzar a ejecutarse automáticamente cada minuto"
    echo "💡 Espera 3-5 minutos y verifica los logs: tail -f storage/logs/laravel.log"
else
    echo "❌ Error al configurar el cron job"
    exit 1
fi

