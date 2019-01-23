import React, { Component } from  'react';
import { PushNotificationIOS, Alert, AsyncStorage } from 'react-native';
import PushNotification from 'react-native-push-notification';

export default class PushController extends Component {

  componentWillMount() {
    PushNotification.configure({

        onRegister: async (token) => {
            console.log( 'TOKEN:', token.token );
            this.props.setToken(token.token);
            try {
              await AsyncStorage.setItem('device_token', token.token);
            } catch (error) {
              console.log(`Error storing DEVICE TOKEN on device`, error);
            }
        },


        // (required) Called when a remote or local notification is opened or received
         onNotification: function(notification) {
            console.log( 'NOTIFICATION:', notification );
            notification.finish(PushNotificationIOS.FetchResult.NoData);
        },

        // IOS ONLY (optional): default: all - Permissions to register.
        permissions: {
            alert: true,
            badge: true,
            sound: true
        },

        // Should the initial notification be popped automatically
        // default: true
        popInitialNotification: true,
        requestPermissions: true,
    });
  }

  localNotif() {
   PushNotification.localNotification({
     /* iOS only properties */
     alertAction: 'view', // (optional) default: view
     category: null, // (optional) default: null
     userInfo: null, // (optional) default: null (object containing additional notification data)

     /* iOS and Android properties */
     title: "Local Notification", // (optional)
     message: "My Notification Message", // (required)
     playSound: false, // (optional) default: true
     soundName: 'default', // (optional) Sound to play when the notification is shown. Value of 'default' plays the default sound. It can be set to a custom sound such as 'android.resource://com.xyz/raw/my_sound'. It will look for the 'my_sound' audio file in 'res/raw' directory and play it. default: 'default' (default sound is played)
     number: '10', // (optional) Valid 32 bit integer specified as string. default: none (Cannot be zero)
     actions: '["Yes", "No"]',  // (Android only) See the doc for notification actions to know more
   });
 }

  render() {
    return null;
  }
}
