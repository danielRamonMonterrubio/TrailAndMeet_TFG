import { Database } from "../../types/database.types";
import { Excursion } from "../../models/Excursion";
//Transformacion de datos de bd a modelo de ui automatico
type ExcursionRow =
  Database["public"]["Tables"]["excursion"]["Row"];
type ExcursionRowWithUser =
  Database["public"]["Tables"]["excursion"]["Row"] & {
    organizerName: string
  }

export const mapExcursion = (row: ExcursionRowWithUser): Excursion => {

  const dt = new Date(row.fechaInicio);

  const date = dt.toISOString().split("T")[0];
  const time = dt.toTimeString().slice(0,5);

  const acceptedCount = 2;
  const availableSpots = Math.max(0, row.capacidad - acceptedCount);

  return {
    id: row.id.toString(),
    title: row.titulo,
    difficulty: row.dificultad as "Facil" | "Medio" | "Dificil",
    date,
    time,
    meetingPoint: row.puntoEncuentro,
    organizerName: row.organizerName,
    availableSpots,
    imageUrl: row.imagenURL ?? undefined
  };
};