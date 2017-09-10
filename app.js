
const Discord = require("discord.js");
const config = require("./config.json");
const request=require('request');
const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const client = new Discord.Client();
const authString = '!auth';
const esi = require('eve-swagger');
var db;

MongoClient.connect('mongodb://<username>:<password>@ds159050.mlab.com:59050/iondiscord', (err, database) => {
  if (err) return console.log(err)
  db = database
});


client.on('ready', () => {
  if(db === undefined){
    throw new Error("WARNING! Unable to connect to the database!  Shutting down!")
  }

  console.log(`\nBot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 

  client.user.setGame(config.game);
});

client.on('guildCreate', guild => {
  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(config.game);
});

client.on('guildDelete', guild => {
  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(config.game);
});

client.on("guildMemberAdd", member => {
  var guild = member.guild;
  var channel = guild.channels.find(x => x.name === "landing_channel");
  channel.send(`Welcome ${member.user.username}, type !auth to begin.`);
});

client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(config.prefix) !== 0) return;

  var args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author.id}.`);

  switch(command) {
    case 'auth':
      if(args.length == 0) {
        msg.channel.send('\n1. Click link: www.google.com \n2.Click button. \n3. Sign into Eve if you aren\'t already, pick a character, then click button. \n4. Type !auth <string> on the next page into this channel.');
      }
      if(args.length == 1) {
        verifyToken(msg, args[0]);
      }
      break;

    case 'refresh':
      //refresh all users
      var user = msg.author;
      var guild = client.guilds.find(x => x.id.toString() === msg.channel.guild.id);
      var guildMember = guild.members.find(x => x.id === user.id);
      var role = guild.roles.find(x => x.name === config.bot_admin_role);

      if(guildMember.roles.has(role.id)){
        refreshAllRoles(msg);
        msg.channel.send("Refreshing all roles...");
      }
      else {
        msg.channel.send(`You do not have the ${role} role required to do that.`)
      }
      break;
  }
});

function refreshAllRoles(msg){
  console.log(`Attempting to refresh all user tokens...`);
  var cursor = db.collection('users').find();

  cursor.each(function(err, user) {
    if(user == null) return;
    console.log(`Refreshing user: ${user.userID}...`)
    var guild = client.guilds.find(x => x.id.toString() === user.guildID);
    var guildMember = guild.members.find(x => x.id === user.userID);
    msg.channel.send(`Refreshing roles for: ${guildMember}`);
    refreshToken(user.userID, user.guildID, user.data.refresh_token);
  });

}

function updateUserRoles(userid){
  var user = db.collection('users').find({ userid: userid });
  tryUpdateRoles(user);
}

function updateRoles(user) {

}

function verifyToken(msg, code){
  var userID = msg.author.id;
  var guildID = msg.channel.guild.id;

  console.log(`\nGetting verification token for user ${userID}...`);
  try {
    var options = {
      method: 'POST',
      url: "https://login.eveonline.com/oauth/token",
      headers: {
        "authorization": "Basic " + Buffer.from(config.client_id+":"+config.client_secret).toString('base64'),
        "content-type": "application/json"
      },
      json: {
        "grant_type":"authorization_code",
        "code":code
      }
    };
    
    console.log(`\nAttempting POST: ${JSON.stringify(options)}`);
    request.post(options, function(err, res, body) {
      if(res && (res.statusCode === 200 || res.statusCode === 201)) {
        console.log(`\nPOST success.  Body: ${JSON.stringify(body)}`)
        
        db.collection('users').update(
          { userID: userID, guildID: guildID },
          {
            userID: userID,
            guildID: guildID,
            data: body
          },
          { upsert: true }
        );

        updateRoles(userID, guildID, body.access_token);
        
      } else if(res) {
        console.log(`\nError: ${res.statusCode}: ${JSON.stringify(body)}`);
        msg.channel.send(`:x: ${msg.author.username} failed to auth.  Please contact an administrator.`);
      } else {
        console.log(`\nERROR: Nothing returned.`);
        msg.channel.send(`:x: ${msg.author.username} failed to auth.  Please contact an administrator.`);
      }
    });
  } catch (err) {
    console.log(err);
    msg.channel.send(`:x: ${msg.author.username} failed to auth.  Please contact an administrator.`);
  }
  msg.channel.send(`:white_check_mark: ${msg.author.username} has been successfully authed.`);
}

