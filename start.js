const Discord = require(`discord.js`);
const Config = require(`./config.json`);
const Client = new Discord.Client();

const commands = require(`./src/app/Commands.js`);


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
    "corp_roles": [{"corp_id": 1234, "role_name": "SUAD"}],
    "alliance_roles": [],
    "default_role": "PUBLIC"
  };

  console.log(`\nNew guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);

  guildInformationUpsert(guild, guildInformation);
});

Client.on('guildDelete', guild => {
  console.log(`\nGuild Removed: ${guild.name} (id: ${guild.id}). This guild had ${guild.memberCount} members!`);

  guildInformationDelete(guild);
});

Client.on("guildMemberAdd", member => {
  var channel = member.guild.channels.find(x => x.name === "landing_channel");

  channel.send(`Welcome ${member} to the ${member.guild.name} discord server.  Type !auth to authenticate with your EVE Online account to continue`);
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;

  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  switch(command) {
    case 'auth':
      commands.authCommand(msg, args);
      break;

    case 'refresh':
      commands.refreshCommand(msg, args);
      break;

    case 'purge':
      commands.purgeCommand(msg, args);
      break;

    case 'corp':
      commands.corpCommand(msg, args);
      break;

    case 'alliance':
      commands.allianceCommand(msg, args);
      break;

    case 'help':
      commands.helpCommand(msg, args);
      break;

    default:
      msg.channel.send(`Command not recognized.`);
      break;
  }
});

Client.login(Config.token);