export type ExcursionDifficulty = "Facil" | "Medio" | "Dificil";
export type ExcursionType = "Senderismo" | "Alta montana" | "Ski de travesia" | "Via ferrata" | "Escalada" | "Trail running" | "Bicicleta";

export const EXCURSION_DIFFICULTIES: ExcursionDifficulty[] = ["Facil", "Medio", "Dificil"];
export const EXCURSION_TYPES: ExcursionType[] = ["Senderismo", "Alta montana", "Ski de travesia", "Via ferrata", "Escalada", "Trail running", "Bicicleta"];

export interface Excursion {
  id: string;
  title: string;

  difficulty: ExcursionDifficulty;
  type: ExcursionType;
  date: string;
  time: string;
  meetingPoint: string;
  organizerName: string;

  availableSpots: number;

  imageUrl?: string;
  status?: string;
}