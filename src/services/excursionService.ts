import { supabase } from "./supabaseClient";
import { Excursion } from "../models/Excursion";
import { mapExcursion } from "./mappers/excursionMapper";

class ExcursionService {
  async getAvailableExcursions(): Promise<Excursion[]> {
    const { data, error } = await supabase.rpc("get_all_excursions");
    console.log("Raw data from RPC:", JSON.stringify(data, null, 2));
    if (error) {
      console.error(error);
      return [];
    }

    if (!data) return [];

    const mapped = (data as any).map(mapExcursion);
    console.log("Mapped excursions:", JSON.stringify(mapped, null, 2));
    return mapped;
  }
}

export const excursionService = new ExcursionService();