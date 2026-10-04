// powderCommand.js
const { Embed } = require("../../contracts/embedHandler.js");
const config = require("../../../config.json");
const fs = require('fs');

module.exports = {
  name: "edit-powder",
  description: "Manage double powder notifications.",
  options: [
    {
      name: "action",
      description: "Powder action",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Toggle", value: "toggle" },
        { name: "Set Username", value: "username" },
        { name: "Toggle Officers", value: "officers" },
        { name: "Toggle Quiet", value: "quiet" },
        { name: "Status", value: "status" }
      ]
    },
    {
      name: "username",
      description: "Username for powder notifications",
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
    
    // Ensure doublePowder object exists
    if (!config.minecraft.doublePowder) {
      config.minecraft.doublePowder = {
        enabled: false,
        username: "",
        notifyOfficers: false,
        quietMode: false,
        reminders: [10, 5, 2]
      };
    }
    
    switch (action) {
      case "toggle": {
        config.minecraft.doublePowder.enabled = !config.minecraft.doublePowder.enabled;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const embed = new Embed()
          .setTitle("⚡ Double Powder")
          .setDescription(`Double powder notifications are now **${config.minecraft.doublePowder.enabled ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.minecraft.doublePowder.enabled ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [embed] });
        break;
      }
        
      case "username": {
        const username = interaction.options.getString('username');
        if (!username) {
          return await interaction.followUp({ content: "❌ Please specify a username!", ephemeral: true });
        }
        
        config.minecraft.doublePowder.username = username;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const userEmbed = new Embed()
          .setTitle("⚡ Powder Username")
          .setDescription(`Powder username set to **${username}**`)
          .setColor(0x00ff00);
        
        await interaction.followUp({ embeds: [userEmbed] });
        break;
      }
        
      case "officers": {
        config.minecraft.doublePowder.notifyOfficers = !config.minecraft.doublePowder.notifyOfficers;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const officerEmbed = new Embed()
          .setTitle("⚡ Officer Notifications")
          .setDescription(`Officer notifications are now **${config.minecraft.doublePowder.notifyOfficers ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.minecraft.doublePowder.notifyOfficers ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [officerEmbed] });
        break;
      }
        
      case "quiet": {
        config.minecraft.doublePowder.quietMode = !config.minecraft.doublePowder.quietMode;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const quietEmbed = new Embed()
          .setTitle("⚡ Quiet Mode")
          .setDescription(`Quiet mode is now **${config.minecraft.doublePowder.quietMode ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.minecraft.doublePowder.quietMode ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [quietEmbed] });
        break;
      }
        
      case "status": {
        const statusEmbed = new Embed()
          .setTitle("⚡ Double Powder Status")
          .addFields(
            { name: "Enabled", value: config.minecraft.doublePowder.enabled ? "✅ Yes" : "❌ No", inline: true },
            { name: "Username", value: config.minecraft.doublePowder.username || "Not set", inline: true },
            { name: "Notify Officers", value: config.minecraft.doublePowder.notifyOfficers ? "✅ Yes" : "❌ No", inline: true },
            { name: "Quiet Mode", value: config.minecraft.doublePowder.quietMode ? "✅ Yes" : "❌ No", inline: true },
            { name: "Reminders", value: config.minecraft.doublePowder.reminders.join(", ") + " minutes", inline: false }
          )
          .setColor(0x00aaff);

        await interaction.followUp({ embeds: [statusEmbed] });
        break;
      }
    }
  }
};
