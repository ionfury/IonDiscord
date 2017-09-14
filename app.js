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

  //check config.bot_admin_role exists
  Client.guilds.forEach(guild => {
    if(!guild.roles.some(role => role.name === config.bot_admin_role)) {
      console.log(`\n WARNING! ${guild.name} does not have ${config.bot_admin_role} configured!`);
    }

    if(!guild.members.some(member => !member.roles.some(role => role.name === config.bot_admin_role))) {
      console.log(`\n WARNING! ${guild.name} does not have any users with ${config.bot_admin_role} granted!`);
    }
  });

  Client.user.setGame(Config.game);
});

Client.on('guildCreate', guild => {
  var guildInformation = {
    "playing": "Needs Configuration",
    "corp_roles": [{"corp_id": 1234, "role_name": "SUAD"}],
    "alliance_roles": [],
    "default_role": "PUBLIC"
  };

  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);

  guildInformationUpsert(guild, guildInformation);

  Client.user.setGame(guildInformation.playing);
});

Client.on('guildDelete', guild => {
  console.log(`\nGuild Removed: ${guild.name} (id: ${guild.id}). This guild had ${guild.memberCount} members!`);

  guildInformationDelete(guild);

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

    case 'purge':
      purgeCommand(msg, args);
      break;

    case 'corps':
      corpCommand(msg, args);
      break;

    case 'alliances':
      allianceCommand(msg, args);
      break;

    case 'help':
      helpCommand(msg, args);
      break;
  }
});

function addCorpToRole(corpID, role, guild) {
  guildInformation = guildInformationGet(guild);

  if(!guildInformation.corp_roles.some(kvp => kvp.role_name === role.name)) {
    guildInformation.corp_roles.push({"corp_id": corpID, "role_name": role.name});
  }

  guildInformationUpsert(guild, guildInformation);  
}

function removeCorpFromRole(corp, role, guild) {
  guildInformation = guildInformationGet(guild);
  
  if(guildInformation.corp_roles.some(kvp => kvp.role_name === role.name)) {
    guildInformation.corp_roles.forEach(kvp => {
      if(kvp.corp_id === corp) {
        delete guildInformation.corp_roles[kvp];
      }
    });
  }

  guildInformationUpsert(guild, guildInformation);
}

function addAllianceToRole(alliance, role, guild) {
  guildInformation = guildInformationGet(guild);

  if(!guildInformation.alliance_roles.some(kvp => kvp.role_name === role.name)) {
    guildInformation.alliance_roles.push({"alliance_id": alliance, "role_name": role.name});
  }

  guildInformationUpsert(guild, guildInformation);
}

function removeAllianceFromRole(alliance, role, guild) {
  guildInformation = guildInformationGet(guild);

  if(guildInformation.alliance_roles.some(kvp => kvp.role_name === role.name)) {
    guildInformation.alliance_roles.forEach(kvp => {
      if(kvp.alliance_id === alliance) {
        delete guildInformation.allianceRoles[kvp];
      }
    })
  }

  guildInformationUpsert(guild, guildInformation);
}

function getGuildCorpRoles(guild) {
  guildInformation = guildInformationGet(guild);

  var corpRoles = guild.roles.filter(role => guildInformation.corp_roles.some(kvp => kvp.role_name === role.name));

  return corpRoles;
}

function getGuildAllianceRoles(guild) {
  guildInformation = guildInformationGet(guild);

  var allianceRoles = guild.roles.filter(role => guildInformation.alliance_roles.some(kvp => kvp.role_name === role.name));

  return allianceRoles;
}

function guildInformationGet(guild) {
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { guildID: guild.id };

    db.collection('guilds').findOne(query, function(err, res) {
      if(err) throw err;
      return res;
    });
  });
}

function guildInformationUpsert(guild, guildInformation) {
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { guildID: guild.id };
    var values = { guildID: guild.id, guildInformation: guildInformation };
    var options = { upsert: true };

    db.collection('guilds').updateOne(query, values, options, function(err, res) {
      if(err) throw err;
      db.close();
    });
  });
}

function guildInformationDelete(guild) {
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { guildID : guild.id };

    db.collection('users').remove(query, function(err, res) {
      if(err) throw err;
      db.close();        
    });

    db.collection('guilds').remove(query, function(err, res) {
      if(err) throw err;
      db.close();
    });
  });
}

function purgeMember(guild, guildMember) {
  //guildMember.kick(`You have not authenticated on this server and are being removed.`);
}

