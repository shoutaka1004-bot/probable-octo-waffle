import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "" }, { status: 200 });
  }

  let lat: number, lng: number;
  try {
    ({ lat, lng } = await req.json());
    if (typeof lat !== "number" || typeof lng !== "number") throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const prompt =
    `あなたは旅の同行者であるAIです。ユーザーは現在、緯度:${lat.toFixed(4)}, 経度:${lng.toFixed(4)} の付近をあえて地図を持たずに散歩しています。` +
    `この場所の歴史、地形、ニッチなトリビア、またはその土地が持つ固有の空気感をベースに、散歩が楽しくなるようなポエティックなメッセージ（30文字〜50文字程度）を1文で生成してください。` +
    `嘘の歴史は書かず、普遍的な街の情緒を切り取ってください。句点で終わること。`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.88 },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ message: "" }, { status: 200 });
    }

    const data = await res.json();
    const message: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ message: "" }, { status: 200 });
  }
}
