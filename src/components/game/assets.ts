import { files } from "../../../assets/files";

export function raceImage(race?: string | null) {
  return (files.races as Record<string, string>)[race || "human"] || files.races.human;
}
