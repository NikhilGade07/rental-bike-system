/**
 * backend/routes/bike.routes.js
 * ─────────────────────────────────────────────────────────────
 * Route definitions for /api/bikes/*
 *
 * PRODUCTION equivalent (Express):
 *   router.get('/',              bikeController.getAll);
 *   router.get('/stats',         protect, adminOnly, bikeController.getStats);
 *   router.get('/:id',           bikeController.getOne);
 *   router.post('/',             protect, adminOnly, bikeController.create);
 *   router.put('/:id',           protect, adminOnly, bikeController.update);
 *   router.delete('/:id',        protect, adminOnly, bikeController.remove);
 *   router.patch('/:id/avail',   protect, adminOnly, bikeController.setAvailability);
 * ─────────────────────────────────────────────────────────────
 */

const BikeRoutes = [
  { method: 'GET',   path: '/api/bikes',              handler: req => window.BRS.BikeController.getAll(req)          },
  { method: 'GET',   path: '/api/bikes/stats',        handler: req => window.BRS.BikeController.getStats(req)        },
  { method: 'GET',   path: '/api/bikes/:id',          handler: req => window.BRS.BikeController.getOne(req)          },
  { method: 'POST',  path: '/api/bikes',              handler: req => window.BRS.BikeController.create(req)          },
  { method: 'PUT',   path: '/api/bikes/:id',          handler: req => window.BRS.BikeController.update(req)          },
  { method: 'DELETE',path: '/api/bikes/:id',          handler: req => window.BRS.BikeController.remove(req)          },
  { method: 'PATCH', path: '/api/bikes/:id/avail',    handler: req => window.BRS.BikeController.setAvailability(req) },
];

window.BRS = window.BRS || {};
window.BRS.BikeRoutes = BikeRoutes;
