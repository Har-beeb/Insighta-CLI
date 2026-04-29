# Insighta CLI

A Command Line Interface for Insighta Labs to securely fetch, filter, and export user profiles from the terminal. 

## Setup & Installation

**1. Clone this repository.**

**2. Install dependencies:**
  ```npm install```

**3. Link the command globally to your machine:**
  ```npm link```

## Usage

**1. Authentication (GitHub OAuth)**
Opens the browser to securely log in and saves your token locally.
  ```insighta login```

**2. Fetch Profiles**
Displays a formatted table of all profiles in the database.
  ```insighta profiles```

**3. Natural Language Search**
Translates plain text into a database query and returns filtered results.
  ```insighta search "females over 25 from nigeria"```

**4. Export to CSV**
Downloads the profiles data as a profiles_export.csv file in your current directory.
  ```insighta export```

**5. Logout**
Removes your locally saved access token.
  ```insighta logout```

---
### 👤 Author
- **Name:** Har-beebullah I.O
- **HNG Slack ID:** H.A.X
- **Track:** Backend