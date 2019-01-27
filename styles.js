import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a2b0de",
    justifyContent: "flex-start",
    alignItems: "stretch"
  },
  header: {
    display: "flex",
    backgroundColor: "yellow",
    flex: -1,
    flexDirection: "row",
    marginTop: 30,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: 50,
    textAlign: "center",
    backgroundColor: "#a2b0de",
    zIndex: 12
  },
  map: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1
  },
  text: {
    color: "red",
    fontWeight: "bold",
    fontSize: 20,
    color: "#31597a",
    paddingLeft: 10
  },
  switch: {
    margin: 10
  },
  button: {
    position: "absolute",
    bottom: 50,
    left: "25%",
    width: "50%",
    borderRadius: 50,
    alignItems: "center",
    zIndex: 10,
    padding: 18,
    backgroundColor: "#fcf1c6"
  },
  buttonText: {
    color: "#31597a",
    fontWeight: "bold",
    fontSize: 23
  },
  filler: {
    flex: 5,
    zIndex: -10
  },
  filler2: {
    flex: 5,
    zIndex: -10
  }
});
