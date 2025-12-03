export async function onRequest(context) {
  const { env } = context;
  const token = env.MSK_TOKEN;
  if (!token) {
    return new Response("MSK_TOKEN is not set", { status: 500 });
  }

  const url = "https://api.moysklad.ru/api/remap/1.2/entity/counterparty";



  const res = await fetch(url, {
  headers: {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json;charset=utf-8"
  }
});


  if (!res.ok) {
    const text = await res.text();
    return new Response("Error from MoySklad: " + text, { status: 500 });
  }

  const data = await res.json();

// Фильтруем только поставщиков
const suppliers = (data.rows || []).filter(row =>
  row.supplier === true || row.isSupplier === true
);

const rows = suppliers.map(row => ({
  id: row.id,
  name: row.name || ""
}));

return new Response(JSON.stringify(rows), {
  status: 200,
  headers: { "Content-Type": "application/json; charset=utf-8" }
});


  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
