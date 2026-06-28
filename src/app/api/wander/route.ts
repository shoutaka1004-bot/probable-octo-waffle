import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

interface LoreData {
  areaName: string;
  routeTheme: string;
  triviaList: string[];
}

const EMPTY: LoreData = { areaName: "", routeTheme: "", triviaList: [] };

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(EMPTY);

  let lat: number, lng: number;
  try {
    ({ lat, lng } = await req.json());
    if (typeof lat !== "number" || typeof lng !== "number") throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const systemInstruction =
    "あなたは地域の散歩案内人です。" +
    "緯度・経度から最寄りエリアを特定し、散歩者向けの情報を日本語JSONのみで返してください。マークダウン・コードブロック禁止。" +
    "形式（必ずこの通り）：" +
    '{"areaName":"〇〇市〇〇区など（30文字以内）","routeTheme":"このエリアの散歩テーマや見どころを1文で（60文字以内）","triviaList":["豆知識1（50文字以内）","豆知識2","豆知識3","豆知識4"]}' +
    "架空・不確かな情報は含めない。JSONのみ出力。";

  const userPrompt = `緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)} 付近の散歩情報を教えてください。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      }),
    });

    if (!res.ok) return NextResponse.json(EMPTY);

    const data = await res.json();
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    // Extract JSON even if model wraps it in markdown fences
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(EMPTY);

    const parsed: LoreData = JSON.parse(match[0]);
    if (!parsed.areaName || !parsed.routeTheme || !Array.isArray(parsed.triviaList)) {
      return NextResponse.json(EMPTY);
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(EMPTY);
  }
}
