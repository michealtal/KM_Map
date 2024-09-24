import React, { useState, useEffect, useRef } from "react";
import ReactMapGL, { Marker, Popup, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as parkData from "../data/skateboard-parks.json"; // Ensure path is correct
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"; // Import the geocoder

export default function App() {
  const defaultLocation = {
    latitude: 45.4211,
    longitude: -75.6903,
  };

  const [viewport, setViewport] = useState({
    latitude: defaultLocation.latitude,
    longitude: defaultLocation.longitude,
    width: "100vw",
    height: "100vh",
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  const [selectedPark, setSelectedPark] = useState(null);
  const [userPin, setUserPin] = useState(null); // To store user's pinned location
  const [startLocation, setStartLocation] = useState(""); // Starting destination
  const [endLocation, setEndLocation] = useState(""); // Final destination
  const [route, setRoute] = useState(null); // To store route data
  const mapRef = useRef(); // Reference to the map instance

  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape") {
        setSelectedPark(null);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  // Handle geolocation to get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setViewport((prevViewport) => ({
            ...prevViewport,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            zoom: 12,
          }));
        },
        () => {
          console.log("Geolocation not available, using default location.");
        }
      );
    } else {
      console.log("Geolocation not supported, using default location.");
    }
  }, []);

  const geocodeLocation = async (location) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );
      const data = await response.json();
  
      // Check if there are valid results
      if (data.features && data.features.length > 0) {
        console.log(`Geocoded ${location}:`, data.features[0].geometry.coordinates);
        return data.features[0].geometry.coordinates; // Return the coordinates (longitude, latitude)
      } else {
        console.error(`No results found for location: ${location}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching geocode for location: ${location}`, error);
      return null; // Return null if there's an error
    }
  };

  

  // Geocoder functionality (for searching locations)
  const handleMapLoad = () => {
    const map = mapRef.current.getMap(); // Ensure the map instance is ready
    const geocoder = new MapboxGeocoder({
      accessToken: process.env.VITE_MAPBOX_TOKEN,
      mapboxgl: map, // Attach the geocoder to the map
      marker: false, // Don't automatically add a marker
    });

    map.addControl(geocoder); // Add search control to the map

    geocoder.on("result", (event) => {
      const { result } = event;
      setViewport((prevViewport) => ({
        ...prevViewport,
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
        zoom: 12,
      }));
      setUserPin({
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
      }); // Set user's search pin location
    });
  };

  const handleMove = (evt) => {
    setViewport((prevViewport) => ({
      ...prevViewport,
      ...evt.viewState,
    }));
  };

  // Handle map click to pin the user's location
  const handleMapClick = (event) => {
    const [longitude, latitude] = event.lngLat;
    setUserPin({
      latitude,
      longitude,
    });
  };

  // Fetch the route using Mapbox Directions API
  const fetchRoute = async () => {
    if (startLocation && endLocation) {
      try {
        // Geocode start and end locations
        const startCoords = await geocodeLocation(startLocation);
        const endCoords = await geocodeLocation(endLocation);
  
        // Ensure both locations were successfully geocoded
        if (startCoords && endCoords) {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords.join(',')};${endCoords.join(',')}?geometries=geojson&access_token=${process.env.VITE_MAPBOX_TOKEN}`
          );
  
          if (res.ok) {
            const data = await res.json();
            setRoute(data.routes[0].geometry); // Set route geometry
          } else {
            const errorData = await res.json();
            console.error("Error fetching route:", errorData);
          }
        } else {
          console.error("Geocoding failed for one or both locations.");
        }
      } catch (error) {
        console.error("Error in geocoding or fetching route:", error);
      }
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Input fields container */}
      <div className="input-container">
        <input
          type="text"
          placeholder="Starting Location"
          value={startLocation}
          onChange={(e) => setStartLocation(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Final Destination"
          value={endLocation}
          onChange={(e) => setEndLocation(e.target.value)}
          className="input-field"
        />
        <button className="route-button" onClick={fetchRoute}>
          Show Route
        </button>
      </div>
      <ReactMapGL
        {...viewport}
        ref={mapRef} // Attach ref to the map
        onMove={handleMove}
        mapboxAccessToken={process.env.VITE_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/khalidadamu09/cm1fgxn4s02ou01pmawjv92us"
        dragPan={true}
        dragRotate={true}
        onClick={handleMapClick} // Allow map click to pin location
        onLoad={handleMapLoad} // Handle map load to initialize geocoder
      >
        {parkData.features.map((park) => (
          <Marker
            key={park.properties.PARK_ID}
            latitude={park.geometry.coordinates[1]}
            longitude={park.geometry.coordinates[0]}
          >
            <button
              className="marker-btn"
              onClick={(evt) => {
                evt.preventDefault();
                setSelectedPark(park);
              }}
            >
              <img src="/skateboarding.svg" alt="Skateboard Icon" />
            </button>
          </Marker>
        ))}

        {/* User pin after clicking on the map */}
        {userPin && (
          <Marker latitude={userPin.latitude} longitude={userPin.longitude}>
            <img src="/pin-icon.svg" alt="User Pin" style={{ width: "24px", height: "24px" }} />
          </Marker>
        )}

        {selectedPark && (
          <Popup
            latitude={selectedPark.geometry.coordinates[1]}
            longitude={selectedPark.geometry.coordinates[0]}
            onClose={() => setSelectedPark(null)}
            closeOnClick={false}
          >
            <div>
              <h2>{selectedPark.properties.NAME}</h2>
              <p>{selectedPark.properties.DESCRIPTIO}</p>
            </div>
          </Popup>
        )}

        {/* Display the route on the map */}
        {route && (
          <Source type="geojson" data={{ type: "Feature", geometry: route }}>
            <Layer
              id="route"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#888", "line-width": 6 }}
            />
          </Source>
        )}
      </ReactMapGL>
    </div>
  );
}
