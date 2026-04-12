import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeIncident(description: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el siguiente reporte de incidencia de seguridad industrial y proporciona una evaluación de riesgos y recomendaciones breves: "${description}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing incident:", error);
    return "No se pudo realizar el análisis automático.";
  }
}

export async function generateSecurityAsset(prompt: string, size?: string) {
  try {
    // If it's an image generation request, we should use the image generation pattern
    // But for now, let's assume it's just a text description or a mock
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating asset:", error);
    return "Error en la generación.";
  }
}

export async function generateShiftSummary(shiftData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera un resumen de turno para el personal de seguridad basado en estos datos: ${JSON.stringify(shiftData)}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating shift summary:", error);
    return "Error en el resumen.";
  }
}

export async function generatePatrolSummary(patrolData: any) {
  const prompt = `
    Genera un informe de recorrido de seguridad abreviado y preciso basado en los siguientes datos:
    Rondín: ${patrolData.userName}
    Inicio: ${patrolData.startTime}
    Fin: ${patrolData.endTime}
    Duración: ${patrolData.duration}
    Sectores escaneados: ${patrolData.scans.map((s: any) => s.sectorName).join(', ')}
    Novedades/Incidentes: ${patrolData.incidents.length > 0 ? patrolData.incidents.map((i: any) => i.description).join('; ') : 'Ninguna'}

    El informe debe ser profesional, directo y resaltar cualquier anomalía.
    Si hay imágenes, menciona que están adjuntas en el centro de actividades.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "No se pudo generar el resumen automático.";
  }
}
