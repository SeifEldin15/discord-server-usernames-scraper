# Discord bot Bot

## Overview
This bot uses Puppeteer to scrape aria labels from a Discord server. It navigates to a specified server and extracts the aria labels of certain elements.

## Disclaimer
**Warning:** Using your real Discord account with this bot may lead to a ban. It is recommended to use a test account to avoid any potential issues with Discord's terms of service.

## Prerequisites
- Node.js installed on your machine.
- Puppeteer library installed. You can install it using npm:
  ```bash
  npm install puppeteer
  ```

## Configuration
Before running the bot, make sure to update the following parameters in `bot.js`:
- `executablePath`: Path to your Chrome executable.
- `userDataDir`: Path to your Chrome user data directory.
- Update the URL in the `page.goto` method to point to the Discord server you want to scrape after login to the discord website, make sure the right tab of usernames is open.
 

## Usage
Run the bot using Node.js: