import { existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (!existsSync("client/dist")) {
  console.error("client/dist not found. Run: npm run build -w client");
  process.exit(1);
}
mkdirSync("dist", { recursive: true });
if (existsSync("dist/pessis-pens-itch.zip")) {
  rmSync("dist/pessis-pens-itch.zip");
}
execFileSync("zip", ["-r", "../../dist/pessis-pens-itch.zip", "."], { cwd: "client/dist", stdio: "inherit" });
console.log("Created dist/pessis-pens-itch.zip");
