const { Expo } = require('expo-server-sdk');
const expo = new Expo();



exports.sendPushNotification = async (pushToken, title, body) => {
    let messages = [];
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token: ${pushToken}`);
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
    });
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        let receipts = await expo.sendPushNotificationsAsync(chunk);
        console.log(receipts);
      } catch (error) {
        console.error(error);
      }
    }
  };