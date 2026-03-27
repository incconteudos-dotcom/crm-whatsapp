import { BrevoClient } from "@getbrevo/brevo";

const apiKey = process.env.BREVO_API_KEY;
console.log("API Key present:", !!apiKey, "length:", apiKey?.length);

const client = new BrevoClient({ apiKey });

try {
  const result = await client.transactionalEmails.sendTransacEmail({
    sender: { name: "CRM Test", email: "noreply@patioestudioscrm.manus.space" },
    to: [{ email: "mazinhoww@gmail.com", name: "Aurimar" }],
    subject: "Teste Brevo CRM",
    htmlContent: "<h1>Teste de email</h1><p>Se chegou, está funcionando!</p>",
  });
  console.log("SUCCESS:", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("ERROR:", err?.message ?? err);
  if (err?.response) {
    const body = await err.response.text?.() ?? JSON.stringify(err.response);
    console.error("Response body:", body);
  }
}
