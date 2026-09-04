/**
 * Print fresh invite codes to paste into data/attendees.ts.
 *   npm run codes -- 6
 */
import { randomInt } from "node:crypto";

// No 0/o/1/l/i — these get read aloud and typed by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const count = Number(process.argv[2]) || 5;

for (let i = 0; i < count; i++) {
  let code = "";
  for (let j = 0; j < 8; j++) code += ALPHABET[randomInt(ALPHABET.length)];
  console.log(code);
}
