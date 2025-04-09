import { Router, RequestHandler } from 'express';
import {
    getAvailabilityBlocksController,
    addAvailabilityBlockController,
    deleteAvailabilityBlockController
} from '../controllers/availability.controller';

const router = Router();

// Prefix '/manage/:managementToken' indicates these require doctor's token

// GET all blocks for the specified doctor
router.get('/manage/:managementToken', getAvailabilityBlocksController as RequestHandler);

// POST a new block for the specified doctor
router.post('/manage/:managementToken', addAvailabilityBlockController as RequestHandler);

// DELETE a specific block (identified by blockId) for the specified doctor
router.delete('/manage/:managementToken/:blockId', deleteAvailabilityBlockController as RequestHandler);


export default router;