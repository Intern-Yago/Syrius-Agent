import { ScheduleSlot } from "../types";

const DAYS_ORDER: Record<string, number> = {
  domingo: 0,
  dom: 0,
  "segunda-feira": 1,
  segunda: 1,
  seg: 1,
  "terça-feira": 2,
  terca: 2,
  terça: 2,
  ter: 2,
  "quarta-feira": 3,
  quarta: 3,
  qua: 3,
  "quinta-feira": 4,
  quinta: 4,
  qui: 4,
  "sexta-feira": 5,
  sexta: 5,
  sex: 5,
  sábado: 6,
  sabado: 6,
  sab: 6,
};

export interface SlotTimingInfo {
  isToday: boolean;
  isOverdue: boolean; // Já passou do horário e não foi postado
  isDueNow: boolean;  // É hoje e está dentro da janela de publicação
  isUpcoming: boolean;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  statusBorder: string;
  formattedTiming: string;
}

function parseDayIndex(dayStr: string): number {
  const clean = dayStr.trim().toLowerCase()
    .replace(/^pr[oó]xima\s+/i, "")
    .replace(/^proxima\s+/i, "")
    .trim();

  for (const [key, idx] of Object.entries(DAYS_ORDER)) {
    if (clean === key || clean.startsWith(key)) return idx;
  }
  return 1;
}

export function getSlotTimingInfo(slot?: ScheduleSlot | null, isPublished = false): SlotTimingInfo | null {
  if (!slot) return null;
  if (isPublished || slot.status === "PUBLISHED") {
    return {
      isToday: false,
      isOverdue: false,
      isDueNow: false,
      isUpcoming: false,
      statusLabel: "Publicado",
      statusColor: "#34d399",
      statusBg: "rgba(16, 185, 129, 0.15)",
      statusBorder: "rgba(16, 185, 129, 0.3)",
      formattedTiming: `${slot.dayOfWeek} às ${slot.timeSlot}`,
    };
  }

  const isNextWeek = (slot.weekOffset ?? 0) > 0 || /pr[oó]xima/i.test(slot.dayOfWeek);

  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const slotDayIndex = parseDayIndex(slot.dayOfWeek);

  const [slotH, slotM] = (slot.timeSlot || "18:00").split(":").map(Number);
  const slotTimeInMinutes = (isNaN(slotH) ? 18 : slotH) * 60 + (isNaN(slotM) ? 0 : slotM);

  // Se o slot é da PRÓXIMA SEMANA, ele está garantidamente no futuro!
  if (isNextWeek) {
    return {
      isToday: false,
      isOverdue: false,
      isDueNow: false,
      isUpcoming: true,
      statusLabel: "Agendado",
      statusColor: "#38bdf8",
      statusBg: "rgba(56, 189, 248, 0.12)",
      statusBorder: "rgba(56, 189, 248, 0.25)",
      formattedTiming: `${slot.dayOfWeek} às ${slot.timeSlot}`,
    };
  }

  const isToday = currentDayOfWeek === slotDayIndex;
  const isPastDay = currentDayOfWeek > slotDayIndex;
  const isPastTimeToday = isToday && currentTimeInMinutes > slotTimeInMinutes + 15;
  const isDueNow = isToday && Math.abs(currentTimeInMinutes - slotTimeInMinutes) <= 30;

  const isOverdue = isPastDay || isPastTimeToday;
  const isUpcoming = !isOverdue && !isDueNow;

  if (isOverdue) {
    return {
      isToday,
      isOverdue: true,
      isDueNow: false,
      isUpcoming: false,
      statusLabel: "Em Atraso",
      statusColor: "#f87171",
      statusBg: "rgba(239, 68, 68, 0.15)",
      statusBorder: "rgba(239, 68, 68, 0.35)",
      formattedTiming: `${slot.dayOfWeek} às ${slot.timeSlot} (Atrasado)`,
    };
  }

  if (isDueNow) {
    return {
      isToday: true,
      isOverdue: false,
      isDueNow: true,
      isUpcoming: false,
      statusLabel: "Horário de Publicar",
      statusColor: "#38bdf8",
      statusBg: "rgba(56, 189, 248, 0.18)",
      statusBorder: "rgba(56, 189, 248, 0.4)",
      formattedTiming: `Hoje às ${slot.timeSlot} (Agora)`,
    };
  }

  // Futuro / No prazo na semana atual
  const dayName = isToday
    ? "Hoje"
    : currentDayOfWeek + 1 === slotDayIndex
    ? "Amanhã"
    : slot.dayOfWeek;

  return {
    isToday,
    isOverdue: false,
    isDueNow: false,
    isUpcoming: true,
    statusLabel: "Agendado",
    statusColor: "#38bdf8",
    statusBg: "rgba(56, 189, 248, 0.12)",
    statusBorder: "rgba(56, 189, 248, 0.25)",
    formattedTiming: `${dayName} às ${slot.timeSlot}`,
  };
}

export function sortSlotsChronologically(slots: ScheduleSlot[]): ScheduleSlot[] {
  const DAY_ORDER: Record<string, number> = {
    "segunda-feira": 1,
    segunda: 1,
    seg: 1,
    "terça-feira": 2,
    "terca-feira": 2,
    terça: 2,
    terca: 2,
    ter: 2,
    "quarta-feira": 3,
    quarta: 3,
    qua: 3,
    "quinta-feira": 4,
    quinta: 4,
    qui: 4,
    "sexta-feira": 5,
    sexta: 5,
    sex: 5,
    "sábado": 6,
    sabado: 6,
    sab: 6,
    domingo: 7,
    dom: 7,
  };

  const getDayNum = (dayStr?: string): number => {
    if (!dayStr) return 99;
    const clean = dayStr
      .trim()
      .toLowerCase()
      .replace(/^pr[oó]xima\s+/i, "")
      .trim();
    for (const [key, num] of Object.entries(DAY_ORDER)) {
      if (clean === key || clean.startsWith(key)) return num;
    }
    return 99;
  };

  const getTimeNum = (timeStr?: string): number => {
    if (!timeStr) return 9999;
    const [h, m] = timeStr.split(":").map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  return [...slots].sort((a, b) => {
    const dayA = getDayNum(a.dayOfWeek);
    const dayB = getDayNum(b.dayOfWeek);
    if (dayA !== dayB) return dayA - dayB;

    const timeA = getTimeNum(a.timeSlot);
    const timeB = getTimeNum(b.timeSlot);
    return timeA - timeB;
  });
}
