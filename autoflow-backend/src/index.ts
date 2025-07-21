import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mainRouter from './routes';
import oauthRoutes from './routes/oauth';
import webhookTriggerRoutes from './routes/webhookTrigger';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', mainRouter);
app.use('/api/oauth', oauthRoutes);
app.use('/api/webhook', webhookTriggerRoutes);

app.get('/', (req, res) => {
  res.send('Autoflow Backend API');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 