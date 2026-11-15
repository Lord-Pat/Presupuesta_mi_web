const OpenAI = require("openai");
const catalogo = require("../config/catalogo");
const schema = require("../config/propuesta_schema");
const instrucciones = require("../prompts/propuesta_prompt");
const validarPropuesta = require("../validators/propuesta_validator");

class ErrorPropuesta extends Error {
  constructor(status, codigo, mensaje) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

function errorRespuesta() {
  return new ErrorPropuesta(502, "RESPUESTA_INVALIDA", "La IA no ha devuelto una propuesta válida. Vuelve a intentar el análisis.");
}

// La inyección del cliente permite probar el flujo sin llamadas reales ni créditos.
function crearServicioOpenAI({ client, env = process.env } = {}) {
  return async function generarPropuesta(solicitud) {
    // Diagnóstico temporal: nunca registrar el contenido de OPENAI_API_KEY.
    console.info({
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
      VERCEL_ENV: process.env.VERCEL_ENV,
      OPENAI_MODEL: process.env.OPENAI_MODEL
    });
    if (!env.OPENAI_API_KEY?.trim()) {
      throw new ErrorPropuesta(503, "IA_NO_CONFIGURADA", "El servicio de IA no está configurado en el servidor.");
    }
    try {
      const sdk = client || new OpenAI({ apiKey: env.OPENAI_API_KEY.trim(), timeout: 45000, maxRetries: 0 });
      const respuesta = await sdk.responses.create({
        model: env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
        instructions: `${instrucciones}\n\nCatálogo de WebQuote:\n${JSON.stringify(catalogo)}`,
        // No es necesario enviar el nombre del cliente al proveedor.
        input: [{ role: "user", content: JSON.stringify({ descripcion: solicitud.descripcion }) }],
        text: { format: { type: "json_schema", name: "propuesta_webquote", strict: true, schema } },
        max_output_tokens: 2000,
        store: false
      });
      if (respuesta.status !== "completed" || respuesta.error ||
          respuesta.output?.some((item) => item.content?.some((contenido) => contenido.type === "refusal")) ||
          !respuesta.output_text) throw errorRespuesta();

      let propuesta;
      try {
        propuesta = JSON.parse(respuesta.output_text);
      } catch {
        throw errorRespuesta();
      }
      if (validarPropuesta(propuesta)) throw errorRespuesta();
      return propuesta;
    } catch (error) {
      if (error instanceof ErrorPropuesta) throw error;
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new ErrorPropuesta(504, "IA_TIMEOUT", "La IA ha tardado demasiado en responder. Vuelve a intentarlo.");
      }
      if (error.status === 401 || error.status === 403) {
        throw new ErrorPropuesta(502, "IA_CREDENCIALES", "El servidor no ha podido autenticarse con el servicio de IA.");
      }
      if (error.status === 429) {
        throw new ErrorPropuesta(429, "IA_LIMITE", "Se ha alcanzado el límite de peticiones o la cuota de IA. Inténtalo más tarde.");
      }
      if (error instanceof OpenAI.APIConnectionError || error.status >= 500) {
        throw new ErrorPropuesta(503, "IA_NO_DISPONIBLE", "No se puede conectar con el servicio de IA. Vuelve a intentarlo.");
      }
      if (error.status === 400 || error.status === 404) {
        throw new ErrorPropuesta(502, "IA_CONFIGURACION", "El servicio de IA no ha aceptado la configuración del análisis. Revisa el modelo configurado en el servidor.");
      }
      throw new ErrorPropuesta(500, "IA_ERROR", "No se ha podido analizar la solicitud. Vuelve a intentarlo.");
    }
  };
}

module.exports = { generarPropuesta: crearServicioOpenAI(), crearServicioOpenAI, ErrorPropuesta };
