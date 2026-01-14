import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Search, Copy, Check, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import L from 'leaflet';

// Fix para iconos de Leaflet en producción
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
    latitud: string;
    longitud: string;
    onLocationChange: (lat: string, lng: string) => void;
}

interface PlaceSuggestion {
    place_id: string;
    name: string;
    formatted_address: string;
    lat: number;
    lng: number;
}

// Componente para actualizar el centro del mapa cuando cambian las coordenadas
function MapUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
    const map = useMap();
    
    useEffect(() => {
        if (zoom !== undefined) {
            map.setView(center, zoom);
        } else {
            map.setView(center, map.getZoom());
        }
    }, [center, zoom, map]);
    
    return null;
}

export default function LocationPicker({ latitud, longitud, onLocationChange }: LocationPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Debug: Log cuando cambian las sugerencias
    useEffect(() => {
        console.log('Suggestions actualizadas:', suggestions.length, suggestions);
    }, [suggestions]);

    // Coordenadas actuales como números
    const currentLat = latitud ? parseFloat(latitud) : null;
    const currentLng = longitud ? parseFloat(longitud) : null;
    
    // Inicializar searchQuery si hay coordenadas pero no hay texto de búsqueda
    useEffect(() => {
        if (currentLat && currentLng && !searchQuery) {
            // No inicializar automáticamente, dejar que el usuario busque
            // O podríamos hacer una búsqueda inversa (reverse geocoding) si es necesario
        }
    }, [currentLat, currentLng, searchQuery]);

    // Centro del mapa: coordenadas actuales o España por defecto
    const mapCenter: [number, number] = currentLat && currentLng
        ? [currentLat, currentLng]
        : [40.4168, -3.7038]; // Madrid, España

    // Búsqueda con debounce
    const handleSearch = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            setSearchError(null);
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        
        try {
            const response = await fetch(`/api/location/search?query=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                // Si hay un error en la respuesta JSON
                const errorMessage = data.error || `Error ${response.status}: ${response.statusText}`;
                setSearchError(errorMessage);
                setSuggestions([]);
                console.error('Error en la búsqueda:', errorMessage);
                return;
            }
            
            if (Array.isArray(data)) {
                console.log('Sugerencias recibidas:', data.length, data);
                setSuggestions(data);
                setSearchError(null);
            } else if (data.error) {
                setSearchError(data.error);
                setSuggestions([]);
                console.error('Error:', data.error);
            } else {
                console.warn('Respuesta inesperada:', data);
                setSuggestions([]);
                setSearchError(null);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al buscar lugares';
            setSearchError(errorMessage);
            setSuggestions([]);
            console.error('Error al buscar lugares:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounce en la búsqueda
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, handleSearch]);

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Verificar que el clic no sea en el input ni en el contenedor de sugerencias
            const target = event.target as HTMLElement;
            const inputElement = target.closest('input');
            const suggestionsElement = suggestionsRef.current;
            
            if (suggestionsElement && !suggestionsElement.contains(target) && !inputElement) {
                setSuggestions([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
        onLocationChange(suggestion.lat.toString(), suggestion.lng.toString());
        setSearchQuery(suggestion.formatted_address);
        setSuggestions([]);
        setSearchError(null);
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationChange(lat.toString(), lng.toString());
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no está disponible en tu navegador');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onLocationChange(latitude.toString(), longitude.toString());
            },
            (error) => {
                console.error('Error en geolocalización:', error);
                alert('No se pudo obtener tu ubicación. Por favor, selecciona manualmente en el mapa.');
            }
        );
    };

    const handleCopyCoordinates = () => {
        if (currentLat && currentLng) {
            const coords = `${currentLat}, ${currentLng}`;
            navigator.clipboard.writeText(coords);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-4">
            {/* Campo de búsqueda */}
            <div className="relative z-[9999]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar ciudad, dirección o lugar..."
                    className="pl-10 relative"
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                    </div>
                )}
                
                {/* Lista de sugerencias */}
                {(suggestions.length > 0 || searchError) && (
                    <div
                        ref={suggestionsRef}
                        className="absolute z-[9999] top-full mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-60 overflow-y-auto"
                        style={{ top: '100%' }}
                    >
                        {searchError ? (
                            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                                <div className="font-medium">Error en la búsqueda</div>
                                <div className="text-xs mt-1">{searchError}</div>
                            </div>
                        ) : (
                            suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.place_id}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {suggestion.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {suggestion.formatted_address}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Mapa */}
            <div className="h-[400px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 relative z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={currentLat && currentLng ? 13 : 6}
                    style={{ height: '100%', width: '100%' }}
                    onClick={handleMapClick}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={mapCenter} zoom={currentLat && currentLng ? 13 : 6} />
                    {currentLat && currentLng && (
                        <Marker
                            position={[currentLat, currentLng]}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const marker = e.target;
                                    const position = marker.getLatLng();
                                    onLocationChange(position.lat.toString(), position.lng.toString());
                                },
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Controles y coordenadas */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Coordenadas */}
                <div className="flex-1 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Coordenadas seleccionadas:</div>
                    <div className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                        {currentLat && currentLng ? (
                            <>
                                Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}
                            </>
                        ) : (
                            <span className="text-gray-400">No seleccionado</span>
                        )}
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGetCurrentLocation}
                        className="flex items-center gap-2"
                    >
                        <Navigation className="h-4 w-4" />
                        <span className="hidden sm:inline">Mi ubicación</span>
                    </Button>
                    {currentLat && currentLng && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyCoordinates}
                            className="flex items-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    <span className="hidden sm:inline">Copiado</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    <span className="hidden sm:inline">Copiar</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
