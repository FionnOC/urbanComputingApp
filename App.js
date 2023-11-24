import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button } from "react-native";
import { useState, useEffect } from "react";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

// firebase
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
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

export default function App() {
  const [location, setLocation] = useState(null);
  const [fetchingApiData, setFetchingApiData] = useState(false);
  const [closestBike, setClosestBike] = useState(null);

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

  const getApiData = async () => {
    try {
      // console.log("before fetch");
      // fetch data using api
      const response = await fetch(
        "https://data.smartdublin.ie/bleeperbike-api/last_snapshot/"
      );
      // if a code 200 is not responded
      if (!response.ok) {
        throw new Error("Network response error");
      }
      // console.log("after fetch");
      // put into json format
      const data = await response.json();

      let closestDistance = Infinity;
      // let closestBike = null;

      // Declare currentLat and currentLong
      let currentLat;
      let currentLong;

      let prevBike = null;

      // for each object returned by the API send a document to Firebase
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

          currentLat = location.coords.latitude;
          currentLong = location.coords.longitude;

          // calculate the distance between the device and bike
          newdistance = calculateDistance(
            currentLat,
            currentLong,
            item.lat,
            item.lon
          );

          // if the distance is less than the previous closest distance
          // reassign the closest distance and closest bike
          if (newdistance < closestDistance) {
            closestDistance = newdistance;
            closestBike = item;
            setClosestBike(closestBike);
            console.log(closestBike.id);
          }

          if (closestBike != prevBike) {
            // console.log(closestBike.id);
            // console.log("Lat: " + closestBike.lat);
            // console.log("Lon: " + closestBike.lon);
            // console.log("Is reserved : " + closestBike.is_reserved);
            // console.log("Last reported : " + closestBike.last_reported);
            prevBike = closestBike;
          }
          // console.log("api to firebase complete");
        } catch (error) {
          console.error("error sending data: ", error);
        }
        // console.log("FIIIINNNNNIIIIIITTTTTOOOOOOOOOO");
      });

      // if (closestBike) {
      //   return closestBike;
      // }
      // return closestBike;

      // console.log(data);
    } catch (error) {
      console.error("Error fetching data from API: ", error);
      return null;
    }
  };

  // update the state of the button
  const fetchApiDataOnClick = async () => {
    setFetchingApiData(true);
    let bike = await getApiData();
    // console.log("BIKE = " + bike);
    // setClosestBike(bike);
    console.log("FINISHED getAPIdata");
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

      // const refreshFunction = () => {
      //   getCurrentLocation();
      //   getApiData();
      // };

      // get the current location from the device being run on
      getCurrentLocation();
      // getApiData();

      // get location data every 5 seconds
      const refreshLocation = setInterval(getCurrentLocation, 5000);

      // wait 2 mins for every refresh of getApiData
      // const refreshBikesLocation = setInterval(getApiData, 120000);

      return () => {
        clearInterval(refreshLocation);
        // clearInterval(refreshBikesLocation);
      };
    })();
  }, []);

  text = JSON.stringify(location);

  return (
    <View style={styles.container}>
      <Button
        title="Fetch API Data"
        onPress={fetchApiDataOnClick}
        disabled={fetchingApiData}
      />
      {/* Display loading message if fetching data */}
      {fetchingApiData && <Text>Loading API data...</Text>}
      {/* <View style={{ flex: 1, width: "100%" }}> */}
      <MapView
        style={{ flex: 0.5, width: "100%" }}
        initialRegion={{
          latitude: 53.3498,
          longitude: -6.2603,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* if the closest bike is assigned, create a marker on the map! */}
        {/* {closestBike && (
          <Marker
            coordinate={{
              latitude: 53.3498,
              longitude: -6.2603,
            }}
            title={"Hello there"}
          />
        )}
        */}

        {/* {closestBike && (
          <Marker
            coordinate={{
              latitude: closestBike.lat,
              longitude: closestBike.lon,
            }}
            title={`Bike ID: ${closestBike.bike_id}`}
            description={`Reserved: ${closestBike.is_reserved}`}
          />
        )} */}
      </MapView>
      {/* </View> */}
      {/* Depending on the state of location, display loading message or the actual data returned from phone */}
      <Text>
        Latitude: {location ? location.coords.latitude : "Loading..."}
      </Text>
      <Text>
        Longitude: {location ? location.coords.longitude : "Loading..."}
      </Text>
      <Text> Speed: {location ? location.coords.speed : "Loading..."}</Text>
      <Text> Time: {location ? location.timestamp : "Loading..."}</Text>
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
