const cors = require("cors");
const express = require("express");
const validarPresupuesto = require("./src/validators/presupuesto_validator");
const tarifas = require("./src/config/tarifas");
const calcularPresupuesto = require("./src/services/presupuesto_service");


const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// Middleware para interpretar peticiones JSON
app.use(express.json());


app.use((err, req, res, next) => {
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



// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
