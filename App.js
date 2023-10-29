import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useState, useEffect } from "react";
import * as Location from "expo-location";

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const getCurrentLocation = async () => {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        console.log(currentLocation);
      };
      getCurrentLocation();

      const refreshLocation = setInterval(getCurrentLocation, 1000);

      // Cleanup the interval when the component is unmounted
      return () => clearInterval(refreshLocation);
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
      <Text>
        Latitude: {location ? location.coords.latitude : "Loading..."}
      </Text>
      <Text>
        Longitude: {location ? location.coords.longitude : "Loading..."}
      </Text>
      <Text> Speed: {location ? location.coords.speed : "Loading..."}</Text>
      <Text> Time: {location ? location.timestamp : "Loading..."}</Text>
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
