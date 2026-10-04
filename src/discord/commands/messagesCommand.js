// messagesCommand.js
const { Embed } = require("../../contracts/embedHandler.js");
const config = require("../../../config.json");
const fs = require('fs');

module.exports = {
  name: "edit-messages",
  description: "Manage message settings.",
  options: [
    {
      name: "action",
      description: "Message action",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Toggle Filter", value: "toggle_filter" },
        { name: "Toggle Join Messages", value: "toggle_join" },
        { name: "Set Mode", value: "set_mode" },
        { name: "Set Format", value: "set_format" },
        { name: "Status", value: "status" }
      ]
    },
    {
      name: "mode",
      description: "Message mode (for Set Mode action)",
      type: 3, // STRING
      required: false,
      choices: [
        { name: "Bot", value: "bot" },
        { name: "Webhook", value: "webhook" },
        { name: "Minecraft", value: "minecraft" }
      ]
    },
    {
      name: "format",
      description: "Message format (for Set Format action)",
      type: 3, // STRING
      required: false
    }
  ],
  execute: async (interaction) => {
    // Permission check
    if (!interaction.member.roles.cache.has(config.discord.commands.commandRole) && 
        !config.discord.commands.users.includes(interaction.user.id)) {
      return await interaction.followUp({ 
        content: "❌ You don't have permission to use this command!", 
        ephemeral: true 
      });
    }

    const action = interaction.options.getString('action');
    
    switch (action) {
      case "toggle_filter": {
        config.discord.other.filterMessages = !config.discord.other.filterMessages;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const filterEmbed = new Embed()
          .setTitle("🔍 Message Filter")
          .setDescription(`Message filtering is now **${config.discord.other.filterMessages ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.discord.other.filterMessages ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [filterEmbed] });
        break;
      }
        
      case "toggle_join": {
        config.discord.other.joinMessage = !config.discord.other.joinMessage;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const joinEmbed = new Embed()
          .setTitle("👋 Join Messages")
          .setDescription(`Join messages are now **${config.discord.other.joinMessage ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.discord.other.joinMessage ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [joinEmbed] });
        break;
      }
        
      case "set_mode": {
        const mode = interaction.options.getString('mode');
        if (!mode) {
          return await interaction.followUp({ content: "❌ Please specify a message mode!", ephemeral: true });
        }
        
        config.discord.other.messageMode = mode;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const modeEmbed = new Embed()
          .setTitle("💬 Message Mode")
          .setDescription(`Message mode set to **${mode}**`)
          .setColor(0x00ff00);
        
        await interaction.followUp({ embeds: [modeEmbed] });
        break;
      }
        
      case "set_format": {
        const format = interaction.options.getString('format');
        if (!format) {
          return await interaction.followUp({ content: "❌ Please specify a message format!", ephemeral: true });
        }
        
        config.discord.other.messageFormat = format;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const formatEmbed = new Embed()
          .setTitle("📝 Message Format")
          .setDescription(`Message format set to: \`${format}\``)
          .setColor(0x00ff00);
        
        await interaction.followUp({ embeds: [formatEmbed] });
        break;
      }
        
      case "status": {
        const statusEmbed = new Embed()
          .setTitle("💬 Message Settings")
          // New way (works)
          .addFields(
            { name: "Mode", value: config.discord.other.messageMode, inline: true },
            { name: "Filter", value: config.discord.other.filterMessages ? "✅ On" : "❌ Off", inline: true },
            { name: "Join Messages", value: config.discord.other.joinMessage ? "✅ On" : "❌ Off", inline: true },
            { name: "Auto Limbo", value: config.discord.other.autoLimbo ? "✅ On" : "❌ Off", inline: true },
            { name: "Current Format", value: `\`${config.discord.other.messageFormat}\``, inline: false }
          )
          .setColor(0x00aaff);
        
        await interaction.followUp({ embeds: [statusEmbed] });
        break;
      }
    }
  }
};
