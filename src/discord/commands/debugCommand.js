const HypixelDiscordChatBridgeError = require("../../contracts/errorHandler.js");
const { Embed, SuccessEmbed, ErrorEmbed } = require("../../contracts/embedHandler.js");
const config = require("../../../config.json");
const fs = require('fs');
const path = require('path');

// Try multiple possible config paths
let configPath;

const possiblePaths = [
    path.join(__dirname, '../../../config.json'),
    path.join(__dirname, '../../config.json'),
    path.join(process.cwd(), 'config.json'),
    './config.json'
];

for (const testPath of possiblePaths) {
    try {
        if (fs.existsSync(testPath)) {
            configPath = testPath;
            break;
        }
    } catch (error) {
        continue;
    }
}

if (!configPath) {
    throw new Error('Could not find config.json file');
}

module.exports = {
    name: "debugmode",
    description: "Toggle debug mode on/off",
    moderatorOnly: true,
    options: [
        {
            name: "action",
            description: "Enable, disable, or check debug mode status",
            type: 3, // STRING type
            required: true,
            choices: [
                {
                    name: "Enable",
                    value: "enable"
                },
                {
                    name: "Disable", 
                    value: "disable"
                },
                {
                    name: "Status",
                    value: "status"
                }
            ]
        }
    ],

    async execute(interaction) {
        try {
            // Check if user has the required role
            const requiredRoleId = "875442654534582323"; // Hard coded command role
            const userRoles = interaction.member.roles.cache;
            
            if (!userRoles.has(requiredRoleId) && interaction.user.id !== "608284610169798663") {
                const errorEmbed = new ErrorEmbed("You don't have permission to use this command.");
                return await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }

            const action = interaction.options.getString('action');

            // Re-read config to get current state
            const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            switch (action) {
                case 'enable': {
                    // Enable debug mode
                    currentConfig.discord.channels.debugMode = true;
                    
                    // Write to config file
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
                    
                    // Update the in-memory config immediately
                    config.discord.channels.debugMode = true;
                    
                    const successEmbed = new SuccessEmbed("Debug Mode Enabled")
                        .setDescription(`Debug mode has been **enabled**.\n\nAll Minecraft messages will now be sent to <#${currentConfig.discord.channels.debugChannel}>`)
                        .addFields([
                            {
                                name: 'Debug Channel',
                                value: `<#${currentConfig.discord.channels.debugChannel}>`,
                                inline: true
                            },
                            {
                                name: 'Status',
                                value: '✅ Active',
                                inline: true
                            }
                        ])
                        .setFooter({ text: `Enabled by ${interaction.user.tag}` });
                    
                    await interaction.followUp({ embeds: [successEmbed] });
                    
                    // Log the change
                    console.log(`[${new Date().toISOString()}] Debug mode ENABLED by ${interaction.user.tag} (${interaction.user.id})`);
                    break;
                }

                case 'disable': {
                    // Disable debug mode
                    currentConfig.discord.channels.debugMode = false;
                    
                    // Write to config file
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
                    
                    // Update the in-memory config immediately
                    config.discord.channels.debugMode = false;
                    
                    const errorEmbed = new ErrorEmbed("Debug Mode Disabled")
                        .setDescription('Debug mode has been **disabled**.\n\nMinecraft messages will no longer be sent to the debug channel.')
                        .addFields([
                            {
                                name: 'Debug Channel',
                                value: `<#${currentConfig.discord.channels.debugChannel}>`,
                                inline: true
                            },
                            {
                                name: 'Status',
                                value: '❌ Inactive',
                                inline: true
                            }
                        ])
                        .setFooter({ text: `Disabled by ${interaction.user.tag}` });
                    
                    await interaction.followUp({ embeds: [errorEmbed] });
                    
                    // Log the change
                    console.log(`[${new Date().toISOString()}] Debug mode DISABLED by ${interaction.user.tag} (${interaction.user.id})`);
                    break;
                }

                case 'status': {
                    // Show current status
                    const isEnabled = currentConfig.discord.channels.debugMode;
                    const statusColor = isEnabled ? 0x00ff00 : 0xff0000;
                    const statusText = isEnabled ? '✅ Enabled' : '❌ Disabled';
                    const statusEmoji = isEnabled ? '🟢' : '🔴';

                    const statusEmbed = new Embed()
                        .setAuthor({ name: '🔧 Debug Mode Status' })
                        .setDescription(`Debug mode is currently **${isEnabled ? 'enabled' : 'disabled'}**.`)
                        .setColor(statusColor)
                        .addFields([
                            {
                                name: 'Current Status',
                                value: `${statusEmoji} ${statusText}`,
                                inline: true
                            },
                            {
                                name: 'Debug Channel',
                                value: `<#${currentConfig.discord.channels.debugChannel}>`,
                                inline: true
                            },
                            {
                                name: 'Message Mode',
                                value: currentConfig.discord.channels.debugChannelMessageMode || 'bot',
                                inline: true
                            },
                            {
                                name: 'Config Path',
                                value: `\`${configPath}\``,
                                inline: false
                            }
                        ]);

                    await interaction.followUp({ embeds: [statusEmbed] });
                    break;
                }
            }
            
        } catch (error) {
            console.error('Error in debug command:', error);
            throw new HypixelDiscordChatBridgeError(`Debug command failed: ${error.message}`);
        }
    }
};
