import React, {Component} from 'react';
import { Platform,
         StyleSheet,
         Text,
         View,
         Button,
         Switch,
         AsyncStorage } from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';
import { SOCKET_URL, BACKEND_URL } from './config.js'

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
      // sample llama (person in trouble) object
      // {
      //   uuid: 'fu3wfb-g34igub-v3rivf',
      //   name: 'Lucy',
      //   long: 11,
      //   lat: 22,
      // }
      llamas : [], // array of objects
    }
  }

  componentWillMount() {
    this.retrieveUuid();
    this.retrieveSwitchValue();
    this.retrieveSafeStatus();
    this.setCurrentGeolocation();
  }

  setCurrentGeolocation = () => {
    navigator.geolocation.getCurrentPosition((position) => {
        this.setState({
          lat: position.coords.latitude,
          long: position.coords.longitude,
          error: null,
        });
        this.state.socket && this.state.socket.emit('active', {
          uuid: this.state.uuid,
          long: this.state.long,
          lat: this.state.lat,
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
       console.log("UUID RETRIEVE ERROR ", error);
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
      }
     } catch (error) {
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
       console.log("SAFE STATUS RETRIEVE ERROR ", error);
     }
  }

  store = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.log("Error storing on device", error);
    }
  }

  initSocket = () => {
    const socket = io(SOCKET_URL);
    if (!this.state.uuid) {  // first time using the app
      socket && socket.emit('create_user', {
        device_token: '123', // will be implemeted later
        long: this.state.long,
        lat: this.state.lat,
      });
    } else { // set user to active
      socket && socket.emit('active', {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
      });
    }

    socket.on('user_created', (user_object) => {
      console.log("Got user object: ", user_object);
      this.setState({ name: user_object.name, uuid: user_object.uuid });
      this.store('uuid', user_object.uuid);
    })
    socket.on('update', (llama) => {
      console.log("updating llama ", llama)
      const llamas = this.state.llamas.slice(); // copy
      llamas.push(llama);
      this.setState({ llamas });
    })
    socket.on('new_room', () => {
      socket.emit('active', {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat,
      });
    })
    socket.on('clear', (uuid) => {
      const newLlamas = this.state.llamas.filter((item) => item.uuid !== uuid);
      this.setState({ llamas: newLlamas });
    })
    this.setState({ socket });
  }

  postRequestToServer = (url, data) => {
    axios.post(url, data)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
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
      this.postRequestToServer(`${BACKEND_URL}user/imsafe`, {
        uuid: this.state.uuid
      });
    } else {
      this.postRequestToServer(`${BACKEND_URL}user/notify`, {
        uuid: this.state.uuid,
        long: this.state.long,
        lat: this.state.lat
      });
    }
    this.store('safe', JSON.stringify(newStatus));
    this.setState({ isSafe: newStatus });
  }

  render() {
    console.log("STATE NOW ", this.state);
    return (
      <View style={styles.container}>
        <Switch
          onValueChange={this.toggleSwitch}
          value={this.state.switchValue}
        />
        {
          this.state.llamas &&
          this.state.llamas.map((item) => <Text key={item.uuid}>id: {item.uuid} long: {item.long} lat: {item.lat}</Text>)
        }
        <Button
          onPress={this.changeSafeStatus}
          title={this.state.isSafe ? 'PLZ HELP' : 'IM SAFE'}
          color="#841584"
          accessibilityLabel="button to ask for help"
        />
        { this.state.error && (<Text>ERROR {this.state.error}</Text>)}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
