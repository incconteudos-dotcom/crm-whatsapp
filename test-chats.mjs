const instanceId = process.env.ZAPI_INSTANCE_ID;
const token = process.env.ZAPI_TOKEN;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;

console.log("Instance:", instanceId?.slice(0, 8));

const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/chats`;
const res = await fetch(url, {
  headers: { "Content-Type": "application/json", "Client-Token": clientToken }
});
const data = await res.json();
console.log("HTTP Status:", res.status);
if (Array.isArray(data)) {
  console.log("Array length:", data.length);
  if (data[0]) {
    console.log("First item keys:", Object.keys(data[0]));
    console.log("First item:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("Empty array");
  }
} else {
  console.log("Response:", JSON.stringify(data, null, 2));
}
