import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { getSettings } from "../config/settings.js";
import { AnalyticsReport } from "./analytics-engine.js";

/**
 * Localiza o arquivo banner.png no projeto ou assets
 */
function getBannerPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "electron", "assets", "banner.png"),
    path.join(process.cwd(), "dist-electron", "assets", "banner.png"),
    path.join(process.cwd(), "electron", "renderer", "src", "assets", "banner.png"),
    path.join(process.cwd(), "banner.png"),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // Ignora erro de acesso
    }
  }
  return null;
}

/**
 * Cria o transporte SMTP com base nas configurações salvas pelo usuário
 */
async function createTransporter() {
  const settings = await getSettings();
  const smtp = settings.smtpConfig;

  if (smtp && smtp.host && smtp.user && smtp.pass) {
    const isGmail = smtp.host.toLowerCase().includes("gmail");
    if (isGmail) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtp.user.trim(),
          pass: smtp.pass.replace(/\s+/g, "").trim(),
        },
      });
    }

    const port = smtp.port || 587;
    const secure = smtp.secure ?? (port === 465);

    return nodemailer.createTransport({
      host: smtp.host,
      port,
      secure,
      auth: {
        user: smtp.user.trim(),
        pass: smtp.pass.replace(/\s+/g, "").trim(),
      },
    });
  }

  // Se não configurado, tenta variáveis de ambiente padrão
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
}

/**
 * 1. Envia E-mail de Teste para validar configuração
 */
export async function sendTestEmail(targetEmail?: string): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();
  const recipient = targetEmail || settings.notificationEmail;

  if (!recipient) {
    throw new Error("Nenhum e-mail de destino configurado. Preencha seu e-mail nas Configurações.");
  }

  const transporter = await createTransporter();
  if (!transporter) {
    throw new Error("Servidor SMTP não configurado. Preencha as credenciais SMTP (Host, Usuário e Senha) nas Configurações.");
  }

  const bannerPath = getBannerPath();
  const attachments = bannerPath
    ? [
        {
          filename: "banner.png",
          path: bannerPath,
          cid: "agent-banner@socialagent",
        },
      ]
    : [];

  const bannerHtml = bannerPath
    ? `
      <div style="margin-bottom: 24px; text-align: center; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);">
        <img src="cid:agent-banner@socialagent" alt="Social Media Agent" style="width: 100%; max-width: 600px; height: auto; display: block; border-radius: 12px;" />
      </div>
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #111114; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 32px; }
        .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 22px; color: #fafafa; margin: 0 0 12px; }
        p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 20px; }
        .footer { font-size: 11px; color: #71717a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        ${bannerHtml}
        <span class="badge">Autônomo & IA</span>
        <h1>Conexão com E-mail Estabelecida com Sucesso!</h1>
        <p>Olá! Este é um e-mail de teste disparado pelo seu <strong>Social Media Agent & Gestor de IA</strong>.</p>
        <p>A partir de agora, seus <strong>Briefings Executivos de Desempenho</strong> e <strong>Análises Post a Post</strong> serão enviados automaticamente para esta caixa de entrada conforme a frequência programada.</p>
        <div class="footer">
          Social Media Agent • Antigravity AI Engine
        </div>
      </div>
    </body>
    </html>
  `;

  const fromAddress = settings.smtpConfig?.from || settings.smtpConfig?.user || `"Social Media Agent" <noreply@socialagent.ai>`;

  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject: "Teste de Conexão - Social Media Agent & Gestor IA",
    html,
    attachments,
  });

  return {
    success: true,
    message: `E-mail de teste enviado com sucesso para ${recipient}!`,
  };
}

/**
 * 2. Envia o Briefing Executivo Completo por E-mail
 */
