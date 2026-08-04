import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listProductsValidation,
  productIdValidation,
  createProductValidation,
  updateProductValidation,
  updateStatusValidation,
} from '../validators/product.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/meta',
  authorizePermission('products', 'view'),
  productController.getProductMeta
);

router.get(
  '/',
  authorizePermission('products', 'view'),
  validate(listProductsValidation),
  productController.listProducts
);

router.get(
  '/:id',
  authorizePermission('products', 'view'),
  validate(productIdValidation),
  productController.getProduct
);

router.post(
  '/',
  authorizePermission('products', 'create'),
  validate(createProductValidation),
  productController.createProduct
);

router.put(
  '/:id',
  authorizePermission('products', 'edit'),
  validate(updateProductValidation),
  productController.updateProduct
);

router.patch(
  '/:id/status',
  authorizePermission('products', 'edit'),
  validate(updateStatusValidation),
  productController.updateProductStatus
);

router.delete(
  '/:id',
  authorizePermission('products', 'delete'),
  validate(productIdValidation),
  productController.deleteProduct
);

export default router;
