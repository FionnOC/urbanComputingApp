import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button, TextInput } from "react-native";
import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";

import { decode } from "@mapbox/polyline";
// firebase
import { initializeApp } from "firebase/app";
import { getFirestore, addDoc, collection } from "firebase/firestore";

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

export default function App() {
  // set up states and variables
  const [location, setLocation] = useState(null);
  const [fetchingApiData, setFetchingApiData] = useState(false);
  const [closestBike, setClosestBike] = useState(null);
  const [data_bleeper, setData] = useState([]);
  const [data_dub_bikes, setDublinData] = useState([]);
  const [destination, setDestination] = useState("");
  const [finalLocation, setFinalCoordinate] = useState({});

  const [closestBikeState, setClosestState] = useState(false);

  const [region, setRegion] = useState({
    latitude: 53.3498,
    longitude: -6.2603,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [lengthOfJourney, setLength] = useState("");
  const [lengthwalk, setWalkLength] = useState("");
  const [directions, setDirections] = useState([]);
  const [walkingDirections, setWalkingDirections] = useState([]);

  const mapRef = useRef(null);

  const calculateLineColor = (length) => {
    const maxLength = 130; // Set a maximum length for the gradient
    const hue = 120 - (Math.min(length, maxLength) / maxLength) * 120; // Convert to hue value (green to red)
    return `hsl(${hue}, 100%, 50%)`;
  };

  // implementation of the haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const radiusOfEarth = 6371; // Radius of the Earth in kilometers

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    // Haversine formula
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = radiusOfEarth * c; // Distance in kilometers
    return distance;
  };

  // fetches cycling Directions from Google Maps Directions API
  const getDirections = async (startLoc, destinationLoc) => {
    try {
      const KEY = "AIzaSyD4Ggrwk8hQsaw_tjciJ63YEev2aV1ae84";
      let resp = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&key=${KEY}&destination=${destinationLoc}&mode=bicycling`
      );
      let respJson = await resp.json();

      return respJson;
    } catch (error) {
      return error;
    }
  };

  // fetches walking Directions from Google Maps Directions API
  const getDirectionsWalking = async (startLoc, destinationLoc) => {
    try {
      const KEY = "AIzaSyD4Ggrwk8hQsaw_tjciJ63YEev2aV1ae84";
      let resp = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&key=${KEY}&destination=${destinationLoc}&mode=walking`
      );
      let respJson = await resp.json();

      return respJson;
    } catch (error) {
      return error;
    }
  };

  // When the button is pressed, call on the direction functions and set state of directions and length of journeys
  const onClickGetDirections = async () => {
    if (closestBike && destination) {
      let startLocation = "";
      if (closestBikeState == true) {
        startLocation = closestBike.latitude + ", " + closestBike.longitude;
      } else {
        startLocation = `${closestBike.lat}, ${closestBike.lon}`;
      }

      // for the cycling directions
      const endLocation = encodeURIComponent(destination);

      const response = await getDirections(startLocation, endLocation);

      let points = decode(response.routes[0].overview_polyline.points);

      let length = response.routes[0].legs[0].duration.text;

      let directions = points.map((point, index) => {
        return {
          latitude: point[0],
          longitude: point[1],
        };
      });

      setFinalCoordinate(directions[directions.length - 1]);

      // now for the walking part
      startWalkPoint = `${location.coords.latitude}, ${location.coords.longitude}`;

      const walkingResponse = await getDirectionsWalking(
        startWalkPoint,
        startLocation
      );

      let lengthOfWalk = walkingResponse.routes[0].legs[0].duration.text;
      // console.log("AH");
      // console.log(walkingResponse.routes[0]);

      let walkingPoints = decode(
        walkingResponse.routes[0].overview_polyline.points
      );

      let walkingDirections = walkingPoints.map((point, index) => {
        return {
          latitude: point[0],
          longitude: point[1],
        };
      });
      setDirections(directions);
      setWalkingDirections(walkingDirections);
      setLength(length);
      setWalkLength(lengthOfWalk);

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

  // Function to fetch data from the Bleeper Bike API
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

  // Function to fetch data from the Dublin Bikes API
  const fetchDublinBikesApiData = async () => {
    try {
      const response = await fetch(
        "https://data.smartdublin.ie/dublinbikes-api/last_snapshot/"
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
  const processApiData = (data, dubData, location) => {
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
          setClosestState(false);
        }
      } catch (error) {
        console.error("Error processing data: ", error);
      }
    });

    dubData.forEach((item) => {
      try {
        currentLat = location.coords.latitude;
        currentLong = location.coords.longitude;

        let newdistance = calculateDistance(
          currentLat,
          currentLong,
          parseFloat(item.latitude),
          parseFloat(item.longitude)
        );

        if (newdistance < closestDistance) {
          closestDistance = newdistance;
          checkClosestBike = item;
          console.log("Dublin bike" + closestDistance);
          setClosestState(true);
        }
      } catch (error) {
        console.error("Error processing data: ", error);
      }
    });

    // console.log(checkClosestBike);

    return checkClosestBike;
  };

  // Function to push bike data to Firebase
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

  // Combined function to fetch data, process it, and update state of closest bike
  const getApiData = async () => {
    const data = await fetchApiData();
    const dublinData = await fetchDublinBikesApiData();
    setData(data);
    setDublinData(dublinData);

    const closestBike = processApiData(data, dublinData, location);

    if (closestBike) {
      setClosestBike(closestBike);
    }

    pushDataToFirebase(data);

    return closestBike;
  };

  // Function to handle the fetch data button click
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

  // get location of user
  const getCurrentLocation = async () => {
    try {
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      console.log(currentLocation);

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

  // animation to go to the closest bike and zoom in
  const goToClosestBike = () => {
    if (closestBike) {
      mapRef.current.animateToRegion(
        {
          latitude: closestBikeState
            ? parseFloat(closestBike.latitude)
            : closestBike.lat,
          longitude: closestBikeState
            ? parseFloat(closestBike.longitude)
            : closestBike.lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        2000
      );
    }
  };

  text = JSON.stringify(location);

  // render on the device.
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 53.3498,
          longitude: -6.2603,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={(region) => setRegion(region)}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Current Location"
            pinColor="green"
          />
        )}
        {closestBike && (
          <Marker
            coordinate={{
              latitude: closestBikeState
                ? parseFloat(closestBike.latitude)
                : closestBike.lat,
              longitude: closestBikeState
                ? parseFloat(closestBike.longitude)
                : closestBike.lon,
            }}
            pinColor="red"
            title="Closest Bike"
          />
        )}

        {data_bleeper &&
          data_bleeper.map((bike) => (
            <Circle
              key={bike.bike_id}
              center={{
                latitude: bike.lat,
                longitude: bike.lon,
              }}
              strokeWidth={1}
              radius={15}
              fillColor={"blue"}
              strokeColor={"#1a66ff"}
            />
          ))}
        {data_dub_bikes &&
          data_dub_bikes.map((dubBike) => (
            <Circle
              key={dubBike.id}
              center={{
                latitude: parseFloat(dubBike.latitude),
                longitude: parseFloat(dubBike.longitude),
              }}
              strokeWidth={1}
              radius={30}
              fillColor={"red"}
              strokeColor={"red"}
            />
          ))}
        {directions.length > 0 && (
          <View>
            <Polyline
              coordinates={directions}
              strokeWidth={5}
              strokeColor={calculateLineColor(directions.length)}
            />
            <Marker
              coordinate={finalLocation}
              pinColor={calculateLineColor(directions.length)}
            />
          </View>
        )}
        {walkingDirections.length > 0 && (
          <Polyline
            coordinates={walkingDirections}
            strokeWidth={5}
            strokeColor={"blue"}
          />
        )}
      </MapView>
      <TextInput
        style={styles.input}
        placeholder="Enter destination:"
        value={destination}
        onChangeText={(text) => setDestination(text)}
      />
      <View style={styles.bottomContainer}>
        {closestBike && destination && (
          <Button
            style={styles.button}
            title="Get Directions"
            onPress={onClickGetDirections}
          />
        )}
        <View style={styles.box}>
          <Button
            style={styles.button}
            title="Fetch API Data"
            onPress={fetchApiDataOnClick}
            disabled={fetchingApiData}
          />
        </View>
        {fetchingApiData && (
          <Text style={styles.text}>Loading API data...</Text>
        )}
        <View style={styles.box}>
          <Button
            style={styles.button}
            onPress={() => goToClosestBike()}
            title="Closest bike"
          />
        </View>
        <Text style={styles.text}>
          Latitude: {location ? location.coords.latitude : "Loading..."}
        </Text>
        <Text style={styles.text}>
          Longitude: {location ? location.coords.longitude : "Loading..."}
        </Text>
        {lengthOfJourney && (
          <Text style={styles.journeyLength}>
            {lengthwalk} walk and {lengthOfJourney} cycle to {destination}
          </Text>
        )}
        {/* {directions && <Text style={styles.journeyLength}>{directions.length}</Text>} */}
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomContainer: {
    flex: 0.35,
  },
  input: {
    alignSelf: "center",
    height: 50,
    borderColor: "gray",
    borderWidth: 1,
    paddingHorizontal: 8,
    width: "80%",
    top: 60,
    position: "absolute",
    zIndex: 1,
    backgroundColor: "white",
  },
  map: {
    flex: 0.65,
  },
  box: {
    flexDirection: "row",
    alignSelf: "center",
    paddingVertical: 10,
  },
  button: { marginVertical: 16, marginHorizontal: 10 },
  text: {
    paddingBottom: 8,
    alignSelf: "center",
  },
  journeyLength: {
    alignSelf: "center",
    fontWeight: "bold",
    fontSize: 22,
    textAlign: "center",
  },
});
