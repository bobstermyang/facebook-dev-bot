The app listens to a pipe and forwards incoming messages to a Facebook messenger
Requirements:
nodejs
npm

Install the latest version of node.js (including npm) at Ubuntu 14.04 
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash
sudo apt-get install nodejs

Install git to clone the project code from the repository:
sudo apt-get install git
Clone the project:
git clone https://github.com/bobstermyang/facebook-dev-bot
Get the dependecies:
cd facebook-dev-bot
npm install body-parser

To start app:
node demo.js
or
npm start

However Facebook Messenger API requires https to access bot, so if you don’t have a certificate for yo server, you can use ngrok.

ngrok as npm package is not very useful in this scenario as ngrok assigns new virtual https address on each "connect" and webhook address has to be updated each time app is restarted.

Instead, you’ll need the core ngrok utility from https://ngrok.com/download and started https mapping in the background using Linux "screen" utility:

screen -S ngrok
./ngrok http 5000
CTRL-A D (to exit the current "screen" and leave it running in the background)

You may switch to ngrok screen using this command:
screen -r ngrok

There you will see that localhost:5000 is mapped to https://SOMEGENERATEDURL.ngrok.io
Press "CTRL-A" and "D" immediately after that to exit the ngok screen and leave it running in the background.

Then I created another screen session and started our demo bot there:

screen -S demo-server
cd facebook-dev-bot
node demo.js
CTRL-A D

You may switch to bot screen using this command:
screen -r demo-server
Press "CTRL-A" and "D" immediately after that to exit demo-server screen and leave the bot running in the background.

The bot is now running at localhost:5000, waiting for Facebook messenger request at localhost:5000/webhook and ngrok is mapping that URI to https://SOMEGENERATEDURL.ngrok.io/webhook.


To add persistent Facebook messanger menu:
HTTP POST Content-Type: application/json
https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN
request body: FbMessengerMenu.json