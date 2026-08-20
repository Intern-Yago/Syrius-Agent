import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function testEdgeTTS() {
  const tempOutput = path.resolve(process.cwd(), "voice-lab", `temp_test_${Date.now()}.mp3`);
  await fs.mkdir(path.dirname(tempOutput), { recursive: true });

  const scriptPath = path.resolve(process.cwd(), "scripts", "synthesize_tts.py");
  const text = "Fala devs! No vídeo de hoje vamos entender porque você deve parar de usar try/catch para tudo no JavaScript.";

  console.log("Calling python...", scriptPath);
  const { stdout, stderr } = await execFileAsync("python", [scriptPath, tempOutput, "pt-BR-AntonioNeural", text]);
  console.log("stdout:", stdout, "stderr:", stderr);

  const fileBuf = await fs.readFile(tempOutput);
  console.log("Generated MP3 bytes:", fileBuf.length);
  await fs.unlink(tempOutput);
  console.log("Success! Base64 sample:", fileBuf.toString("base64").slice(0, 50));
}

testEdgeTTS().catch(console.error);
