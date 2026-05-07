CREATE UNIQUE INDEX IF NOT EXISTS event_attendee_one_per_ticket_idx
  ON public.event_attendee(ticket_id)
  WHERE ticket_id IS NOT NULL;

INSERT INTO public.event_attendee (
  event_id,
  ticket_id,
  ticket_type_id,
  order_id,
  member_id,
  name,
  email,
  purchaser_email,
  status,
  source
)
SELECT
  ticket.event_id,
  ticket.id,
  ticket.ticket_type_id,
  ticket.order_id,
  ticket.member_id,
  NULLIF(ticket.guest_name, ''),
  NULLIF(ticket.guest_email, ''),
  member.email,
  CASE
    WHEN ticket.status = 'refunded' THEN 'refunded'
    WHEN ticket.status = 'chargeback' THEN 'chargeback'
    WHEN ticket.status = 'canceled' THEN 'canceled'
    ELSE 'registered'
  END,
  CASE WHEN ticket.status = 'comp' OR ticket_order.status = 'comp' THEN 'comp' ELSE 'paid' END
FROM public.event_ticket ticket
JOIN public.event_ticket_order ticket_order ON ticket_order.id = ticket.order_id
LEFT JOIN public.member member ON member.id = ticket.member_id
WHERE ticket.status IN ('active', 'comp', 'refunded', 'chargeback', 'canceled')
  AND NOT EXISTS (
    SELECT 1
    FROM public.event_attendee attendee
    WHERE attendee.ticket_id = ticket.id
  );
