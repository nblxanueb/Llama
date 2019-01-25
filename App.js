import React, { Component } from "react";
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
import io from "socket.io-client";
import { SOCKET_URL, BACKEND_URL } from "./config.js";
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from "react-native-maps";
import { mapStyle } from "./mapstyles.js";
import { styles } from "./styles.js";


console.disableYellowBox = true;

type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super();
    this.state = {
      switchValue: true,
      isSafe: true,
      socket: null,
      uuid: null,
      long: 0,
      lat: 0,
      name: null,
      error: null,
      llamas: [], // array of objects
      responders: [] // responder objects
    };
  }

  componentWillMount() {
    this.retrieveSafeStatus()
      .then(() => {
        return this.setCurrentGeolocation();
      })
      .then(() => {
        return this.retrieveUuid();
      })
      .then(() => {
        this.retrieveSwitchValue();
      })
      .catch(err => console.log(err));
  }

  setCurrentGeolocation = async () => {
    await navigator.geolocation.getCurrentPosition(
      position => {
        this.setState({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          error: null
        });
        this.state.socket &&
          this.state.socket.emit("active", {
            uuid: this.state.uuid,
            long: this.state.long,
            lat: this.state.lat,
            isSafe: this.state.isSafe
          });
      },
      error => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  retrieveUuid = async () => {
    try {
      const uuid = await AsyncStorage.getItem("uuid");
      if (uuid !== null) {
        console.log("retrieved uuid: ", uuid);
        this.setState({ uuid });
      }
    } catch (error) {
      console.log("UUID RETRIEVE ERROR ", error);
    }
  };

  retrieveSwitchValue = async () => {
    try {
      const switchValue = await AsyncStorage.getItem("switch");
      if (switchValue !== null) {
        console.log("retrieved switch value: ", switchValue);
        this.setState({ switchValue: JSON.parse(switchValue) });
        if (!this.state.socket && switchValue == "true") {
          this.initSocket();
        }
      } else {
        this.initSocket();
      }
    } catch (error) {
      console.log("SWITCH VALUE RETRIEVE ERROR ", error);
    }
  };

  retrieveSafeStatus = async () => {
    try {
      const isSafe = await AsyncStorage.getItem("safe");
      if (isSafe !== null) {
        console.log("retrieved safe status: ", isSafe);
        this.setState({ isSafe: JSON.parse(isSafe) });
      }
    } catch (error) {
      console.log("SAFE STATUS RETRIEVE ERROR ", error);
    }
  };

  store = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log(`Error storing ${key} on device`, error);
    }
  };

  initSocket = () => {
    const socket = io(SOCKET_URL);
    console.log("********** initiating socket *******");
    if (!this.state.uuid) {
      // first time using the app
      socket &&
        socket.emit("create_user", {
          device_token: `${Math.random()}`, // will be implemeted later
          long: this.state.long,
          lat: this.state.lat
        });
    } else {
      // set user to active
      socket &&
        socket.emit("active", {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat,
          isSafe: this.state.isSafe
        });
    }

    socket.on("user_created", user_object => {
      console.log("Got user object: ", user_object);
      this.setState({ name: user_object.name, uuid: user_object.uuid });
      this.store("uuid", user_object.uuid);
    });
    socket.on("add_llama", llama => {
      console.log("adding llama ", llama);
      const llamas = [...this.state.llamas];
      if (llama.uuid !== this.state.uuid) llamas.push(llama);
      this.setState({ llamas });
    });
    socket.on("add_responder", resp => {
      console.log("adding reponder ", resp);
      const responders = [...this.state.responders];
      if (resp.uuid !== this.state.uuid) responders.push(resp);
      this.setState({ responders });
    });
    socket.on("update_llama", llama => {
      console.log("updating llama ", llama);
      const llamaIndex = this.state.llamas.forEach((one, i) => {
        if (one.uuid === llama.uuid) return i;
      });
      if (llamaIndex !== null) {
        const llamas = [...this.state.llamas];
        llamas.splice(llamaIndex, 1, llama);
        this.setState({ llamas });
      }
    });
    socket.on("update_responder", resp => {
      console.log("updating resonder ", resp);
      const respIndex = this.state.responders.forEach((one, i) => {
        if (one.uuid === resp.uuid) return i;
      });
      if (respIndex !== null) {
        const responders = [...this.state.responders];
        responders.splice(respIndex, 1, resp);
        this.setState({ responders });
      }
    });
    socket.on("new_llama", () => {
      socket.emit("active", {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
        isSafe: this.state.isSafe
      });
    });
    socket.on("new_responder", () => {
      console.log("new responder was hit");
      if (!this.state.isSafe) {
        socket.emit("active", {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat,
          isSafe: this.state.isSafe
        });
      }
    });
    socket.on("clear", uuid => {
      const newLlamas = this.state.llamas.filter(item => item.uuid !== uuid);
      const newResponders = this.state.responders.filter(
        item => item.uuid !== uuid
      );
      this.setState({ llamas: newLlamas, responders: newResponders });
    });

    this.setState({ socket });
  };

  toggleSwitch = value => {
    this.setState({ switchValue: value });
    console.log("Switch is: " + value);
    if (value == 1) {
      // active --> TODO start location tracking
      !this.state.socket && this.initSocket();
      this.store("switch", JSON.stringify(true));
    } else {
      // not active --> TODO stop location tracking
      this.state.socket &&
        this.state.socket.emit("not_active", {
          uuid: this.state.uuid
        });
      this.state.socket && this.state.socket.disconnect();
      this.setState({ socket: null, llamas: [] });
      this.store("switch", JSON.stringify(false));
    }
  };

  changeSafeStatus = () => {
    const newStatus = !this.state.isSafe;
    if (newStatus) {
      this.state.socket &&
        this.state.socket.emit("imsafe", {
          uuid: this.state.uuid
        });
    } else {
      this.state.socket &&
        this.state.socket.emit("notify", {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat
        });
      if (this.state.switchValue === false) {
        // if the user is not set active
        this.store("switch", true);
        this.setState({ switchValue: true });
      }
    }
    this.store("safe", JSON.stringify(newStatus));
    this.setState({ isSafe: newStatus });
  };

  render() {
    console.log("STATE NOW ", this.state);
    return <View style={styles.container}>
        <MapView provider={PROVIDER_GOOGLE} style={styles.map} customMapStyle={mapStyle} region={{ latitude: 40.756705, longitude: -73.985251, latitudeDelta: 0.01, longitudeDelta: 0.01 }} showsUserLocation={true}>
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
      </View>;
  }
}

