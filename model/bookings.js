const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema({
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "place",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  checkIn: String,
  checkOut: String,
  name: String,
  guests: Number,
  number: Number,
});

module.exports = mongoose.model("booking", bookingSchema);
