#!/usr/bin/env node

const axios = require("axios");
const { program } = require("commander");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const baseUrl = "https://hng-stage-0-api-eta.vercel.app";
// const baseUrl = "https://localhost:3000";
const CONFIG_FILE = path.join(os.homedir(), ".insighta.json");

program
  .version("1.0.0")
  .description("Insighta CLI - Remote control for the HNG Stage 3 API");

// 1. PING COMMAND
program
  .command("ping")
  .description("Check if the CLI is breathing")
  .action(() => {
    console.log(chalk.green("Pong! The Insighta CLI is alive and well! 🚀"));
  });

// 2. LOGIN COMMAND
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
          await axios.get(`${baseUrl}/api/profiles`, {
            headers: {
              "X-API-Version": "1",
              Authorization: `Bearer ${cleanToken}`,
            },
            params: { limit: 1 },
          });

          const configData = { access_token: cleanToken };
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));

          console.log(
            chalk.green(
              "\n✅ Login successful! Your token is verified and saved.",
            ),
          );
        } catch (error) {
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

// 3. LOGOUT COMMAND
program
  .command("logout")
  .description("Log out and remove your saved token")
  .action(() => {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log(chalk.green("\n✅ Successfully logged out. Token removed."));
    } else {
      console.log(chalk.yellow("\n⚠️ You are already logged out."));
    }
  });

// 4. WHOAMI COMMAND
program
  .command("whoami")
  .description(
    "See which GitHub user is currently logged in and check your role",
  )
  .action(async () => {
    if (!fs.existsSync(CONFIG_FILE)) {
      return console.log(
        chalk.red(
          '❌ You are not logged in. Please run "insighta login" first.',
        ),
      );
    }

    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(chalk.yellow("\nChecking current session..."));
      const response = await axios.get(`${baseUrl}/api/users/me`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
      });

      const user = response.data.data;

      console.log(chalk.green(`\n✅ You are securely logged in:`));
      console.log(chalk.cyan(`Username:`), `@${user.username}`);

      const displayRole =
        user.role === "admin" ? chalk.magenta(user.role) : user.role;
      console.log(chalk.cyan(`Role:    `), displayRole);
      console.log(chalk.cyan(`Email:   `), user.email || "Private");
      console.log(chalk.cyan(`User ID: `), user.id);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(
          chalk.red(`\n❌ Error fetching user data: ${error.message}`),
        );
      }
    }
  });

// 5. GET SINGLE PROFILE COMMAND
program
  .command("get <id>")
  .description("View the full details of a specific profile by its ID")
  .action(async (id) => {
    if (!fs.existsSync(CONFIG_FILE)) {
      return console.log(
        chalk.red(
          '❌ You are not logged in. Please run "insighta login" first.',
        ),
      );
    }

    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(chalk.yellow(`\nFetching profile details for ID: ${id}...`));
      const response = await axios.get(`${baseUrl}/api/profiles/${id}`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
      });

      const profile = response.data.data || response.data;

      console.log(chalk.green(`\n✅ Profile found:`));
      console.log(chalk.cyan(`ID:`), profile._id || profile.id);
      console.log(chalk.cyan(`Name:`), profile.name);
      console.log(
        chalk.cyan(`Gender:`),
        `${profile.gender} (Probability: ${profile.gender_probability})`,
      );
      console.log(chalk.cyan(`Age:`), `${profile.age} (${profile.age_group})`);
      console.log(
        chalk.cyan(`Country:`),
        `${profile.country_name} (${profile.country_id})`,
      );
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(
          chalk.yellow("\n⚠️ Profile not found. Check the ID and try again."),
        );
      } else if (error.response?.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(chalk.red(`\n❌ Error fetching profile: ${error.message}`));
      }
    }
  });

