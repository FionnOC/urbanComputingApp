import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Button } from "react-native";
import { useState, useEffect } from "react";
import * as Location from "expo-location";

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
  const [errorMsg, setErrorMsg] = useState(null);
  const [fetchingApiData, setFetchingApiData] = useState(false);

  const getApiData = async () => {
    try {
      // console.log("before fetch");
      const response = await fetch(
        "https://data.smartdublin.ie/bleeperbike-api/last_snapshot/"
      );
      if (!response.ok) {
        throw new Error("Network response error");
      }
      // console.log("after fetch");
      const data = await response.json();

      data.forEach(async (item) => {
        const collectionRef = collection(db, "apiData");
        try {
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
          // console.log("api to firebase complete");
        } catch (error) {
          console.error("error sending data: ", error);
        }
      });
      console.log("done");

      // console.log(data);
    } catch (error) {
      console.error("Error fetching data from API: ", error);
      return null;
    }
  };

  const fetchApiDataOnClick = async () => {
    setFetchingApiData(true);
    await getApiData();
    setFetchingApiData(false);
  };

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
    console.log("finished func");
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

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

      // const refreshFunction = () => {
      //   getCurrentLocation();
      //   getApiData();
      // };

      getCurrentLocation();
      // getApiData();

      const refreshLocation = setInterval(getCurrentLocation, 10000);

      // wait 2 mins for every refresh of getApiData
      // const refreshBikesLocation = setInterval(getApiData, 120000);

      return () => {
        clearInterval(refreshLocation);
        // clearInterval(refreshBikesLocation);
      };
    })();
  }, []);

  let text = "Waiting..";
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View style={styles.container}>
      <Button
        title="Fetch API Data"
        onPress={fetchApiDataOnClick}
        disabled={fetchingApiData}
      />
      {/* Display loading message if fetching data */}
      {fetchingApiData && <Text>Loading API data...</Text>}
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
