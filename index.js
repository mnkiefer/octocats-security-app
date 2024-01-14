import fs from "fs";
import http from "http";
import dotenv from "dotenv";

import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import { protectDefaultBranch, createIssue } from "./requests.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === "production" ? "https://0.0.0.0" : 'http://localhost';
const PATH = "/api/webhook";

// Get environment variables (from .env file locally)
(dotenv.config({ silent: process.env.NODE_ENV === "production" }));
const APP_ID = process.env.APP_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PRIVATE_KEY = process.env.PRIVATE_KEY || fs.readFileSync(process.env.PRIVATE_KEY_PATH, "utf8");

// Create new App instance
const app = new App({
  appId: APP_ID,
  privateKey: PRIVATE_KEY,
  webhooks: { secret: WEBHOOK_SECRET }
});

// Set up webhook event listener
app.webhooks.on("repository.created", async ({ octokit, payload }) => {
  const repoName = payload.repository.name;
  console.log(`[${repoName}] - Received *repository.create* event`);

  const branchProtectionRule = await protectDefaultBranch(octokit, payload);
  console.log(`[${repoName}] - Added *${branchProtectionRule.pattern}* branch protection rule`);

  const issueNumber = await createIssue(octokit, payload);
  console.log(`[${repoName}] - Opened issue #${issueNumber}`);
});

// Log errors
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error('Error processing request:',  error.event);
  } else {
    console.error(error);
  }
});

// Set up middleware
const middleware = createNodeMiddleware(app.webhooks, { path: PATH });

// Set up Node.js server
http.createServer(middleware).listen(PORT, () => {
  console.log(`Server is listening for events at: ${HOST}:${PORT}${PATH}`);
  console.log('Press Ctrl + C to quit.')
});
