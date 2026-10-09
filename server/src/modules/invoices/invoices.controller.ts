import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { InvoicesService } from './invoices.service.js';
import { sendResponse } from '../../utils/response.js';
import {WhatsappService} from "../../services/whatsapp.service.js"
import { ApiError} from '../../utils/apiError.js';

export class InvoicesController {
  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const isClient = req.user!.role === 'CLIENT';
    const invoice = await InvoicesService.getInvoiceById(
      req.params.id,
      isClient ? req.user!.userId : undefined
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Invoice details retrieved.',
      data: invoice,
    });
  };

  static myInvoices = async (req: AuthenticatedRequest, res: Response) => {
    const invoices = await InvoicesService.listUserInvoices(req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'My invoices retrieved.',
      data: invoices,
    });
  };

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const invoices = await InvoicesService.listAllInvoices();
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All invoices list retrieved.',
      data: invoices,
    });
  };

  static downloadPdf = async (req:AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const token = req.query.token as string | undefined;
    console.log('test whatsapp',token)
    const authUser = (req as AuthenticatedRequest).user;

    // 1. Check authorization: EITHER authenticated user OR valid signed token
    if (!authUser) {
      if (!token || !WhatsappService.verifySignedToken(token, id)) {
        throw ApiError.unauthorized('Invalid or expired invoice download link.');
      }
    }

    // 2. Generate PDF on-the-fly (0% Storage)
    const pdfBuffer = await InvoicesService.generateInvoicePdf(id);

    // 3. Return the PDF stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${id}.pdf`);
    return res.send(pdfBuffer);
  };
}
