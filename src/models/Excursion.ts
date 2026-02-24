export type ExcursionDifficulty = "Facil" | "Medio" | "Dificil";

export interface Excursion {
  id: string;
  title: string;

  difficulty: ExcursionDifficulty;
  date: string; 
  time: string; 
  meetingPoint: string; 
  organizerName: string; 

  availableSpots: number;

  imageUrl?: string;
}