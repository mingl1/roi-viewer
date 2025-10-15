export async function GET() {
  const IP = process.env.BACKEND_IP || "http://54.198.145.146:5000";
  const API_URL = `${IP}/api/stats`;

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
