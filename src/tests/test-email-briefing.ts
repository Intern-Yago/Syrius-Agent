/**
 * @title Teste de Envio de Briefing por E-mail
 * @description Valida a conexão SMTP com Gmail e o disparo do template HTML executivo de briefing.
 * @category Notificações & E-mail
 */

export const testInfo = {
  title: "Notificações & Briefing Executivo por E-mail",
  description: "Testa o transporte SMTP configurado nas opções e o envio do template executivo dark-theme para a caixa de entrada.",
  category: "Notificações & E-mail",
};

import { sendTestEmail } from "../services/email-service.js";
import { getSettings } from "../config/settings.js";

async function run() {
  console.log("1. Carregando configurações de e-mail e SMTP...");
  const settings = await getSettings();
  const targetEmail = settings.notificationEmail || "yago.commercial@gmail.com";
  console.log(`- Destino: ${targetEmail}`);
  console.log(`- Host SMTP: ${settings.smtpConfig?.host || "smtp.gmail.com"}`);

  console.log("\n2. Disparando e-mail de teste executivo...");
  const res = await sendTestEmail(targetEmail);

  if (!res.success) {
    throw new Error(res.message || "Falha ao enviar e-mail de teste");
  }

  console.log(`\n✅ ${res.message}`);
}

run().catch((err) => {
  console.error("❌ Falha no teste de e-mail:", err);
  process.exit(1);
});
