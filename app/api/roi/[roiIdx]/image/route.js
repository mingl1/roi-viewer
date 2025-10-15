export async function GET(request, { params }) {
  const { roiIdx } = await params;
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const API_URL = "http://54.198.145.146:5000";
  const backendUrl = `${API_URL}/api/roi/${roiIdx}/image?${qs}`;

  const res = await fetch(backendUrl);
  const blob = await res.blob();

  return new Response(blob, {
    headers: { "Content-Type": res.headers.get("Content-Type") || "image/png" },
  });
}
