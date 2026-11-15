const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const app = require("../server");

let server;
let url;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = `http://127.0.0.1:${server.address().port}/api/solicitudes/validar`;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

function enviar(datos) {
  return fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
  });
}

test("valida y recorta los datos sin incluir campos ajenos a la solicitud", async () => {
  const respuesta = await enviar({ cliente: "  Empresa ficticia  ", descripcion: "  Necesito una web informativa.  ", extra: true });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), {
    valida: true, solicitud: { cliente: "Empresa ficticia", descripcion: "Necesito una web informativa." }
  });
});

test("acepta exactamente 120 y 2000 caracteres", async () => {
  assert.equal((await enviar({ cliente: "a".repeat(120), descripcion: "b".repeat(2000) })).status, 200);
});

for (const [nombre, datos, campo] of [
  ["nombre vacío", { cliente: "", descripcion: "Web ficticia" }, "cliente"],
  ["nombre con espacios", { cliente: "   ", descripcion: "Web ficticia" }, "cliente"],
  ["descripción vacía", { cliente: "Empresa ficticia", descripcion: "" }, "descripcion"],
  ["descripción con espacios", { cliente: "Empresa ficticia", descripcion: " \n\t " }, "descripcion"],
  ["nombre demasiado largo", { cliente: "a".repeat(121), descripcion: "Web ficticia" }, "cliente"],
  ["descripción de 2001 caracteres", { cliente: "Empresa ficticia", descripcion: "a".repeat(2001) }, "descripcion"],
  ["nombre numérico", { cliente: 12, descripcion: "Web ficticia" }, "cliente"],
  ["descripción como objeto", { cliente: "Empresa ficticia", descripcion: {} }, "descripcion"],
  ["nombre ausente", { descripcion: "Web ficticia" }, "cliente"],
  ["descripción ausente", { cliente: "Empresa ficticia" }, "descripcion"],
  ["cuerpo nulo", null, null],
  ["cuerpo como array", [], "general"],
]) {
  test(`rechaza ${nombre}`, async () => {
    const respuesta = await enviar(datos);
    assert.equal(respuesta.status, 400);
    const data = await respuesta.json();
    assert.equal(typeof data.error, "string");
    if (campo) assert.equal(typeof data.errores[campo], "string");
  });
}

test("rechaza JSON mal formado y Content-Type incorrecto con respuesta JSON", async () => {
  for (const [contentType, body] of [["application/json", "{invalido"], ["text/plain", "texto"]]) {
    const respuesta = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body });
    assert.equal(respuesta.status, 400);
    assert.equal(typeof (await respuesta.json()).error, "string");
  }
});
