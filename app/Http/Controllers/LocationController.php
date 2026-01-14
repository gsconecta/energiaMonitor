<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    /**
     * Buscar lugares usando Google Places API
     * 
     * GET /api/location/search?query=...
     */
    public function search(Request $request)
    {
        $query = $request->get('query');
        
        if (!$query || strlen($query) < 3) {
            return response()->json([]);
        }

        $apiKey = config('services.google.places_api_key');
        
        if (!$apiKey) {
            Log::warning('Google Places API key no configurada');
            return response()->json([
                'error' => 'Google Places API key no configurada. Por favor, configura GOOGLE_PLACES_API_KEY en tu archivo .env'
            ], 500);
        }

        // Log para debugging (solo en desarrollo)
        if (config('app.debug')) {
            Log::debug('Google Places API - Iniciando búsqueda', [
                'query' => $query,
                'api_key_prefix' => substr($apiKey, 0, 10) . '...',
                'request_url' => $request->fullUrl()
            ]);
        }

        try {
            // Usar Places Autocomplete API
            // Nota: Removemos el parámetro 'types' para permitir más resultados (ciudades, direcciones, establecimientos)
            $response = Http::get('https://maps.googleapis.com/maps/api/place/autocomplete/json', [
                'input' => $query,
                'key' => $apiKey,
                'language' => 'es',
                'components' => 'country:es', // Limitar a España
                // Removido 'types' para permitir búsquedas más amplias
            ]);

            if (!$response->successful()) {
                $responseBody = $response->body();
                Log::error('Error en Google Places API - HTTP Error', [
                    'status' => $response->status(),
                    'body' => $responseBody,
                    'query' => $query
                ]);
                return response()->json([
                    'error' => 'Error al buscar lugares. HTTP Status: ' . $response->status()
                ], 500);
            }

            $data = $response->json();

            // Log de respuesta para debugging
            if (config('app.debug')) {
                Log::debug('Google Places API - Respuesta recibida', [
                    'status' => $data['status'] ?? 'unknown',
                    'predictions_count' => count($data['predictions'] ?? []),
                    'query' => $query
                ]);
            }

            // Manejar diferentes estados de respuesta de Google Places API
            if ($data['status'] !== 'OK' && $data['status'] !== 'ZERO_RESULTS') {
                $errorMessage = match($data['status']) {
                    'REQUEST_DENIED' => 'Acceso denegado. Verifica que la API key tenga los permisos necesarios y que las restricciones de URL incluyan tu dominio.',
                    'INVALID_REQUEST' => 'Solicitud inválida. Verifica los parámetros de la petición.',
                    'OVER_QUERY_LIMIT' => 'Se ha excedido el límite de consultas de la API.',
                    'UNKNOWN_ERROR' => 'Error desconocido en Google Places API.',
                    default => 'Error en Google Places API: ' . $data['status']
                };

                Log::error('Google Places API status no OK', [
                    'status' => $data['status'],
                    'error_message' => $data['error_message'] ?? null,
                    'data' => $data
                ]);

                return response()->json([
                    'error' => $errorMessage,
                    'status' => $data['status']
                ], 500);
            }

            $predictions = $data['predictions'] ?? [];

            // Si no hay resultados, retornar array vacío
            if (empty($predictions)) {
                if (config('app.debug')) {
                    Log::debug('Google Places API - Sin resultados', [
                        'query' => $query,
                        'status' => $data['status'] ?? 'unknown'
                    ]);
                }
                return response()->json([]);
            }

            // Obtener detalles de cada predicción para tener coordenadas
            $results = [];
            foreach (array_slice($predictions, 0, 5) as $prediction) {
                // Obtener detalles del lugar para tener coordenadas
                $detailsResponse = Http::get('https://maps.googleapis.com/maps/api/place/details/json', [
                    'place_id' => $prediction['place_id'],
                    'key' => $apiKey,
                    'language' => 'es',
                    'fields' => 'geometry,formatted_address,name',
                ]);

                if ($detailsResponse->successful()) {
                    $details = $detailsResponse->json();
                    if (isset($details['result'])) {
                        $result = $details['result'];
                        $location = $result['geometry']['location'] ?? null;
                        
                        if ($location) {
                            $results[] = [
                                'place_id' => $prediction['place_id'],
                                'name' => $prediction['description'],
                                'formatted_address' => $result['formatted_address'] ?? $prediction['description'],
                                'lat' => $location['lat'],
                                'lng' => $location['lng'],
                            ];
                        }
                    }
                }
            }

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Excepción en búsqueda de lugares', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'error' => 'Error al procesar la búsqueda: ' . $e->getMessage()
            ], 500);
        }
    }
}