function purgeAllMembersWithoutRole(guild, role) {
  guildMembers = getAllAuthGuildMembers(guild);
  
  var removeMembers = [];

  guild.members.forEach(function (guildMember) {
    if(!guildMember.roles.has(role.id)) {
      purgeMember(guild, guildMember);
    }
  });
}

function getAllAuthGuildMembers(guild) {
  var guildID = guild.id;
  
  MongoClient.connect(connectionUrl, function(err, db) {
    if(err) throw err;

    var query = { guildID: guildID };

    db.collection('users').find(query).toArray(function(err, result) {
      if(err) throw err;

      db.close();

      return result;
    });
  });
}

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
  var guild = msg.channel.guild;
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
    msg.channel.send(`You do not have the ${role} role required to do that.`);
  }
}

/*
 * purgeCommand
 * msg: the message object which initiated this command
 * args: the arguments passed into the message
 * 
 * usage:
 * !purge - purges all users without the ${config.default_role} role.
 * !purge @user - purge @users if they do not have the ${config.default_role} role.
 */
function purgeCommand(msg, args) {
  var user = msg.author;
  var guild = msg.channel.guild;
  var guildMember = guild.members.find(x => x.id === user.id);

  if(!checkHasBotAdminRole(guild, guildMember)) {
    msg.channel.send(`You do not have the required roles to perform this command.`);
    return;
  }

  if(args.length === 0) {
    msg.channel.send(`Purging all members without the public role...`);
    //purgeAllMembersWithoutRole(guild,)

  } else if (args.length === 1 && hasRole) {
    msg.channel.send(`Purging member x if they don't have the public role`)
  }
}

/*
 * corpCommand
 * msg: the message object which initiated this command
 * args: the arguments passed into the message
 * 
 * usage:
 * !corp - view all corp ids and their associated roles
 * !corp add ROLE CORP_ID - adds the association between ROLE and CORP_ID (all users authing in CORP will be given ROLE)
 * !corp remove ROLE CORP_ID - removes the association between ROLE and CORP_ID
 */
function corpCommand(msg, args) {
  var user = msg.author;
  var guild = msg.channel.guild;
  var guildMember = guild.members.find(x => x.id === user.id);

  if(!checkHasBotAdminRole(guild, guildMember)) {
    msg.channel.send(`You do not have the required roles to perform this command.`);
    return;
  }

  if(args.length == 0) {
    var roles = getGuildCorpRoles(guild);
    msg.channel.send(`Corp roles: ${roles}.`);
  } else if (args.length == 3) {
    if(args[0] === "add" || args[1] === "remove") {
      var role = args[1];
      var corpID = args[2];
      
      if(args[0] === "add") {
        addCorpToRole(corp, role, guild);
      }
      if(args[0] === "remove") {
        removeCorpFromRole(corp, role, guild);
      }
    } else {
      msg.channel.send(`Second argument must be either 'add' or 'remove'.`);
    }
  } else {
    msg.channel.send(`Invalid number of arguments ${args.length}.`);
  }
}

/*
 * allianceCommand
 * msg: the message object which initiated this command
 * args: the arguments passed into the message
 * 
 * usage:
 * !alliance - view all alliance ids and their associated roles
 * !alliance add ROLE ALLIANCE_ID - adds the association between ROLE and ALLIANCE_ID (all users authing in ALLIANCE will be given ROLE)
 * !alliance remove ROLE ALLIANCE_ID - removes the association between ROLE and ALLIANCE_ID
 */
function allianceCommand(msg, args) {
  var user = msg.author;
  var guild = msg.channel.guild;
  var guildMember = guild.members.find(x => x.id === user.id);

  if(!checkHasBotAdminRole(guild, guildMember)) {
    msg.channel.send(`You do not have the required roles to perform this command.`);
    return;
  }

  if(args.length == 0) {

  } else if (args.length == 3) {
    if(args[1] === "add" || args[1] === "remove") {

    } else {
      msg.channel.send(`Second argument must be either 'add' or 'remove'.`);
    }
  } else {
    msg.channel.send(`Invalid number of arguments ${args.length}.`);
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

function checkHasBotAdminRole(guild, guildMember) {
  var role = guild.roles.find(x => x.name === Config.bot_admin_role);
  var hasRole = guildMember.roles.has(role.id);

  return guildMember.roles.has(role.id);
}



Client.login(Config.token);