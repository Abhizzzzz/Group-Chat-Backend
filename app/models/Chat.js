/**
 * Module Dependencies
 */
const mongoose = require('mongoose'),
Schema = mongoose.Schema;

let chatSchema = new Schema({
  chatId: {
    type: String,
    required: true,
    // enables us to search the record faster
    index: true,
    unique: true
  },
  senderName: {
    type: String,
    default: ''
  },
  senderId: {
    type: String,
    default: ''
  },
  receiverName: {
    type: String,
    default: ''
  },
  receiverId: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: 0
  },
  chatRoom: {
    type: String,
    default: 0
  },
  message: {
    type: String,
    default: 0
  },
  seen: {
    type: Boolean,
    default: false
  },
  createdOn :{
    type: Date,
    default: Date.now
  },
  modifiedOn :{
    type: Date,
    default: Date.now
  }


})


mongoose.model('Chat', chatSchema);