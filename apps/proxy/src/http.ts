type HeadersRecord = Record<string, string>;

export async function httpGetJson(url: string, headers: HeadersRecord): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: headers as Record<string, string>,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upstream ${url} failed: ${response.status} ${text}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}


