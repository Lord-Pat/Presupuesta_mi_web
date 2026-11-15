const PDFKit = require("pdfkit");
const { randomUUID } = require("node:crypto");
const catalogo = require("../config/catalogo");
const calcularPresupuesto = require("./presupuesto_service");

const euros = (importe) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(importe).replace(/\u00a0/g, " ");
const nombrePDF = (cliente) => `presupuesto-webquote-${cliente.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64).replace(/-$/, "") || "cliente"}.pdf`;
// Helvetica estándar admite el español y WinAnsi. Los símbolos no representables
// se sustituyen, y los controles nunca se interpretan como contenido del PDF.
const seguro = (valor) => String(valor).normalize("NFC").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n")
  .replace(/[^\x20-\x7e\xa0-\xff\n\t€–—‘’“”…]/gu, "?");

function prepararDocumento(datos) {
  const { tipo, paginas, formulario, segundoIdioma } = datos.configuracion;
  const configuracion = { tipo, paginas, formulario, segundoIdioma };
  // Única fuente de importes: el mismo servicio que /api/presupuesto.
  const presupuesto = calcularPresupuesto(configuracion);
  const campos = { [tipo]: "base", paginaAdicional: "paginasAdicionales", formulario: "formulario", segundoIdioma: "segundoIdioma" };
  return {
    cliente: datos.solicitud.cliente.trim(), descripcion: datos.solicitud.descripcion.trim(),
    resumen: datos.propuesta.resumen.trim(), aclaraciones: datos.aclaraciones,
    necesidadesNoCubiertas: datos.propuesta.necesidadesNoCubiertas,
    configuracion, presupuesto,
    partidas: catalogo.servicios.filter(({ id }) => datos.serviciosSeleccionados.includes(id)).map((servicio) => ({
      id: servicio.id, nombre: servicio.nombre, descripcion: servicio.descripcion,
      cantidad: servicio.id === "paginaAdicional" ? paginas - 1 : 1,
      precioUnitario: servicio.precio.importe, importe: presupuesto[campos[servicio.id]]
    }))
  };
}

