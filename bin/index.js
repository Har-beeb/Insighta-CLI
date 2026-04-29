const axios = require("axios");

const { program } = require("commander");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const baseUrl = "https://hng-stage-0-api-eta.vercel.app";

// This creates a hidden file in the user's home directory to store the token
// Example: C:\Users\YourName\.insighta.json OR ~/.insighta.json
const CONFIG_FILE = path.join(os.homedir(), ".insighta.json");

program
  .version("1.0.0")
  .description("Insighta CLI - Remote control for the HNG Stage 3 API");

// The Ping Command
program
  .command("ping")
  .description("Check if the CLI is breathing")
  .action(() => {
    console.log(chalk.green("Pong! The Insighta CLI is alive and well! 🚀"));
  });

// The Login Command
program
  .command("login")
  .description("Login via GitHub to get your access token")
  .action(async () => {
    const open = (await import("open")).default;

    console.log(chalk.yellow("\nOpening your browser to GitHub..."));
    console.log(
      chalk.gray(
        `If it does not open automatically, click here: ${baseUrl}/auth/github\n`,
      ),
    );

    await open(`${baseUrl}/auth/github`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Make this callback async!
    rl.question(
      chalk.cyan("Paste your access_token from the browser here: "),
      async (token) => {
        const cleanToken = token.trim();

        if (!cleanToken) {
          console.log(chalk.red("❌ No token provided. Login cancelled."));
          rl.close();
          return;
        }

        console.log(chalk.yellow("\nVerifying token with the server..."));

        try {
          // Test the token against the backend before saving it
          await axios.get(`${baseUrl}/api/profiles`, {
            headers: {
              "X-API-Version": "1",
              Authorization: `Bearer ${cleanToken}`,
            },
            params: { limit: 1 }, // We only need 1 profile to prove it works
          });

          // If the server didn't throw an error, the token is perfectly valid!
          const configData = { access_token: cleanToken };
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));

          console.log(
            chalk.green(
              "\n✅ Login successful! Your token is verified and saved.",
            ),
          );
        } catch (error) {
          // If the backend throws a 401, it ends up here
          console.log(
            chalk.red(
              "\n❌ Invalid token! The server rejected it. Please try again.",
            ),
          );
        } finally {
          rl.close();
        }
      },
    );
  });

// The Profiles Command
program
  .command("profiles")
  .description("Fetch and display all profiles from the database")
  .action(async () => {
    // 1. Check if the config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log(
        chalk.red(
          '❌ You are not logged in. Please run "insighta login" first.',
        ),
      );
      return;
    }

    // 2. Read the token from the hidden file
    const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const token = configData.access_token;

    try {
      console.log(chalk.yellow("\nFetching profiles from the server..."));

      // 3. Make the authenticated request to your backend
      const response = await axios.get(`${baseUrl}/api/profiles`, {
        headers: {
          "X-API-Version": "1",
          Authorization: `Bearer ${token}`,
        },
      });

      // 4. Display the data beautifully
      // (Assuming your backend returns something like { status: "success", data: [ ...profiles ] })
      const profiles = response.data.data || response.data;

      console.log(
        chalk.green(`\n✅ Successfully retrieved ${profiles.length} profiles:`),
      );

      // console.table makes a beautiful grid in the terminal!
      // You can adjust the array to match the exact field names in your database
      console.table(profiles, ["_id", "name", "gender", "age", "country_id"]);
    } catch (error) {
      // 5. Handle expired tokens or server crashes gracefully
      if (error.response && error.response.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(
          chalk.red(`\n❌ Error fetching profiles: ${error.message}`),
        );
      }
    }
  });

// The Search Command
program
  .command("search <query>") // The <query> syntax tells commander to expect a string after the word 'search'
  .description(
    'Search for profiles using natural language (e.g., "males under 40")',
  )
  .action(async (query) => {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log(
        chalk.red(
          '❌ You are not logged in. Please run "insighta login" first.',
        ),
      );
      return;
    }

    const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const token = configData.access_token;

    try {
      console.log(
        chalk.yellow(`\nTranslating and searching for: "${query}"...`),
      );

      const response = await axios.get(`${baseUrl}/api/profiles/search`, {
        headers: {
          "X-API-Version": "1",
          Authorization: `Bearer ${token}`,
        },
        params: {
          q: query, // This attaches ?q="user input" to the URL
        },
      });

      const profiles = response.data.data || response.data;

      if (profiles.length === 0) {
        console.log(
          chalk.yellow(`\n⚠️ No profiles found matching that description.`),
        );
        return;
      }

      console.log(
        chalk.green(`\n✅ Found ${profiles.length} matching profiles:`),
      );
      console.table(profiles, ["_id", "name", "gender", "age", "country_id"]);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(
          chalk.red(`\n❌ Error searching profiles: ${error.message}`),
        );
      }
    }
  });

// The Export Command
program
  .command("export")
  .description("Download all profiles as a CSV file")
  .action(async () => {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log(
        chalk.red(
          '❌ You are not logged in. Please run "insighta login" first.',
        ),
      );
      return;
    }

    const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const token = configData.access_token;

    try {
      console.log(chalk.yellow("\nRequesting CSV export from the server..."));

      const response = await axios.get(`${baseUrl}/api/profiles/export`, {
        headers: {
          "X-API-Version": "1",
          Authorization: `Bearer ${token}`,
        },
        params: {
          format: "csv",
        },
      });

      // The backend returns the raw CSV text, so we just write it straight to a file
      const exportPath = path.join(process.cwd(), "profiles_export.csv");
      fs.writeFileSync(exportPath, response.data);

      console.log(
        chalk.green(`\n✅ Export successful! File saved to: ${exportPath}`),
      );
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(
          chalk.red(`\n❌ Error exporting profiles: ${error.message}`),
        );
      }
    }
  });

// The Logout Command
program
  .command("logout")
  .description("Log out and remove your saved token")
  .action(() => {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE); // This deletes the hidden file!
      console.log(chalk.green("\n✅ Successfully logged out. Token removed."));
    } else {
      console.log(chalk.yellow("\n⚠️ You are already logged out."));
    }
  });

program.parse(process.argv);
