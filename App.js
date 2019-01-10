import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, Switch} from 'react-native';
import io from 'socket.io-client';
import { SOCKET_URL } from './config.js'

type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super();
    this.state = {
      switchValue: false,
      socket: null,
      // sample llama object
      // {
      //   name: 'Lucy',
      //   long: '11',
      //   lat: '22',
      //   key: '1'
      // }
      llamas : [], // array of objects, each object has long, lat and name ??
    }
  }

  // componentWillMount() {
  // TODO retrieve switchValue from memory
  //   if (this.switchValue == 1) {
  //     this.initSocket();
  //   }
  // }

  initSocket = () => {
    const socket = io(SOCKET_URL);
    console.log('hello')
    socket.on('connnect', () => {
      console.log('Connected to socket');
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
      this.initSocket();
    } else {
      // not active --> TODO stop location tracking
      this.state.socket.disconnect();
      this.setState({ socket : null, llamas: [] });
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
          this.state.llamas.map((item) => <Text key={item.key}>name: {item.name} long: {item.long} lat: {item.lat}</Text>)
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
