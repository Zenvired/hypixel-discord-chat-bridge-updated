const { describe, it, expect, beforeEach, afterEach, jest: mocking } = require("@jest/globals");
const fs = require("fs");

mocking.mock("../config.json", () => structuredClone(require("../config.example.json")), { virtual: true });

const config = require("../config.json");
const example = require("../config.example.json");
const events = require("../src/discord/commands/eventsCommand.js");
const messages = require("../src/discord/commands/messagesCommand.js");
const powder = require("../src/discord/commands/powderCommand.js");

const realExists = fs.existsSync;
const fileExists = mocking.spyOn(fs, "existsSync").mockImplementation((file) => String(file).endsWith("/config.json") || realExists(file));
const debug = require("../src/discord/commands/debugCommand.js");
fileExists.mockRestore();

function interaction(action, options = {}, allowed = true) {
  return {
    member: { roles: { cache: { has: mocking.fn().mockReturnValue(allowed) } } },
    user: { id: "123", tag: "tester" },
    options: { getString: mocking.fn((name) => name === "action" ? action : options[name] ?? null) },
    followUp: mocking.fn().mockResolvedValue(undefined)
  };
}

function response(interaction) {
  expect(interaction.followUp).toHaveBeenCalledTimes(1);
  return interaction.followUp.mock.calls[0][0];
}

function savedConfig() {
  expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  expect(fs.writeFileSync.mock.calls[0][1]).toBe(JSON.stringify(config, null, 2));
}

beforeEach(() => {
  Object.assign(config, structuredClone(example));
  mocking.spyOn(fs, "writeFileSync").mockImplementation(() => {});
});

afterEach(() => {
  mocking.restoreAllMocks();
});

