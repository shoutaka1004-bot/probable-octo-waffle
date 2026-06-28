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

  let lat: number | null = null;
  let lng: number | null = null;
  let startName = "";
  let destinationName = "";
  let timeMinutes: number | null = null;

  try {
    const body = await req.json();
    if (typeof body.lat === "number") lat = body.lat;
    if (typeof body.lng === "number") lng = body.lng;
    if (typeof body.startName === "string") startName = body.startName.trim();
    if (typeof body.destinationName === "string") destinationName = body.destinationName.trim();
    if (typeof body.timeMinutes === "number" && body.timeMinutes > 0) timeMinutes = body.timeMinutes;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!destinationName && (lat === null || lng === null)) {
    return NextResponse.json(EMPTY);
  }

  let systemInstruction: string;
  let userPrompt: string;

  if (destinationName) {
    const startDesc = startName
      ? `出発地: ${startName}`
      : lat !== null && lng !== null
      ? `出発地の座標: 緯度${lat.toFixed(5)}, 経度${lng.toFixed(5)}`
      : "出発地: 指定なし";

    const timeDesc = timeMinutes
      ? `目標時間: ${timeMinutes}分（歩行速度約75m/分、合計距離の目安: 約${Math.round(timeMinutes * 75)}m）`
      : "時間制限なし";

    systemInstruction =
      "あなたは散歩ルート設計者です。" +
      "出発地から目的地まで、徒歩で巡れる個性的なスポットを2〜4箇所経由するルートを設計してください。" +
      "スポットの条件：実在する公園・神社・寺・史跡・有名な通り・商店街・広場など個性ある場所。" +
      "出発地→スポット1→スポット2→...→目的地の順で並べること。" +
      "最後のwaypointは必ず目的地自体の実在する座標にすること。" +
      "waypointsは最低3個（目的地を含む）。" +
      "JSONのみ返すこと（マークダウン・コードブロック禁止）。" +
      '形式：{"areaName":"エリア名（30文字以内）","waypoints":[{"lat":35.xxxxx,"lng":139.xxxxx,"name":"スポット名（15文字以内）","trivia":"豆知識（50文字以内）"}]}' +
      "座標は小数点5桁の実在する正確な値。架空の場所は含めない。";

    userPrompt =
      `${startDesc}\n目的地: ${destinationName}\n${timeDesc}\n` +
      "上記の条件で、出発地から目的地まで個性的なスポットを経由する散歩ルートを設計してください。";
  } else {
    systemInstruction =
      "あなたは地域の散歩ルート設計者です。" +
      "与えられた出発地点の周辺にある、歩いて巡れる特徴的なスポットを3〜5箇所選び、ルートを構成してください。" +
      "選ぶ場所の条件：実在する公園・神社・寺・史跡・有名な通り・商店街・広場など個性のある場所。" +
      "ルートの総距離が700m〜1.5km程度になるよう、出発地点から近い順に並べること。" +
      "JSONのみ返すこと（マークダウン・コードブロック禁止）。" +
      '形式：{"areaName":"エリア名（30文字以内）","waypoints":[{"lat":35.xxxxx,"lng":139.xxxxx,"name":"スポット名（15文字以内）","trivia":"このスポットの豆知識（50文字以内）"}]}' +
      "座標は小数点5桁の実在する正確な値。架空の場所は含めない。waypointsは必ず3個以上。";

    userPrompt = `出発地点の緯度: ${lat!.toFixed(5)}, 経度: ${lng!.toFixed(5)}\nこの周辺で徒歩散歩ルートを構成してください。`;
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
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

    const valid = parsed.waypoints.filter(
      (w) => typeof w.lat === "number" && typeof w.lng === "number" && w.name
    );
    if (valid.length === 0) return NextResponse.json(EMPTY);

    return NextResponse.json({ areaName: parsed.areaName, waypoints: valid });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
