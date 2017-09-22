const Discord = require(`discord.js`);
const Promise = require('bluebird');

const Utils = require (`./Utils.js`);

const Config = require(`./../../config.json`);

module.exports = {
  /*
  * helpCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * !help
  */
  helpCommand: function(msg, args) {
    var hasAdmin = Utils.CheckHasRoleByName(msg.member, Config.bot_admin_role)

    var message = ``;
    if(args.length == 1) {
      switch (args[0]){
        case "help":
          msg.channel.send("http://i0.kym-cdn.com/entries/icons/original/000/021/158/bleach.jpg");
          return;
          break;
        case "auth":
          message += `\nauth:`;
          message += `\n\thandles authenticating a discord user to an EVE online account.`;
          message += `\n`;
          message += `\nusage:`;
          message += `\n\t"${Config.prefix}auth": displays the steps to authenticate.`;
          message += `\n\t"${Config.prefix}auth <string>": attempts to authenticate with <string>.`;
          break;
        case "refresh":
          message += `\nrefresh:`;
          message += `\n\thandles refreshing a user's information once they have already authenticated on this server.`;
          message += `\n`;
          message += `\nusage:`;
          message += `\n\t"${Config.prefix}refresh": attempts to refresh user details with existing auth token.`;
          message += `\nREQUIRES: ${Config.bot_admin_role} role:`;
          message += `\n\t"${Config.prefix}refresh <@user>": attempts to refresh <@user>'s details with their existing auth token.`;
          break;
        case "purge":
          message += `\npurge:`
          message += `\nREQUIRES: ${Config.bot_admin_role} role:`;
          message += `\n\t"${Config.prefix}purge": strips ALL roles from users who have no auth information.`;
          break;
        case "corp":
          message += `\ncorp:`;
          message += `\n\thandles display & configuration of relationships between EVE corporations and discord roles.`;
          message += `\n`;
          message += `\nusage:`;
          message += `\nREQUIRES: ${Config.bot_admin_role} role:`;
          message += `\n\t"${Config.prefix}corp": displays list of configured corporation id: role mappings`;
          message += `\n\t"${Config.prefix}corp add <int> <string>": adds a corp-role relationship where <int> is the corp key and <string> is the exact name of the role.`;
          message += `\n\t"${Config.prefix}corp remove <int> <string>": removes a corp-role relationship where <int> is the corp key and <string> is the exact name of the role.`;
          message += `\n`;
          message += `\nTo find a corp key:`;
          message += `\n\t1. Open the corp's zkill page and look in the url.`;
          message += `\n\t2. the corp's key will be: zkillboard.com/corporation/<key>/`
          message += `\n`;
          message += `\nEXAMPLE:`;
          message += `\n\t${Config.prefix}corp add 1091440439 SUAD`;
          break;
        case "alliance":
          message += `\nalliance:`;
          message += `\n\thandles display & configuration of relationships between EVE alliances and discord roles.`;
          message += `\n`;
          message += `\nusage:`;
          message += `\nREQUIRES: ${Config.bot_admin_role} role:`;
          message += `\n\t"${Config.prefix}alliance": displays list of configured alliance id: role mappings`;
          message += `\n\t"${Config.prefix}alliance add <int> <string>": adds a alliance-role relationship where <int> is the corp key and <string> is the exact name of the role.`;
          message += `\n\t"${Config.prefix}alliance remove <int> <string>": removes a alliance-role relationship where <int> is the corp key and <string> is the exact name of the role.`;
          message += `\n`;
          message += `\nTo find an alliance key:`;
          message += `\n\t1. Open the alliance's zkill page and look in the url.`;
          message += `\n\t2. The alliance's key will be: zkillboard.com/alliance/<key>/`
          message += `\n`;
          message += `\nEXAMPLE:`;
          message += `\n\t${Config.prefix}corp add 498125261 TEST`;
          break;
        case "default":
          message += `\ndefault:`;
          message += `\n\thandles configuration of the default role for users who have authenticated.`;
          message += `\n`;
          message += `\nusage:`;
          message += `\nREQUIRES: ${Config.bot_admin_role} role:`;
          message += `\n\t"${Config.prefix}default": displays the default role for users who have authenticated.`;
          message += `\n\t"${Config.prefix}default <string>": sets the default role for users who have authenticated where <string> is the exact name of the role..`;
        case "notify":
          message += `\nnotify command usage:`
          break;
        case "subscription":
          message += `\nsubscription command usage:`
          break;
        default:
          message += `No such command: "${args[0]}".`;
          break;
      }
    }
    else {
      message += `Try help <command> for specifics\n`;
      message += `\nCommands:`;
      message += `\n\tauth`;
      message += `\n\trefresh`;
      message += `\n\tpurge`;
      message += `\n\tdefault`;
      message += `\n\tcorp`;
      message += `\n\talliance`;
      message += `\n\tnotify`;
      message += `\n\tsubscription`;
    }


    msg.channel.send("```" + message + "```");
    //msg.channel.send(`\n\`\`\`Commands are: \n\t!auth: follow commands to identify yourself on this server.\n\t!refresh: refreshes your auth information once it's already been cached.\n\t!help: Displays this message.\`\`\``);
  },

  /*
  * authCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * usage:
  * !auth
  * !auth <token>
  */
  authCommand: function(msg, args){
    if(args.length == 0) {
      msg.channel.send(`\n1. Click link: ${Config.auth_url} \n2.Click button. \n3. Sign into Eve if you haven't already, pick a character, then click the button. \n4. Type !auth <string> on the next page into this channel.`);
    }
    if(args.length == 1) {
      var userID = msg.author.id;
      var guild = msg.channel.guild;
      var guildMember = guild.members.find(x => x.id === userID.toString());

      Utils.Authorize(msg, guildMember, args[0]);
    }
  },

  /*
  * refreshCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * usage:
  * !refresh -
  * !refresh @user - 
  */
  refreshCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);
    var role = guild.roles.find(x => x.name === Config.bot_admin_role);
    var hasRole = guildMember.roles.has(role.id);
    
    if(args.length === 0){
      msg.channel.send(`Refreshing roles for ${guildMember}`);
      Utils.RefreshUserRoles(msg, guildMember);

    } else if (args.length == 1) {
      if(!hasRole) {
        msg.channel.send(`:x:You do not have the ${role} role required to do that.`)
      } else if (args[0] === "all") {
        msg.channel.send(`Refreshing all user roles.`);

        Utils.RefreshAllUserRoles(msg, guild);
      } else {
        var member = msg.mentions.members.first();
        if(!member) 
          return msg.channel.send(`:x: Invalid member.`);

        msg.channel.send(`Refreshing ${member}'s roles.`);
        
        Utils.RefreshUserRoles(msg, member);
      }
    } else {
      msg.channel.send(`Invalid number of arguments: ${args.length}.`);
    }
  },

