import { sendTestEmail } from "../src/services/email-service.js";

async function main() {
  console.log("Enviando e-mail de teste para yago.commercial@gmail.com via Gmail SMTP...");
  const res = await sendTestEmail("yago.commercial@gmail.com");
  console.log("Resultado do envio:", res);
}

main().catch(console.error);
