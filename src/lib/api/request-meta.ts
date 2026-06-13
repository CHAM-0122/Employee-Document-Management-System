export function getRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "0.0.0.0";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    ipAddress,
    userAgent,
  };
}

