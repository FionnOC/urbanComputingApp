import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button, TextInput } from "react-native";
import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";

import { decode } from "@mapbox/polyline";

// firebase
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyD4Ggrwk8hQsaw_tjciJ63YEev2aV1ae84",
  authDomain: "urban-computing-oconnof9.firebaseapp.com",
  projectId: "urban-computing-oconnof9",
  storageBucket: "urban-computing-oconnof9.appspot.com",
  messagingSenderId: "648137198410",
  appId: "1:648137198410:web:d4bd820bcd4bdefe020fb3",
  measurementId: "G-VHX6H62W4X",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

const getDirections = async (startLoc, destinationLoc) => {
  try {
    const KEY = "AIzaSyD4Ggrwk8hQsaw_tjciJ63YEev2aV1ae84"; //put your API key here.
    //otherwise, you'll have an 'unauthorized' error.
    let resp = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&destination=${destinationLoc}&key=${KEY}`
    );
    let respJson = await resp.json();
    let points = decode(respJson.routes[0].overview_polyline.points);
    console.log(points);
    let coords = points.map((point, index) => {
      return {
        latitude: point[0],
        longitude: point[1],
      };
    });
    return coords;
  } catch (error) {
    return error;
  }
};

export default function App() {
  // set up states and variables
  const [location, setLocation] = useState(null);
  const [fetchingApiData, setFetchingApiData] = useState(false);
  const [closestBike, setClosestBike] = useState(null);
  const [data_test, setData] = useState([]);
  const [destination, setDestination] = useState("");
  const [region, setRegion] = useState({
    latitude: 53.3498,
    longitude: -6.2603,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [directionsBounds, setDirectionsBounds] = useState(null);
  const [directions, setDirections] = useState([]);

  const mapRef = useRef(null);

  // calculate distance forumula based on lat lon
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  const onClickGetDirections = async () => {
    if (closestBike && destination) {
      const startLocation = `${closestBike.lat}, ${closestBike.lon}`;
      const endLocation = encodeURIComponent(destination);
      const directions = await getDirections(startLocation, endLocation);
      setDirections(directions);

      // Calculate bounds of the directions
      const bounds = directions.reduce(
        (acc, cur) => {
          acc.minLatitude = Math.min(acc.minLatitude, cur.latitude);
          acc.maxLatitude = Math.max(acc.maxLatitude, cur.latitude);
          acc.minLongitude = Math.min(acc.minLongitude, cur.longitude);
          acc.maxLongitude = Math.max(acc.maxLongitude, cur.longitude);
          return acc;
        },
        {
          minLatitude: Infinity,
          maxLatitude: -Infinity,
          minLongitude: Infinity,
          maxLongitude: -Infinity,
        }
      );

      setDirectionsBounds({
        latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
        longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
        latitudeDelta: bounds.maxLatitude - bounds.minLatitude + 0.02,
        longitudeDelta: bounds.maxLongitude - bounds.minLongitude + 0.02,
      });

      if (directions) {
        mapRef.current.animateToRegion(
          {
            latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
            longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
            latitudeDelta: bounds.maxLatitude - bounds.minLatitude + 0.01,
            longitudeDelta: bounds.maxLongitude - bounds.minLongitude + 0.01,
          },
          2000
        );
      }
    }
  };

  // Function to fetch data from the API
  const fetchApiData = async () => {
    try {
      const response = await fetch(
        "https://data.smartdublin.ie/bleeperbike-api/last_snapshot/"
      );

      if (!response.ok) {
        throw new Error("Network response error");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching data from API: ", error);
      return null;
    }
  };

  // Function to process the fetched data and find the closest bike
  const processApiData = (data, location) => {
    let closestDistance = Infinity;
    let checkClosestBike = null;

    let currentLat;
    let currentLong;

    data.forEach((item) => {
      try {
        currentLat = location.coords.latitude;
        currentLong = location.coords.longitude;

        let newdistance = calculateDistance(
          currentLat,
          currentLong,
          item.lat,
          item.lon
        );

        if (newdistance < closestDistance) {
          closestDistance = newdistance;
          checkClosestBike = item;
          console.log(closestDistance);
        }
      } catch (error) {
        console.error("Error processing data: ", error);
      }
    });

    return checkClosestBike;
  };

  // Function to push data to Firebase
  const pushDataToFirebase = async (data) => {
    try {
      data.forEach(async (item) => {
        const collectionRef = collection(db, "apiData");

        try {
          // get current time
          const currentTime = new Date();
          await addDoc(collectionRef, {
            bike_id: item.bike_id,
            is_disabled: item.is_disabled,
            is_reserved: item.is_reserved,
            last_reported: item.last_reported,
            lat: item.lat,
            lon: item.lon,
            timestamp: currentTime,
          });
        } catch (error) {
          console.error();
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  // Combined function to fetch data, process it, and update state
  const getApiData = async () => {
    const data = await fetchApiData();
    setData(data);

    const closestBike = processApiData(data, location);

    if (closestBike) {
      setClosestBike(closestBike);
    }

    // pushDataToFirebase(data);

    return closestBike;
  };

  // Function to handle the button click
  const fetchApiDataOnClick = async () => {
    setFetchingApiData(true);
    let bike = await getApiData();
    console.log("BIKE = ", bike?.id);
    setFetchingApiData(false);
  };

  // send the device data to firebase using addDoc
  const sendLocationToFirebase = async (locationData) => {
    console.log("entered Sendlocation function");
    const collectionRef = collection(db, "positions");
    const { coords, timestamp } = locationData;
    try {
      await addDoc(collectionRef, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date(timestamp),
        speed: coords.speed,
      });
      console.log("Location data sent to Firestore");
    } catch (error) {
      console.log("error sending data: ", error);
    }
    console.log("Finished sending location to firebase");
  };

  const getCurrentLocation = async () => {
    try {
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      console.log(currentLocation);

      // send location data to firebase
      sendLocationToFirebase(currentLocation);
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  // followed the logic provided by the expo location documentation and used useEffect to execute when the app is rendered
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      // check if permission was granted by user
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      // get the current location from the device being run on
      getCurrentLocation();
      // getApiData();

      // get location data every 5 seconds
      const refreshLocation = setInterval(getCurrentLocation, 5000);

      return () => {
        clearInterval(refreshLocation);
        // clearInterval(refreshBikesLocation);
      };
    })();
  }, []);

  const goToClosestBike = () => {
    if (closestBike) {
      mapRef.current.animateToRegion(
        {
          latitude: closestBike.lat,
          longitude: closestBike.lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        2000
      );
    }
  };

  text = JSON.stringify(location);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter destination:"
        value={destination}
        onChangeText={(text) => setDestination(text)}
      />
      {closestBike && destination && (
        <Button
          title="get directions"
          onPress={onClickGetDirections}
          // disabled={!closestBike || !destination}
        />
      )}
      <Button
        title="Fetch API Data"
        onPress={fetchApiDataOnClick}
        disabled={fetchingApiData}
      />
      {/* Display loading message if fetching data */}
      {fetchingApiData && <Text>Loading API data...</Text>}
      {/* <View style={{ flex: 1, width: "100%" }}> */}
      <MapView
        ref={mapRef}
        style={{ flex: 0.75, width: "100%" }}
        initialRegion={{
          latitude: 53.3498,
          longitude: -6.2603,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={(region) => setRegion(region)}
        // region={directionsBounds || region}
      >
        {/* if the closest bike is assigned, create a marker on the map! */}
        {closestBike && (
          <Marker
            coordinate={{
              latitude: closestBike.lat,
              longitude: closestBike.lon,
            }}
            title={`Bike ID: ${closestBike.bike_id}`}
            description={`Reserved: ${closestBike.is_reserved}`}
            pinColor="red"
          />
        )}
        {/* {data_test &&
          data_test.map((bike) => (
            <Marker
              key={bike.bike_id} // Make sure to provide a unique key for each Marker
              coordinate={{
                latitude: bike.lat,
                longitude: bike.lon,
              }}
              title={`Bike ID: ${bike.bike_id}`}
              description={`Reserved: ${bike.is_reserved}`}
              pinColor="green"
            />
          ))} */}
        {directions.length > 0 && (
          <Polyline
            coordinates={directions}
            strokeWidth={3}
            strokeColor="blue"
          />
        )}
      </MapView>
      {closestBike && (
        <Button
          onPress={() => goToClosestBike()}
          title="Show me the closest bike ..."
        />
      )}

      {/* </View> */}
      {/* Depending on the state of location, display loading message or the actual data returned from phone */}
      <Text>
        Latitude: {location ? location.coords.latitude : "Loading..."}
      </Text>
      <Text>
        Longitude: {location ? location.coords.longitude : "Loading..."}
      </Text>
      <Text> Speed: {location ? location.coords.speed : "Loading..."}</Text>
      <Text> Time: {location ? Date(location.timestamp) : "Loading..."}</Text>
      {/* <Text>{data_test}</Text> */}
      {/* <Text> {text} </Text> */}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
