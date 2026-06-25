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
    const mapped = (data as any).map(mapExcursion);
    console.log("Mapped excursions:", JSON.stringify(mapped, null, 2));
    return mapped;
  }

  async getFilteredExcursions(params: {
    difficulty?: ExcursionDifficulty;
    type?: ExcursionType;
    offset?: number;
  }): Promise<{ excursions: ExcursionListItem[]; total: number; hasMore: boolean }> {
    const data = await getFunction('get-filtered-excursions', {
      difficulty: params.difficulty,
      type: params.type,
      offset: params.offset ?? 0,
    });
    return {
      excursions: (data.excursions ?? []).map(mapToListItem),
      total: data.total ?? 0,
      hasMore: data.hasMore ?? false,
    };
  }
}

export const excursionService = new ExcursionService();
