const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

// Node.js 22.16+ permite leer .env sin añadir dotenv. El entorno del proceso
// tiene prioridad; .env.local prevalece sobre .env, con rutas relativas al backend.
function cargarEntorno() {
  const variables = {};
  for (const archivo of [".env", ".env.local"]) {
    const ruta = path.resolve(__dirname, "../..", archivo);
    if (fs.existsSync(ruta)) Object.assign(variables, parseEnv(fs.readFileSync(ruta, "utf8")));
  }
  for (const [nombre, valor] of Object.entries(variables)) {
    if (process.env[nombre] === undefined) process.env[nombre] = valor;
  }
}

module.exports = cargarEntorno;