function generarPDF(datos) {
  const modelo = prepararDocumento(datos);
  return new Promise((resolve, reject) => {
    const fecha = new Date();
    const id = `WQ-${randomUUID()}`;
    const PDFDocument = PDFKit.PDFDocument || PDFKit;
    const doc = new PDFDocument({ size: "A4", margins: { top: 148, bottom: 64, left: 48, right: 48 }, bufferPages: true,
      info: { Title: "Presupuesto web · WebQuote", Author: "WebQuote", Subject: "Presupuesto informativo de servicios web", CreationDate: fecha } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), nombre: nombrePDF(modelo.cliente), presupuesto: modelo.presupuesto }));
    const color = { navy: "#152943", blue: "#245DE0", pale: "#EFF4FC", text: "#29364B", muted: "#64748B", line: "#DCE4EF" };
    const ancho = doc.page.width - 96;
    const fechaTexto = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).format(fecha);
    const body = () => doc.font("Helvetica").fontSize(10.5).fillColor(color.text);
    function cabecera() {
      doc.rect(0, 0, doc.page.width, 105).fill(color.navy);
      doc.font("Helvetica-Bold").fontSize(14).fillColor("white").text("WebQuote", 48, 25, { lineBreak: false });
      doc.fontSize(27).text("Presupuesto web", 48, 51, { lineBreak: false });
      doc.roundedRect(doc.page.width - 169, 31, 121, 25, 5).fill(color.blue);
      doc.fontSize(9).fillColor("white").text("PRESUPUESTO", doc.page.width - 164, 39, { width: 111, align: "center", lineBreak: false });
      doc.font("Helvetica").fontSize(8).fillColor(color.muted).text(id, 48, 119, { lineBreak: false });
      doc.text(fechaTexto, doc.page.width - 148, 119, { width: 100, align: "right", lineBreak: false });
      doc.moveTo(48, 135).lineTo(doc.page.width - 48, 135).lineWidth(0.7).stroke(color.line);
      body(); doc.x = 48; doc.y = 148;
    }
    doc.on("pageAdded", cabecera);
    const asegurar = (alto) => { if (doc.y + alto > doc.page.height - 64) doc.addPage(); };
    function titulo(texto) {
      asegurar(56);
      doc.font("Helvetica-Bold").fontSize(13).fillColor(color.navy).text(texto, 48, doc.y, { width: ancho });
      doc.y += 10; body();
    }
    function parrafo(texto) {
      body(); doc.text(seguro(texto), 48, doc.y, { width: ancho, lineGap: 3 }); doc.y += 12;
    }
    function tablaCabecera() {
      const y = doc.y;
      doc.rect(48, y, ancho, 27).fill(color.navy);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
      doc.text("SERVICIO", 59, y + 9, { width: 220, lineBreak: false });
      doc.text("CANT.", 290, y + 9, { width: 35, align: "center", lineBreak: false });
      doc.text("UNITARIO", 334, y + 9, { width: 94, align: "right", lineBreak: false });
      doc.text("IMPORTE", 438, y + 9, { width: 98, align: "right", lineBreak: false });
      doc.y = y + 27; body();
    }
    try {
      cabecera();
      doc.font("Helvetica-Bold").fontSize(9).fillColor(color.blue).text("PREPARADO PARA", 48, doc.y);
      doc.y += 7;
      doc.fontSize(19).fillColor(color.navy).text(seguro(modelo.cliente), 48, doc.y, { width: ancho }); doc.y += 18;
      body();
      const resumen = seguro(modelo.resumen);
      const alto = doc.heightOfString(resumen, { width: ancho - 28, lineGap: 3 }) + 28;
      const destacado = alto < doc.page.height - 262;
      if (destacado) asegurar(alto + 50);
      titulo("Resumen del proyecto");
      if (destacado) {
        asegurar(alto + 12);
        const y = doc.y;
        doc.roundedRect(48, y, ancho, alto, 7).fill(color.pale);
        body(); doc.text(resumen, 62, y + 14, { width: ancho - 28, lineGap: 3 }); doc.y = y + alto + 20;
      } else parrafo(resumen);
      asegurar(150); titulo("Servicios incluidos"); tablaCabecera();
      modelo.partidas.forEach((partida, indice) => {
        doc.font("Helvetica").fontSize(9.5);
        const descripcion = seguro(partida.descripcion);
        const altoFila = doc.heightOfString(descripcion, { width: 220, lineGap: 2 }) + 44;
        if (doc.y + altoFila > doc.page.height - 64) { doc.addPage(); titulo("Servicios incluidos · continuación"); tablaCabecera(); }
        const y = doc.y;
        doc.rect(48, y, ancho, altoFila).fill(indice % 2 === 0 ? color.pale : "#FAFBFD");
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(color.text).text(seguro(partida.nombre), 59, y + 12, { width: 220 });
        doc.font("Helvetica").fontSize(9.5).fillColor(color.muted).text(descripcion, 59, y + 30, { width: 220, lineGap: 2 });
        doc.fontSize(10).fillColor(color.text);
        doc.text(String(partida.cantidad), 290, y + 13, { width: 35, align: "center" });
        doc.text(euros(partida.precioUnitario), 334, y + 13, { width: 94, align: "right" });
        doc.font("Helvetica-Bold").text(euros(partida.importe), 438, y + 13, { width: 98, align: "right" });
        doc.y = y + altoFila; body();
      });
      doc.y += 18; asegurar(100);
      const yTotal = doc.y;
      doc.roundedRect(48, yTotal, ancho, 82, 7).fill(color.navy);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("white").text("TOTAL DE LOS SERVICIOS", 64, yTotal + 18, { width: 250 });
      doc.fontSize(25).text(euros(modelo.presupuesto.total), 330, yTotal + 14, { width: ancho - 298, align: "right" });
      doc.font("Helvetica").fontSize(9).fillColor("#D5E1F8").text("Impuestos no calculados · EUR", 64, yTotal + 53, { lineBreak: false });
      doc.y = yTotal + 106;
      titulo("Detalle de la solicitud"); parrafo(modelo.descripcion);
      asegurar(100); titulo("Dudas y aclaraciones");
      if (!modelo.aclaraciones.length) parrafo("No hay dudas adicionales registradas.");
      modelo.aclaraciones.forEach((item, indice) => {
        asegurar(65);
        parrafo(`${indice + 1}. ${item.pregunta}`);
        parrafo(item.respuesta.trim() ? `Aclaración del cliente: ${item.respuesta.trim()}` : "Pendiente de aclarar.");
      });
      titulo("Necesidades pendientes de valoración");
      parrafo("Fuera del alcance y del total de los servicios incluidos:");
      if (!modelo.necesidadesNoCubiertas.length) parrafo("No se han identificado necesidades fuera del catálogo.");
      modelo.necesidadesNoCubiertas.forEach((texto, indice) => parrafo(`${indice + 1}. ${texto}`));
      const rango = doc.bufferedPageRange();
      for (let pagina = rango.start; pagina < rango.start + rango.count; pagina++) {
        doc.switchToPage(pagina);
        const margenInferior = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const y = doc.page.height - 40;
        doc.moveTo(48, y - 10).lineTo(doc.page.width - 48, y - 10).lineWidth(0.5).stroke(color.line);
        doc.font("Helvetica").fontSize(8).fillColor(color.muted).text("WebQuote · Documento informativo", 48, y, { lineBreak: false });
        doc.text(`Página ${pagina + 1} de ${rango.count}`, doc.page.width - 158, y, { width: 110, align: "right", lineBreak: false });
        doc.page.margins.bottom = margenInferior;
      }
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}

module.exports = { generarPDF, prepararDocumento, nombrePDF };
