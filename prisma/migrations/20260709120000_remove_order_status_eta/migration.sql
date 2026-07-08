-- Merge legacy ETA status into ON_ROUTE (same operational meaning).
UPDATE "Order" SET status = 'ON_ROUTE' WHERE status = 'ETA';
UPDATE "OrderStatusEvent" SET status = 'ON_ROUTE' WHERE status = 'ETA';
