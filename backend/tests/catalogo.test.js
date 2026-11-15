const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("../server");
const catalogo = require("../src/config/catalogo");
const tarifas = require("../src/config/tarifas");

test("el cálculo ignora precios y totales enviados por el navegador", async () => {
  const respuesta = await fetch(`${url}/api/presupuesto`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "landing", paginas: 2, formulario: true, segundoIdioma: false, base: 1, total: 1, precio: 1 })
  });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), {
    base: 300, paginasAdicionales: 50, formulario: 80, segundoIdioma: 0, total: 430, moneda: "EUR"
  });
});

let server;
let url;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("el catálogo contiene los cinco servicios únicos con importes de tarifas", () => {
  const ids = catalogo.servicios.map((servicio) => servicio.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.keys(tarifas).sort());
  assert.equal(catalogo.moneda, "EUR");
  for (const servicio of catalogo.servicios) {
    assert.ok(servicio.nombre.trim());
    assert.ok(servicio.descripcion.trim());
    assert.ok(servicio.categoria);
    assert.equal(servicio.precio.importe, tarifas[servicio.id]);
    assert.equal(servicio.precio.tipo, servicio.id === "paginaAdicional" ? "porCantidad" : "fijo");
  }
  assert.deepEqual(JSON.parse(JSON.stringify(catalogo)), catalogo);
});

test("describe la selección de base, la primera página y los extras opcionales", () => {
  assert.deepEqual(catalogo.reglas, {
    serviciosBase: ["landing", "corporativa"],
    seleccionBase: "exactamenteUno",
    paginasIncluidasEnBase: 1
  });
  const adicional = catalogo.servicios.find((servicio) => servicio.id === "paginaAdicional");
  assert.equal(adicional.precio.campoCantidad, "paginas");
  assert.equal(adicional.precio.reglaCalculo, "(paginas - 1) * importe");
  assert.ok(adicional.precio.reglaCantidad);
  for (const id of ["formulario", "segundoIdioma"]) {
    assert.equal(catalogo.servicios.find((servicio) => servicio.id === id).opcional, true);
  }
});

test("GET /api/catalogo devuelve el catálogo completo como JSON", async () => {
  const respuesta = await fetch(`${url}/api/catalogo`);
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await respuesta.json(), catalogo);
});

test("estado y tarifas conservan sus respuestas", async () => {
  for (const [ruta, esperado] of [["estado", { status: "ok" }], ["tarifas", tarifas]]) {
    const respuesta = await fetch(`${url}/api/${ruta}`);
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), esperado);
  }
});

test("presupuestos conservan sus importes para ambas bases, páginas y extras", async () => {
  for (const tipo of ["landing", "corporativa"]) {
    for (const paginas of [1, 2, 20]) {
      for (const formulario of [false, true]) {
        for (const segundoIdioma of [false, true]) {
          const respuesta = await fetch(`${url}/api/presupuesto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo, paginas, formulario, segundoIdioma })
          });
          const base = tipo === "landing" ? 300 : 600;
          const adicionales = (paginas - 1) * 50;
          const extraFormulario = formulario ? 80 : 0;
          const extraIdioma = segundoIdioma ? 150 : 0;
          assert.equal(respuesta.status, 200);
          assert.deepEqual(await respuesta.json(), {
            base,
            paginasAdicionales: adicionales,
            formulario: extraFormulario,
            segundoIdioma: extraIdioma,
            total: base + adicionales + extraFormulario + extraIdioma,
            moneda: "EUR"
          });
        }
      }
    }
  }
});

test("presupuestos siguen rechazando datos inválidos", async () => {
  for (const datos of [
    {},
    { tipo: ["landing", "corporativa"], paginas: 1, formulario: false, segundoIdioma: false },
    { tipo: "landing", paginas: 0, formulario: false, segundoIdioma: false }
  ]) {
    const respuesta = await fetch(`${url}/api/presupuesto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    assert.equal(respuesta.status, 400);
    assert.equal(typeof (await respuesta.json()).error, "string");
  }
});