export async function sendExecutiveBriefingEmail(report: AnalyticsReport): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();

  if (!settings.emailNotificationsEnabled && !settings.notificationEmail) {
    return {
      success: false,
      message: "Envio de e-mail desativado nas configurações.",
    };
  }

  const recipient = settings.notificationEmail;
  if (!recipient) {
    return {
      success: false,
      message: "Nenhum e-mail de destino cadastrado.",
    };
  }

  const transporter = await createTransporter();
  if (!transporter) {
    console.warn("[email] Servidor SMTP não configurado. Pulando envio de e-mail.");
    return {
      success: false,
      message: "SMTP não configurado.",
    };
  }

  const bannerPath = getBannerPath();
  const attachments = bannerPath
    ? [
        {
          filename: "banner.png",
          path: bannerPath,
          cid: "agent-banner@socialagent",
        },
      ]
    : [];

  const bannerHtml = bannerPath
    ? `
      <div style="margin-bottom: 24px; text-align: center; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);">
        <img src="cid:agent-banner@socialagent" alt="Social Media Agent" style="width: 100%; max-width: 640px; height: auto; display: block; border-radius: 12px;" />
      </div>
    `
    : "";

  // Renderiza a lista de pautas recomendadas
  const topicsHtml = (report.recommendedTopicsForNextCycle || [])
    .map(
      (t) => `
      <div style="background: #09090b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 10px;">
        <div style="margin-bottom: 4px;">
          <span style="font-size: 10px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${t.suggestedFormat}</span>
          <span style="font-size: 11px; color: #a1a1aa; font-weight: 600; margin-left: 6px;">${t.suggestedDay}</span>
        </div>
        <strong style="font-size: 13px; color: #fafafa; display: block; margin-bottom: 4px;">${t.topic}</strong>
        <span style="font-size: 11px; color: #71717a;">${t.reason}</span>
      </div>
    `
    )
    .join("");

  // Renderiza as análises post a post (Camada Micro)
  const postsBreakdownHtml = (report.individualPostsBreakdown || [])
    .map(
      (p) => `
      <div style="background: #09090b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 10px; background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${p.postFormat}</span>
          <span style="font-size: 11px; font-weight: 700; color: #34d399;">Nota ${p.individualScore.toFixed(1)}/10</span>
        </div>
        <strong style="font-size: 14px; color: #fafafa; display: block; margin-bottom: 10px;">"${p.postTopic}"</strong>
        
        <div style="font-size: 12px; color: #e4e4e7; margin-bottom: 8px;">
          <strong style="color: #34d399;">Por que funcionou:</strong> ${p.whyItWorked}
        </div>
        <div style="font-size: 12px; color: #e4e4e7; margin-bottom: 8px;">
          <strong style="color: #fbbf24;">O que prejudicou:</strong> ${p.whatHurtIt}
        </div>
        <div style="font-size: 11px; color: #a1a1aa;">
          <strong>Gancho (1ª linha):</strong> ${p.hookAnalysis}
        </div>
      </div>
    `
    )
    .join("");

  // Renderiza auto-correções da memória RAG se houver
  const selfCorrectionsHtml = (report.selfCorrectionsApplied || [])
    .map(
      (c: any) => `
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
        <strong style="font-size: 12px; color: #fbbf24; display: block; margin-bottom: 4px;">Auto-Correção: ${c.oldPremise}</strong>
        <p style="font-size: 11px; color: #fde68a; margin: 0; line-height: 1.4;">${c.reasoning}</p>
      </div>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
        .card { max-width: 640px; margin: 0 auto; background-color: #111114; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; }
        .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
        h1 { font-size: 22px; color: #fafafa; margin: 0 0 6px; }
        .period { font-size: 12px; color: #71717a; margin-bottom: 20px; }
        .metric-grid { display: table; width: 100%; margin-bottom: 24px; }
        .metric-col { display: table-cell; width: 25%; background: #09090b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center; }
        .metric-val { font-size: 18px; font-weight: 700; color: #fafafa; display: block; }
        .metric-lbl { font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700; margin-top: 4px; display: block; }
        h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #a1a1aa; margin: 24px 0 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; }
        ul { margin: 0 0 20px; padding-left: 18px; font-size: 13px; color: #d4d4d8; line-height: 1.5; }
        li { margin-bottom: 6px; }
        .footer { font-size: 11px; color: #71717a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 32px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        ${bannerHtml}
        <span class="badge">Briefing Executivo • Gestor de Mídia IA</span>
        <h1>Relatório de Inteligência & Estratégia</h1>
        <div class="period">${report.periodLabel} • Score Geral: <strong>${report.score.toFixed(1)} / 10</strong></div>

        <!-- GRID DE MÉTRICAS -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 24px;">
          <tr>
            <td style="background: #09090b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center;">
              <span style="font-size: 18px; font-weight: 700; color: #fafafa; display: block;">${report.reachTotal.toLocaleString("pt-BR")}</span>
              <span style="font-size: 9px; color: #71717a; text-transform: uppercase; font-weight: 700; display: block; margin-top: 4px;">Alcance</span>
            </td>
            <td style="background: #09090b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center;">
              <span style="font-size: 18px; font-weight: 700; color: #38bdf8; display: block;">${report.interactionsTotal}</span>
              <span style="font-size: 9px; color: #71717a; text-transform: uppercase; font-weight: 700; display: block; margin-top: 4px;">Interações</span>
            </td>
            <td style="background: #09090b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center;">
              <span style="font-size: 18px; font-weight: 700; color: #34d399; display: block;">+${report.followersGained}</span>
              <span style="font-size: 9px; color: #71717a; text-transform: uppercase; font-weight: 700; display: block; margin-top: 4px;">Seguidores</span>
            </td>
            <td style="background: #09090b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center;">
              <span style="font-size: 18px; font-weight: 700; color: #c084fc; display: block;">${report.engagementRate}%</span>
              <span style="font-size: 9px; color: #71717a; text-transform: uppercase; font-weight: 700; display: block; margin-top: 4px;">Engajamento</span>
            </td>
          </tr>
        </table>

        <!-- RESUMO QUALITATIVO -->
        <h2>Diagnóstico Geral da Conta</h2>
        <p style="font-size: 13px; color: #e4e4e7; line-height: 1.5; margin: 0 0 16px;">
          ${report.quantitativeSummary}
        </p>

        <!-- AUTO-CORREÇÕES DO RAG -->
        ${selfCorrectionsHtml ? `<h2>Auto-Correções & Refinamento de Hipóteses</h2>${selfCorrectionsHtml}` : ""}

        <!-- ANÁLISE POST A POST (CAMADA MICRO) -->
        ${postsBreakdownHtml ? `<h2>Diagnóstico Individual Post a Post</h2>${postsBreakdownHtml}` : ""}

        <!-- DIRETRIZES ESTRATÉGICAS -->
        <h2>Diretrizes Estratégicas para o Próximo Ciclo</h2>
        <ul>
          ${(report.strategicDirectives || []).map((d) => `<li>${d}</li>`).join("")}
        </ul>

        <!-- PRÓXIMAS PAUTAS RECOMENDADAS -->
        ${topicsHtml ? `<h2>Grade Editorial Recomendada pelo Gestor</h2>${topicsHtml}` : ""}

        <div class="footer">
          Enviado automaticamente pelo Social Media Agent • Antigravity AI Engine
        </div>
      </div>
    </body>
    </html>
  `;

  const fromAddress = settings.smtpConfig?.from || settings.smtpConfig?.user || `"Social Media Agent" <noreply@socialagent.ai>`;

  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject: `Briefing Semanal Instagram (@${settings.instagramHandle.replace("@", "")}) - Score ${report.score.toFixed(1)}/10`,
    html,
    attachments,
  });

  console.log(`[email] Briefing Executivo enviado com sucesso para ${recipient}!`);
  return {
    success: true,
    message: `Briefing enviado com sucesso para ${recipient}!`,
  };
}

