import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().default('http://localhost:5173'),

    // MongoDB
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    // JWT
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

    // Clerk
    CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),

    // AI
    GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
    GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

    // Brevo
    BREVO_API_KEY: z.string().optional(),
    BREVO_SMTP_SERVER: z.string().optional(),
    BREVO_SMTP_PORT: z.string().optional(),
    BREVO_SMTP_LOGIN: z.string().optional(),
    BREVO_SENDER_EMAIL: z.string().optional(),

    // External APIs
    ELECTRICITYMAP_API_KEY: z.string().optional(),
    CLIMATIQ_API_KEY: z.string().optional(),
    OPEN_METEO_BASE_URL: z.string().optional(),

    // n8n
    N8N_WEBHOOK_URL: z.string().optional(),

    // Mapbox
    MAPBOX_ACCESS_TOKEN: z.string().optional(),

    // ML API
    ML_API_URL: z.string().default('https://ecoexchange-api.onrender.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
