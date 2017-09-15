const Discord = require(`discord.js`);
const Promise = require('bluebird');

const Config = require(`./../../config.json`);

const Guild = require(`../db/Guild.js`);
const User = require(`../db/User.js`);
const Utils = require(`../Utils.js`);
const Api = require(`./Api.js`);

module.exports = {
  /*
  * helpCommand
  * msg: the message object which initiated this command
  * args: the arguments passed into the message
  * 
  * !help
  */
  helpCommand: function(msg, args) {
    msg.channel.send(`\n\`\`\`Commands are: \n\t!auth: follow commands to identify yourself on this server.\n\t!refresh: refreshes your auth information once it's already been cached.\n\t!help: Displays this message.\`\`\``);
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

      Authorize(msg, guildMember, args[0]);
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
    msg.channel.send(`Command not yet implemented.`)
    return;
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
    msg.channel.send(`Command not yet implemented.`)
    return;
    var user = msg.author;
    var guild = msg.channel.guild;
    var guildMember = guild.members.find(x => x.id === user.id);

    if(!Utils.checkHasBotAdminRole(guild, guildMember)) {
      msg.channel.send(`You do not have the required roles to perform this command.`);
      return;
    }

    if(args.length === 0) {
      msg.channel.send(`Purging all members without the public role...`);
      //purgeAllMembersWithoutRole(guild,)

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
      DisplayCorpRoles(msg, guild);
    } else if (args.length == 3) {
      if(args[0] === "add" || args[0] === "remove") {
        var corpID = args[1];
        var roleName = args[2];

        if(args[0] === "add") {
          AddCorpToRole(msg, corpID, roleName, msg.channel.guild);
        }
        if(args[0] === "remove") {
          RemoveCorpFromRole(msg, corpID, roleName, msg.channel.guild);
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
      DisplayAllianceRoles(msg, guild);
    } else if (args.length == 3) {
      if(args[0] === "add" || args[0] === "remove") {
        var allianceID = args[1];
        var roleName = args[2];

        if(args[0] === "add") {
          AddAllianceToRole(msg, allianceID, roleName, msg.channel.guild);
        }
        if(args[0] === "remove") {
          RemoveAllianceFromRole(msg, allianceID, roleName, msg.channel.guild);
        }
      } else {
        msg.channel.send(`Second argument must be either 'add' or 'remove'.`);
      }
    } else {
      msg.channel.send(`Invalid number of arguments ${args.length}.`);
    }
  }
}

/**
 * Respond in msg.channel with a list of alliance role associations.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.Guild} guild - The guild to display alliances for.
 */
var DisplayAllianceRoles = function(msg, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var message = `Alliance role mappings:\n`

      message += out.guildInformation.alliance_roles
      .map(allianceRole => {
        var role = guild.roles.find(role => role.name === allianceRole.role_name);
        return `\t${allianceRole.alliance_id}: ${role}`;
      }).join(`\n`);
      
      msg.channel.send(`${message}`);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to add the alliance/role association to guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} allianceID - The allianceID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to add the alliance and role to.
 */
var AddAllianceToRole = function (msg, allianceID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.alliance_roles.some(kvp => (kvp.role_name === roleName || kvp.alliance_id === corpID));
      var roleExists = msg.channel.guild.roles.some(role => role.name === roleName);
      
      if(recordExists) {
        throw new Error (`**Role Name** or **Alliance ID** is already registered.`);
      } else if (!roleExists) {
        throw new Error (`Role **${roleName}** does not exists.`);
      } else {
        out.guildInformation.alliance_roles.push({ "alliance_id" : allianceID, "role_name" : roleName });
      } 

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record added!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to remove the alliance/role association to the guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} allianceID - The allianceID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to remove the alliance and role from.
 */
var RemoveAllianceFromRole = function (msg, allianceID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.alliance_roles.some(kvp => (kvp.role_name === roleName || kvp.alliance_id === allianceID));

      if(!recordExists) {
        throw new Error (`**Role Name** or **Alliance ID** has not been registered.`);
      } else {
        out.guildInformation.alliance_roles = out.guildInformation.alliance_roles.filter(kvp => !(kvp.role_name === roleName || kvp.alliance_id === allianceID));
      }

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record removed!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Respond in msg.channel with a list of corp role associations.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.Guild} guild - The guild to display alliances for.
 */
var DisplayCorpRoles = function(msg, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var message = `Corporation role mappings:\n`

      message += out.guildInformation.corp_roles
      .map(corpRole => {
        var role = guild.roles.find(role => role.name === corpRole.role_name);
        return `\t${corpRole.corp_id}: ${role}`;
      }).join(`\n`);
      
      msg.channel.send(`${message}`);
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to add the corp/role association to guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} corpID - The corpID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to add the corp and role to.
 */
var AddCorpToRole = function (msg, corpID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.corp_roles.some(kvp => (kvp.role_name === roleName || kvp.corp_id === corpID));
      var roleExists = msg.channel.guild.roles.some(role => role.name === roleName);
      
      if(recordExists) {
        throw new Error (`**Role Name** or **Corp ID** is already registered.`);
      } else if (!roleExists) {
        throw new Error (`Role **${roleName}** does not exists.`);
      } else {
        out.guildInformation.corp_roles.push({ "corp_id" : corpID, "role_name" : roleName });
      } 

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record added!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Attempts to remove the corp/role association from the guild and replies in msg.channel with the result.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*int} corpID - The corpID to add.
 * @param {*string} roleName - The role name to add.
 * @param {*Discordjs.Guild} guild - The guild to remove the corp and role from.
 */
var RemoveCorpFromRole = function (msg, corpID, roleName, guild) {
  Guild.GuildGet(guild)
    .then(out => {
      var recordExists = out.guildInformation.corp_roles.some(kvp => (kvp.role_name === roleName || kvp.corp_id === corpID));

      if(!recordExists) {
        throw new Error (`**Role Name** or **Corp ID** has not been registered.`);
      } else {
        out.guildInformation.corp_roles = out.guildInformation.corp_roles.filter(kvp => !(kvp.role_name === roleName || kvp.corp_id === corpID));
      }

      return out;
    })
    .then(Guild.GuildUpsert)
    .then(modified => { if(modified) msg.channel.send(`:white_check_mark: Record removed!`) })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}

/**
 * Takes an auth token and auths against ESI, then updates guildMember's name and permissions from EVE.
 * @param {*Discordjs.Message} msg - The message which triggered this action.
 * @param {*Discordjs.GuildMember} guildMember - The guildMember.
 * @param {*string} token - The auth token.
 */
var Authorize = function (msg, guildMember, token) {
  Api.AuthToken(guildMember, token)
    .then(res => {
      return [guildMember, res];
    })
    .spread(User.UserUpsert)
    .then(res => {
      Promise.join(
        Api.VerifyToken(res),
        Guild.GuildGet(guildMember.guild),
        function(verifyData,guildData) {
          return Utils.UpdateRoles(msg.channel, guildMember, verifyData, guildData);
        }
      );
    })
    .catch(err => {
      msg.channel.send(`:x: ${err}`);
    });
}