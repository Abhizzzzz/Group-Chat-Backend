const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib');
const passwordLib = require('../libs/passwordLib');
const emailLib = require('../libs/gmailLib');
const tokenLib = require('../libs/tokenLib');


/* Models */
const UserModel = mongoose.model('User');
const AuthModel = mongoose.model('Auth');


// start user signup function 

let signUpFunction = (req, res) => {
    let validatingInputs = () =>{
        return new Promise((resolve,reject) =>{
            if(req.body.email && req.body.password && req.body.firstName && req.body.lastName && req.body.mobileNumber){
                if(!validateInput.Email(req.body.email)){
                    let apiResponse = response.generate(true,"Email does'nt meet the requirement",400,null);
                    reject(apiResponse);
                }
                else{
                    // if(!validateInput.Password(req.body.email)){
                    //     let apiResponse = response.generate(true,"Minimum 8 characters which contain only characters,numeric digits, underscore and first character must be a letter",400,null);
                    //     reject(apiResponse);
                    // }
                    // else{
                    //     resolve(req);
                    // }
                    resolve(req);
                   
                }
                
            }
            else{
                let apiResponse = response.generate(true,"Body parameter are missing",400,null);
                reject(apiResponse);
            }
        });
    }; // end of validateInputs

    let createUser = () =>{
        return new Promise((resolve,reject) =>{
            UserModel.findOne({'email': req.body.email}).exec((err,userDetails) =>{
                if(err){
                    logger.error(err.message,"userController => createUser()",5);
                    let apiResponse = response.generate(true,"Failed to create user",500,null);
                    reject(apiResponse);

                }
                // user is not present in the DB 
                else if(check.isEmpty(userDetails)){
                    let newUser = new UserModel({
                        userId: shortid.generate(),
                          firstName: req.body.firstName,
                          lastName: req.body.lastName,
                          password: passwordLib.hashpassword(req.body.password),
                          email: req.body.email.toLowerCase(),
                          mobileNumber: req.body.mobileNumber
                    });

                    newUser.save((err,newUserDetails) =>{
                        if(err){
                            logger.error(err.message,"userController => createUser()",5);
                            let apiResponse = response.generate(true,"Failed to create new user",500,null);
                            reject(apiResponse);
                        }
                        else{
                            let newUserObj = newUserDetails.toObject();
                            resolve(newUserObj);
                        }
                    });

                }
                // user is present already in the DB
                else{
                    let apiResponse = response.generate(true,'User already signed up',403,null);
                    reject(apiResponse);
                }

            });


        });
    }; // end of createUser
  
    validatingInputs(req,res).then(createUser).then((newUserDetails) =>{
        delete newUserDetails.password;
        delete newUserDetails._id;
        delete newUserDetails.__v;
        // sending a welcome email
        emailLib.welcomeEmail(newUserDetails);
        let apiResponse = response.generate(false,"Signed up successfully",200,newUserDetails);
        res.send(apiResponse);
    }).catch((err) =>{
        console.log(err);
        res.send(err);
    });


}// end user signup function 

