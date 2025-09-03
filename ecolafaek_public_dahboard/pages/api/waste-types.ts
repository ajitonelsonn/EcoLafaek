// pages/api/waste-types.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { WasteType } from "@/types";
import executeQuery from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WasteType[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = `
      SELECT waste_type_id, name, description, hazard_level, recyclable, icon_url
      FROM waste_types
      ORDER BY name
    `;

    const wasteTypes = await executeQuery<WasteType[]>({ query });

    res.status(200).json(wasteTypes);
  } catch (error) {
    console.error("Error getting waste types:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
