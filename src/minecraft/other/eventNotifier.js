const { getSkyblockCalendar } = require("../../../API/functions/getCalendar.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const config = require("../../../config.json");
const axios = require("axios");

// Double powder monitoring state
let lastPowderStatus = null;
let powderCheckCounter = 0;

if (config.minecraft.skyblockEventsNotifications.enabled) {
  const { notifiers, customTime } = config.minecraft.skyblockEventsNotifications;
  
  setInterval(async () => {
    try {
      const eventBOT = new minecraftCommand(bot);
      eventBOT.officer = false;
      
      // ========================================
      // YOUR ORIGINAL CALENDAR EVENT CODE
      // ========================================
      const EVENTS = getSkyblockCalendar();
      for (const event in EVENTS.events) {
        const eventData = EVENTS.events[event];
        if (notifiers[event] === false) {
          continue;
        }
        if (eventData.events[0].start_timestamp < Date.now()) {
          continue;
        }
        const minutes = Math.floor((eventData.events[0].start_timestamp - Date.now()) / 1000 / 60);
        let extraInfo = "";
        if (event == "JACOBS_CONTEST") {
          const { data: jacobResponse } = await axios.get("https://dawjaw.net/jacobs");
          const jacobCrops = jacobResponse.find((crop) => crop.time >= Math.floor(eventData.events[0].start_timestamp / 1000));
          if (jacobCrops?.crops !== undefined) {
            extraInfo = ` (${jacobCrops.crops.join(", ")})`;
          }
        }
        const cTime = getCustomTime(customTime, event);
        if (cTime.length !== 0 && cTime.includes(minutes.toString())) {
          eventBOT.send(`[EVENT] ${eventData.name}${extraInfo}: Starting in ${minutes}m!`);
          await delay(1500);
        }
        if (minutes == 0) {
          eventBOT.send(`[EVENT] ${eventData.name}${extraInfo}: Starting now!`);
          await delay(1500);
        }
      }
      
      // ========================================
      // NEW DOUBLE POWDER MONITORING
      // ========================================
      // Check every 2 minutes to reduce API calls
      powderCheckCounter++;
      if (powderCheckCounter >= 2) { // Every 2 intervals = 2 minutes
        await handleDoublePowderEvent(eventBOT);
        powderCheckCounter = 0;
      }
      
    } catch (e) {
      console.error(e);
      /* empty */
    }
  }, 60000);
}

// ========================================
// YOUR ORIGINAL FUNCTION (unchanged)
// ========================================
function getCustomTime(events, value) {
  if (events === undefined || value === undefined) {
    return [];
  }
  return Object.keys(events).filter((key) => events[key].includes(value));
}

// ========================================
// NEW DOUBLE POWDER FUNCTIONS
// ========================================
async function handleDoublePowderEvent(eventBOT) {
  try {
    const powderConfig = config.minecraft.skyblockEventsNotifications.doublePowder;
    
    if (!powderConfig?.enabled) {
      return;
    }
    
    const username = powderConfig.username || config.minecraft.bot.username;
    if (!username) {
      console.log("No username configured for double powder monitoring");
      return;
    }
    
    console.log(`Checking double powder events for ${username}...`);
    
    const response = await axios.get(`https://soopy.dev/api/guildBot/runCommand?user=${username}&cmd=chevent`, {
      timeout: 10000
    });
    
    if (!response.data?.msg) {
      console.log("No message in double powder API response");
      return;
    }
    
    const eventData = parseDoublePowderData(response.data.msg);
    console.log(`Double powder status: ${eventData.hasDoublePowder ? 'ACTIVE' : 'INACTIVE'}`);
    
    // Store event data for history
    await logPowderEvent(eventData);
    
    // Check if status changed
    if (lastPowderStatus !== eventData.hasDoublePowder) {
      await sendPowderNotification(eventBOT, eventData, lastPowderStatus === null);
      lastPowderStatus = eventData.hasDoublePowder;
    }
    
    // Send reminder notifications for long events
    if (eventData.hasDoublePowder && powderConfig.reminders) {
      await handlePowderReminders(eventBOT, eventData);
    }
  } catch(error) {
    console.error(error);
  }
}

function parseDoublePowderData(message) {
  const eventData = {
    hasDoublePowder: false,
    percentage: null,
    timeRemaining: null,
    rawMessage: message
  };

  if (message.includes('DOUBLE_POWDER')) {
    eventData.hasDoublePowder = true;
    
    // Extract percentage
    const percentageMatch = message.match(/(\d+)% of lobby/);
    if (percentageMatch) {
      eventData.percentage = parseInt(percentageMatch[1]);
    }
    
    // Extract time remaining
    const timeMatch = message.match(/ends in ([\d\w\s]+)/);
    if (timeMatch) {
      eventData.timeRemaining = timeMatch[1].trim();
    }
  }

  return eventData;
}

async function sendPowderNotification(eventBOT, eventData, isFirstCheck = false) {
  try {
    const powderConfig = config.minecraft.skyblockEventsNotifications.doublePowder;
    
    if (!eventData.hasDoublePowder && !isFirstCheck && !powderConfig.quietMode) {
      eventBOT.send(`[POWDER] Double Powder event ended`);
    }
  } catch (error) {
    console.error("Error sending powder notification:", error.message);
  }
}

async function handlePowderReminders(eventBOT, eventData) {
  const powderConfig = config.minecraft.skyblockEventsNotifications.doublePowder;
  
  if (!eventData.timeRemaining) return;
  
  // Parse time remaining (e.g., "13m 41s" -> minutes)
  const timeMatch = eventData.timeRemaining.match(/(\d+)m/);
  if (!timeMatch) return;
  
  const minutesLeft = parseInt(timeMatch[1]);
  
  // Send reminders at specified times if enabled
  const reminders = powderConfig.reminders || [];
  
  if (reminders.includes(minutesLeft)) {
    eventBOT.send(`[POWDER] ${minutesLeft} minutes left of Double Powder! (${eventData.percentage}% coverage)`);
    await delay(1500);
  }
}

async function logPowderEvent(eventData) {
  try {
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      active: eventData.hasDoublePowder,
      percentage: eventData.percentage,
      timeRemaining: eventData.timeRemaining,
      message: eventData.rawMessage
    };
    
    // Append to log file
    await fs.appendFile('powder_events.log', JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error("Error logging powder event:", error.message);
  }
}

// Additional utility function for manual checking
async function checkPowderManually(username) {
  try {
    const response = await axios.get(`https://soopy.dev/api/guildBot/runCommand?user=${username}&cmd=chevent`);
    return parseDoublePowderData(response.data.msg);
  } catch (error) {
    console.error("Manual powder check failed:", error.message);
    return null;
  }
}
module.exports = { checkPowderManually };
