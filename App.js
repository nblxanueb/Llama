import React, {Component} from 'react';
import { Platform,
         StyleSheet,
         Text,
         View,
         Switch,
         AsyncStorage } from 'react-native';
import io from 'socket.io-client';
import { SOCKET_URL } from './config.js'

type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super();
    this.state = {
      switchValue: false,
      socket: null,
      uuid: null,
      long: null,
      lat: null,
      name: null,
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

  storeSwitchValue = async (value) => {
    try {
      await AsyncStorage.setItem('switch', value);
    } catch (error) {
      console.log("SWITCH VALUE SAVE ERROR ", error);
    }
  }

  storeUuid = async (value) => {
    try {
      await AsyncStorage.setItem('uuid', value);
    } catch (error) {
      console.log("SWITCH VALUE SAVE ERROR ", error);
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
    }
    socket.on('user_created', (user_object) => {
      console.log("Got user object: ", user_object);
      this.setState({ name: user_object.name, uuid: user_object.uuid });
      this.storeUuid(user_object.uuid);
    })
    socket.on('update', (arr) => {
      const llamas = arr;
      this.setState({ llamas });
    })
    this.setState({ socket });
  }

  toggleSwitch = (value) => {
    this.setState({switchValue: value});
    console.log('Switch is: ' + value);
    if (value == 1) {
      // active --> TODO start location tracking
      !this.state.socket && this.initSocket();
      this.storeSwitchValue(JSON.stringify(true));

    } else {
      // not active --> TODO stop location tracking
      this.state.socket && this.state.socket.disconnect();
      this.setState({ socket : null, llamas: [] });
      this.storeSwitchValue(JSON.stringify(false));
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Switch
          onValueChange={this.toggleSwitch}
          value={this.state.switchValue}
        />
        {
          this.state.llamas &&
          this.state.llamas.map((item) => <Text key={item.uuid}>name: {item.name} long: {item.long} lat: {item.lat}</Text>)
        }
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
