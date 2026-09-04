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
              text: "Identify the object in this image, its primary material, and waste category. Respond ONLY with a single raw JSON object. Do NOT include thinking, reasoning, markdown formatting, or preamble. Return ONLY this exact JSON schema: {\"item\": \"specific item name\", \"material\": \"primary material\", \"category\": \"Electronics|Plastics|Glass|Paper|Metals|Organic|Textiles|Hazardous|General\", \"confidence\": 0.95}",
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
      max_tokens: 800,
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
      
      const isBusy = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
      const userErrorMsg = isBusy
        ? "Featherless AI vision service is currently busy. Please click 'Retry Analysis' in a moment."
        : `Featherless AI analysis temporary error (${response.status}). Please retry or try another image.`;

      return NextResponse.json(
        {
          success: false,
          error: userErrorMsg,
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 500 }
      );
    }

    const data = await response.json();

    // Server-side console logging for debugging (NEVER logs API key or uploaded image)
    console.log("[Featherless HTTP Status]:", response.status);
    console.log("[Featherless Response Body]:", JSON.stringify(data, null, 2));

    // Extract raw message content from response structure (handles string, array, or reasoning fields)
    let rawContent = "";
    const choice = data?.choices?.[0];
    const msg = choice?.message;

    if (msg) {
      if (typeof msg.content === "string" && msg.content.trim()) {
        rawContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        rawContent = msg.content
          .map((part: { text?: string } | string) => (typeof part === "string" ? part : part?.text || ""))
          .join("\n");
      }
      
      // Fallback: check reasoning_content or thinking fields if content is empty or lacks JSON
      if (!rawContent.includes("{") && typeof msg.reasoning_content === "string") {
        rawContent = (rawContent + "\n" + msg.reasoning_content).trim();
      }
      if (!rawContent.includes("{") && typeof msg.thinking === "string") {
        rawContent = (rawContent + "\n" + msg.thinking).trim();
      }
    } else if (typeof choice?.text === "string") {
      rawContent = choice.text;
    }

    if (!rawContent || !rawContent.trim()) {
      console.error("[Featherless Error]: Model returned empty content in choices.");
      return NextResponse.json(
        { success: false, error: "Empty or invalid response content received from Featherless AI." },
        { status: 502 }
      );
    }

    // Strip thinking tags if present in raw content
    const cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Robust JSON parsing algorithm
    let parsedResult: { item?: string; material?: string; category?: string; confidence?: number | string } | null = null;

    // 1. Direct JSON parse attempt on cleaned or raw content
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch {
      // 2. Strip code fences attempt
      const stripped = cleanedContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
      try {
        parsedResult = JSON.parse(stripped);
      } catch {
        // 3. Extract JSON object via regex matching across cleaned or raw content
        const match = cleanedContent.match(/\{[\s\S]*?\}/) || rawContent.match(/\{[\s\S]*?\}/);
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
