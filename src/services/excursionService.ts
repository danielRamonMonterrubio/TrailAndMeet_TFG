import { supabase } from "./supabaseClient";
import { Excursion } from "../models/Excursion";

class ExcursionService {
  async getAvailableExcursions(): Promise<Excursion[]> {
    const { data, error } = await supabase.rpc("get_all_excursions");

    if (error) {
      console.error(error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => {

      const date = new Date(row.fechaInicio);

      return {
        id: row.id.toString(),
        title: row.titulo,
        type: row.tipoExcursion,
        difficulty: row.dificultad,
        date: date.toISOString().split("T")[0],
        time: date.toTimeString().slice(0,5),
        meetingPoint: row.puntoEncuentro,
        meetingLat: Number(row.meetingLat),
        meetingLng: Number(row.meetingLng),
        organizerId: row.creadoPor,
        organizerName: row.creadoPor,
        capacity: row.capacidad,
        acceptedCount: 2,
        status: row.status,
        imageUrl: row.imagenURL,
        gpxPath: row.GPXPath,
      };

    });
  }
}

export const excursionService = new ExcursionService();