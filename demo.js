/* jshint node: true, devel: true */
//'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request'),
  net = require('net'),
  fs = require('fs');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
//const SERVER_URL = (process.env.SERVER_URL) ?
//  (process.env.SERVER_URL) :
//  config.get('serverURL');

//if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
//  console.error("Missing config values");
//  process.exit(1);
//}

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Check that the token used in the Webhook setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
   var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
			// placeholder: does nothing at the moment
        } else if (messagingEvent.message) {
		  //console.log("A message received");
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
			// placeholder: does nothing at the moment
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
			// placeholder: does nothing at the moment
        } else if (messagingEvent.account_linking) {
			// placeholder: does nothing at the moment
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    }); 

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, we should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. 
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  if (message.is_echo) {
	  return;
  }
  if (message.quick_reply) {
    console.log("Quick reply: " +message.quick_reply.payload);
	processInputText(message.quick_reply.payload,senderID);
	return;
  }
  console.log("Received message for user %d and page %d at %d", senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));
  var messageText = message.text;
  if (messageText) {
       processInputText(messageText,senderID);
  } 
}



/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  processInputText(payload, senderID);	
}

function processInputText(inputText, senderID){
  
  if (inputText=="ON"){
     subscriberID=senderID;
     var outputText="Events forwarding is ON";
	 console.log("Events forwarding is ON for user " + senderID);
	 sendTextMessage(senderID, outputText);
  }
  else if (inputText=="OFF"){
     subscriberID='';
     var outputText="Events forwarding is OFF";
	 console.log(outputText);
	 sendTextMessage(senderID, outputText);
  }
  else{
	  //var outputText="Ok, I've noted input '" +inputText + "'.";
	  //sendTextMessage(senderID, outputText);
	  sendQuickReply(senderID);
  }
  
}



/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

function sendQuickReply(recipientId) {
  var messageData;
  if (subscriberID==recipientId) 	
	  messageData = {
		recipient: {
		  id: recipientId
		},
		message: {
		  text: "Hi, event forwarding is enabled at the moment.",
		  metadata: "",
		  quick_replies: [
			{
			  "content_type":"text",
			  "title":"Turn it OFF",
			  "payload":"OFF"
			}
		  ]
		}
	  };
  else
	  messageData = {
		recipient: {
		  id: recipientId
		},
		message: {
		  text: "Hi, event forwarding is dissabled at the moment.",
		  metadata: "",
		  quick_replies: [
			{
			  "content_type":"text",
			  "title":"Turn it ON",
			  "payload":"ON"
			}
		  ]
		}
	  };
  

  callSendAPI(messageData);
}




/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error(response.error);
    }
  });  
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


// pipe part

var subscriberID='';

var PIPE_NAME = "log_pipe";
var PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;
var L = console.log;

try {
    fs.accessSync(PIPE_PATH, fs.F_OK);
    L('Existing pipe found');
    fs.unlink(PIPE_PATH);
    L('Existing pipe deleted');

} catch (e) {
    //L('No existing pipe found');
}

var server = net.createServer(function(stream) {
    L('Server: on connection')

    stream.on('data', function(c) {
        L(c.toString());
		if (subscriberID!=''){
			sendTextMessage(subscriberID, c.toString());
			L('Facebook message sent');
		}
		else
			L('No subscriber');
    });

    stream.on('end', function() {
       L('Server: on stream end')
       //server.close();
    });
});

server.on('close',function(){
    L('Server: on close');
})

server.listen(PIPE_PATH,function(){
    L('Server: on listening');
})





