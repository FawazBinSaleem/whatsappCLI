const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const readline = require("readline");

const client = new Client({
  authStrategy: new LocalAuth(),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const nameCache = new Map();

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isYes(input) {
  const value = input.trim().toLowerCase();
  return value === "yes" || value === "y";
}

function isSend(input) {
  return input.trim() === "SEND";
}

function formatRecipient(index, recipient) {
  const adminTag = recipient.isAdmin ? " [ADMIN]" : "";
  return `${index + 1}. ${recipient.displayName} (${recipient.user})${adminTag}`;
}

async function getDisplayNameFromParticipant(participant) {
  const serializedId = participant.id._serialized;

  if (nameCache.has(serializedId)) {
    return nameCache.get(serializedId);
  }

  let displayName;

  try {
    const contact = await client.getContactById(serializedId);
    displayName =
      contact.pushname ||
      contact.name ||
      contact.number ||
      participant.id.user ||
      serializedId;
  } catch (err) {
    displayName = participant.id.user || serializedId;
  }

  if (displayName && /^\d+$/.test(displayName)) {
    displayName = `Unknown (${displayName})`;
  }

  nameCache.set(serializedId, displayName);
  return displayName;
}

async function chooseGroup(groups) {
  console.log("\nGroups:\n");
  groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.name}`);
  });

  const groupChoice = parseInt(await ask("\nChoose a group number: "), 10);
  const selectedGroup = groups[groupChoice - 1];

  if (!selectedGroup) {
    return null;
  }

  return selectedGroup;
}

async function buildRecipientDetails(selectedGroup, includeAdmins, myId) {
  let participants = selectedGroup.participants.filter((participant) => {
    const isAdmin = participant.isAdmin || participant.isSuperAdmin;
    return includeAdmins ? true : !isAdmin;
  });

  participants = participants.filter(
    (participant) => participant.id._serialized !== myId,
  );

  const recipientDetails = [];

  for (const participant of participants) {
    const isAdmin = participant.isAdmin || participant.isSuperAdmin;
    const displayName = await getDisplayNameFromParticipant(participant);

    recipientDetails.push({
      participant,
      serializedId: participant.id._serialized,
      user: participant.id.user,
      displayName,
      isAdmin,
    });
  }

  return recipientDetails;
}

function previewRecipients(recipients, title = "Recipients") {
  console.log(`\n${title}:\n`);

  recipients.forEach((recipient, index) => {
    console.log(formatRecipient(index, recipient));
  });

  console.log(`\nTotal recipients: ${recipients.length}`);
}

function parseExcludeInput(excludeInput, maxLength) {
  if (excludeInput === "") {
    return new Set();
  }

  return new Set(
    excludeInput
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => !isNaN(value) && value >= 1 && value <= maxLength),
  );
}

function applyExclusions(recipients, excludeSet) {
  const kept = [];
  const excluded = [];

  recipients.forEach((recipient, index) => {
    const displayIndex = index + 1;

    if (excludeSet.has(displayIndex)) {
      excluded.push(recipient);
    } else {
      kept.push(recipient);
    }
  });

  return { kept, excluded };
}

async function askForExclusions(recipients) {
  const excludeInput = (
    await ask(
      "\nEnter indices to exclude any participants (comma separated, e.g. 2,3) or press Enter to skip: ",
    )
  ).trim();

  const excludeSet = parseExcludeInput(excludeInput, recipients.length);
  return applyExclusions(recipients, excludeSet);
}

async function askForMessage() {
  const message = await ask("\nEnter the message to send: ");
  return message.trim();
}

async function askForMode() {
  const mode = (
    await ask('\nChoose mode: type "send" to send, or "preview" for dry run: ')
  )
    .trim()
    .toLowerCase();

  return mode;
}

async function sendMessages(recipients, message) {
  console.log(`\nSending to ${recipients.length} member(s)...`);

  let successCount = 0;
  let failureCount = 0;

  for (const recipient of recipients) {
    try {
      await client.sendMessage(recipient.serializedId, message);
      successCount++;
      console.log(`Sent to ${recipient.displayName} (${recipient.user})`);

      const delay = 1000 + Math.floor(Math.random() * 2000);
      await sleep(delay);
    } catch (err) {
      failureCount++;
      console.log(
        `Failed to send to ${recipient.displayName} (${recipient.user}): ${err.message}`,
      );
    }
  }

  console.log("\nDone.");
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
}

async function runApp() {
  console.log("WhatsApp client is ready.");

  const chats = await client.getChats();
  const groups = chats.filter((chat) => chat.isGroup);

  if (groups.length === 0) {
    console.log("No group chats found.");
    return;
  }

  const selectedGroup = await chooseGroup(groups);

  if (!selectedGroup) {
    console.log("Invalid group choice.");
    return;
  }

  const includeAdminsAnswer = await ask("Include admins? (yes/no): ");
  const includeAdmins = isYes(includeAdminsAnswer);

  const myId = client.info.wid._serialized;
  let recipients = await buildRecipientDetails(
    selectedGroup,
    includeAdmins,
    myId,
  );

  if (recipients.length === 0) {
    console.log("\nNo recipients matched your filter.");
    return;
  }

  previewRecipients(recipients);

  const { kept, excluded } = await askForExclusions(recipients);
  recipients = kept;

  if (excluded.length > 0) {
    previewRecipients(excluded, "Excluded recipients");
  }

  if (recipients.length === 0) {
    console.log("\nNo recipients left after exclusions.");
    return;
  }

  previewRecipients(recipients, "Final recipients");

  const message = await askForMessage();

  if (!message) {
    console.log("Message cannot be empty.");
    return;
  }

  const mode = await askForMode();

  if (mode === "preview") {
    console.log("\nDry run selected. No messages were sent.");
    return;
  }

  if (mode !== "send") {
    console.log("Invalid mode. Cancelled.");
    return;
  }

  const confirm = await ask(
    '\nType "SEND" to continue, or anything else to cancel: ',
  );

  if (!isSend(confirm)) {
    console.log("Cancelled.");
    return;
  }

  await sendMessages(recipients, message);
}

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan the QR code with WhatsApp.");
});

client.on("ready", async () => {
  try {
    await runApp();
  } catch (err) {
    console.log(`Unexpected error: ${err.message}`);
  } finally {
    rl.close();
  }
});

client.initialize();
