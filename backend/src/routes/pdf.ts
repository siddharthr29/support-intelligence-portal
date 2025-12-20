import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

export async function pdfRoutes(fastify: FastifyInstance) {
  // Generate PDF from URL using Puppeteer
  fastify.post<{
    Body: {
      url: string;
    };
  }>('/api/pdf/generate-map', async (request, reply) => {
    const { url } = request.body;

    if (!url) {
      return reply.status(400).send({
        success: false,
        error: 'URL is required',
      });
    }

    try {
      // Dynamic import of puppeteer to avoid bundling issues
      const puppeteer = await import('puppeteer');

      logger.info({ url }, 'Generating PDF from URL');

      // Launch browser
      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set viewport for proper rendering
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2,
      });

      // Navigate to the URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });

      // Additional wait for tiles to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      await browser.close();

      logger.info('PDF generated successfully');

      // Set headers for PDF download
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="avni-implementations-map-${new Date().toISOString().split('T')[0]}.pdf"`);

      return reply.send(pdf);
    } catch (error) {
      logger.error({ error, url }, 'Failed to generate PDF');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
