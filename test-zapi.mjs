const instanceId = process.env.ZAPI_INSTANCE_ID;
const token = process.env.ZAPI_TOKEN;

console.log("Instance ID set:", !!instanceId, instanceId ? instanceId.slice(0, 8) + "..." : "NOT SET");
console.log("Token set:", !!token, token ? token.slice(0, 8) + "..." : "NOT SET");

const clientToken = process.env.ZAPI_CLIENT_TOKEN;
console.log("Client-Token set:", !!clientToken, clientToken ? clientToken.slice(0, 8) + "..." : "NOT SET");

const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
try {
  const headers = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log("HTTP Status:", res.status);
  console.log("Z-API Response:", JSON.stringify(data, null, 2));
} catch (e) {
  console.error("Error:", e.message);
}
