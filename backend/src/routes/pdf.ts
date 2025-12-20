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

    let browser;
    try {
      logger.info({ url }, 'Generating PDF from URL');

      // Use chrome-aws-lambda for serverless/Render.com environments
      let chromium;
      let puppeteer;
      
      try {
        // Try chrome-aws-lambda first (for Render.com/serverless)
        chromium = await import('@sparticuz/chromium');
        puppeteer = await import('puppeteer-core');
        
        logger.info('Using chrome-aws-lambda for PDF generation');
        
        browser = await puppeteer.default.launch({
          args: chromium.default.args,
          executablePath: await chromium.default.executablePath(),
          headless: true,
        });
      } catch (chromiumError) {
        // Fallback to regular puppeteer (for local/development)
        logger.info('chrome-aws-lambda not available, using puppeteer');
        puppeteer = await import('puppeteer');
        
        browser = await puppeteer.default.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });
      }

      const page = await browser.newPage();

      // Set viewport for proper rendering
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2,
      });

      // Log navigation attempt
      logger.info({ url }, 'Navigating to URL');

      // Navigate to the URL with error handling
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2', // Changed from networkidle0 for better compatibility
          timeout: 60000, // Increased timeout
        });
      } catch (navError) {
        logger.error({ navError, url }, 'Navigation failed');
        throw new Error(`Failed to navigate to URL: ${navError instanceof Error ? navError.message : 'Unknown error'}`);
      }

      // Wait for map to load
      logger.info('Waiting for Leaflet map container');
      try {
        await page.waitForSelector('.leaflet-container', { timeout: 15000 });
      } catch (selectorError) {
        logger.error('Leaflet container not found');
        // Continue anyway - page might still be usable
      }

      // Additional wait for tiles to load
      logger.info('Waiting for tiles to load');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased to 5s

      // Generate PDF
      logger.info('Generating PDF');
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
      // Ensure browser is closed on error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.error({ closeError }, 'Failed to close browser');
        }
      }

      logger.error({ error, url, stack: error instanceof Error ? error.stack : undefined }, 'Failed to generate PDF');
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  });
}
