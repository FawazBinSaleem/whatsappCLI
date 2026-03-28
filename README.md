# WhatsApp Group Messaging Tool

A Node.js CLI tool for sending messages to selected members of a WhatsApp group.

---

## Features

- Select a WhatsApp group from your chats  
- Display all group members  
- Show participant names (with fallback to number if unavailable)  
- Option to include or exclude admins  
- Automatically exclude yourself  
- Exclude specific participants by index (e.g. `2,5,8`)  
- Preview:
  - initial recipients  
  - excluded recipients  
  - final recipient list  
- Confirm before sending  
- Random delay between messages  
- Success and failure summary after sending  

---

## How It Works

1. Connects to WhatsApp Web using QR login  
2. Retrieves all chats and filters group chats  
3. Prompts the user to select a group  
4. Builds a list of participants:
   - optionally excludes admins  
   - excludes the current user  
5. Fetches and caches display names  
6. Displays the initial recipient list  
7. Allows manual exclusion by index  
8. Displays:
   - excluded participants  
   - final recipients  
9. Prompts for message input  
10. Prompts for mode:
    - `send` → proceeds  
    - `preview` → stops without sending  
11. Requires confirmation (`SEND`)  
12. Sends messages individually with delays  
13. Outputs success/failure results  

---

## Installation

Clone the repository.

Install dependencies:

```
npm install
npm install whatsapp-web.js qrcode-terminal
```

---

## Usage

Run the script:

```
node app.js
```

### First Run
- Scan the QR code with WhatsApp  
- Session is saved locally  

---

## Example Flow

```
Groups:

1. Work group
2. Friends

Choose a group number: 1
Include admins? (yes/no): no

Recipients:

1. Alice (1234567890)
2. Unknown (9876543210)

Enter indices to exclude: 2

Excluded recipients:

1. Unknown (9876543210)

Final recipients:

1. Alice (1234567890)

Enter the message: Hello!

Choose mode: send / preview: send
Type "SEND" to continue

Sending to 1 member(s)...
Sent to Alice (1234567890)

Done.
Successful: 1
Failed: 0
```


---

## Notes

- Some users may not have names available:
  - falls back to phone number or ID  
- Uses unofficial WhatsApp Web automation  
- Messages are sent individually, not as a broadcast  

---

## Tech Stack

- Node.js  
- whatsapp-web.js  
- qrcode-terminal  

---

## Disclaimer

This project uses an unofficial WhatsApp Web API.  
Use responsibly. Excessive automation may lead to account restrictions.
