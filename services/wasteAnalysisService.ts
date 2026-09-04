import { WasteActionDecision, RecyclerOption } from "@/types/pickup";

export interface WasteAnalysisResult {
  itemName: string;
  category: string;
  material: string;
  confidence: number;
  recommendedAction: WasteActionDecision;
  aiReasoning: string;
  imageSrc: string;
  reuseDetails?: {
    title: string;
    steps: string[];
    difficulty: "Easy" | "Medium" | "Advanced";
    impact: string;
  };
  recycleDetails?: {
    binColor: string;
    binName: string;
    instructions: string[];
    assignedRecycler: RecyclerOption;
  };
  safeDisposalDetails?: {
    isHazardous: boolean;
    instructions: string[];
    warning: string;
    authorizedTeam: string;
  };
}

export const RECYCLER_DIRECTORY: Record<string, RecyclerOption> = {
  plastics: {
    id: "rec-plastics",
    name: "EcoRecycle Plastics & Packaging Ltd",
    acceptedMaterials: ["PET Plastics", "Rigid Containers", "Packaging"],
    contact: "+1 (800) 555-PLASTICS",
    rating: 4.9,
  },
  metals: {
    id: "rec-metals",
    name: "Metro Metal & Can Reclaimers",
    acceptedMaterials: ["Aluminium Cans", "Steel", "Scrap Metals"],
    contact: "+1 (800) 555-METALS",
    rating: 4.8,
  },
  paper: {
    id: "rec-paper",
    name: "City Fiber & Paper Recovery Depot",
    acceptedMaterials: ["Cardboard", "Paper", "Newspaper"],
    contact: "+1 (800) 555-PAPER",
    rating: 4.7,
  },
  electronics: {
    id: "rec-ewaste",
    name: "ElectroRecycle Certified E-Waste Partners",
    acceptedMaterials: ["E-Waste", "Circuit Boards", "Batteries"],
    contact: "+1 (800) 555-EWASTE",
    rating: 4.9,
  },
};

export interface NormalizedWasteInfo {
  item: string;
  category: string;
  material: string;
  recommendedAction: WasteActionDecision;
  aiReasoning: string;
}

