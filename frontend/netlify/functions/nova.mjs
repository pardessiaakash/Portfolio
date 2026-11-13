// Netlify: serves Nova's AI at /api/nova (see nova/handler.js).
import { handleNova } from "../../nova/handler.js";

export default (request) => handleNova(request, process.env);

export const config = { path: "/api/nova" };
