const { Collection } = require("discord.js");
const { cleanText } = require("../contracts/filter.js");
const config = require("../../config.json");
const axios = require("axios");
const fs = require("fs");

class CommandHandler {
  /** @param {import("minecraft-protocol").Client} minecraft */
  constructor(minecraft) {
    this.minecraft = minecraft;
    this.prefix = config.minecraft.bot.prefix;
    this.commands = new Collection();
    const commandFiles = fs.readdirSync("./src/minecraft/commands").filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = new (require(`./commands/${file}`))(minecraft);
      this.commands.set(command.name, command);
    }
  }

  handle(player, message, officer) {
    if (message.startsWith(this.prefix)) {
      if (config.minecraft.commands.normal === false) {
        return;
      }
      const args = message.slice(this.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const command = this.commands.get(commandName) ?? this.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));
      if (command === undefined) {
        return;
      }
      console.minecraft(`${player} - [${command.name}] ${message}`);
      command.officer = officer;
      command.onCommand(player, message);
    } else if (message.startsWith("-") && message.startsWith("- ") === false) {
      if (config.minecraft.commands.soopy === false || message.at(1) === "-") {
        return;
      }
      
      const command = message.slice(1).split(" ")[0];
      
      // Check if the command is disabled
      if (config.minecraft.commands.soopyDisabled && config.minecraft.commands.soopyDisabled.includes(command)) {
        const chat = officer ? "oc" : "gc";
        if (command == "define") {
          bot.chat(`/${chat} [SOOPY V2] ${player} is too lazy to use a dictionary!`);
        } else {
          bot.chat(`/${chat} [SOOPY V2] Command '${command}' is disabled`);
        }
        return;
      }
      
      if (isNaN(parseInt(command.replace(/[^-()\d/*+.]/g, ""))) === false) {
        return;
      }
      
      const chat = officer ? "oc" : "gc";
      bot.chat(`/${chat} [SOOPY V2] ${cleanText(message)}`);
      console.minecraft(`${player} - [${command}] ${message}`);
      
      (async () => {
        try {
          const URI = encodeURI(`https://soopy.dev/api/guildBot/runCommand?user=${player}&cmd=${message.slice(1)}`);
          const response = await axios.get(URI);
          if (response?.data?.msg === undefined) {
            return bot.chat(`/${chat} [SOOPY V2] An error occured while running the command`);
          }
          bot.chat(`/${chat} [SOOPY V2] ${cleanText(response.data.msg)}`);
        } catch (e) {
          bot.chat(`/${chat} [SOOPY V2] ${e.cause ?? e.message ?? "Unknown error"}`);
        }
      })();
    }
  }
}

module.exports = CommandHandler;
