const discord = require(`discord.js`);
const Config = require(`./../config.json`);

module.exports = {
  checkHasBotAdminRole: function(guild, guildMember) {
    var role = guild.roles.find(x => x.name === Config.bot_admin_role);
    var hasRole = guildMember.roles.has(role.id);

    return guildMember.roles.has(role.id);
  }
};