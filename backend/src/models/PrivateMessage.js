const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: ["sent", "delivered"],
      default: "sent",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
