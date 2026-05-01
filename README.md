# Insighta CLI

A Command Line Interface for Insighta Labs to securely fetch, filter, and export user profiles from the terminal. 


## Setup & Installation

**1. Clone this repository.**

**2. Install dependencies:**
  ```npm install```

**3. Link the command globally to your machine:**
  ```npm link```


## Usage

**1. The Basics & Auth**

Check CLI status:
  ```insighta ping```

Log in to the system:
```insighta login````

Verify your current session and role:
```insighta whoami```

Log out and destroy the token:
```insighta logout```

---

**2. Reading Data (Analysts & Admins)**

Get a single profile by ID:
```insighta get <paste_an_id_here>```

Get a basic list of profiles:
```insighta profiles```

Get a paginated list:
```insighta profiles --page 2 --limit 20```

Get a filtered list:
```insighta profiles --gender male --country NG```

Search using natural language:
```insighta search "young females from nigeria"```

---

**3. Writing Data (Admin Only)**

Create a new profile:
```insighta create --name "John Doe"```

Delete a profile:
```insighta delete <paste_an_id_here>```

---

**4. Exporting Data**

Export all profiles to CSV:
```insighta export```

Export a filtered list to CSV:
```insighta export --gender female --country NG```

---

### 👤 Author
- **Name:** Har-beebullah I.O
- **HNG Slack ID:** H.A.X
- **Track:** Backend