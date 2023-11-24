 # urbanComputingApp

# Mobile App Data Submission to Cloud

I have built a mobile app using React Native that collects data from the device being run on and also fetches data from the SmartDublin BleeperBike API. The collected data from both sources is then uploaded to Firebase.

## Prerequisites

Before running the app on your machine, make sure you have the following prerequisites installed:

- Node.js and npm
- Expo: You can install it using npm: `npm install -g expo-cli`
- Firebase Account: You'll need to set up a Firebase project and obtain the configuration details to put into your project. I am not sure if the ones I have in for myself will work for another user.

## Setup

1. Download my source code from the zip file.

2. Install the required dependencies listed in the package.json using npm command below.

   ```
   npm install
   ```

3. Potentially create a Firebase project and insert your own firebaseConfig in App.js

4. Run the project using:

   ```
   expo start
   ```

5. I used Expo Go on my mobile phone to scan the presented QR code to run and test the app.
