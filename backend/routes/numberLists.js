import express from 'express';
import numberListController from '../controllers/numberListController.js';
import authMiddleware from '../middleware/auth.js';
import partnerFeature from '../middleware/partnerFeature.js';
import apiPermission from '../middleware/apiPermission.js';
import blockPartnerProduct from '../middleware/blockPartnerProduct.js';

const router = express.Router();

router.use(authMiddleware, partnerFeature('whatsapp-contacts-groups'));

router.get('/', apiPermission('manage_number_lists'), numberListController.getLists);
router.post('/', apiPermission('manage_number_lists'), numberListController.createList);
router.post('/merge', apiPermission('manage_number_lists'), blockPartnerProduct('Number-list transformations'), numberListController.mergeLists);
router.get('/:id', apiPermission('manage_number_lists'), numberListController.getList);
router.put('/:id', apiPermission('manage_number_lists'), numberListController.updateList);
router.delete('/:id', apiPermission('manage_number_lists'), numberListController.deleteList);
router.post('/:id/duplicate', apiPermission('manage_number_lists'), blockPartnerProduct('Number-list transformations'), numberListController.duplicateList);
router.post('/:id/filter', apiPermission('manage_number_lists'), blockPartnerProduct('Number-list transformations'), numberListController.filterList);
router.post('/:id/append-batch', apiPermission('manage_number_lists'), numberListController.appendBatch);

export default router;
