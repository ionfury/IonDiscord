const Discord = require(`discord.js`);
const Config = require(`./config.json`);
const Client = new Discord.Client();

const Commands = require(`./src/app/Commands.js`);
const Guild = require(`./src/db/Guild.js`);


Client.on('ready', () => {
  console.log(`\nBot has started, with ${Client.users.size} users, in ${Client.channels.size} channels of ${Client.guilds.size} guilds.`); 

  //check Config.bot_admin_role exists
  Client.guilds.forEach(guild => {
    
    if(!guild.roles.some(role => role.name === Config.bot_admin_role)) {
      console.log(`\n WARNING! Guild [${guild.name}] does not have role [${Config.bot_admin_role}] created!`);
    } else {
      var botAdminRole = guild.roles.find(role => role.name === Config.bot_admin_role);
      
      if(!guild.members.some(member => member.roles.some(role => role === botAdminRole))) {
        console.log(`\n WARNING! Guild [${guild.name}] does not have any users with [${Config.bot_admin_role}] role granted!`);
      }
    }
  });

  Client.user.setGame(Config.game);
});

Client.on('guildCreate', guild => {
  var guildInformation = {
    "corp_roles": [],
    "alliance_roles": [],
    "default_role": ""
  };

  var guildRecord = {
    "guildID": guild.id,
    "guildInformation": guildInformation
  };

  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);

  Guild.guildUpsert(guildRecord);
});

Client.on('guildDelete', guild => {
  console.log(`\nGuild Removed: ${guild.name} (id: ${guild.id}). This guild had ${guild.memberCount} members!`);

 // Guild.guildInformationDelete(guild);
});

Client.on("guildMemberAdd", member => {
  console.log(`\nNew Member: ${member.user} joined the guild ${member.guild.name}.`)
  member.send(`Welcome ${member.user} to the ${member.guild.name} discord server.  Type **!auth** in a channel in the server with me in it to authenticate with your EVE Online account, or try **!help**.`);
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;
  if(!msg.guild) {
    msg.reply(`Please converse with me in a guild channel instead.`);
    return;
  }
  var botAdminRole = msg.guild.roles.find(role => role.name === Config.bot_admin_role);
  if(!botAdminRole) {
    msg.channel.send(`Bot admin role named ${Config.bot_admin_role} must exist.`);
    return;
  }

  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  switch(command) {
    case 'help':
      Commands.helpCommand(msg, args);
      break;

    case 'auth':
      Commands.authCommand(msg, args);
      break;

    case 'refresh':
      Commands.refreshCommand(msg, args);
      break;

    case 'purge':
      Commands.purgeCommand(msg, args);
      break;

    case 'default':
      Commands.defaultCommand(msg, args);
      break;

    case 'corp':
      Commands.corpCommand(msg, args);
      break;

    case 'alliance':
      Commands.allianceCommand(msg, args);
      break;

    case 'notify':
      Commands.notifyCommand(msg, args);
      break;

    /*case 'subscription'
      Commands.subscriptionCommand(msg, args);
      break;*/

    default:
      msg.channel.send(`Command not recognized.`);
      break;
  }
});

Client.login(Config.token);