// start of login function 
let loginFunction = (req, res) => {
    let validatingInputs = () =>{
        console.log("validatingInputs");
        return new Promise((resolve,reject) =>{
            if(req.body.email && req.body.password){
                resolve(req);
            }
            else{
                let apiResponse = response.generate(true,"Email or password missing",400,null);
                reject(apiResponse);
            }
        });
    }; // end of validatingInputs

    let findUser = () =>{
        console.log("findUser");
        return new Promise((resolve,reject) =>{
            UserModel.findOne({'email': req.body.email}).exec((err,userDetails) =>{
                if(err){
                    logger.error("Failed to retrieve user data","userController => findUser()",5);
                    let apiResponse = response.generate(true,"Failed to retrieve user data",500,null);
                    reject(apiResponse);
                }
                else if(check.isEmpty(userDetails)){
                    logger.error("User not registered","userController => findUser()",5);
                    let apiResponse = response.generate(true,"User not registered",500,null);
                    reject(apiResponse);
                }
                else{
                    logger.info("User found","userController => findUser()",10);
                    resolve(userDetails);
                }
            });
        });

    }; // end of findUser

    let validatingPassword = (retrieveUserDetails) =>{
        console.log("validatingPassword");
        return new Promise((resolve,reject) =>{
            passwordLib.comparePassword(req.body.password,retrieveUserDetails.password,(err,isMatch) =>{
                if(err){
                    logger.error("Login failed","userController => validatingPassword()",5);
                    let apiResponse = response.generate(true,"Login failed",500,null);
                    reject(apiResponse);
                }
                else if(isMatch){
                    let retrieveUserDetailsObj = retrieveUserDetails.toObject();
                    delete retrieveUserDetailsObj.password;
                    delete retrieveUserDetailsObj._id;
                    delete retrieveUserDetailsObj.__v;
                    delete retrieveUserDetailsObj.createdOn;
                    delete retrieveUserDetailsObj.modifiedOn;
                    resolve(retrieveUserDetailsObj);
                }
                else{
                    logger.error("Invalid password","userController => validatingPassword()",10);
                    let apiResponse = response.generate(true,"Invalid password",400,null);
                    reject(apiResponse);
                }
            });
        });

    }; // end of validatingPassword

    let generateToken = (userDetails) =>{
        console.log("generateToken");
        return new Promise((resolve,reject) =>{
            tokenLib.generateToken(userDetails,(err,tokenDetails) =>{
                if(err){
                    logger.error("Failed to generate token","userController => generateToken()",10);
                    let apiResponse = response.generate(true,"Failed to generate token",500,null);
                    reject(apiResponse);
                }
                else{
                    tokenDetails.userId = userDetails.userId;
                    tokenDetails.userDetails = userDetails;
                    resolve(tokenDetails);
                }
            });
        });
    }; // end of generateToken

    let saveToken = (tokenDetails) =>{
        console.log("saveToken");
        return new Promise((resolve,reject) =>{
            AuthModel.findOne({userId: tokenDetails.userId}).exec((err,retrieveTokenDetails) =>{
                if(err){
                    let apiResponse = response.generate(true,"Failed to save token",500,null);
                    reject(apiResponse);
                }
                // user is logging for the first time
                else if(check.isEmpty(retrieveTokenDetails)){
                    let newAuthToken = new AuthModel({
                        userId: tokenDetails.userId,
                        authToken: tokenDetails.token,
                        // we are storing this is due to we might change this from 15 days 
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenGenerationTime: time.now()
                    });

                    newAuthToken.save((err,newTokenDetails) =>{
                        if(err){
                            let apiResponse = response.generate(true,"Failed to save token",500,null);
                            reject(apiResponse);
                        }
                        else{
                            let responseBody = {
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails
                            };
                            resolve(responseBody);
                        }
                    });
                }
                // user has already logged in need to update the token
                else{
                    retrieveTokenDetails.authToken = tokenDetails.token;
                    retrieveTokenDetails.tokenSecret = tokenDetails.tokenSecret;
                    retrieveTokenDetails.tokenGenerationTime = time.now();
                    retrieveTokenDetails.save((err,newTokenDetails) =>{
                        if(err){
                            let apiResponse = response.generate(true,"Failed to save token",500,null);
                            reject(apiResponse);
                        }
                        else{
                            let responseBody ={
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails
                            };
                            resolve(responseBody);
                        }
                    });
                }
            });
        });

    }; // end of saveToken


    validatingInputs(req,res).then(findUser).then(validatingPassword).then(generateToken).then(saveToken).then((resolve) =>{
        let apiResponse = response.generate(false,"Login successful!!",200,resolve);
        res.send(apiResponse);
    }).catch((err) =>{
        console.log(err);
        res.send(err);
        res.status(err.status);
    });

    
}; // end of the login function 


let logout = (req, res) => {
    console.log("Logout");

    AuthModel.remove({'userId': req.params.userId},(err,result) =>{
        if(err){
            logger.error(err.message,'userController=>logout',10);
            let apiResponse = response.generate(true,`Error occured: ${err.message}`,500,null);
            res.send(apiResponse);
        }
        else if(check.isEmpty(result)){
            logger.error('User already logged out or Invalid userId','userController=>logout',5);
            let apiResponse = response.generate(true,'User already logged out or Invalid userId',404,null);
            res.send(apiResponse);
        }
        else{
            logger.info('Logged out successfully','userController=>logout',5);
            let apiResponse = response.generate(false,'Logged out successfully',200,null);
            res.send(apiResponse);
        }
    });
  
} // end of the logout function.


module.exports = {

    signUpFunction: signUpFunction,
    loginFunction: loginFunction,
    logout: logout

}// end exports