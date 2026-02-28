const { execSync } = require('child_process');
const fs = require('fs');

try {
  let out = "";
  console.log("Adding...");
  out += execSync('git add .').toString() + "\\n";
  console.log("Committing...");
  try {
    out += execSync('git commit -m "Refactor: Finalized Hackathon Release (TalentScout AI)"').toString() + "\\n";
  } catch (e) {
    out += "Commit output (might be empty): " + e.stdout + "\\n";
  }
  console.log("Pushing...");
  out += execSync('git push origin HEAD --force').toString();
  fs.writeFileSync('git_output.txt', out);
  console.log("Done.");
} catch (error) {
  fs.writeFileSync('git_output.txt', "ERROR: " + error.message + "\\n" + (error.stdout ? error.stdout.toString() : ""));
}
