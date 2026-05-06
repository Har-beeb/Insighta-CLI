const fs = require("fs");

// We use a stream here so we don't blow up our own computer's RAM
// while trying to test the server's RAM!
const writeStream = fs.createWriteStream("massive_test1.csv");

writeStream.write("name,email,gender,age,country_id\n"); // CSV Headers

console.log("⏳ Generating 50,000 profiles... this will take a few seconds.");

const genders = ["male", "female"];
const countries = ["NG", "US", "UK", "CA", "GH"];

let i = 1;
const max = 50000;

function write() {
  let ok = true;
  do {
    const name = `VercelUser${i}`;
    const email = `user${i}_${Date.now()}@vercel.com`;
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const age = Math.floor(Math.random() * 50) + 18;
    const country = countries[Math.floor(Math.random() * countries.length)];

    const row = `${name},${email},${gender},${age},${country}\n`;

    if (i === max) {
      writeStream.write(row);
      console.log("✅ Done! Created massive_test1.csv (Check your folder size)");
    } else {
      ok = writeStream.write(row);
    }
    i++;
  } while (i <= max && ok);

  if (i <= max) {
    // Wait for the buffer to empty before writing more (prevents memory crash)
    writeStream.once("drain", write);
  }
}

write();