function tryUpdateRoles(userID, guildID, accessToken) {
  try {
    updateRoles(userID, guildID, accessToken);
  } catch (err) {
    console.log(err);
  }
}

function updateRoles(userID, guildID, accessToken) {
  console.log(`\nUpdating Roles for user: ${userID} in guild ${guildID}, with access token: ${accessToken}...`);
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer "+accessToken
    }
  };

  request.get(options, function(err, res, body) {
    if(res && (res.statusCode === 200 || res.statusCode === 201)) {
      console.log(`\nPOST success.  Body: ${JSON.stringify(body)}`)
      var data = JSON.parse(body);
      var characterName = data.CharacterName;
      var defaultRole = config.role_mappings.default;
      var guild = client.guilds.find(x => x.id.toString() === guildID.toString());
      var guildMember = guild.members.find(x => x.id === userID.toString());
      var role = guild.roles.find(x => x.name === defaultRole);

      //Check default role
      console.log(`Adding user:${guildMember.user.username} to role:${role.name}.`)
      guildMember.addRole(role);

      //Check corp roles
      esi.characters(data.CharacterID).info().then(result => {
        var corp = result.corporation_id;
        var corpRoles = config.role_mappings.corp;

        corpRoles.forEach(function(corpRole) {
          console.log(`Checking role for ${corpRole.role_name}`)
          var role = guild.roles.find(x => x.name === corpRole.role_name);
          if(corpRole.corporation_id === corp) {
            console.log(`Adding user:${guildMember.user.usernamee} to role:${role.name}.`)
            guildMember.addRole(role);
          } else {
            console.log(`Removing user:${guildMember.user.username} from role:${role.name}.`)
            guildMember.removeRole(role);
          }
        });

        //Check alliance roles
        esi.corporations(result.corporation_id).info().then(result => {
          var ticker = result.ticker;
          guildMember.setNickname(`[${ticker}] ${characterName}`);
          
          var alliance = result.alliance_id;
          var allianceRoles = config.role_mappings.alliance;
          
          allianceRoles.forEach(function(allianceRole) {
            console.log(`Checking role for ${allianceRole.role_name}`)
            var role = guild.roles.find(x => x.name === allianceRole.role_name);
            if(allianceRole.alliance_id === alliance){
              console.log(`Adding user:${guildMember.user.username} to role:${role.name}.`)
              guildMember.addRole(role);
            } else {
              console.log(`Removing user:${guildMember.user.username} from role:${role.name}.`)
              guildMember.removeRole(role);
            }
          });
        });
      });
    } else if(res) {
      console.log(`\nError: ${res.statusCode}: ${JSON.stringify(body)}`);
    } else {
      console.log(`\nERROR: Nothing returned.`);
    }
  });
}



function refreshToken(userID, guildID, refreshToken){
  console.log(`\nRefreshing the token for user: ${userID} in guild: ${guildID}, of token: ${refreshToken}.`);
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(config.client_id+":"+config.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"refresh_token",
      "refresh_token":refreshToken
    }
  };

  request.post(options, function(err, res, body) {
    console.log(`\nPOST success.  Body: ${JSON.stringify(body)}`)
    
    db.collection('users').update(
      { userID: userID, guildID: guildID },
      {
        userID: userID,
        guildID: guildID,
        data: body
      },
      { upsert: true }
    );

    updateRoles(userID, guildID, body.access_token);
    
    if(res && (res.statusCode === 200 || res.statusCode === 201)) {
      tryUpdateRoles(userID, guildID, body.access_token);
    } else if(res) {
      console.log("error: " + res.statusCode);
    } else {
      console.log("error");
    }
  });
}


client.login(config.token);



