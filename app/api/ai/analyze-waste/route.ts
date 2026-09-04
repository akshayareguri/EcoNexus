import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FEATHERLESS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: "FEATHERLESS_API_KEY is missing from server configuration (.env.local)." 
        },
        { status: 500 }
      );
    }

    const model = process.env.FEATHERLESS_MODEL || "Qwen/Qwen3.8-Flash-Next";

    const body = await req.json().catch(() => ({}));
    const imageUrl = body.image || body.imageSrc || body.imageData || body.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid input. A base64 image data URL or image URL string is required in the request body." 
        },
        { status: 400 }
      );
    }

    // Official Featherless multimodal payload structure:
    // messages[0].content: text item first, image_url item second
    const payload = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image of a waste or discarded item. First, prioritize identifying the actual object (e.g., smartphone, plastic bottle, cardboard box, battery). Then determine its primary material composition and appropriate waste category. Return strictly raw JSON with no markdown formatting or extra text in this exact schema: {\"item\": \"specific item name\", \"material\": \"primary material\", \"category\": \"Electronics|Plastics|Glass|Paper|Metals|Organic|Textiles|Hazardous|General\", \"confidence\": 0.95}",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    };

    const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[Featherless API HTTP Error]: Status", response.status, "Body:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Featherless AI API error (${response.status}): ${errorText}`,
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 500 }
      );
    }

    const data = await response.json();

    // Server-side console logging for debugging (NEVER logs API key or uploaded image)
    console.log("[Featherless HTTP Status]:", response.status);
    console.log("[Featherless Response Body]:", JSON.stringify(data, null, 2));

    // Extract raw message content from response structure (handles string or array content)
    let rawContent = "";
    const choiceMessageContent = data?.choices?.[0]?.message?.content;

    if (typeof choiceMessageContent === "string") {
      rawContent = choiceMessageContent;
    } else if (Array.isArray(choiceMessageContent)) {
      rawContent = choiceMessageContent
        .map((part: { text?: string } | string) => (typeof part === "string" ? part : part?.text || ""))
        .join("\n");
    } else if (typeof data?.choices?.[0]?.text === "string") {
      rawContent = data.choices[0].text;
    }

    if (!rawContent || !rawContent.trim()) {
      console.error("[Featherless Error]: Model returned empty content in choices.");
      return NextResponse.json(
        { success: false, error: "Empty or invalid response content received from Featherless AI." },
        { status: 502 }
      );
    }

    // Robust JSON parsing algorithm
    let parsedResult: { item?: string; material?: string; category?: string; confidence?: number | string } | null = null;

    // 1. Direct JSON parse attempt
    try {
      parsedResult = JSON.parse(rawContent.trim());
    } catch {
      // 2. Strip code fences attempt
      const stripped = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
      try {
        parsedResult = JSON.parse(stripped);
      } catch {
        // 3. Extract JSON object via regex matching
        const match = rawContent.match(/\{[\s\S]*?\}/);
        if (match) {
          try {
            parsedResult = JSON.parse(match[0]);
          } catch {
            parsedResult = null;
          }
        }
      }
    }

    if (!parsedResult || typeof parsedResult !== "object") {
      console.warn("[Featherless Warning]: Could not parse JSON from output:", rawContent);
      return NextResponse.json(
        { success: false, error: "Empty or invalid response received from Featherless AI." },
        { status: 502 }
      );
    }

    const item = typeof parsedResult.item === "string" && parsedResult.item.trim()
      ? parsedResult.item.trim()
      : "Unknown Waste Item";

    const material = typeof parsedResult.material === "string" && parsedResult.material.trim()
      ? parsedResult.material.trim()
      : "Mixed Material";

    const category = typeof parsedResult.category === "string" && parsedResult.category.trim()
      ? parsedResult.category.trim()
      : "General Waste";

    let confidence = 0.9;
    const rawConf = parsedResult.confidence;
    if (typeof rawConf === "number") {
      confidence = rawConf;
    } else if (typeof rawConf === "string") {
      const parsed = parseFloat(rawConf);
      if (!isNaN(parsed)) confidence = parsed;
    }

    if (confidence > 1 && confidence <= 100) {
      confidence = confidence / 100;
    }
    if (isNaN(confidence) || confidence <= 0 || confidence > 1) {
      confidence = 0.85;
    }

    return NextResponse.json({
      success: true,
      item,
      material,
      category,
      confidence,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Analyze Waste Route Exception]:", errMessage);
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    );
  }
}
