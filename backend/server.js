require("./src/config/entorno")();
const cors = require("cors");
const express = require("express");
const validarPresupuesto = require("./src/validators/presupuesto_validator");
const validarSolicitud = require("./src/validators/solicitud_validator");
const tarifas = require("./src/config/tarifas");
const catalogo = require("./src/config/catalogo");
const calcularPresupuesto = require("./src/services/presupuesto_service");
const { generarPropuesta, ErrorPropuesta } = require("./src/services/openai_service");
const validarDatosPDF = require("./src/validators/pdf_validator");
const { generarPDF } = require("./src/services/pdf_service");


const app = express();
app.locals.generarPropuesta = generarPropuesta;
app.locals.generarPDF = generarPDF;
const PORT = process.env.PORT || 3001;


app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN || "http://localhost:3000").split(",").map((origen) => origen.trim()),
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  exposedHeaders: ["Content-Disposition"]
}));

// Middleware para interpretar peticiones JSON
app.use(express.json());


app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "El contenido es demasiado grande. Reduce los textos de la solicitud." });
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "El cuerpo de la solicitud contiene un JSON inválido"
    });
  }

  next(err);
});


// GET - Comprobar estado de la API
app.get("/api/estado", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

// GET - Consultar tarifas
app.get("/api/tarifas", (req, res) => {
  res.status(200).json(tarifas);
});

// GET - Consultar catálogo de servicios
app.get("/api/catalogo", (req, res) => {
  res.status(200).json(catalogo);
});

// POST - Validar solicitud del cliente sin almacenarla
app.post("/api/solicitudes/validar", (req, res) => {
  if (!req.is("application/json")) {
    return res.status(400).json({ error: "El Content-Type debe ser application/json" });
  }

  try {
    const errores = validarSolicitud(req.body);
    if (errores) {
      return res.status(400).json({ valida: false, error: "Revisa los datos de la solicitud", errores });
    }
    return res.status(200).json({
      valida: true,
      solicitud: { cliente: req.body.cliente.trim(), descripcion: req.body.descripcion.trim() }
    });
  } catch {
    return res.status(500).json({ error: "No se ha podido validar la solicitud. Vuelve a intentarlo." });
  }
});

// POST - Proponer servicios; nunca calcula ni confirma un presupuesto.
app.post("/api/propuestas", async (req, res) => {
  if (!req.is("application/json")) {
    return res.status(400).json({ error: "El Content-Type debe ser application/json" });
  }
  const errores = validarSolicitud(req.body);
  if (errores) {
    return res.status(400).json({ error: "Revisa los datos de la solicitud", errores });
  }
  try {
    const propuesta = await app.locals.generarPropuesta({
      cliente: req.body.cliente.trim(), descripcion: req.body.descripcion.trim()
    });
    return res.status(200).json(propuesta);
  } catch (error) {
    if (error instanceof ErrorPropuesta) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    return res.status(500).json({ error: "No se ha podido analizar la solicitud. Vuelve a intentarlo.", codigo: "IA_ERROR" });
  }
});

// POST - Calcular presupuesto

app.post("/api/presupuesto", (req, res) => {

  // Comprobar el Content-Type
  if (!req.is("application/json")) {
    return res.status(400).json({
      error: "El Content-Type debe ser application/json"
    });
  }

  // Validar los datos recibidos
  const error = validarPresupuesto(req.body);

  if (error) {
    return res.status(400).json({
      error: error
    });
  }

  // Calcular el presupuesto
  const presupuesto = calcularPresupuesto(req.body);

  // Devolver el resultado
  return res.status(200).json(presupuesto);

});



// PDF en memoria: se validan los datos y se recalcula siempre en el servidor.
app.post("/api/presupuesto/pdf", async (req, res) => {
  if (!req.is("application/json")) return res.status(400).json({ error: "El Content-Type debe ser application/json" });
  const error = validarDatosPDF(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const archivo = await app.locals.generarPDF(req.body);
    if (archivo.buffer.length > 4 * 1024 * 1024) return res.status(413).json({ error: "El documento es demasiado grande. Reduce los textos e inténtalo de nuevo." });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${archivo.nombre}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return res.status(200).send(archivo.buffer);
  } catch {
    return res.status(500).json({ error: "No se ha podido generar el PDF. Conservamos tu selección; vuelve a intentarlo." });
  }
});

// Iniciar servidor
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
  });
}

module.exports = app;
