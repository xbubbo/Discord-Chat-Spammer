const { Client } = require("discord.js-selfbot-v13");
const fs = require("fs-extra");
const chalk = require("chalk");
require("dotenv").config();

let data;
if (process.env.TOKENS) {
  data = JSON.parse(process.env.TOKENS);
} else {
  data = fs.readJsonSync("./tokens.json");
}

if (!data || !Array.isArray(data)) {
  throw new Error("Unable to find valid tokens.");
}

const tokens = data.map(item => ({
  token: item.token.trim(),
  channelIds: item.channelIds.map(channelId => channelId.trim())
}));

const spamSpeed = parseInt(process.env.SPEED) || 500; 
const deleteSpeed = parseInt(process.env.DELETESPEED) || 0; 
const deleteMessages = process.env.DELETE === "TRUE"; 

if (process.env.REPLIT_DB_URL && !process.env.TOKENS) {
  console.log(
    `You are running on Replit, please use its secret feature to prevent your tokens from being stolen.\nCreate a secret variable called "TOKENS" for your tokens.`
  );
}

let lastSentMessage;

async function Login(token, channelIds) {
  if (!token) {
    console.log(
      chalk.redBright("You must specify a (valid) token.") +
      chalk.white(` ${token} is invalid.`)
    );
    return;
  }

  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    console.log(
      chalk.redBright(
        "You must specify (valid) channel IDs for all your tokens. These are the channels in which they will spam."
      )
    );
    return;
  }

  const client = new Client({ checkUpdate: false, readyStatus: false });

  client.login(token).catch(() => {
    console.log(
      `Failed to login with token "${chalk.red(token)}"! Please check if the token is valid.`
    );
  });

  client.on("ready", async () => {
    console.log(`Logged in to ` + chalk.red(client.user.tag) + `!`);
    client.user.setStatus("invisible");

    const messages = fs.readFileSync("messages.txt", "utf-8").split("\n");

    let currentChannelIndex = 0;

    async function spamMessages(channelId) {
      const spamChannel = await client.channels.fetch(channelId);
      if (!spamChannel) {
        console.log(
          `Couldn't find the channel specified for ${client.user.username}. Please check if the account has access to it.`
        );
        return;
      }

      const message = messages[Math.floor(Math.random() * messages.length)];
      const sentMessage = await spamChannel.send(message);

      console.log(`Account: ` + chalk.red(client.user.tag) + ` Sent "${message}" in channel: ${spamChannel.name}`);

      if (deleteMessages && lastSentMessage) {
        setTimeout(async () => {
          await lastSentMessage.delete().catch(err => console.log(chalk.red("Failed to delete message:", err)));
        }, deleteSpeed);
      }

      lastSentMessage = sentMessage;

      setTimeout(() => spamMessages(channelIds[currentChannelIndex]), spamSpeed);
    }

    spamMessages(channelIds[currentChannelIndex]);
  });
}

async function start() {
  for (const { token, channelIds } of tokens) {
    await Login(token, channelIds);
  }
}

start();
