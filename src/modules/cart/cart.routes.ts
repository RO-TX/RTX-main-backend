import { Router } from 'express';
import * as c from './cart.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/auth';
import { productIdParam, addItemSchema, setQtySchema } from './cart.validation';

const router = Router();

// Guest-friendly: optionalAuth attaches req.user when logged in, but a cart
// works today via the x-cart-session header since there's no login flow yet.
router.use(optionalAuth);

router.get('/', c.getCart);
router.post('/items', validate({ body: addItemSchema }), c.addItem);
router.patch('/items/:productId', validate({ params: productIdParam, body: setQtySchema }), c.setQuantity);
router.delete('/items/:productId', validate({ params: productIdParam }), c.removeItem);
router.delete('/', c.clearCart);

export default router;
