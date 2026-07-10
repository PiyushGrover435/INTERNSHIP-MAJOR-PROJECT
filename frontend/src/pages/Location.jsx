import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { MapPin, Navigation } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090 // Default to New Delhi if location not available
};

const Location = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [currentLocation, setCurrentLocation] = useState(defaultCenter);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setLocationError("Unable to retrieve your location. Please ensure location permissions are granted.");
          console.error("Error getting location:", error);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon shadow-[0_0_15px_rgba(0,245,255,0.2)]">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide text-glow">Live Location</h1>
          <p className="text-sm text-cyber-muted">Patient tracking and geolocation</p>
        </div>
      </div>

      <div className="glass-strong border border-cyber-border rounded-2xl flex-1 relative overflow-hidden flex flex-col p-2 min-h-[500px]">
        {locationError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-cyber-danger/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg border border-cyber-danger backdrop-blur-sm">
            {locationError}
          </div>
        )}
        
        {!isLoaded ? (
          <div className="flex-1 flex items-center justify-center rounded-xl bg-[#0a0a0a]">
            <div className="flex flex-col items-center gap-3 text-cyber-neon">
              <Navigation className="w-8 h-8 animate-pulse" />
              <p className="animate-pulse">Initializing Global Positioning...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 rounded-xl overflow-hidden relative border border-cyber-border/50">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={currentLocation}
              zoom={14}
              options={{
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                  {
                    featureType: "administrative.locality",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
                  },
                  {
                    featureType: "poi",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
                  },
                  {
                    featureType: "poi.park",
                    elementType: "geometry",
                    stylers: [{ color: "#263c3f" }],
                  },
                  {
                    featureType: "poi.park",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#6b9a76" }],
                  },
                  {
                    featureType: "road",
                    elementType: "geometry",
                    stylers: [{ color: "#38414e" }],
                  },
                  {
                    featureType: "road",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#212a37" }],
                  },
                  {
                    featureType: "road",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#9ca5b3" }],
                  },
                  {
                    featureType: "road.highway",
                    elementType: "geometry",
                    stylers: [{ color: "#746855" }],
                  },
                  {
                    featureType: "road.highway",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#1f2835" }],
                  },
                  {
                    featureType: "road.highway",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#f3d19c" }],
                  },
                  {
                    featureType: "water",
                    elementType: "geometry",
                    stylers: [{ color: "#17263c" }],
                  },
                  {
                    featureType: "water",
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#515c6d" }],
                  },
                  {
                    featureType: "water",
                    elementType: "labels.text.stroke",
                    stylers: [{ color: "#17263c" }],
                  },
                ],
                disableDefaultUI: true,
                zoomControl: true,
              }}
            >
              <Marker
                position={currentLocation}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="rgba(0, 245, 255, 0.2)" stroke="#00f5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="#00f5ff"></circle></svg>'),
                }}
              />
            </GoogleMap>
          </div>
        )}
      </div>
    </div>
  );
};

export default Location;