describe("debugmode", () => {
  beforeEach(() => {
    mocking.spyOn(fs, "readFileSync").mockImplementation(() => JSON.stringify(config));
    mocking.spyOn(console, "log").mockImplementation(() => {});
    mocking.spyOn(console, "error").mockImplementation(() => {});
  });

  it.each([
    ["enable", true, "enabled"],
    ["disable", false, "disabled"]
  ])("%s changes the saved and active config once", async (action, enabled, word) => {
    config.discord.channels.debugMode = !enabled;
    const previous = structuredClone(config.discord.channels);
    const request = interaction(action);

    await debug.execute(request);

    expect(config.discord.channels).toEqual({ ...previous, debugMode: enabled });
    savedConfig();
    expect(JSON.parse(fs.writeFileSync.mock.calls[0][1]).discord.channels.debugMode).toBe(enabled);
    expect(response(request).embeds[0].data.description).toContain(word);
  });

  it("status reports the current config without saving it", async () => {
    config.discord.channels.debugMode = true;
    const request = interaction("status");

    await debug.execute(request);

    expect(response(request).embeds[0].data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Current Status", value: "🟢 ✅ Enabled" })
    ]));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("denies an unauthorized user before reading or changing config", async () => {
    const request = interaction("enable", {}, false);

    await debug.execute(request);

    expect(response(request)).toEqual(expect.objectContaining({ ephemeral: true }));
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("allows the owner and wraps a failed config write", async () => {
    const owner = interaction("enable", {}, false);
    owner.user.id = "608284610169798663";
    await debug.execute(owner);
    expect(response(owner).embeds[0].data.description).toContain("enabled");

    fs.writeFileSync.mockImplementation(() => { throw new Error("disk full"); });
    await expect(debug.execute(interaction("disable"))).rejects.toThrow("Debug command failed: disk full");
  });
});

describe("edit-events", () => {
  it("toggle_all changes the system setting and sends one response", async () => {
    const request = interaction("toggle_all");
    const previous = structuredClone(config.minecraft.skyblockEventsNotifications);

    await events.execute(request);

    expect(config.minecraft.skyblockEventsNotifications).toEqual({ ...previous, enabled: false });
    savedConfig();
    expect(response(request).embeds[0].data.description).toContain("DISABLED");
  });

  it("toggle_event changes only the requested event", async () => {
    const request = interaction("toggle_event", { event: "DARK_AUCTION" });
    const original = structuredClone(config.minecraft.skyblockEventsNotifications.notifiers);

    await events.execute(request);

    expect(config.minecraft.skyblockEventsNotifications.notifiers).toEqual({ ...original, DARK_AUCTION: false });
    savedConfig();
    expect(response(request).embeds[0].data.description).toContain("DARK_AUCTION");
  });

  it("status reports the system and event settings without a write", async () => {
    const request = interaction("status");

    await events.execute(request);

    const fields = response(request).embeds[0].data.fields;
    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "System", value: "✅ Enabled" }),
      expect.objectContaining({ name: "DARK_AUCTION", value: "✅" })
    ]));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("rejects a missing event without changing config", async () => {
    const request = interaction("toggle_event");

    await events.execute(request);

    expect(response(request)).toEqual({ content: "❌ Please specify an event!", ephemeral: true });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("rejects a user without the command role", async () => {
    const request = interaction("toggle_all", {}, false);

    await events.execute(request);

    expect(response(request).ephemeral).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("edit-messages", () => {
  it.each([
    ["toggle_filter", "filterMessages", "filtering"],
    ["toggle_join", "joinMessage", "Join messages"]
  ])("%s toggles only %s", async (action, setting, description) => {
    const request = interaction(action);
    const previous = structuredClone(config.discord.other);

    await messages.execute(request);

    expect(config.discord.other).toEqual({ ...previous, [setting]: !previous[setting] });
    savedConfig();
    expect(response(request).embeds[0].data.description.toLowerCase()).toContain(description.toLowerCase());
  });

  it.each([
    ["set_mode", "mode", "webhook", "messageMode"],
    ["set_format", "format", "{username}: {message}", "messageFormat"]
  ])("%s saves and acknowledges the supplied value", async (action, option, value, setting) => {
    const request = interaction(action, { [option]: value });
    const previous = structuredClone(config.discord.other);

    await messages.execute(request);

    expect(config.discord.other).toEqual({ ...previous, [setting]: value });
    savedConfig();
    expect(response(request).embeds[0].data.description).toContain(value);
    expect(request.options.getString).toHaveBeenCalledWith(option);
  });

  it("status reports current values without changing them", async () => {
    const request = interaction("status");

    await messages.execute(request);

    expect(response(request).embeds[0].data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Mode", value: "bot" }),
      expect.objectContaining({ name: "Filter", value: "✅ On" })
    ]));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it.each(["set_mode", "set_format"])("%s rejects a missing value", async (action) => {
    const request = interaction(action);

    await messages.execute(request);

    expect(response(request).ephemeral).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("denies a user without permission", async () => {
    const request = interaction("toggle_filter", {}, false);

    await messages.execute(request);

    expect(response(request).ephemeral).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("edit-powder", () => {
  it.each([
    ["toggle", "enabled", "Double powder"],
    ["officers", "notifyOfficers", "Officer notifications"],
    ["quiet", "quietMode", "Quiet mode"]
  ])("%s changes only %s", async (action, setting, description) => {
    config.minecraft.doublePowder = {
      enabled: false,
      username: "ExistingPlayer",
      notifyOfficers: false,
      quietMode: false,
      reminders: [10, 5, 2]
    };
    const request = interaction(action);
    const previous = structuredClone(config.minecraft.doublePowder);

    await powder.execute(request);

    expect(config.minecraft.doublePowder).toEqual({ ...previous, [setting]: true });
    savedConfig();
    expect(response(request).embeds[0].data.description.toLowerCase()).toContain(description.toLowerCase());
  });

  it("username saves the selected player", async () => {
    config.minecraft.doublePowder = {
      enabled: true,
      username: "ExistingPlayer",
      notifyOfficers: true,
      quietMode: false,
      reminders: [10, 5, 2]
    };
    const request = interaction("username", { username: "DuckySoLucky" });
    const previous = structuredClone(config.minecraft.doublePowder);

    await powder.execute(request);

    expect(config.minecraft.doublePowder).toEqual({ ...previous, username: "DuckySoLucky" });
    savedConfig();
    expect(response(request).embeds[0].data.description).toContain("DuckySoLucky");
  });

  it("status reports the current settings without saving", async () => {
    const request = interaction("status");

    await powder.execute(request);

    expect(response(request).embeds[0].data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Enabled", value: "❌ No" }),
      expect.objectContaining({ name: "Reminders", value: "10, 5, 2 minutes" })
    ]));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("rejects a missing username without a write", async () => {
    const request = interaction("username");

    await powder.execute(request);

    expect(response(request)).toEqual({ content: "❌ Please specify a username!", ephemeral: true });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("denies a user without permission", async () => {
    const request = interaction("toggle", {}, false);

    await powder.execute(request);

    expect(response(request).ephemeral).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

it.each([
  ["edit-events", events],
  ["edit-messages", messages],
  ["edit-powder", powder]
])("%s allows a listed user without the command role", async (name, command) => {
  config.discord.commands.users = ["123"];
  const request = interaction("status", {}, false);

  await command.execute(request);

  expect(response(request).embeds).toHaveLength(1);
  expect(fs.writeFileSync).not.toHaveBeenCalled();
});
