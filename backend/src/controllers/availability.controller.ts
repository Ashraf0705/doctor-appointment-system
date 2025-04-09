import { Request, Response, NextFunction } from 'express';
import * as availabilityService from '../services/availability.service';

// --- GET ALL BLOCKS FOR DOCTOR ---
export const getAvailabilityBlocksController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params;
        if (!managementToken) {
            return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        }

        const blocks = await availabilityService.getAvailabilityBlocksByToken(managementToken);
        // Service returns [] if token invalid, which is fine for GET (no blocks found)
        res.status(200).json({
            status: 'success',
            count: blocks.length,
            data: {
                availabilityBlocks: blocks,
            },
        });
    } catch (error) {
        next(error);
    }
};

// --- ADD NEW BLOCK FOR DOCTOR ---
export const addAvailabilityBlockController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken } = req.params;
        const { day_of_week, start_time, end_time } = req.body;

        // Basic Validation
        if (!managementToken) {
            return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        }
        if (day_of_week === undefined || !start_time || !end_time) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: day_of_week, start_time, end_time.' });
        }
        if (typeof day_of_week !== 'number' || day_of_week < 0 || day_of_week > 6) {
             return res.status(400).json({ status: 'error', message: 'Invalid day_of_week. Must be an integer between 0 (Sunday) and 6 (Saturday).' });
        }
        // Time format/logic validation is handled in the service, but basic presence check here

        const blockInput: availabilityService.AvailabilityBlockInput = { day_of_week, start_time, end_time };
        const newBlock = await availabilityService.addAvailabilityBlock(managementToken, blockInput);

        // If service throws 'Invalid management token', it will be caught below
        res.status(201).json({
            status: 'success',
            message: 'Availability block added successfully!',
            data: {
                availabilityBlock: newBlock,
            },
        });

    } catch (error) {
         // Handle specific validation errors from service
         if (error instanceof Error && (error.message.includes("Invalid time format") || error.message.includes("Start time must be before end time"))) {
             return res.status(400).json({ status: 'error', message: error.message });
         }
          // Handle invalid token error from service
          if (error instanceof Error && error.message.includes('Invalid management token')) {
             return res.status(404).json({ status: 'fail', message: 'Doctor with provided management token not found.' });
         }
        next(error); // Pass other errors (like DB errors) to global handler
    }
};

// --- DELETE BLOCK FOR DOCTOR ---
export const deleteAvailabilityBlockController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { managementToken, blockId } = req.params;
        const parsedBlockId = parseInt(blockId, 10);

        // Validation
        if (!managementToken) {
            return res.status(400).json({ status: 'error', message: 'Management token is required.' });
        }
        if (isNaN(parsedBlockId) || parsedBlockId <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid block ID provided.' });
        }

        const deleted = await availabilityService.deleteAvailabilityBlock(managementToken, parsedBlockId);

        if (deleted) {
            res.status(204).send(); // Success, no content
        } else {
            // Block not found OR token invalid OR block didn't belong to doctor
            res.status(404).json({
                status: 'fail',
                message: `Availability block with ID ${parsedBlockId} not found for the specified doctor.`,
            });
        }
    } catch (error) {
        next(error);
    }
};