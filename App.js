import React, {Component} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  Switch,
  TouchableOpacity,
  AsyncStorage
} from "react-native";
import io from 'socket.io-client';
import DeviceInfo from 'react-native-device-info';
import PushNotification from 'react-native-push-notification';
import PushController from './PushController';
import SplashScreen from 'react-native-splash-screen';
import { SOCKET_URL, BACKEND_URL } from './config.js';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import { mapStyle } from "./mapstyles.js";
import { styles } from "./styles.js";

console.disableYellowBox = true;


type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super();
    this.state = {
      switchValue: false,
      isSafe: true,
      socket: null,
      uuid: null,
      long: 0,
      lat: 0,
      name: null,
      error: null,
      llamas : [], // array of objects
      responders: [], // responder objects
      device_token: null,
      watchId: 0,
    }
  }

  componentWillMount() {
    if (DeviceInfo.isEmulator()) {
      console.log("==== its an emulator ======");
    }
    this.retrieveSafeStatus()
    .then(() => {
       return this.setCurrentGeolocation();
    })
    .then(() => {
       return this.retrieveUuid();
    })
    .then(() => {
       return this.retrieveDeviceToken();
    })
    .then(() => {
       return this.retrieveName();
    })
    .then(() => {
      this.retrieveSwitchValue();
    })
    .catch((err) => this.setState({ error: err.message }));
  }

  componentDidMount() {
    SplashScreen.hide();
    const watchId = setInterval(async () => {
      await navigator.geolocation.getCurrentPosition((position) => {
          console.log("******* updating location *************");
          this.state.socket && this.state.uuid && this.state.socket.emit('update_location', {
            uuid: this.state.uuid,
            lat: position.coords.latitude,
            long: position.coords.longitude,
            isSafe: this.state.isSafe,
            name: this.state.name,
          });
          this.setState({
            lat: position.coords.latitude,
            long: position.coords.longitude,
            error: null,
          });
        },
        (error) => this.setState({ error: error.message }),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 },
      );
    }, 5000);
    this.setState({ watchId });
  }

  componentWillUnmount() {
    clearInterval(this.state.watchId);
  }

  setCurrentGeolocation = async () => {
    await navigator.geolocation.getCurrentPosition((position) => {
        this.setState({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          error: null,
        });
        this.state.socket && this.state.socket.emit('active', {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat,
          isSafe: this.state.isSafe,
          name: this.state.name,
        });
      },
      (error) => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
  }

  retrieveUuid = async () => {
    try {
      const uuid = await AsyncStorage.getItem('uuid');
      if (uuid !== null) {
        console.log("retrieved uuid: ", uuid);
        this.setState({ uuid })
      }
     } catch (error) {
       this.setState({ error: error.message })
       console.log("UUID RETRIEVE ERROR ", error);
     }
  }

  retrieveName = async () => {
    try {
      const name = await AsyncStorage.getItem('name');
      if (name !== null) {
        console.log("retrieved name: ", name);
        this.setState({ name })
      }
     } catch (error) {
       this.setState({ error: error.message })
       console.log("NAME RETRIEVE ERROR ", error);
     }
  }

  retrieveSwitchValue = async () => {
    try {
      const switchValue = await AsyncStorage.getItem('switch');
      if (switchValue !== null) {
        console.log("retrieved switch value: ", switchValue);
        this.setState({ switchValue: JSON.parse(switchValue) })
        if (!this.state.socket && switchValue == 'true') {
          this.initSocket();
        }
      } // end outer if
     } catch (error) {
       this.setState({ error: error.message })
       console.log("SWITCH VALUE RETRIEVE ERROR ", error);
     }
  }

  retrieveSafeStatus = async () => {
    try {
      const isSafe = await AsyncStorage.getItem('safe');
      if (isSafe !== null) {
        console.log("retrieved safe status: ", isSafe);
        this.setState({ isSafe: JSON.parse(isSafe) })
      }
     } catch (error) {
       this.setState({ error: error.message });
       console.log("SAFE STATUS RETRIEVE ERROR ", error);
     }
  }

  retrieveDeviceToken = async () => {
    try {
      const tkn = await AsyncStorage.getItem('token');
      if (tkn !== null) {
        console.log("retrieved device token: ", tkn);
        this.setState({ device_token: tkn });
      } else {
        if (DeviceInfo.isEmulator()) {
          console.log("created fake device token")
          this.setState({ device_token: `${Math.random()}` });
        }
      }
     } catch (error) {
       this.setState({ error: error.message });
       console.log("DEVICE TOKEN RETRIEVE ERROR ", error);
     }
  }

  setToken = (tkn) => {
    this.setState({ device_token: tkn });
  }

  store = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      this.setState({ error: error.message })
      console.log(`Error storing ${key} on device`, error);
    }
  }

  initSocket = () => {
    const socket = io(SOCKET_URL);
    console.log("********** initiating socket *******");
    if (!this.state.uuid) {  // first time using the app
      socket && socket.emit('create_user', {
        device_token: this.state.device_token,
        long: this.state.long,
        lat: this.state.lat,
      });
    } else {
      socket && socket.emit('active', {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
        isSafe: this.state.isSafe,
        name: this.state.name,
      });
    }

    socket.on('who_are_you', () => {
      console.log('it me');
    });

    socket.on('user_created', (user_object) => {
      console.log("Got user object: ", user_object);
      this.setState({ name: user_object.name, uuid: user_object.uuid });
      this.store('uuid', user_object.uuid);
      this.store('name', user_object.name);
    });

    socket.on('add_llama', (llama) => {
      let llamaIndex = -1;
      this.state.llamas.forEach((one,i) => {
        if (one.uuid === llama.uuid) llamaIndex = i;
      });
      if (llamaIndex === -1) { // not found
        console.log("adding llama ", llama)
        const llamas = [...this.state.llamas];
        if (llama.uuid !== this.state.uuid)llamas.push(llama);
        this.setState({ llamas });
      }
    });

    socket.on('add_responder', (resp) => {
      let respIndex = -1;
      this.state.responders.forEach((one,i) => {
        if (one.uuid === resp.uuid) respIndex = i;
      });
      console.log(`add ${respIndex} resp ?`)
      if(respIndex === -1) { // not found
        console.log("adding responder ", resp)
        const responders = [...this.state.responders];
        if (resp.uuid !== this.state.uuid) responders.push(resp);
        this.setState({ responders });
      }
    });

    socket.on('update', (person) => {
      if (person.isSafe) {
        console.log("updating responder ", person);
        let respIndex = -1;
        this.state.responders.forEach((one,i) => {
          if (one.uuid === person.uuid) respIndex = i;
        });
        if (respIndex > -1) { // is found
          const responders = [...this.state.responders];
          responders.splice(respIndex, 1, person);
          this.setState({ responders });
        }
      } else { // person is not safe
        console.log("updating llama ", person);
        let llamaIndex = -1;
        this.state.llamas.forEach((one,i) => {
          if (one.uuid === person.uuid) llamaIndex = i;
        });
        if (llamaIndex > -1) { // is found
          const llamas = [...this.state.llamas];
          llamas.splice(llamaIndex, 1, person);
          this.setState({ llamas });
        }
      } // end else
    });

    socket.on('new_llama', (uuid) => {
      // remove if new llama is in responder list
      const responders = this.state.responders.filter((item) => item.uuid !== uuid);
      this.setState({ responders });
      socket.emit('active', {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
        isSafe: this.state.isSafe,
        name: this.state.name,
      });
    });

    socket.on('new_responder', () => {
      console.log("new responder was hit");
      if (!this.state.isSafe) { // responders will not get data about each other
        socket.emit('active', {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat,
          isSafe: this.state.isSafe,
          name: this.state.name,
        });
      }
    });

    socket.on('clear', (uuid) => {
      const newLlamas = this.state.llamas.filter((item) => item.uuid !== uuid);
      const newResponders = this.state.responders.filter((item) => item.uuid !== uuid);
      this.setState({ llamas: newLlamas, responders: newResponders });
    });

    this.setState({ socket });
  }

  toggleSwitch = (value) => {
    this.setState({switchValue: value});
    console.log('Switch is: ' + value);
    if (value == 1) {
      // active --> TODO start location tracking
      !this.state.socket && this.initSocket();
      this.store('switch', JSON.stringify(true));

    } else {
      // not active --> TODO stop location tracking
      this.state.socket && this.state.socket.emit('not_active', {
        uuid: this.state.uuid
      });
      this.state.socket && this.state.socket.disconnect();
      this.setState({ socket : null, llamas: [] });
      this.store('switch', JSON.stringify(false));
    }
  }

  changeSafeStatus = () => {
    const newStatus = !this.state.isSafe;
    if (newStatus) {
      this.state.socket && this.state.socket.emit('imsafe', {
        uuid: this.state.uuid
      });
    } else {
      this.state.socket && this.state.socket.emit('notify', {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
        name: this.state.name,
      });
      if(this.state.switchValue === false) { // if the user is not set active
        this.store('switch', true);
        this.setState({ switchValue: true });
      }
    }
    this.store('safe', JSON.stringify(newStatus));
    this.setState({ isSafe: newStatus });
  }

  render() {
    console.log("STATE NOW ", this.state);
    return (
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={mapStyle}
          region={{
            latitude: this.state.lat,
            longitude: this.state.long,
            latitudeDelta: 0.01,
            longitudeDelta: 0.015 }}
            showsUserLocation={true}>
          {this.state.llamas && this.state.llamas.map(llama => (
              <Marker
                title={llama.name}
                coordinate={{ latitude: llama.lat, longitude: llama.long }}
                image={require("./images/red.png")}
              >
                <Callout>
                  <Text style={{ textAlign: "center", marginBottom: 5 }}>
                    {llama.name}
                  </Text>
                  <Image
                    style={{ width: 180, height: 180 }}
                    source={{ uri: `${BACKEND_URL}img/${llama.name}.jpeg` }}
                  />
                </Callout>
              </Marker>
            ))}
          {this.state.responders && this.state.responders.map(responder => (
              <Marker
                title={responder.name}
                coordinate={{
                  latitude: responder.lat,
                  longitude: responder.long
                }}
                image={require("./images/yellow.png")}>
                <Callout>
                  <Text style={{ textAlign: "center", marginBottom: 5 }}>
                    {responder.name}
                  </Text>
                  <Image
                    style={{ width: 180, height: 180 }}
                    source={{ uri: `${BACKEND_URL}img/${responder.name}.jpeg` }}
                  />
                </Callout>
              </Marker>
            ))}
        </MapView>
        <View style={styles.header}>
          <Text style={styles.text}> I'm Ready to Help </Text>
          <Switch trackColor={{ true: "#31597a", false: "null" }} style={styles.switch} onValueChange={this.toggleSwitch} value={this.state.switchValue} disabled={this.state.isSafe ? false : true} />
        </View>
        <View style={styles.filler} />
        <TouchableOpacity style={styles.button} onPress={this.changeSafeStatus} accessibilityLabel="button to ask for help">
          <Text style={styles.buttonText}>
            {this.state.isSafe ? "Huddle Up" : "All Clear"}
          </Text>
        </TouchableOpacity>
        <View style={styles.filler2} />
        <PushController setToken={this.setToken}/>
      </View>
    );
  }
}
