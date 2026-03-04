import { supabase } from "./supabaseClient";
import { Excursion } from "../models/Excursion";
import { mapExcursion } from "./mappers/excursionMapper";

class ExcursionService {
  async getAvailableExcursions(): Promise<Excursion[]> {
    const { data, error } = await supabase.rpc("get_all_excursions");
    console.log(data)
    if (error) {
      console.error(error);
      return [];
    }

    if (!data) return [];

    return (data as any).map(mapExcursion)
  }
}

export const excursionService = new ExcursionService();