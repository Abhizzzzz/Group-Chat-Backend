// when user logins we are going to store these details in Auth
// one more layer of security

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const time = require('../libs/timeLib');

const authSchema = new Schema({
    userId: {
        type: String
    },
    authToken: {
        type: String
    },
    // we are storing this is due to we might change this from 15 days 
    tokenSecret: {
        type: String
    },
    tokenGenerationTime: {
        type: Date,
        default: time.now()
    }
});

//  Login is the table name i.e collections in mongodb
module.exports = mongoose.model('Auth',authSchema,'Login');