const {
  Client,
  Permissions,
  version,
  PermissionFlagsBits,
} = require("discord.js");
const axios = require("axios").default;
const ver = version;

class Fish {
  /**
   * @description Anti-Phishing Handler (Fish Detector)
   * @param {Client} client Discord.JS Client
   * @param {String} [version] Discord.JS Version *Default is latest version*
   */
  init(client, version = ver) {
    let ev;
    let permissionsBitfield;

    // Parse the major version reliably (handles versions like "14.24.2")
    const major = parseInt(String(version).split(".")[0], 10) || 0;

    // Resolve SEND_MESSAGES permission in a way that works for v13 and v14.
    // Fallback to numeric value 2048 if enumerations are not available.
    const SEND_MESSAGES_FLAG =
      (Permissions && Permissions.FLAGS && Permissions.FLAGS.SEND_MESSAGES) ||
      (PermissionFlagsBits && PermissionFlagsBits.SendMessages) ||
      2048;

    if (major < 13) {
      ev = "message";
      permissionsBitfield = SEND_MESSAGES_FLAG;
    } else {
      ev = "messageCreate";
      // For newer versions, pass the raw bitfield/flag value. This will work
      // with v13 (number) and v14 (PermissionFlagsBits or numeric) alike.
      permissionsBitfield = SEND_MESSAGES_FLAG;
    }

    client.on(ev, (message) => {
      if (message && message.partial) message.fetch().catch(() => {});
      this.checkForFish(client, message, permissionsBitfield);
    });

    client.on("messageUpdate", (oldMsg, newMsg) => {
      if (newMsg && newMsg.partial) newMsg.fetch().catch(() => {});
      this.checkForFish(client, newMsg, permissionsBitfield);
    });
  }

  /**
   * @description Checks if an existing link is a phishing link
   * @param {Client} client
   * @param {Message} message
   * @param {BigInt} permissionsBitfield
   */
  checkForFish(client, message, permissionsBitfield) {
    if (message.author === client.user) return;

    const uAgent = `${client.user.username} (${client.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: permissionsBitfield,
    })})`;
    const urlCheck =
      /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/i;

    if (!urlCheck.test(message.content)) return;
    const URL = message.content;

    axios({
      url: "https://anti-fish.bitflow.dev/check",
      method: "POST",
      headers: {
        "User-Agent": uAgent,
      },
      data: {
        message: URL,
      },
    })
      .then(function (val) {
        const a = val.data;

        if (a.match) {
          client.emit("phishingMessage", message, a);
        }
      })
      .catch((e) => console.error(e));
  }
}

module.exports = Fish;
