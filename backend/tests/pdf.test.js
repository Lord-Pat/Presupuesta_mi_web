const { test, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { inflateSync } = require("node:zlib");
const app = require("../server");
const validarDatosPDF = require("../src/validators/pdf_validator");
const { prepararDocumento, generarPDF, nombrePDF } = require("../src/services/pdf_service");

function datos(extras = false) {
  return {
    estado: "confirmado",
    solicitud: { cliente: "Restaurante Mediterráneo ficticio", descripcion: "Una web informativa para un restaurante ficticio." },
    propuesta: { resumen: "Presentación del restaurante y sus servicios.", dudas: [], necesidadesNoCubiertas: [] },
    serviciosSeleccionados: extras ? ["corporativa", "paginaAdicional", "formulario", "segundoIdioma"] : ["landing"],
    configuracion: { tipo: extras ? "corporativa" : "landing", paginas: extras ? 3 : 1, formulario: extras, segundoIdioma: extras },
    aclaraciones: [], presupuesto: { total: 1, base: 1 }
  };
}

// Lectura mínima de los streams de texto de nuestros PDF con fuentes estándar.
// No se añade una segunda librería PDF a la aplicación ni a sus pruebas.
function textoPDF(buffer) {
  const pdf = buffer.toString("latin1");
  const decoder = new TextDecoder("windows-1252");
  const textos = [];
  for (const stream of pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let contenido;
    try { contenido = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1"); }
    catch { continue; }
    for (const linea of contenido.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
      textos.push([...linea[1].matchAll(/<([a-f\d]+)>/gi)].map((item) => decoder.decode(Buffer.from(item[1], "hex"))).join(""));
    }
  }
  return textos.join("\n");
}

let server;
let url;
const original = app.locals.generarPDF;
before(async () => { server = app.listen(0, "127.0.0.1"); await once(server, "listening"); url = `http://127.0.0.1:${server.address().port}/api/presupuesto/pdf`; });
afterEach(() => { app.locals.generarPDF = original; });
after(async () => { if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
const enviar = (data) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

test("PDF sencillo: landing, nombre con acentos y 300 euros sin aceptar el total manipulado", async () => {
  const respuesta = await enviar(datos());
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("content-type"), /application\/pdf/);
  assert.match(respuesta.headers.get("content-disposition"), /^inline; filename="presupuesto-webquote-restaurante-mediterraneo-ficticio\.pdf"$/);
  assert.equal(respuesta.headers.get("cache-control"), "no-store");
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.ok(buffer.toString("latin1").trimEnd().endsWith("%%EOF"));
  const texto = textoPDF(buffer);
  for (const esperado of ["Presupuesto web", "Restaurante Mediterráneo ficticio", "Landing page", "300,00 €", "Impuestos no calculados", "Documento informativo"]) assert.ok(texto.includes(esperado), esperado);
  assert.ok(!texto.includes("1,00 €"));
  assert.ok(!texto.includes("Web corporativa"));
});

test("PDF con extras: corporativa, tres páginas, formulario y segundo idioma suman 930 euros", async () => {
  const modelo = prepararDocumento(datos(true));
  assert.deepEqual(modelo.presupuesto, { base: 600, paginasAdicionales: 100, formulario: 80, segundoIdioma: 150, total: 930, moneda: "EUR" });
  assert.equal(modelo.partidas.find((item) => item.id === "paginaAdicional").cantidad, 2);
  const archivo = await generarPDF(datos(true));
  const texto = textoPDF(archivo.buffer);
  for (const esperado of ["Web corporativa", "Página adicional", "Formulario de contacto", "Segundo idioma", "600,00 €", "100,00 €", "80,00 €", "150,00 €", "930,00 €"]) assert.ok(texto.includes(esperado), esperado);
});

test("solo incluye servicios finalmente seleccionados", async () => {
  const seleccion = datos(true);
  seleccion.serviciosSeleccionados = seleccion.serviciosSeleccionados.filter((id) => id !== "formulario");
  seleccion.configuracion.formulario = false;
  const archivo = await generarPDF(seleccion);
  assert.ok(!textoPDF(archivo.buffer).includes("Formulario de contacto"));
  assert.ok(textoPDF(archivo.buffer).includes("850,00 €"));
});

test("incluye dudas pendientes, respuestas y necesidades no presupuestadas", async () => {
  const pendientes = datos();
  pendientes.propuesta.dudas = ["¿Qué contenido tendrá?", "¿Qué material falta?"];
  pendientes.aclaraciones = [{ pregunta: pendientes.propuesta.dudas[0], respuesta: "Carta y presentación." }, { pregunta: pendientes.propuesta.dudas[1], respuesta: "" }];
  pendientes.propuesta.necesidadesNoCubiertas = ["Reservas automáticas pendientes de valoración."];
  assert.equal(validarDatosPDF(pendientes), null);
  const texto = textoPDF((await generarPDF(pendientes)).buffer);
  for (const esperado of ["Carta y presentación.", "Pendiente de aclarar.", "Reservas automáticas", "Fuera del alcance"]) assert.ok(texto.includes(esperado), esperado);
});

test("texto extenso genera varias páginas A4 con cabeceras y numeración", async () => {
  const extenso = datos(true);
  extenso.solicitud.descripcion = "Descripción ficticia con información del proyecto y su contenido. ".repeat(30).slice(0, 2000);
  extenso.propuesta.resumen = "Resumen ficticio de los objetivos y contenidos del proyecto. ".repeat(20).slice(0, 1500);
  const archivo = await generarPDF(extenso);
  const paginas = [...archivo.buffer.toString("latin1").matchAll(/\/Type \/Page\b/g)].length;
  assert.ok(paginas > 1);
  const texto = textoPDF(archivo.buffer);
  assert.ok(texto.includes(`Página 1 de ${paginas}`));
  assert.ok(texto.includes(`Página ${paginas} de ${paginas}`));
  assert.ok(archivo.buffer.toString("latin1").includes("/MediaBox [0 0 595.28 841.89]"));
});

for (const [nombre, cambiar] of [
  ["sin confirmar", (d) => { d.estado = "borrador"; }],
  ["nombre vacío", (d) => { d.solicitud.cliente = " "; }],
  ["resumen demasiado largo", (d) => { d.propuesta.resumen = "a".repeat(1501); }],
  ["resumen con importes ajenos al cálculo", (d) => { d.propuesta.resumen = "El presupuesto total es de 1 euro."; }],
  ["servicio desconocido", (d) => { d.serviciosSeleccionados.push("tienda"); }],
  ["servicio duplicado", (d) => { d.serviciosSeleccionados.push("landing"); }],
  ["sin base", (d) => { d.serviciosSeleccionados = []; }],
  ["dos bases", (d) => { d.serviciosSeleccionados.push("corporativa"); }],
  ["cantidades incoherentes", (d) => { d.configuracion.paginas = 2; }],
  ["cantidad inválida", (d) => { d.configuracion.paginas = 21; }],
  ["aclaración inválida", (d) => { d.aclaraciones = [{ pregunta: "inventada", respuesta: 3 }]; }],
  ["controles de texto inválidos", (d) => { d.solicitud.cliente = "Nombre\u0000"; }]
]) {
  test(`rechaza ${nombre} antes de generar el PDF`, async () => {
    let llamadas = 0;
    app.locals.generarPDF = async () => { llamadas++; };
    const data = datos(); cambiar(data);
    const respuesta = await enviar(data);
    assert.equal(respuesta.status, 400);
    assert.equal(typeof (await respuesta.json()).error, "string");
    assert.equal(llamadas, 0);
  });
}

test("falla de forma controlada y permite reintentar sin exponer errores internos", async () => {
  app.locals.generarPDF = async () => { throw new Error("ruta y credencial ficticia privada"); };
  const respuesta = await enviar(datos());
  assert.equal(respuesta.status, 500);
  assert.ok(!(await respuesta.json()).error.includes("privada"));
  app.locals.generarPDF = original;
  assert.equal((await enviar(datos())).status, 200);
});

test("nombres de descarga seguros y caracteres externos no rompen el PDF", async () => {
  assert.match(nombrePDF("../../Empresa \r\n\" ñ/<>"), /^presupuesto-webquote-empresa-n\.pdf$/);
  const especiales = datos(); especiales.solicitud.cliente = "Empresa (ficticia) \\ 😀";
  assert.ok((await generarPDF(especiales)).buffer.length > 1000);
});

test("rechaza cuerpos mal formados, tipos incorrectos y excesivamente grandes con JSON controlado", async () => {
  for (const body of ["{invalido", "null", JSON.stringify({ descripcion: "x".repeat(110000) })]) {
    const respuesta = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    assert.ok([400, 413].includes(respuesta.status));
    assert.equal(typeof (await respuesta.json()).error, "string");
  }
});
