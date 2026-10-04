const { describe, it, expect, beforeEach, jest: mocking } = require("@jest/globals");

mocking.mock("../config.json", () => require("../config.example.json"), { virtual: true });
const mockGetGuild = mocking.fn();
const mockGetPlayer = mocking.fn();
const mockGetNetworth = mocking.fn();
mocking.mock("hypixel-api-reborn", () => ({
  Client: mocking.fn().mockImplementation(() => ({ getGuild: mockGetGuild, getPlayer: mockGetPlayer }))
}));
mocking.mock("skyhelper-networth", () => ({
  ProfileNetworthCalculator: mocking.fn().mockImplementation(() => ({ getNetworth: mockGetNetworth }))
}));

const ChatHandler = require("../src/minecraft/handlers/ChatHandler.js");
const config = require("../config.json");

describe("ChatHandler", () => {
  describe("uncoloredRegex", () => {
    const regex = /^(?<chatType>\w+) > (?:(?:\[(?<rank>[^\]]+)\] )?(?:(?<username>\w+)(?: \[(?<guildRank>[^\]]+)\])?: )?)?(?<message>.+)$/;

    it("should match a regular message", () => {
      const message = "Guild > [MVP+] DuckySoLucky [Staff]: Test Message";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("Guild");
      expect(match.groups.rank).toBe("MVP+");
      expect(match.groups.username).toBe("DuckySoLucky");
      expect(match.groups.guildRank).toBe("Staff");
      expect(match.groups.message).toBe("Test Message");
    });

    it("should match a message with rank but without guild rank", () => {
      const message = "Guild > [MVP+] DuckySoLucky: Test Message";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("Guild");
      expect(match.groups.rank).toBe("MVP+");
      expect(match.groups.username).toBe("DuckySoLucky");
      expect(match.groups.guildRank).toBeUndefined();
      expect(match.groups.message).toBe("Test Message");
    });

    it("should match a message without rank but with guild rank", () => {
      const message = "Guild > DuckySoLucky [Staff]: Test Message";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("Guild");
      expect(match.groups.rank).toBeUndefined();
      expect(match.groups.username).toBe("DuckySoLucky");
      expect(match.groups.guildRank).toBe("Staff");
      expect(match.groups.message).toBe("Test Message");
    });

    it("should match a message without rank or guild rank", () => {
      const message = "Guild > DuckySoLucky: Test Message";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("Guild");
      expect(match.groups.rank).toBeUndefined();
      expect(match.groups.username).toBe("DuckySoLucky");
      expect(match.groups.guildRank).toBeUndefined();
      expect(match.groups.message).toBe("Test Message");
    });
  });

  describe("coloredRegex", () => {
    const regex =
      /^(?<chatType>§[0-9a-fA-F](Guild|Officer)) > (?<rank>§[0-9a-fA-F](?:\[.*?\])?)?\s*(?<username>[^§\s]+)\s*(?:(?<guildRank>§[0-9a-fA-F](?:\[.*?\])?))?\s*§f: (?<message>.*)/;

    it("should match a regular message", () => {
      const message = "§2Guild > §b[MVP§0+§b] DuckySoSkilled §2[Staff]§f: yeeeee";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("§2Guild");
      expect(match.groups.rank).toBe("§b[MVP§0+§b]");
      expect(match.groups.username).toBe("DuckySoSkilled");
      expect(match.groups.guildRank).toBe("§2[Staff]");
      expect(match.groups.message).toBe("yeeeee");
    });

    it("should match a message with rank but without guild rank", () => {
      const message = "§2Guild > §b[MVP§0+§b] DuckySoSkilled§f: yeeeee";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("§2Guild");
      expect(match.groups.rank).toBe("§b[MVP§0+§b]");
      expect(match.groups.username).toBe("DuckySoSkilled");
      expect(match.groups.guildRank).toBeUndefined();
      expect(match.groups.message).toBe("yeeeee");
    });

    it("should match a message without rank but with guild rank", () => {
      const message = "§2Guild > §7DuckySoSkilled §2[Staff]§f: yeeeee";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("§2Guild");
      expect(match.groups.rank).toBe("§7");
      expect(match.groups.username).toBe("DuckySoSkilled");
      expect(match.groups.guildRank).toBe("§2[Staff]");
      expect(match.groups.message).toBe("yeeeee");
    });

    it("should match a message without rank or guild rank", () => {
      const message = "§2Guild > §7DuckySoSkilled§f: yeeeee";
      const match = message.match(regex);
      expect(match).toBeTruthy();
      expect(match.groups.chatType).toBe("§2Guild");
      expect(match.groups.rank).toBe("§7");
      expect(match.groups.username).toBe("DuckySoSkilled");
      expect(match.groups.guildRank).toBeUndefined();
      expect(match.groups.message).toBe("yeeeee");
    });
  });
  let chatHandler;
  beforeEach(() => {
    mocking.clearAllMocks();
    chatHandler = new ChatHandler();
  });

  it("passes API calls through the real Hypixel wrapper", async () => {
    mocking.resetModules();
    const Client = require("hypixel-api-reborn").Client;
    const guild = { name: "Guild", members: [] };
    const player = { nickname: "Player" };
    mockGetGuild.mockResolvedValue(guild);
    mockGetPlayer.mockResolvedValue(player);

    const hypixel = require("../src/contracts/API/HypixelRebornAPI.js");

    expect(Client).toHaveBeenCalledWith(config.minecraft.API.hypixelAPIkey, { cache: true });
    await expect(hypixel.getGuild("player", "Bot")).resolves.toBe(guild);
    await expect(hypixel.getPlayer("uuid")).resolves.toBe(player);
    expect(mockGetGuild).toHaveBeenCalledWith("player", "Bot");
    expect(mockGetPlayer).toHaveBeenCalledWith("uuid");
  });

  it("passes profile data into the networth calculator", async () => {
    const Calculator = require("skyhelper-networth").ProfileNetworthCalculator;
    const { getPlayerVariableStats } = require("../src/contracts/getVariableStats.js");
    const profile = { leveling: { experience: 1200 } };
    const museum = { value: 1 };
    mockGetNetworth.mockResolvedValue({ bank: 20, purse: 30 });

    const stats = await getPlayerVariableStats(
      "uuid",
      { name: "Guild", members: [] },
      { nickname: "Player" },
      { profile, profileData: { banking: { balance: 20 } }, museum }
    );

    expect(Calculator).toHaveBeenCalledWith(profile, museum, 20);
    expect(mockGetNetworth).toHaveBeenCalledWith({ onlyNetworth: true });
    expect(stats).toEqual(expect.objectContaining({ username: "Player", guildName: "Guild", skyblockBank: 20, skyblockPurse: 30 }));
  });

  it("uses the config fixture for debug messages", async () => {
    const minecraft = { broadcastMessage: mocking.fn() };
    const handler = new ChatHandler(minecraft);
    const previous = config.discord.channels.debugMode;
    config.discord.channels.debugMode = true;

    try {
      await handler.onMessage({ toString: () => "Unrelated message", toMotd: () => "§fUnrelated message" });
      expect(minecraft.broadcastMessage).toHaveBeenCalledWith({
        fullMessage: "§fUnrelated message",
        message: "Unrelated message",
        chat: "debugChannel"
      });
    } finally {
      config.discord.channels.debugMode = previous;
    }
  });

  describe("isDiscordMessage", () => {
    it("should return true for a valid Discord message", () => {
      const messages = ["DuckySoSkilled » test", "DuckySoSkilled: test", "DuckySoSkilled > test"];
      for (const message of messages) {
        expect(chatHandler.isDiscordMessage(message)).toBe(true);
      }
    });

    it("should return false for an invalid Discord message", () => {
      const messages = ["DuckySoLucky message", "yeah i agree", "bro you're so bad", "test false: message"];
      for (const message of messages) {
        expect(chatHandler.isDiscordMessage(message)).toBe(false);
      }
    });
  });

  describe("isCommand", () => {
    it("!help", () => {
      const message = "!help";
      expect(chatHandler.isCommand(message)).toBe(true);
    });

    it("!skyblock DuckySoSkilled", () => {
      const message = "!skyblock DuckySoSkilled";
      expect(chatHandler.isCommand(message)).toBe(true);
    });

    it("-rtca DeathStreeks", () => {
      const message = "-rtca DeathStreeks";
      expect(chatHandler.isCommand(message)).toBe(true);
    });

    it("-chevent", () => {
      const message = "-chevent";
      expect(chatHandler.isCommand(message)).toBe(true);
    });
  });

  describe("getCommandData", () => {
    it("!skyblock DuckySoSkillled", () => {
      const message = "DuckySoSkilled: !skyblock DuckySoSkilled";
      const match = chatHandler.getCommandData(message);
      expect(match).toBeTruthy();
      expect(match.player).toBe("DuckySoSkilled");
      expect(match.command).toBe("!skyblock DuckySoSkilled");
    });

    it("!nw", () => {
      const message = "DeathStreeks: !nw";
      const match = chatHandler.getCommandData(message);
      expect(match).toBeTruthy();
      expect(match.player).toBe("DeathStreeks");
      expect(match.command).toBe("!nw");
    });

    it("-rtca", () => {
      const message = "15h: -rtca";
      const match = chatHandler.getCommandData(message);
      expect(match).toBeTruthy();
      expect(match.player).toBe("15h");
      expect(match.command).toBe("-rtca");
    });
  });

  describe("getUsernameFromEventMessage", () => {
    it("should return the username from the message with a MVP+ rank", () => {
      const message = "[MVP+] DuckySoSkilled left the guild!";
      const username = chatHandler.getUsernameFromEventMessage(message);
      expect(username).toBe("DuckySoSkilled");
    });

    it("should return the username from the message with a VIP rank", () => {
      const message = "[VIP] DuckySoSkilled left the guild!";
      const username = chatHandler.getUsernameFromEventMessage(message);
      expect(username).toBe("DuckySoSkilled");
    });

    it("should return the username from the message without a rank", () => {
      const message = "DuckySoSkilled left the guild!";
      const username = chatHandler.getUsernameFromEventMessage(message);
      expect(username).toBe("DuckySoSkilled");
    });
  });
});
