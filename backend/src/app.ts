import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { initCronJobs } from './cron/scheduler';
import routes from './routes';
import { wakeUpML } from './services/ml/mlService';

const app = express();

// ======================== MIDDLEWARE ========================

// Security
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://ecoex.onrender.com',
            'https://ecoexchange.ai',
            env.FRONTEND_URL,
            env.FRONTEND_URL.replace(/\/$/, '') // handle trailing slash
        ];

        if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`Rejected origin by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('short', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

// Rate limiting
app.use('/api/', apiLimiter);

// ======================== ROUTES ========================

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        status: 'ok',
        service: 'EcoExchange API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        endpoints: {
            auth: '/api/auth',
            companies: '/api/companies',
            marketplace: '/api/marketplace',
            matches: '/api/matches',
            impact: '/api/impact',
            passports: '/api/passports',
            alerts: '/api/alerts',
        },
    });
});

// API routes
app.use('/api', routes);

// ======================== ERROR HANDLING ========================

app.use(notFoundHandler);
app.use(errorHandler);

// ======================== SERVER ========================

const PORT = parseInt(env.PORT);

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Initialize cron jobs
        initCronJobs();

        // Wake up ML server in background
        wakeUpML();

        app.listen(PORT, () => {
            logger.info(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🌍 EcoExchange API Server                       ║
║   ──────────────────────────────                   ║
║   Status:  RUNNING                                ║
║   Port:    ${PORT}                                    ║
║   Mode:    ${env.NODE_ENV}                        ║
║   Health:  http://localhost:${PORT}/api/health        ║
║                                                   ║
║   📋 Endpoints:                                    ║
║   • Auth:        /api/auth                        ║
║   • Companies:   /api/companies                   ║
║   • Marketplace: /api/marketplace                 ║
║   • Matches:     /api/matches                     ║
║   • Impact:      /api/impact                      ║
║   • Passports:   /api/passports                   ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

startServer();

export default app;
