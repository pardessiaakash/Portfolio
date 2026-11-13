// Vercel: serves Nova's AI at /api/nova (see nova/handler.js).
import { handleNova } from "../nova/handler.js";

export const config = { runtime: "edge" };

export default function handler(request) {
  return handleNova(request, process.env);
}
