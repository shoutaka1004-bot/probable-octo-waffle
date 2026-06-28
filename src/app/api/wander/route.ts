import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  trivia: string;
}

interface RouteData {
  areaName: string;
  waypoints: Waypoint[];
}

const EMPTY: RouteData = { areaName: "", waypoints: [] };

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
    "あなたは地域の散歩ルート設計者です。" +
    "与えられた出発地点の周辺にある、歩いて巡れる特徴的なスポットを3〜5箇所選び、ルートを構成してください。" +
    "選ぶ場所の条件：実在する公園・神社・寺・史跡・有名な通り・商店街・広場など個性のある場所。" +
    "ルートの総距離が700m〜1.5km程度になるよう、出発地点から近い順に並べること。" +
    "JSONのみ返すこと（マークダウン・コードブロック禁止）。" +
    "形式：" +
    '{"areaName":"エリア名（30文字以内）","waypoints":[{"lat":35.xxxxx,"lng":139.xxxxx,"name":"スポット名（15文字以内）","trivia":"このスポットの豆知識（50文字以内）"}]}' +
    "座標は小数点5桁の実在する正確な値。架空の場所は含めない。waypointsは必ず3個以上。";

  const userPrompt = `出発地点の緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}\nこの周辺で徒歩散歩ルートを構成してください。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 700, temperature: 0.5 },
      }),
    });

    if (!res.ok) return NextResponse.json(EMPTY);

    const data = await res.json();
    const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(EMPTY);

    const parsed: RouteData = JSON.parse(match[0]);
    if (!parsed.areaName || !Array.isArray(parsed.waypoints) || parsed.waypoints.length < 1) {
      return NextResponse.json(EMPTY);
    }

    // Validate each waypoint has required numeric coords
    const valid = parsed.waypoints.filter(
      (w) => typeof w.lat === "number" && typeof w.lng === "number" && w.name
    );
    if (valid.length === 0) return NextResponse.json(EMPTY);

    return NextResponse.json({ areaName: parsed.areaName, waypoints: valid });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
