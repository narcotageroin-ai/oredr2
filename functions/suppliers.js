export async function onRequest(context) {
  const { env } = context;
  const token = env.MSK_TOKEN;
  if (!token) {
    return new Response("MSK_TOKEN is not set", { status: 500 });
  }

  const url = "https://online.moysklad.ru/api/remap/1.2/entity/counterparty?filter=isSupplier=true";

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response("Error from MoySklad: " + text, { status: 500 });
  }

  const data = await res.json();
  const rows = (data.rows || []).map(row => ({
    id: row.id,
    name: row.name || ""
  }));

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