export function normalizeWasteClassification(
  rawItem: string,
  rawMaterial: string,
  rawCategory?: string
): NormalizedWasteInfo {
  const itemLower = rawItem.toLowerCase().trim();
  const matLower = rawMaterial.toLowerCase().trim();
  const catLower = (rawCategory || "").toLowerCase().trim();
  const combined = `${itemLower} ${matLower} ${catLower}`;

  // 1. Hazardous Waste (Batteries, Chemicals, Biohazard, Medical, Toxic, Paints, Fluorescent Bulbs)
  if (
    combined.includes("battery") ||
    combined.includes("lithium") ||
    combined.includes("chemical") ||
    combined.includes("solvent") ||
    combined.includes("paint") ||
    combined.includes("hazard") ||
    combined.includes("pesticide") ||
    combined.includes("acid") ||
    combined.includes("fluorescent") ||
    combined.includes("mercury") ||
    combined.includes("toxic") ||
    combined.includes("biohazard") ||
    combined.includes("medical")
  ) {
    return {
      item: rawItem,
      category: "Household Hazardous Waste (HHW)",
      material: rawMaterial || "Hazardous Material",
      recommendedAction: "SAFE_DISPOSAL",
      aiReasoning: `Item identified as ${rawItem}. Requires specialized municipal HHW containment due to chemical or battery hazards.`,
    };
  }

  // 2. Electronics / E-Waste (Smartphone, Phone, Laptop, Tablet, Computer, Charger, Circuit Board, Gadget)
  // Overrides conflicting material classifications like "glass" or "plastic" when object is an electronic device!
  if (
    itemLower.includes("phone") ||
    itemLower.includes("smartphone") ||
    itemLower.includes("mobile") ||
    itemLower.includes("laptop") ||
    itemLower.includes("computer") ||
    itemLower.includes("tablet") ||
    itemLower.includes("circuit") ||
    itemLower.includes("monitor") ||
    itemLower.includes("charger") ||
    itemLower.includes("keyboard") ||
    itemLower.includes("mouse") ||
    itemLower.includes("screen") ||
    itemLower.includes("gadget") ||
    combined.includes("e-waste") ||
    combined.includes("electronic")
  ) {
    return {
      item: rawItem,
      category: "Electronics & E-Waste",
      material: "Electronic Components & Metals",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Electronic devices contain recoverable circuit components and precious metals requiring certified e-waste recycling.`,
    };
  }

  // 3. Plastics & Packaging
  if (
    combined.includes("plastic") ||
    combined.includes("pet") ||
    combined.includes("pvc") ||
    combined.includes("polystyrene") ||
    combined.includes("styrofoam") ||
    combined.includes("bottle") && !combined.includes("glass")
  ) {
    return {
      item: rawItem,
      category: "Plastics & Packaging",
      material: rawMaterial || "PET / Rigid Plastic",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Clean recyclable plastic suitable for municipal reprocessing.`,
    };
  }

  // 4. Metals & Cans
  if (
    combined.includes("metal") ||
    combined.includes("can") ||
    combined.includes("aluminum") ||
    combined.includes("steel") ||
    combined.includes("tin") ||
    combined.includes("foil") ||
    combined.includes("iron") ||
    combined.includes("brass") ||
    combined.includes("copper")
  ) {
    return {
      item: rawItem,
      category: "Metals & Cans",
      material: rawMaterial || "Aluminium / Scrap Metal",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). High purity recyclable metal suitable for certified eco processing.`,
    };
  }

  // 5. Paper & Cardboard Packaging
  if (
    combined.includes("paper") ||
    combined.includes("cardboard") ||
    combined.includes("carton") ||
    combined.includes("box") ||
    combined.includes("newspaper") ||
    combined.includes("fiber") ||
    combined.includes("magazine")
  ) {
    return {
      item: rawItem,
      category: "Paper & Cardboard Packaging",
      material: rawMaterial || "Cardboard / Paper Fiber",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Clean dry paper fiber suitable for repulping and recycling.`,
    };
  }

  // 6. Organic Waste
  if (
    combined.includes("organic") ||
    combined.includes("food") ||
    combined.includes("peel") ||
    combined.includes("fruit") ||
    combined.includes("vegetable") ||
    combined.includes("compost") ||
    combined.includes("coffee") ||
    combined.includes("scrap")
  ) {
    return {
      item: rawItem,
      category: "Organic Waste",
      material: rawMaterial || "Compostable Organic Matter",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Biodegradable organic matter suitable for municipal composting.`,
    };
  }

  // 7. Clean Glass Containers & Upcycling
  if (combined.includes("glass") || combined.includes("jar") || combined.includes("mason")) {
    if (combined.includes("jar") || combined.includes("container") || combined.includes("mason")) {
      return {
        item: rawItem,
        category: "Glass & Home Containers",
        material: "Glass",
        recommendedAction: "REUSE",
        aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Durable glass container suitable for home dry food storage or DIY upcycling.`,
      };
    }
    return {
      item: rawItem,
      category: "Glass Containers",
      material: "Glass",
      recommendedAction: "RECYCLE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Recyclable glass container suitable for cullet reprocessing.`,
    };
  }

  // 8. Textiles & Fabrics (DIY upcycling)
  if (
    combined.includes("textile") ||
    combined.includes("cloth") ||
    combined.includes("clothes") ||
    combined.includes("fabric") ||
    combined.includes("jeans") ||
    combined.includes("denim") ||
    combined.includes("garment") ||
    combined.includes("shirt")
  ) {
    return {
      item: rawItem,
      category: "Textiles & Fabrics",
      material: rawMaterial || "Fabric / Cotton / Denim",
      recommendedAction: "REUSE",
      aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Structural fabric suitable for home upcycling into tote bags or cloths.`,
    };
  }

  // Default fallback -> RECYCLE
  return {
    item: rawItem,
    category: rawCategory || "General Recyclables",
    material: rawMaterial || "Mixed Materials",
    recommendedAction: "RECYCLE",
    aiReasoning: `Item identified as ${rawItem} (${rawMaterial}). Material assessed for general municipal waste recovery.`,
  };
}

/**
 * Waste Image Analysis Engine
 * Connects to server-side Featherless AI endpoint (POST /api/ai/analyze-waste).
 */
export async function analyzeWasteImage(
  imageSrc: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileName?: string
): Promise<WasteAnalysisResult> {
  let aiItem = "";
  let aiMaterial = "";
  let aiCategory = "";
  let aiConfidence = 90;

  const res = await fetch("/api/ai/analyze-waste", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageSrc }),
  });

  const data = await res.json();

  if (res.ok && data.success) {
    aiItem = data.item || "Identified Waste Item";
    aiMaterial = data.material || "Identified Material";
    aiCategory = data.category || "";
    const rawConf = typeof data.confidence === "number" ? data.confidence : 0.9;
    aiConfidence = Math.round(rawConf <= 1 ? rawConf * 100 : rawConf);
  } else {
    throw new Error(data.error || "Featherless AI Waste Analysis failed.");
  }

  // Application-side normalization layer & conflict resolution
  const norm = normalizeWasteClassification(aiItem, aiMaterial, aiCategory);

  // 1. SAFE_DISPOSAL
  if (norm.recommendedAction === "SAFE_DISPOSAL") {
    return {
      itemName: norm.item,
      category: norm.category,
      material: norm.material,
      confidence: aiConfidence,
      recommendedAction: "SAFE_DISPOSAL",
      aiReasoning: norm.aiReasoning,
      imageSrc,
      safeDisposalDetails: {
        isHazardous: true,
        instructions: [
          "Tape exposed electrical or chemical terminals with non-conductive tape.",
          "Keep in a cool, dry ventilated plastic bin away from heat sources.",
          "Do NOT place in regular municipal blue or trash bins."
        ],
        warning: "CRITICAL HAZARD: Special municipal safe-disposal collection required.",
        authorizedTeam: "Ward 3 EcoHub Municipal HHW Fleet",
      },
    };
  }

  // 2. REUSE (DIY / Upcycling)
  if (norm.recommendedAction === "REUSE") {
    const isTextile = norm.category.includes("Textile");

    return {
      itemName: norm.item,
      category: norm.category,
      material: norm.material,
      confidence: aiConfidence,
      recommendedAction: "REUSE",
      aiReasoning: norm.aiReasoning,
      imageSrc,
      reuseDetails: {
        title: `DIY Upcycling Project for ${norm.item}`,
        steps: [
          isTextile ? "Cut along seams to repurpose fabric into tote bag or cleaning cloths." : "Wash thoroughly with warm soapy water to clean container.",
          isTextile ? "Use durable fabric as handles or household trivets." : "Repurpose for pantry dry food storage, planters, or organization.",
          "Enjoy your upcycled item at home with zero landfill footprint!"
        ],
        difficulty: isTextile ? "Medium" : "Easy",
        impact: "Extends product lifespan and prevents 100% of manufacturing carbon footprint.",
      },
    };
  }

  // 3. RECYCLE
  let recycler = RECYCLER_DIRECTORY.plastics;
  if (norm.category.includes("Electronics") || norm.category.includes("E-Waste")) {
    recycler = RECYCLER_DIRECTORY.electronics;
  } else if (norm.category.includes("Metal")) {
    recycler = RECYCLER_DIRECTORY.metals;
  } else if (norm.category.includes("Paper") || norm.category.includes("Cardboard")) {
    recycler = RECYCLER_DIRECTORY.paper;
  }

  return {
    itemName: norm.item,
    category: norm.category,
    material: norm.material,
    confidence: aiConfidence,
    recommendedAction: "RECYCLE",
    aiReasoning: norm.aiReasoning,
    imageSrc,
    recycleDetails: {
      binColor: norm.category.includes("Electronics") ? "bg-purple-600 text-white" : "bg-blue-600 text-white",
      binName: norm.category.includes("Electronics") ? "E-Waste / Electronics Recovery" : "Blue Bin (Recyclables)",
      instructions: [
        "Rinse out any liquid or food residues if applicable.",
        "Compress packaging flat to optimize pickup volume.",
        "Keep clean and schedule pickup with certified recycler."
      ],
      assignedRecycler: recycler,
    },
  };
}
