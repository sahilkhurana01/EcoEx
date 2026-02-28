import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';
import { logger } from '../utils/logger';

// Force Node.js to use Google DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

export const connectDatabase = async (): Promise<void> => {
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            await mongoose.connect(env.MONGO_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            logger.info('✅ MongoDB connected successfully');

            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected. Attempting reconnect...');
            });

            return;
        } catch (error) {
            retries++;
            logger.error(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed:`, error);
            if (retries === MAX_RETRIES) {
                logger.warn('⚠️ MongoDB unavailable — server will start without DB. Endpoints requiring DB will fail gracefully.');
                return;
            }
            await new Promise((res) => setTimeout(res, 3000));
        }
    }
};
