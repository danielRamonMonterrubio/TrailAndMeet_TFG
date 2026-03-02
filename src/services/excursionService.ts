import { Excursion } from "../models/Excursion";

class ExcursionService {
  async getAvailableExcursions(): Promise<Excursion[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "1",
            title: "Hayedo de Montejo - Otono",
            difficulty: "Facil",
            date: "2026-02-26",
            time: "10:00",
            meetingPoint: "Centro de Visitantes Montejo",
            organizerName: "Isabel Fernandez",
            availableSpots: 8,
          },
          {
            id: "2",
            title: "Ruta del Cares - Picos de Europa",
            difficulty: "Medio",
            date: "2026-02-28",
            time: "08:00",
            meetingPoint: "Aparcamiento Puente Poncebos",
            organizerName: "Maria Gonzalez",
            availableSpots: 7,
          },
        ]);
      }, 300);
    });
  }
}

export const excursionService = new ExcursionService();