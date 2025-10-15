export async function GET(request, { params }) {
  const { roiIdx } = params;
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  // Use environment variable if defined, otherwise fallback to default IP
  const API_URL = process.env.BACKEND_IP || "http://54.198.145.146:5000";
  const backendUrl = `${API_URL}/api/roi/${roiIdx}/image?${qs}`;

  const res = await fetch(backendUrl);
  const blob = await res.blob();

  return new Response(blob, {
    headers: { "Content-Type": res.headers.get("Content-Type") || "image/png" },
  });
}
