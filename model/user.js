const mongoose = require("mongoose");

mongoose.connect(
  `add_your_mongodb_atlas_connection_url`,
)
.then(() => {
    console.log("Connected to MongoDB Atlas");
})
.catch((error) => {
    console.error("Error connecting to MongoDB Atlas:", error.message);
});

const userSchema = mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  password: String,
});

module.exports = mongoose.model("user", userSchema);