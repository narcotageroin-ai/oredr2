function isoUtc(date) {
  return date.toISOString().split('.')[0] + "Z";
}

export async function onRequest(context) {
  const { request, env } = context;
  const token = env.MSK_TOKEN;
  const orgHref = env.ORG_HREF;

  if (!token || !orgHref) {
    return new Response("MSK_TOKEN or ORG_HREF not set", { status: 500 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const supplierId = body.supplierId;
  const analysisDays = Number(body.analysisDays || 30);
  const forecastDays = Number(body.forecastDays || 14);
  const packageSizeDefault = Number(body.packageSize || 10);
  const reservePercent = Number(body.reservePercent || 30);

  if (!supplierId) {
    return new Response("supplierId is required", { status: 400 });
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  // 1. Получаем товары по поставщику
  const productsUrl = `https://api.moysklad.ru/api/remap/1.2/entity/product?filter=supplier.id==${supplierId}`;
  const productsRes = await fetch(productsUrl, { headers });
  if (!productsRes.ok) {
    const text = await productsRes.text();
    return new Response("Error getting products: " + text, { status: 500 });
  }
  const productsData = await productsRes.json();
  const products = productsData.rows || [];

  const now = new Date();
  const dateFrom = isoUtc(new Date(now.getTime() - analysisDays * 24 * 3600 * 1000));
  const dateTo = isoUtc(now);

  const orderPositions = [];

  for (const product of products) {
    const productId = product.id;
    const productMeta = product.meta && product.meta.href;
    const stock = Number(product.stock || 0);

    // 2. Продажи по товару
    const salesFilter = `moment>${dateFrom};moment<${dateTo};product.id=${productId}`;
    const salesUrl = `https://api.moysklad.ru/api/remap/1.2/report/sales/byorder?filter=${encodeURIComponent(salesFilter)}`;
    const salesRes = await fetch(salesUrl, { headers });
    if (!salesRes.ok) {
      const text = await salesRes.text();
      return new Response("Error getting sales: " + text, { status: 500 });
    }
    const salesData = await salesRes.json();
    const salesRows = salesData.rows || [];
    const totalSold = salesRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const avgDaily = analysisDays > 0 ? totalSold / analysisDays : 0;

    let forecastQty = avgDaily * forecastDays - stock;

    if (stock <= 0 && forecastQty > 0) {
      forecastQty = forecastQty * (1 + reservePercent / 100);
    }

    let pkg = Number(product.packageSize || packageSizeDefault);
    if (!Number.isFinite(pkg) || pkg <= 0) {
      pkg = packageSizeDefault;
    }

    if (forecastQty <= 0) continue;

    const orderQty = Math.ceil(forecastQty / pkg) * pkg;

    // Цена
    let priceValue = 0;
    if (Array.isArray(product.salePrices) && product.salePrices.length > 0) {
      priceValue = Number(product.salePrices[0].value || 0);
    }

    orderPositions.push({
      assortment: {
        meta: {
          href: productMeta,
          type: "product",
          mediaType: "application/json"
        }
      },
      quantity: orderQty,
      price: priceValue
    });
  }

  if (!orderPositions.length) {
    return new Response("Нет позиций для заказа (прогноз <= 0)", { status: 200 });
  }

  const supplierMeta = {
    href: `https://api.moysklad.ru/api/remap/1.2/entity/counterparty/${supplierId}`,
    type: "counterparty",
    mediaType: "application/json"
  };

  const orderBody = {
    supplier: { meta: supplierMeta },
    organization: {
      meta: {
        href: orgHref,
        type: "organization",
        mediaType: "application/json"
      }
    },
    positions: orderPositions
  };

  const orderUrl = "https://api.moysklad.ru/api/remap/1.2/entity/supplierorder";
  const orderRes = await fetch(orderUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(orderBody)
  });

  if (!orderRes.ok) {
    const text = await orderRes.text();
    return new Response("Ошибка создания заказа: " + text, { status: 500 });
  }

  return new Response("✅ Заказ поставщику успешно сформирован!", { status: 200 });
}
