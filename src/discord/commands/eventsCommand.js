// eventsCommand.js
const { Embed } = require("../../contracts/embedHandler.js");
const config = require("../../../config.json");
const fs = require('fs');

module.exports = {
  name: "edit-events",
  description: "Manage Skyblock event notifications.",
  options: [
    {
      name: "action",
      description: "Event action",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Toggle All", value: "toggle_all" },
        { name: "Toggle Event", value: "toggle_event" },
        { name: "List Events", value: "list" },
        { name: "Status", value: "status" }
      ]
    },
    {
      name: "event",
      description: "Specific event to toggle",
      type: 3, // STRING
      required: false,
      choices: [
        { name: "Jacob's Contest", value: "JACOBS_CONTEST" },
        { name: "Dark Auction", value: "DARK_AUCTION" },
        { name: "Bank Interest", value: "BANK_INTEREST" },
        { name: "Spooky Festival", value: "SPOOKY_FESTIVAL" },
        { name: "Traveling Zoo", value: "TRAVELING_ZOO" },
        { name: "Jerry's Workshop", value: "JERRYS_WORKSHOP" }
      ]
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
    const event = interaction.options.getString('event');
    
    switch (action) {
      case "toggle_all": {
        config.minecraft.skyblockEventsNotifications.enabled = !config.minecraft.skyblockEventsNotifications.enabled;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const embed = new Embed()
          .setTitle("📅 Event Notifications")
          .setDescription(`Event notifications are now **${config.minecraft.skyblockEventsNotifications.enabled ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(config.minecraft.skyblockEventsNotifications.enabled ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [embed] });
        break;
      }
        
      case "toggle_event": {
        if (!event) {
          return await interaction.followUp({ content: "❌ Please specify an event!", ephemeral: true });
        }
        
        const currentStatus = config.minecraft.skyblockEventsNotifications.notifiers[event];
        config.minecraft.skyblockEventsNotifications.notifiers[event] = !currentStatus;
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        
        const eventEmbed = new Embed()
          .setTitle("📅 Event Toggle")
          .setDescription(`**${event}** notifications are now **${!currentStatus ? 'ENABLED' : 'DISABLED'}**`)
          .setColor(!currentStatus ? 0x00ff00 : 0xff0000);
        
        await interaction.followUp({ embeds: [eventEmbed] });
        break;
      }
        
        case "status": {
          const statusEmbed = new Embed()
            .setTitle("📅 Event Notifications Status")
            .addFields(
              { name: "System", value: config.minecraft.skyblockEventsNotifications.enabled ? "✅ Enabled" : "❌ Disabled", inline: false }
            );
  
// Add event status fields
          const eventFields = Object.entries(config.minecraft.skyblockEventsNotifications.notifiers).map(([eventName, enabled]) => ({
            name: eventName,
            value: enabled ? "✅" : "❌",
            inline: true
          }));
  
          statusEmbed.addFields(...eventFields);
          statusEmbed.setColor(0x00aaff);
          await interaction.followUp({ embeds: [statusEmbed] });
          break;
        }
    }
  }
};
