const express = require("express");
const app = express();
const port = 3000;
var state = "OFF";
// Define a GET endpoint
app.get("/", (req, res) => {
  console.log(state, "Sent State");
  res.send(state);
});

app.get("/change/:on", (req, res) => {
  state = req.params.on == "ON" ? "ON" : "OFF";
  res.send(state);
});
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});