const Discord = require("discord.js");
const Config = require("./config.json");
const Request = require('request');
const Http = require('http');
const MongoClient = require('mongodb').MongoClient;
const Client = new Discord.Client();
const ESI = require('eve-swagger');
var connectionUrl = `mongodb://${Config.database_username}:${Config.database_password}@ds159050.mlab.com:59050/iondiscord`;

Client.on('ready', () => {
  console.log(`\nBot has started, with ${Client.users.size} users, in ${Client.channels.size} channels of ${Client.guilds.size} guilds.`); 

  Client.user.setGame(Config.game);
});

Client.on('guildCreate', guild => {
  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  Client.user.setGame(Config.game);
});

Client.on('guildDelete', guild => {
  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  Client.user.setGame(Config.game);
});

Client.on("guildMemberAdd", member => {
  var guild = member.guild;
  var channel = guild.channels.find(x => x.name === "landing_channel");
  channel.send(`Welcome ${member.user.username}, type !auth to begin.`);
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;

  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  switch(command) {
    case 'auth':
      authCommand(msg, args);
      break;

    case 'refresh':
      refreshCommand(msg, args);
      break;

    case 'help':
      helpCommand(msg, args);
      break;
  }
});

/// Displays the help message
function helpCommand(msg, args) {
  msg.channel.send(`\n\`\`\`Commands are: \n\t!auth: follow commands to identify yourself on this server.\n\t!refresh: refreshes your auth information once it's already been cached.\n\t!help: Displays this message.\`\`\``);
}

/// Auth functionality
function authCommand(msg, args){
  if(args.length == 0) {
    msg.channel.send(`\n1. Click link: ${Config.auth_url} \n2.Click button. \n3. Sign into Eve if you aren\'t already, pick a character, then click button. \n4. Type !auth <string> on the next page into this channel.`);
  }
  if(args.length == 1) {
    verifyToken(msg, args[0]);
  }
}

/// Refresh functionality
function refreshCommand(msg, args) {
  var user = msg.author;
  var guild = Client.guilds.find(x => x.id.toString() === msg.channel.guild.id);
  var guildMember = guild.members.find(x => x.id === user.id);
  var role = guild.roles.find(x => x.name === Config.bot_admin_role);
  var hasRole = guildMember.roles.has(role.id);

  if(args.length === 0){
    if(hasRole) {
      msg.channel.send("Refreshing all roles...");
      refreshAllRoles(msg);
    } else {
      refreshUserRoles(msg, guildMember);
    }
  } else if (args.length === 1 && hasRole) {
    var updateMember = guild.members.find(x => x.toString() === args[0]);
    refreshUserRoles(msg, updateMember);
  }  else {
    msg.channel.send(`You do not have the ${role} role required to do that.`)
  }
}

/// Looks up the given guildmember in the database and refreshes it's information, then refreshes that guildmember's roles
function refreshUserRoles(msg, guildMember) {
  console.log(`Refreshing roles for ${guildMember.nickname}`);
  var guildID = msg.channel.guild.id;

  MongoClient.connect(connectionUrl, function(err, db) {
    var query = { guildID: guildID, userID: guildMember.id }

    db.collection('users').findOne(query, function(err, result) {
      if(err) throw err;

      if (result) {
        refreshToken(guildMember, msg.channel.guild, result.data.refresh_token, msg.channel);
      } else {
        msg.channel.send(`:x: ${guildMember} has not yet authenticated.`);
      }

      db.close();
    });
  });
}

/// Refreshes all roles and tokens for all members on the server msg is from
function refreshAllRoles(msg){
  var guildID = msg.channel.guild.id;
  
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { guildID: guildID };

    db.collection('users').find(query).toArray(function(err, result) {
      if(err) throw err;

      result.forEach(function(user) {
        var guild = Client.guilds.find(x => x.id.toString() === user.guildID);
        var guildMember = guild.members.find(x => x.id === user.userID);
        msg.channel.send(`Refreshing roles for: ${guildMember}`);
        refreshToken(guildMember, guild, user.data.refresh_token, msg.channel);
      });

      db.close();
    });
  });
}

/// Saves the values to the database
function save(guildMember, guild, data) {
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { userID: guildMember.id, guildID: guild.id };
    var values = { userID: guildMember.id, guildID: guild.id, data: data }
    var options = { upsert: true }

    db.collection('users').updateOne(query, values, options, function(err, res) {
      if(err) throw err;
      db.close();
    });
  });
}