/**
  * purgeCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * usage:
  * !purge - purges all users without the ${Config.default_role} role.
  * !purge @user - purge @users if they do not have the ${Config.default_role} role.
  */
  purgeCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.CheckHasRoleByName(guildMember, Config.bot_admin_role)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    if(args.length === 0) {
      msg.channel.send(`Purging roles from unauthorized roles...`);
      Utils.Purge(msg, guild);

    } else if (args.length === 1 && hasRole) {
      msg.channel.send(`Purging member x if they don't have the public role`)
    }
  },

/**
  * corpCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * usage:
  * !corp - view all corp ids and their associated roles
  * !corp add CORP_ID ROLE- adds the association between ROLE and CORP_ID (all users authing in CORP will be given ROLE)
  * !corp remove CORP_ID ROLE- removes the association between ROLE and CORP_ID
  */
  corpCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.CheckHasRoleByName(guildMember, Config.bot_admin_role)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    //Display corp roles
    if(args.length == 0) {
      Utils.DisplayCorpRoles(msg, guild);
    } else if (args.length == 3) {
      if(args[0] === "add" || args[0] === "remove") {
        var corpID = args[1];
        var roleName = args[2];

        if(args[0] === "add") {
          Utils.AddCorpToRole(msg, corpID, roleName, msg.channel.guild);
        }
        if(args[0] === "remove") {
          Utils.RemoveCorpFromRole(msg, corpID, roleName, msg.channel.guild);
        }
      } else {
        msg.channel.send(`Second argument must be either 'add' or 'remove'.`);
      }
    } else {
      msg.channel.send(`Invalid number of arguments ${args.length}.`);
    }
  },

/**
  * allianceCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * usage:
  * !alliance - view all alliance ids and their associated roles
  * !alliance add ROLE ALLIANCE_ID - adds the association between ROLE and ALLIANCE_ID (all users authing in ALLIANCE will be given ROLE)
  * !alliance remove ROLE ALLIANCE_ID - removes the association between ROLE and ALLIANCE_ID
  */
  allianceCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.CheckHasRoleByName(guildMember, Config.bot_admin_role)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    //Display alliance roles
    if(args.length == 0) {
      Utils.DisplayAllianceRoles(msg, guild);
    } else if (args.length == 3) {
      if(args[0] === "add" || args[0] === "remove") {
        var allianceID = args[1];
        var roleName = args[2];

        if(args[0] === "add") {
          Utils.AddAllianceToRole(msg, allianceID, roleName, msg.channel.guild);
        }
        if(args[0] === "remove") {
          Utils.RemoveAllianceFromRole(msg, allianceID, roleName, msg.channel.guild);
        }
      } else {
        msg.channel.send(`Second argument must be either 'add' or 'remove'.`);
      }
    } else {
      msg.channel.send(`Invalid number of arguments ${args.length}.`);
    }
  },

  notifyCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.CheckHasRoleByName(guildMember, Config.bot_admin_role)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    if(args.length == 0) {
      msg.channel.send(`The following users have not authenticated: `);
      Utils.NotifyUnauthenticatedUsers(msg, guild);
    } else {
      msg.channel.send(`Invalid number of arguments ${args.length}.`);
    }
  },

  defaultCommand: function(msg, args) {
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.CheckHasRoleByName(guildMember, Config.bot_admin_role)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    if(args.length == 0) {
      Utils.DisplayDefaultRole(msg, guild);
    } else if (args.length == 2) {
      if(args[0] === "set") {
        var roleName = args[1];
        Utils.SetDefaultRole(msg, roleName, guild);
      } else {
        msg.channel.send(`Second argument must be 'set'.`);
      }
    } else {
      msg.channel.send(`Invalid number of arguments ${args.length}.`);
    }
  },

  subscriptionCommand: function(msg, args) {
    console.log("err");
  }
}