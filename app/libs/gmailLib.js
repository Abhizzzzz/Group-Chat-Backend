// nodemmailer with sendgrid
var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

var options = {
  auth: {
    api_user: 'Abhizzzzz',
    api_key: 'kingstar@123'
  }
}
var client = nodemailer.createTransport(sgTransport(options));

let welcomeEmail = (newUserDetails) =>{
    
    let email = {
        from: 'AbhizzzzzChatApp,abhizzzzz@donotreply.com',
        to: newUserDetails.email,
        subject: 'WELCOME TO OUR CHAT APPLICATION',
        text: 'Welcome '+newUserDetails.firstName+" "+newUserDetails.lastName+" to our Chat Application",
        html: '<p>Welcome '+'<b>'+newUserDetails.firstName+" "+newUserDetails.lastName+'</b>'+" to our Chat Application</p>"
      };
      
      client.sendMail(email, function(err, info){
          if (err ){
            console.log(err);
          }
          else {
            console.log('Email sent successfully!!');
          }
      });

};

module.exports = {
    welcomeEmail: welcomeEmail
};
