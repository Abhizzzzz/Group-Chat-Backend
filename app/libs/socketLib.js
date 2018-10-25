const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const logger = require('./loggerLib');
const tokenLib = require('./tokenLib');
const check = require('./checkLib');
const response = require('./responseLib');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const redisLib = require('../libs/redisLib');
const ChatModel = mongoose.model('Chat');
let setServer = (server) =>{
    // required to create a connection,initialize the socketio,syntax of initializing socketio
    let io = socketio.listen(server);
    let myIo = io.of('chat');

    myIo.on('connection',(socket) =>{

        

        console.log("Socket connection");
        socket.emit("verify-user","");
        socket.on('set-user',(authToken) =>{
            console.log('set-user');
            tokenLib.verifyClaims(authToken,(err,user) =>{
                if(err){
                    if(err.name == "TokenExpiredError"){
                        socket.emit('auth-error',{status: 500,error: 'Token expired'});
                    }
                    else{
                        socket.emit('auth-error',{status: 500,error: 'Please provide correct authToken'});
                    }
                }
                else{
                    console.log("User is verified setting details");
                    let currentUser = user.data;
                    socket.userId = currentUser.userId;
                    let fullName = `${currentUser.firstName} ${currentUser.lastName}`;
                    console.log(fullName+" is online");
                    let key = currentUser.userId;
                    let value = fullName;
                    redisLib.setAUserOnlineInAHash("onlineUsers",key,value,(err,result) =>{
                        if(err){
                            console.log('some error occured');
                        }
                        else{
                            redisLib.getAllUserInAHash("onlineUsers",(err,result) =>{
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    console.log(result);
                                    // we are broadcasting it to other users who are online and why we need to write emit is
                                    // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                                    socket.emit('online-user-list',result);
                                    socket.broadcast.emit('online-user-list',result);
                                }
                            });

                            redisLib.getAllUserInAHash("onlineGroups",(err,result) =>{
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    console.log(result);
                                    // we are broadcasting it to other users who are online and why we need to write emit is
                                    // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                                    socket.emit('online-group-list',result);
                                    // socket.broadcast.emit('online-group-list',result);
                                }
                            });
                        }
                    });

                }
            });
        });


        socket.on('chat-message',(data) =>{
            data.chatId = shortid.generate();
            console.log(data);
            setTimeout(() =>{
                eventEmitter.emit('save-chat',data);
            },2000);
            if(check.isEmpty(data.chatRoom)){
                myIo.emit(data.receiverId,data);
            }
            else{
                socket.to(data.chatRoom).broadcast.emit('group-message',data);
            }
            
        });

        socket.on('typing',(typerDetails) =>{
            socket.to(typerDetails.chatRoom).broadcast.emit('typing',typerDetails);
        });

        socket.on('create-group',(groupName) =>{
            console.log(groupName);
            socket.room = groupName;
            socket.join(groupName);

            let groupId = shortid.generate();
            let key = groupId;
            let value = groupName;

            redisLib.setAUserOnlineInAHash("onlineGroups",key,value,(err,result) =>{
                if(err){
                    console.log('some error occured');
                }
                else{
                    redisLib.getAllUserInAHash("onlineGroups",(err,result) =>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            console.log(result);
                            // we are broadcasting it to other users who are online and why we need to write emit is
                            // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                            socket.emit('online-group-list',result);
                            // socket.broadcast.emit('online-group-list',result);
                        }
                    });
                }
            });

        });

        socket.on('delete-group',(groupId) =>{
            console.log(groupId);
            if(redisLib.deleteUserFromAHash("onlineGroups",groupId)){
                redisLib.getAllUserInAHash("onlineGroups",(err,result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log(result);
                        // we are broadcasting it to other users who are online and why we need to write emit is
                        // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                        socket.emit('online-group-list',result);
                        // socket.broadcast.emit('online-group-list',result);
                    }
                });
            }
        });

        socket.on('join-group',(groupName) =>{
            socket.join(groupName);
            console.log("joined");


        });

        // disconnect
        // As we close the client side browsers tab,disconnect event emits
        socket.on('disconnect',() =>{
            console.log("User is disconnected");
            console.log(socket.userId);
            // leaving the room
            // socket.leave(socket.room);

            if(socket.userId){
                redisLib.deleteUserFromAHash('onlineUsers',socket.userId);
                redisLib.getAllUserInAHash('onlineUsers',(err,result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log(result);
                        // we are broadcasting it to other users who are online and why we need to write emit is
                        // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                        socket.emit('online-user-list',result);
                        socket.broadcast.emit('online-user-list',result);
                    }
                });
            }

        });
        // we are creating this event to delete the user from online user,because above functions only calls up on closing the window
        socket.on('logout',() =>{
            console.log("Logging out");
            console.log(socket.userId);
            // leaving the room
            // socket.leave(socket.room);

            if(socket.userId){
                redisLib.deleteUserFromAHash('onlineUsers',socket.userId);
                redisLib.getAllUserInAHash('onlineUsers',(err,result) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log(result);
                        // we are broadcasting it to other users who are online and why we need to write emit is
                        // because broadcast just notifies to other users but does'nt notify us that's why we are writing two statements
                        socket.emit('online-user-list',result);
                        socket.broadcast.emit('online-user-list',result);
                    }
                });
            }

        });

    });

}; // end of setServer

    // database operations are kept outside of socket.io code

    // saving chat in the database
    // we are listening the save-chat event here,which is emitted in the chat-message event
    eventEmitter.on('save-chat',(data) =>{
        let newChat = ChatModel({
            chatId: data.chatId,
            senderName: data.senderName,
            senderId: data.senderId,
            receiverId: data.receiverId,
            receiverName: data.receiverName,
            message: data.message,
            chatRoom: data.chatRoom || '',
            createdOn: data.createdOn 

        });

        newChat.save((err,result) =>{
            if(err){
                console.log(`error occurred: ${err}`);
            }
            else if(result == undefined || result == null || result == ""){
                console.log("Chat Is Not Saved.");
            }
            else {
                console.log("Chat Saved.");
                console.log(result);
            }
        });

    });

module.exports = {
    setServer: setServer
};