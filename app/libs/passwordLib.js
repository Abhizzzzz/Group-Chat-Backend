const bcrypt = require('bcryptjs');
const saltRounds = 10;

const logger = require('../libs/loggerLib');

// for encrypting the password
// we have created this function synchronous because,
// we want to use this in signUp so we want to complete that there only,not to use callback because we want to hash the password in signup only
let hashpassword = (myPlainTextPassword) =>{
    let salt = bcrypt.genSaltSync(saltRounds);
    // encryption
    let hash = bcrypt.hashSync(myPlainTextPassword,salt);
    return hash;
};

// for comparing the password at the time of login
let comparePassword = (oldPassword,hashpassword,cb) =>{
    bcrypt.compare(oldPassword,hashpassword,(err,res) =>{
        if(err){
            logger.error(err.message,'Comparison Error',5);
            cb(err,null);
        }
        else{
            cb(null,res);
        };
    });
};

// sync function of compare password,just declared not to be used
let comparePasswordSync = (myPlainTextPassword,hashpassword) =>{
    return bcrypt.compareSync(myPlainTextPassword,hashpassword);
};

module.exports = {
    hashpassword: hashpassword,
    comparePassword: comparePassword,
    comparePasswordSync: comparePasswordSync
};