// 6. LIST PROFILES COMMAND (With Filters & Pagination)
program
  .command("profiles")
  .description(
    "Fetch and display profiles with optional filters and pagination",
  )
  .option("-g, --gender <gender>", "Filter by gender (male/female)")
  .option("-c, --country <country>", "Filter by country code (e.g., NG)")
  .option("-p, --page <page>", "Page number for pagination", "1")
  .option("-l, --limit <limit>", "Number of items per page", "10")
  .action(async (options) => {
    if (!fs.existsSync(CONFIG_FILE))
      return console.log(chalk.red("❌ Not logged in."));
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(chalk.yellow("\nFetching profiles..."));

      const queryParams = {
        gender: options.gender,
        country: options.country,
        page: options.page,
        limit: options.limit,
      };

      const response = await axios.get(`${baseUrl}/api/profiles`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
        params: queryParams,
      });

      const profiles = response.data.data || response.data;
      console.log(
        chalk.green(
          `\n✅ Retrieved ${profiles.length} profiles (Page ${options.page}):`,
        ),
      );
      console.table(profiles, ["_id", "name", "gender", "age", "country_id"]);
    } catch (error) {
      if (error.response?.status === 401) {
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

// 7. SEARCH COMMAND
program
  .command("search <query>")
  .description(
    'Search for profiles using natural language (e.g., "males under 40")',
  )
  .action(async (query) => {
    if (!fs.existsSync(CONFIG_FILE))
      return console.log(chalk.red("❌ Not logged in."));
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(
        chalk.yellow(`\nTranslating and searching for: "${query}"...`),
      );

      const response = await axios.get(`${baseUrl}/api/profiles/search`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
        params: { q: query },
      });

      const profiles = response.data.data || response.data;

      if (profiles.length === 0) {
        return console.log(
          chalk.yellow(`\n⚠️ No profiles found matching that description.`),
        );
      }

      console.log(
        chalk.green(`\n✅ Found ${profiles.length} matching profiles:`),
      );
      console.table(profiles, ["_id", "name", "gender", "age", "country_id"]);
    } catch (error) {
      if (error.response?.status === 401) {
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

// 8. CREATE COMMAND (Admin Only)
program
  .command("create")
  .description("Create a new profile (Admin only)")
  .requiredOption("-n, --name <name>", "The name of the profile to create")
  .action(async (options) => {
    if (!fs.existsSync(CONFIG_FILE))
      return console.log(chalk.red("❌ Not logged in."));
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(chalk.yellow(`\nCreating profile for: "${options.name}"...`));
      const response = await axios.post(
        `${baseUrl}/api/profiles`,
        { name: options.name },
        { headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` } },
      );

      console.log(chalk.green(`\n✅ Profile created successfully!`));
      console.table(
        [response.data.data || response.data],
        ["_id", "name", "gender", "age", "country_id"],
      );
    } catch (error) {
      const status = error.response?.status;
      if (status === 403)
        console.log(chalk.red("\n⛔ Access Denied: Admin only."));
      else if (status === 401)
        console.log(chalk.red("\n❌ Your session is invalid."));
      else console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

// 9. DELETE COMMAND (Admin Only)
program
  .command("delete <id>")
  .description("Delete a profile by ID (Admin only)")
  .action(async (id) => {
    if (!fs.existsSync(CONFIG_FILE))
      return console.log(chalk.red("❌ Not logged in."));
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      await axios.delete(`${baseUrl}/api/profiles/${id}`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
      });
      console.log(chalk.green(`\n✅ Profile ${id} successfully deleted.`));
    } catch (error) {
      const status = error.response?.status;
      if (status === 403)
        console.log(chalk.red("\n⛔ Access Denied: Admin only."));
      else if (status === 404)
        console.log(chalk.yellow("\n⚠️ Profile not found."));
      else if (status === 401)
        console.log(chalk.red("\n❌ Your session is invalid."));
      else console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

// 10. EXPORT COMMAND
program
  .command("export")
  .description("Download profiles as a CSV file with optional filters")
  .option("-g, --gender <gender>", "Filter by gender (male/female)")
  .option("-c, --country <country>", "Filter by country code (e.g., NG)")
  .action(async (options) => {
    if (!fs.existsSync(CONFIG_FILE))
      return console.log(chalk.red("❌ Not logged in."));
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8"),
    ).access_token;

    try {
      console.log(chalk.yellow("\nRequesting CSV export from the server..."));

      const queryParams = {
        format: "csv",
        gender: options.gender,
        country: options.country,
      };

      const response = await axios.get(`${baseUrl}/api/profiles/export`, {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
        params: queryParams,
      });

      const exportPath = path.join(process.cwd(), "profiles_export.csv");
      fs.writeFileSync(exportPath, response.data);

      console.log(
        chalk.green(`\n✅ Export successful! Saved to: ${exportPath}`),
      );
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(
          chalk.red(
            '\n❌ Your session is invalid or expired. Please run "insighta login" again.',
          ),
        );
      } else {
        console.log(chalk.red(`\n❌ Error exporting: ${error.message}`));
      }
    }
  });

  // 11. TEST CACHE COMMAND
program
  .command("test-cache")
  .description("Test the Stage 4B Redis caching performance")
  .option("-g, --gender <gender>", "Filter profiles by gender", "male")
  .action(async (options) => {
    // 1. Check if logged in (just like your other commands)
    if (!fs.existsSync(CONFIG_FILE)) {
      return console.log(
        chalk.red('❌ You are not logged in. Please run "insighta login" first.')
      );
    }

    // 2. Read the token from the local config
    const token = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf-8")
    ).access_token;

    try {
      console.log(chalk.blue(`\n🚀 Firing requests to test Redis cache (Filter: ${options.gender})...`));

      // Setup the auth headers using your existing format
      const requestConfig = {
        headers: { "X-API-Version": "1", Authorization: `Bearer ${token}` },
        params: { gender: options.gender }
      };

      // --- ROUND 1: Cold Request (Hits MongoDB) ---
      const start1 = Date.now();
      const res1 = await axios.get(`${baseUrl}/api/profiles`, requestConfig);
      const time1 = Date.now() - start1;
      
      console.log(chalk.yellow(`\n[Round 1 - DB]`));
      console.log(`Time:   ${time1}ms`);
      console.log(`Source: ${res1.data.source || 'Database'}`);

      // --- ROUND 2: Warm Request (Hits Redis Cache) ---
      const start2 = Date.now();
      const res2 = await axios.get(`${baseUrl}/api/profiles`, requestConfig);
      const time2 = Date.now() - start2;

      console.log(chalk.green(`\n[Round 2 - Cache]`));
      console.log(`Time:   ${time2}ms`);
      console.log(`Source: ${res2.data.source || 'Cache'}`);

      // --- SUMMARY ---
      if (time2 < time1) {
        console.log(chalk.cyan(`\n✅ Cache is active! Request was ${time1 - time2}ms faster.`));
      } else {
        console.log(chalk.yellow(`\n⚠️ Cache didn't seem faster. Check if Redis is connected.`));
      }

    } catch (error) {
      if (error.response?.status === 401) {
        console.log(
          chalk.red('\n❌ Your session is invalid or expired. Please run "insighta login" again.')
        );
      } else {
        console.log(chalk.red(`\n❌ Error hitting the API: ${error.message}`));
      }
    }
  });

  // 12. UPLOAD COMMAND
program
  .command("upload <filepath>")
  .description("Upload a CSV file to test ingestion streams")
  .action(async (filepath) => {
    const fs = require('fs');
    const path = require('path');
    const FormData = require('form-data');

    if (!fs.existsSync(CONFIG_FILE)) {
      return console.log(chalk.red('❌ You are not logged in. Please run "insighta login" first.'));
    }

    const token = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")).access_token;
    const fullPath = path.resolve(filepath);

    if (!fs.existsSync(fullPath)) {
      return console.log(chalk.red(`❌ File not found: ${fullPath}`));
    }

    try {
      console.log(chalk.yellow(`\n📤 Streaming ${filepath} to the server...`));
      console.log(chalk.gray(`(If this is the 500k row file, this might take a minute!)`));

      const form = new FormData();
      form.append('file', fs.createReadStream(fullPath));

      const response = await axios.post(`${baseUrl}/api/profiles/upload`, form, {
        headers: { 
          "X-API-Version": "1", 
          Authorization: `Bearer ${token}`,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log(chalk.green(`\n✅ Upload Complete!`));
      console.log(chalk.cyan(JSON.stringify(response.data, null, 2)));

    } catch (error) {
      if (error.response?.status === 401) {
        console.log(chalk.red('\n❌ Your session is invalid.'));
      } else {
        console.log(chalk.red(`\n❌ Upload failed: ${error.message}`));
        if (error.response) console.log(error.response.data);
      }
    }
  });

program.parse(process.argv);
