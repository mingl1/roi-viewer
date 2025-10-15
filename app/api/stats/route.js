export async function GET() {
  const API_URL = "http://54.198.145.146:5000/api/stats";

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