/**
 * 3. Envia Alerta de Post em Atraso por E-mail
 */
export async function sendOverduePostAlertEmail(slot: {
  topic: string;
  format: string;
  dayOfWeek: string;
  timeSlot: string;
  editorialPillar?: string;
  status: string;
}): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();

  if (!settings.emailNotificationsEnabled && !settings.notificationEmail) {
    return {
      success: false,
      message: "Envio de e-mail desativado nas configurações.",
    };
  }

  const recipient = settings.notificationEmail;
  if (!recipient) {
    return {
      success: false,
      message: "Nenhum e-mail de destino cadastrado.",
    };
  }

  const transporter = await createTransporter();
  if (!transporter) {
    console.warn("[email] Servidor SMTP não configurado. Pulando envio de alerta de atraso.");
    return {
      success: false,
      message: "SMTP não configurado.",
    };
  }

  const bannerPath = getBannerPath();
  const attachments = bannerPath
    ? [
        {
          filename: "banner.png",
          path: bannerPath,
          cid: "agent-banner@socialagent",
        },
      ]
    : [];

  const bannerHtml = bannerPath
    ? `
      <div style="margin-bottom: 24px; text-align: center; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);">
        <img src="cid:agent-banner@socialagent" alt="Social Media Agent" style="width: 100%; max-width: 600px; height: auto; display: block; border-radius: 12px;" />
      </div>
    `
    : "";

  const statusDescription =
    slot.status === "READY"
      ? "Pronto para Publicação (Aguardando Disparo)"
      : "Planejado na Grade (Pendente de Produção)";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background-color: #111114; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 20px; color: #fafafa; margin: 0 0 10px; }
        p { font-size: 13px; color: #d4d4d8; line-height: 1.6; margin: 0 0 16px; }
        .slot-box { background: #09090b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 18px; margin: 20px 0; }
        .meta-row { font-size: 12px; color: #a1a1aa; margin-bottom: 8px; }
        .meta-row strong { color: #f4f4f5; }
        .footer { font-size: 11px; color: #71717a; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        ${bannerHtml}
        <span class="badge">⚠️ Alerta de Cronograma • Publicação em Atraso</span>
        <h1>Post Não Publicado no Horário Programado</h1>
        <p>O horário programado para o post da grade editorial foi atingido ou ultrapassado, mas a publicação ainda não consta como realizada no perfil <strong>@${settings.instagramHandle.replace("@", "")}</strong>.</p>
        
        <div class="slot-box">
          <div class="meta-row">
            <span>📅 Horário Programado:</span> <strong>${slot.dayOfWeek} às ${slot.timeSlot}</strong>
          </div>
          ${
            slot.editorialPillar
              ? `<div class="meta-row"><span>🏷️ Pilar Editorial:</span> <strong>${slot.editorialPillar}</strong></div>`
              : ""
          }
          <div class="meta-row">
            <span>📐 Formato:</span> <strong>${slot.format}</strong>
          </div>
          <div class="meta-row">
            <span>📌 Status Atual:</span> <strong style="color: ${slot.status === "READY" ? "#38bdf8" : "#fbbf24"};">${statusDescription}</strong>
          </div>
          <div style="margin-top: 12px; font-size: 14px; font-weight: 700; color: #fafafa;">
            "${slot.topic}"
          </div>
        </div>

        <p style="font-size: 12px; color: #a1a1aa;">
          Para manter o algoritmo do Instagram aquecido e garantir a cadência da sua audiência, abra o <strong>Syrius Agent</strong> e realize a publicação ou aprove o conteúdo.
        </p>

        <div class="footer">
          Social Media Agent • Antigravity AI Engine
        </div>
      </div>
    </body>
    </html>
  `;

  const fromAddress = settings.smtpConfig?.from || settings.smtpConfig?.user || `"Social Media Agent" <noreply@socialagent.ai>`;

  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject: `⚠️ Alerta de Atraso: Post não publicado (${slot.dayOfWeek} às ${slot.timeSlot}) - ${slot.topic.slice(0, 50)}`,
    html,
    attachments,
  });

  console.log(`[email] Alerta de post em atraso enviado com sucesso para ${recipient}!`);
  return {
    success: true,
    message: `Alerta de atraso enviado para ${recipient}!`,
  };
}
