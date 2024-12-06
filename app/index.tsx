import React, { useState, useEffect, useRef } from 'react';
import { Platform, Text, View, StyleSheet, Button } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Device from 'expo-device';
import * as Location from 'expo-location';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function Index() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTripStarted, setIsTripStarted] = useState(false);
  const [path, setPath] = useState<Coordinates[]>([]);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const getCurrentLocation = async () => {
      try {
        if (Platform.OS === 'android' && !Device.isDevice) {
          setErrorMsg('Oops, this will not work on Snack in an Android Emulator. Try it on your device!');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({});
        setLocation(initialLocation);

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (newLocation) => {
            setLocation(newLocation);

            if (isTripStarted) {
              const newCoord = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              };
              setPath((prevPath) => [...prevPath, newCoord]);
            }

            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              });
            }
          }
        );
      } catch (error) {
        setErrorMsg('An error occurred while fetching location');
        console.error(error);
      }
    };

    getCurrentLocation();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [isTripStarted]);

  const handleToggleTrip = () => {
    if (location) {
      const newLocation: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (!isTripStarted) {
        // Start a new trip
        setStartLocation(newLocation);
        setEndLocation(null); // Clear the end marker
        setPath([newLocation]); // Initialize path with the start location
        console.log('Start location set:', newLocation);
      } else {
        // End the current trip
        setEndLocation(newLocation);
        console.log('End location set:', newLocation);
      }

      setIsTripStarted(!isTripStarted);
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
        >
          {startLocation && (
            <Marker
              key="start-location"
              coordinate={startLocation}
              pinColor="green"
              title="Start Location"
              description="This is your starting point"
            />
          )}
          {endLocation && (
            <Marker
              key="end-location"
              coordinate={endLocation}
              pinColor="red"
              title="End Location"
              description="This is your ending point"
            />
          )}
          {path.length > 1 && (
            <Polyline
              coordinates={path}
              strokeWidth={5}
              strokeColor="blue"
            />
          )}
        </MapView>
      ) : (
        <Text style={styles.paragraph}>Fetching location...</Text>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title={isTripStarted ? "End Trip" : "Start Trip"}
          onPress={handleToggleTrip}
        />
      </View>

      <Text style={styles.paragraph}>
        {errorMsg || `Lat: ${location?.coords.latitude}, Lon: ${location?.coords.longitude}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  paragraph: {
    fontSize: 18,
    textAlign: 'center',
    margin: 10,
  },
  map: {
    width: '100%',
    height: '80%',
  },
  buttonContainer: {
    marginVertical: 10,
  },
});