/// Triggers the verification process for the code, then saves it and updates the roles
function verifyToken(msg, code){
  var userID = msg.author.id;
  var guildID = msg.channel.guild.id;
  var guild = Client.guilds.find(x => x.id.toString() === guildID.toString());
  var guildMember = guild.members.find(x => x.id === userID.toString());

  console.log(`\nGetting verification token for user ${guildMember.nickname}, code ${code}.`);
  try {
    var options = {
      method: 'POST',
      url: "https://login.eveonline.com/oauth/token",
      headers: {
        "authorization": "Basic " + Buffer.from(Config.client_id+":"+Config.client_secret).toString('base64'),
        "content-type": "application/json"
      },
      json: {
        "grant_type":"authorization_code",
        "code":code
      }
    };
    
    Request.post(options, function(err, res, body) {
      if(res && (res.statusCode === 200 || res.statusCode === 201)) {
        
        save(guildMember, guild, body);
        updateRoles(guildMember, guild, body.access_token, msg.channel);
      } else {
        console.log(`\nERROR: Nothing returned.`);
        msg.channel.send(`:x: ${guildMember} failed to auth.  Please contact an administrator.`);
      }
    });
  } catch (err) {
    console.log(err);
    msg.channel.send(`:x: ${guildMember} failed to auth.  Please contact an administrator.`);
  } 
}

/// Updates the roles for the guildmember in the guild using accesstoken and responds in channel.
function updateRoles(guildMember, guild, accessToken, channel) {
  console.log(`\nUpdating Roles for user: ${guildMember.nickname} in guild ${guild.name}, with access token: ${accessToken}...`);
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer "+accessToken
    }
  };

  Request.get(options, function(err, res, body) {
    if(res && (res.statusCode === 200 || res.statusCode === 201)) {
      var data = JSON.parse(body);
      var characterName = data.CharacterName;
      var defaultRole = Config.role_mappings.default;
      var role = guild.roles.find(x => x.name === defaultRole);

      //Check default role
      guildMember
        .addRole(role)
        .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });

      //Check corp roles
      ESI.characters(data.CharacterID).info()
      .then(result => {
        var corp = result.corporation_id;
        var corpRoles = Config.role_mappings.corp;

        corpRoles.forEach(function(corpRole) {
          var role = guild.roles.find(x => x.name === corpRole.role_name);

          if(corpRole.corporation_id === corp) {
            guildMember
              .addRole(role)
              .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });
          } else {
            guildMember
              .removeRole(role)
              .catch(err => { channel.send(`:x: Failed to remove ${role} from user ${guildMember}.`) });
          }
        });

        //Check alliance roles
        ESI.corporations(result.corporation_id).info()
        .then(result => {
          var ticker = result.ticker;
          var newName = `[${ticker}] ${characterName}`;

          guildMember
            .setNickname(newName)
            .then(res => { channel.send(`:white_check_mark: Renamed ${guildMember}.`)})
            .catch(err => { channel.send(`:x: Failed to update ${guildMember}'s name to \"${newName}\".`) });
          
          var alliance = result.alliance_id;
          var allianceRoles = Config.role_mappings.alliance;
          
          allianceRoles.forEach(function(allianceRole) {
            var role = guild.roles.find(x => x.name === allianceRole.role_name);
            if(allianceRole.alliance_id === alliance){
              guildMember
                .addRole(role)
                .catch(err => { channel.send(`:x: Failed to add ${role} to user ${guildMember}.`) });
            } else {
              guildMember
                .removeRole(role)
                .catch(err => { channel.send(`:x: Failed to remove ${role} from user ${guildMember}.`) });
            }
          });
        })
        .catch(err => {
          console.log(`Failed to retrieve ESI Alliances: ${err}`);
          channel.send(`:x: Failed to retrieve ESI Alliances.`);
        });
      })
      .catch(err => {
        console.log(`Failed to retrieve ESI Corps: ${err}`);
        channel.send(`:x: Failed to retrieve ESI Corporations.`);
      });
    } else if(res) {
      console.log(`\nError: ${res.statusCode}: ${JSON.stringify(body)}`);
    } else {
      console.log(`\nERROR: Nothing returned.`);
    }
  });
}

/// Refreshes the token for guildmember in guild and responds in channel
function refreshToken(guildMember, guild, refreshToken, channel){
  console.log(`\nRefreshing the token for user: ${guildMember} in guild: ${guild.name}, of token: ${refreshToken}.`);

  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(Config.client_id+":"+Config.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"refresh_token",
      "refresh_token":refreshToken
    }
  };

  Request.post(options, function(err, res, body) {

    if(res && (res.statusCode === 200 || res.statusCode === 201)) {
      save(guildMember, guild, body);
      updateRoles(guildMember, guild, body.access_token, channel);
    } else if(res) {
      console.log("Error: " + res.statusCode);
      channel.send(`Error: ${res.statusCode}`);
    } else if(err) {
      console.log(err);
      channel.send(`Error: ${err.code}`);
    } else {
      console.log("Unspecified error");
    }
  });
}

Client.login(Config.token);