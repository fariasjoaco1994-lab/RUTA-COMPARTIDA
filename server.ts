import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Integration
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-4123456789012345-010101-abcdef1234567890abcdef1234567890-123456789' 
  });

  app.post("/api/create-preference", async (req, res) => {
    try {
      const { title, quantity, unit_price, bookingId } = req.body;
      
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: bookingId,
              title: title,
              quantity: quantity,
              unit_price: unit_price,
              currency_id: 'ARS'
            }
          ],
          back_urls: {
            success: `${process.env.APP_URL}/booking-success`,
            failure: `${process.env.APP_URL}/booking-failure`,
            pending: `${process.env.APP_URL}/booking-pending`,
          },
          auto_return: 'approved',
          external_reference: bookingId
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error("Error creating MP preference:", error);
      res.status(500).json({ error: "Failed to create payment preference" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
